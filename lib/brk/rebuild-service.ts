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
  return new Date(Date.UTC(year, month, day - 1, 23, 8, 0));
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
  evalTime: Date
) {
  await creditBrkWallet(memberUserId, (fee * 21) / 100, 'RETURN_FEE', `Hoàn 21% phí tham gia sau 1 ngày cân nhắc`, undefined, evalTime);

  const brkdReturn = Math.round((BRKD_PER_ACTIVATION * 21) / 100);
  if (brkdReturn > 0) {
    await creditBrkdWallet(memberUserId, brkdReturn, `BRKD hoàn 21% sau 1 ngày cân nhắc`, undefined, evalTime);
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
    await prisma.system.update({
      where: { userId_onSystem: { userId: member.userId, onSystem } },
      data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
    });

    await distributeCommission(member.userId, onSystem, fee, systemTree, evalTime);
    await confirmMember(member.userId, member.refSysId, onSystem, fee, systemTree, evalTime);
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
      await prisma.system.update({
        where: { userId_onSystem: { userId: member.userId, onSystem: 4 } },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      });

      await distributeCommission(member.userId, 4, fee, systemTree, latestEval);
      await confirmMember(member.userId, member.refSysId, 4, fee, systemTree, latestEval);
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
    new Date(2026, 6, 5, 0, 0, 0)
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