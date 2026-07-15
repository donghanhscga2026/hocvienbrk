import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { resolvePlacement } from './placement-rules';
import { addUserToSystemClosure } from '@/lib/system-closure-helpers';
import { create2F1Voucher, checkAndPromoteLevel } from './level-manager';
import { ensureBrkWallet, creditBrkWallet, creditBrkdWallet } from './wallet-service';
import { distributeCommission } from './commission-calculator';
import { processRevenueShareForSystem } from './revenue-share-service';

const BRKP_PER_ACTIVATION = 17;
const BRKD_PER_ACTIVATION = 12868686;
const MBDT_BASE = 12_000_000;
const MBDT_MIN = 12_868_686;
const MBDT_MAX = 15_868_686;

function generateMBDT(): number {
  return Math.floor(Math.random() * (MBDT_MAX - MBDT_MIN + 1)) + MBDT_MIN;
}

function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000;
}

async function cleanup() {
  const systems = await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { autoId: true, userId: true }
  });
  const userIds = systems.map(r => r.userId);
  const autoIds = systems.map(r => r.autoId);

  if (userIds.length === 0) return;

  await prisma.brkRevenueAward.deleteMany({
    where: { pool: { systemId: 4 } }
  });
  await prisma.brkRevenuePool.deleteMany({
    where: { systemId: 4 }
  });

  if (autoIds.length > 0) {
    await prisma.systemClosure.deleteMany({
      where: { OR: [{ ancestorId: { in: autoIds } }, { descendantId: { in: autoIds } }] }
    });
  }
  await prisma.brkLevelUpRecord.deleteMany({ where: { onSystem: 4 } });
  await prisma.brkReferralBonus.deleteMany({ where: { onSystem: 4 } });

  const wallets = await prisma.brkWallet.findMany({ where: { userId: { in: userIds } } });
  if (wallets.length > 0) {
    await prisma.brkTransaction.deleteMany({ where: { walletId: { in: wallets.map(w => w.id) } } });
    await prisma.$executeRaw(
      Prisma.sql`UPDATE "brk_wallet" SET balance = 0, brkd = 0, "voucherBalance" = 0, "totalEarned" = 0, "totalWithdrawn" = 0 WHERE id IN (${Prisma.join(wallets.map(w => w.id))})`
    );
  }

  await prisma.system.deleteMany({ where: { onSystem: 4 } });
}

function getEvalTime(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day - 1, 17, 13, 0));
}

function getCurrentEvalTime(): Date {
  const now = new Date();
  const todayEval = getEvalTime(now.getFullYear(), now.getMonth(), now.getDate());
  return todayEval <= now ? todayEval : getEvalTime(now.getFullYear(), now.getMonth(), now.getDate() - 1);
}

interface PendingMember {
  userId: number;
  activatedAt: Date;
  refSysId: number;
}

async function confirmMember(
  memberUserId: number,
  refSysId: number,
  onSystem: number,
  fee: number,
  systemTree: any,
  evalTime: Date,
  memberMBDT: number
) {
  const returnPct = Number(systemTree?.returnPct ?? 21)
  const returnRefId = `return_fee_sys_${onSystem}_user_${memberUserId}`
  const returnAmt = (fee * returnPct) / 100

  await creditBrkWallet(memberUserId, returnAmt, 'RETURN_FEE', `Hoàn ${returnPct}% phí tham gia sau 1 ngày cân nhắc`, returnRefId, evalTime);

  const brkdReturn = Math.round((memberMBDT * returnPct) / 100);
  if (brkdReturn > 0) {
    const brkdRefId = `return_brkd_sys_${onSystem}_user_${memberUserId}`
    await creditBrkdWallet(memberUserId, brkdReturn, `BRKD hoàn ${returnPct}% sau 1 ngày cân nhắc`, brkdRefId, evalTime);
  }

  if (refSysId > 0) {
    await create2F1Voucher(refSysId, onSystem, evalTime);
  }
}

async function confirmAndLevelUp(
  members: PendingMember[],
  onSystem: number,
  fee: number,
  systemTree: any,
  evalTime: Date
) {
  for (const member of members) {
    // Dedup: skip nếu đã xử lý RETURN_FEE rồi (tránh tính trùng points)
    const returnRefId = `return_fee_sys_${onSystem}_user_${member.userId}`
    const existingReturn = await prisma.brkTransaction.findFirst({
      where: { wallet: { userId: member.userId }, type: 'RETURN_FEE', refId: returnRefId }
    });
    if (existingReturn) continue;

    const memberMBDT = generateMBDT();

    await prisma.system.update({
      where: { userId_onSystem: { userId: member.userId, onSystem } },
      data: { totalPoints: { increment: mbdtToMbp(memberMBDT) } }
    });

    await creditBrkdWallet(
      member.userId,
      memberMBDT,
      `Nhận ${memberMBDT.toLocaleString()} BRKD gốc khi kích hoạt sau 1 ngày cân nhắc`,
      `brkd_deposit_sys_${onSystem}_user_${member.userId}`,
      evalTime
    );

    await distributeCommission(member.userId, onSystem, fee, systemTree, evalTime, undefined, memberMBDT);
    await confirmMember(member.userId, member.refSysId, onSystem, fee, systemTree, evalTime, memberMBDT);
    await checkAndPromoteLevel(member.userId, onSystem, evalTime);

    const memberSys = await prisma.system.findUnique({
      where: { userId_onSystem: { userId: member.userId, onSystem } }
    });
    if (memberSys) {
      const closures = await prisma.systemClosure.findMany({
        where: { descendantId: memberSys.autoId, depth: { gte: 1 }, systemId: onSystem }
      });
      const ancestorSystems = await prisma.system.findMany({
        where: { autoId: { in: closures.map(c => c.ancestorId) } }
      });
      for (const ancestor of ancestorSystems) {
        await checkAndPromoteLevel(ancestor.userId, onSystem, evalTime);
      }
    }
  }
}

async function executeMethodA(enrollments: any[], systemTree: any, fee: number) {
  const pending: PendingMember[] = [];

  for (const enrollment of enrollments) {
    const userId = enrollment.userId;
    const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt;
    const graceEnd = new Date(activatedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    let refSysId = 0;

    if (enrollment !== enrollments[0]) {
      const effectiveReferrer = enrollment.referrerId || enrollment.user.referrerId;
      refSysId = await resolvePlacement(4, effectiveReferrer);
    }

    await prisma.system.create({
      data: {
        userId, onSystem: 4, refSysId, status: 'ACTIVE',
        activatedAt, gracePeriodEnd: graceEnd, expiresAt, level: 1, totalPoints: 0
      }
    });

    await addUserToSystemClosure(userId, refSysId, 4);
    await ensureBrkWallet(userId);

    pending.push({ userId, activatedAt, refSysId });
  }

  const due: PendingMember[] = [];
  const now = new Date();
  for (const p of pending) {
    if (p.activatedAt.getTime() + 3 * 24 * 60 * 60 * 1000 <= now.getTime()) {
      due.push(p);
    }
  }

  if (due.length > 0) {
    const latestEval = getCurrentEvalTime();
    for (const member of due) {
      // Dedup: skip nếu đã xử lý RETURN_FEE rồi (tránh tính trùng points)
      const returnRefId = `return_fee_sys_4_user_${member.userId}`
      const existingReturn = await prisma.brkTransaction.findFirst({
        where: { wallet: { userId: member.userId }, type: 'RETURN_FEE', refId: returnRefId }
      });
      if (existingReturn) continue;

      const memberMBDT = BRKD_PER_ACTIVATION;

      await prisma.system.update({
        where: { userId_onSystem: { userId: member.userId, onSystem: 4 } },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      });

      await creditBrkdWallet(
        member.userId,
        memberMBDT,
        `Nhận ${memberMBDT.toLocaleString()} BRKD gốc khi kích hoạt`,
        `brkd_deposit_sys_4_user_${member.userId}`,
        latestEval
      );

      await distributeCommission(member.userId, 4, fee, systemTree, latestEval, undefined, memberMBDT);
      await confirmMember(member.userId, member.refSysId, 4, fee, systemTree, latestEval, memberMBDT);
      await checkAndPromoteLevel(member.userId, 4, latestEval);

      const memberSys = await prisma.system.findUnique({
        where: { userId_onSystem: { userId: member.userId, onSystem: 4 } }
      });
      if (memberSys) {
        const closures = await prisma.systemClosure.findMany({
          where: { descendantId: memberSys.autoId, depth: { gte: 1 }, systemId: 4 }
        });
        const ancestorSystems = await prisma.system.findMany({
          where: { autoId: { in: closures.map(c => c.ancestorId) } }
        });
        for (const ancestor of ancestorSystems) {
          await checkAndPromoteLevel(ancestor.userId, 4, latestEval);
        }
      }
    }
  }

  await processRevenueShareForSystem(
    4,
    getCurrentEvalTime()
  );
}

async function executeMethodB(enrollments: any[], systemTree: any, fee: number) {
  const enrollByDay: Map<string, any[]> = new Map();
  for (const e of enrollments) {
    const activatedAt = e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt;
    const dayStr = activatedAt.toLocaleDateString('vi-VN');
    if (!enrollByDay.has(dayStr)) enrollByDay.set(dayStr, []);
    enrollByDay.get(dayStr)!.push(e);
  }

  const sortedDays = Array.from(enrollByDay.keys());
  const now = new Date();
  let processedCount = 0;

  const pending: PendingMember[] = [];
  let daysProcessed = 0;
  let periodNumber = 1;

  for (const day of sortedDays) {
    const dayEnrollments = enrollByDay.get(day)!;
    const [d, m, y] = day.split('/');

    for (const enrollment of dayEnrollments) {
      const userId = enrollment.userId;
      const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt;
      const graceEnd = new Date(activatedAt.getTime() + 1 * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      processedCount++;
      let refSysId = 0;
      if (processedCount > 1) {
        const effectiveReferrer = enrollment.referrerId || enrollment.user.referrerId;
        refSysId = await resolvePlacement(4, effectiveReferrer);
      }

      await prisma.system.create({
        data: {
          userId, onSystem: 4, refSysId, status: 'ACTIVE',
          activatedAt, gracePeriodEnd: graceEnd, expiresAt, level: 1, totalPoints: 0
        }
      });

      await addUserToSystemClosure(userId, refSysId, 4);
      await ensureBrkWallet(userId);

      pending.push({ userId, activatedAt, refSysId });
    }

    const evalTime = getEvalTime(Number(y), Number(m) - 1, Number(d) + 1);
    if (evalTime > now) break;
    const due: PendingMember[] = [];
    const remaining: PendingMember[] = [];

    for (const p of pending) {
      if (p.activatedAt.getTime() + 24 * 60 * 60 * 1000 <= evalTime.getTime()) {
        due.push(p);
      } else {
        remaining.push(p);
      }
    }
    pending.length = 0;
    pending.push(...remaining);

    await confirmAndLevelUp(due, 4, fee, systemTree, evalTime);

    daysProcessed++;
    if (daysProcessed % 3 === 0) {
      await processRevenueShareForSystem(4, getEvalTime(Number(y), Number(m) - 1, Number(d) + 1));
      periodNumber++;
    }
  }

  if (pending.length > 0) {
    const due: PendingMember[] = [];
    for (const p of pending) {
      if (p.activatedAt.getTime() + 24 * 60 * 60 * 1000 <= now.getTime()) {
        due.push(p);
      }
    }

    if (due.length > 0) {
      const latestEval = getCurrentEvalTime();
      await confirmAndLevelUp(due, 4, fee, systemTree, latestEval);
    }
  }
}

export async function rebuildSystem4Data(method: 'A' | 'B') {
  await cleanup();

  await prisma.systemConfig.upsert({
    where: { key: 'brk_promotion_logic' },
    update: { value: method },
    create: { key: 'brk_promotion_logic', value: method }
  });

  const graceDays = method === 'A' ? 3 : 1;
  await prisma.systemTree.update({
    where: { onSystem: 4 },
    data: { nameSystem: 'MB - Ngân hàng phước báu', graceDays }
  });

  await prisma.course.update({
    where: { id: 22 },
    data: { noidung_stk: 'MB {SDT} {HOTEN}' }
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, referrerId: true } },
      payment: { select: { transferTime: true, verifiedAt: true } },
    },
  });

  enrollments.sort((a, b) => {
    const ta = a.payment?.transferTime || a.payment?.verifiedAt || a.createdAt;
    const tb = b.payment?.transferTime || b.payment?.verifiedAt || b.createdAt;
    return ta.getTime() - tb.getTime();
  });

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } });
  const fee = Number(systemTree?.fee || 26868);

  if (method === 'A') {
    await executeMethodA(enrollments, systemTree, fee);
  } else {
    await executeMethodB(enrollments, systemTree, fee);
  }
}