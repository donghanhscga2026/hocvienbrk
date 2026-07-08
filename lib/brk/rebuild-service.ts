import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { resolvePlacement } from './placement-rules';
import { addUserToSystemClosure } from '@/lib/system-closure-helpers';

const BRKP_PER_ACTIVATION = 17;
const BRKD_PER_ACTIVATION = 12868686;

const LEVEL_CONFIGS = [
  { level: 1, pct: 21, req: 17, gift: 0 },
  { level: 2, pct: 30, req: 50, gift: 386000 },
  { level: 3, pct: 39, req: 250, gift: 1000000 },
  { level: 4, pct: 52.5, req: 1000, gift: 2000000 },
  { level: 5, pct: 64.5, req: 4000, gift: 4000000 }
];

async function cleanup() {
  const systems = await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { autoId: true, userId: true }
  });
  const userIds = systems.map(r => r.userId);
  const autoIds = systems.map(r => r.autoId);

  if (userIds.length === 0) return;

  // Clear old pool awards first due to foreign keys, then the pools themselves
  await prisma.brkRevenueAward.deleteMany({
    where: { pool: { systemId: 4 } }
  });
  await prisma.brkRevenuePool.deleteMany({
    where: { systemId: 4 }
  });

  // Delete systemClosure by ancestorId/descendantId (FK to System.autoId), not by systemId
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

async function distributeRevenueSharePeriod(
  onSystem: number,
  periodStart: Date,
  periodEnd: Date,
  roundNumber: number,
  fee: number,
  sharePct: number,
  distributedAt?: Date
) {
  const distDate = distributedAt || periodEnd;

  const newActivations = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
      activatedAt: {
        gte: periodStart,
        lt: periodEnd
      },
      gracePeriodEnd: {
        lt: distDate
      }
    }
  });

  const totalRevenue = newActivations.length * fee;
  const poolAmount = (totalRevenue * sharePct) / 100;

  if (totalRevenue <= 0) {
    await prisma.brkRevenuePool.create({
      data: {
        systemId: onSystem,
        roundNumber,
        periodStart,
        periodEnd,
        totalRevenue: 0,
        poolAmount: 0,
        qualifiedCount: 0,
        status: 'DISTRIBUTED',
        distributedAt: distDate
      }
    });
    return;
  }

  const activeMembers = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
      activatedAt: { lte: periodEnd }
    }
  });

  const qualified = [];
  for (const member of activeMembers) {
    const f1Count = await prisma.systemClosure.count({
      where: {
        ancestorId: member.autoId,
        depth: 1,
        systemId: onSystem
      }
    });
    if (f1Count >= 1) {
      qualified.push(member);
    }
  }

  const qualifiedCount = qualified.length;
  if (qualifiedCount === 0) {
    await prisma.brkRevenuePool.create({
      data: {
        systemId: onSystem,
        roundNumber,
        periodStart,
        periodEnd,
        totalRevenue,
        poolAmount,
        qualifiedCount: 0,
        status: 'DISTRIBUTED',
        distributedAt: distDate
      }
    });
    return;
  }

  const amountPerPerson = Math.floor((poolAmount * 100) / qualifiedCount) / 100;

  const pool = await prisma.brkRevenuePool.create({
    data: {
      systemId: onSystem,
      roundNumber,
      periodStart,
      periodEnd,
      totalRevenue,
      poolAmount,
      qualifiedCount,
      status: 'DISTRIBUTED',
      distributedAt: distDate
    }
  });

  for (const member of qualified) {
    await creditBrkWallet(
      member.userId,
      amountPerPerson,
      'REVENUE_SHARE',
      `Chia đều doanh thu kỳ ${roundNumber} (${sharePct}% của ${totalRevenue.toLocaleString('vi')} VND)`,
      distDate
    );

    const totalBrkdRevenue = newActivations.length * BRKD_PER_ACTIVATION;
    const brkdPoolAmount = (totalBrkdRevenue * sharePct) / 100;
    const brkdShare = Math.round(brkdPoolAmount / qualifiedCount);
    if (brkdShare > 0) {
      await creditBrkdWallet(
        member.userId,
        brkdShare,
        'BRKD_CREDIT',
        `BRKD chia doanh thu kỳ ${roundNumber}`,
        distDate
      );
    }

    await prisma.brkRevenueAward.create({
      data: {
        poolId: pool.id,
        userId: member.userId,
        amount: amountPerPerson,
        paid: true
      }
    });
  }
}

async function ensureWallet(userId: number) {
  let wallet = await prisma.brkWallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.brkWallet.create({
      data: { userId, balance: 0, brkd: 0, voucherBalance: 0, totalEarned: 0, totalWithdrawn: 0 }
    });
  }
  return wallet;
}

async function creditBrkWallet(userId: number, amount: number, type: any, description: string, createdAt?: Date) {
  const wallet = await ensureWallet(userId);
  const oldBalance = Number(wallet.balance);
  const newBalance = oldBalance + amount;
  const oldTotalEarned = Number(wallet.totalEarned);
  const newTotalEarned = oldTotalEarned + amount;

  await prisma.brkWallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance, totalEarned: newTotalEarned }
  });

  await prisma.brkTransaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type,
      description,
      balanceType: 'CASH',
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      createdAt
    }
  });
}

async function creditBrkdWallet(userId: number, amount: number, type: any, description: string, createdAt?: Date) {
  const wallet = await ensureWallet(userId);
  const oldBrkd = Number(wallet.brkd);
  const newBrkd = oldBrkd + amount;

  await prisma.brkWallet.update({
    where: { id: wallet.id },
    data: { brkd: newBrkd }
  });

  await prisma.brkTransaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type,
      description,
      balanceType: 'BRKD',
      balanceBefore: oldBrkd,
      balanceAfter: newBrkd,
      createdAt
    }
  });
}

async function creditVoucherWallet(userId: number, amount: number, type: any, description: string, createdAt?: Date) {
  const wallet = await ensureWallet(userId);
  const oldVoucher = Number(wallet.voucherBalance);
  const newVoucher = oldVoucher + amount;

  await prisma.brkWallet.update({
    where: { id: wallet.id },
    data: { voucherBalance: newVoucher }
  });

  await prisma.brkTransaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type,
      description,
      balanceType: 'VOUCHER',
      balanceBefore: oldVoucher,
      balanceAfter: newVoucher,
      createdAt
    }
  });
}

async function executeMethodA(enrollments: any[], systemTree: any, fee: number) {
  let processedCount = 0;
  for (const enrollment of enrollments) {
    const userId = enrollment.userId;
    const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt;
    const graceEnd = new Date(activatedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    processedCount++;
    let refSysId = 0;
    if (processedCount > 1) {
      const effectiveReferrer = enrollment.referrerId || enrollment.user.referrerId;
      refSysId = await resolvePlacement(4, effectiveReferrer);
    }

    const system = await prisma.system.create({
      data: {
        userId,
        onSystem: 4,
        refSysId,
        status: 'ACTIVE',
        activatedAt,
        gracePeriodEnd: graceEnd,
        expiresAt,
        level: 1,
        totalPoints: BRKP_PER_ACTIVATION
      }
    });

    await addUserToSystemClosure(userId, refSysId, 4);
    await ensureWallet(userId);

    let currentRef = refSysId;
    let previousPct = 21;

    while (currentRef > 0) {
      const upSys = await prisma.system.findFirst({ where: { userId: currentRef, onSystem: 4 } });
      if (!upSys) break;

      await prisma.system.update({
        where: { autoId: upSys.autoId },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      });

      const upConfig = LEVEL_CONFIGS.find(c => c.level === upSys.level) || LEVEL_CONFIGS[0];
      const earnPct = upConfig.pct - previousPct;

      if (earnPct > 0) {
        const commAmt = (fee * earnPct) / 100;
        await creditBrkWallet(upSys.userId, commAmt, 'COMMISSION', `Hoa hồng cấp ${upSys.level} (${earnPct}%) từ thành viên mới #${userId}`, activatedAt);

        const brkdAmt = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100);
        await creditBrkdWallet(upSys.userId, brkdAmt, 'BRKD_CREDIT', `BRKD cấp ${upSys.level} (${earnPct}%) từ thành viên mới #${userId}`, activatedAt);

        previousPct = Math.max(previousPct, upConfig.pct);
      }

      currentRef = upSys.refSysId;
    }

    let currentUserIdToCheck = userId;
    while (currentUserIdToCheck > 0) {
      const sysToCheck = await prisma.system.findFirst({ where: { userId: currentUserIdToCheck, onSystem: 4 } });
      if (!sysToCheck) break;

      let hasLevelUp = true;
      while (hasLevelUp) {
        hasLevelUp = false;
        const currentLvl = sysToCheck.level;
        const nextConfig = LEVEL_CONFIGS.find(c => c.level === currentLvl + 1);

        if (nextConfig && sysToCheck.totalPoints.toNumber() >= nextConfig.req) {
          await prisma.system.update({
            where: { autoId: sysToCheck.autoId },
            data: { level: nextConfig.level }
          });
          sysToCheck.level = nextConfig.level;

          await prisma.brkLevelUpRecord.create({
            data: { userId: sysToCheck.userId, onSystem: 4, fromLevel: currentLvl, toLevel: nextConfig.level, promotedAt: activatedAt }
          });

          if (nextConfig.gift > 0) {
            await creditVoucherWallet(sysToCheck.userId, nextConfig.gift, 'VOUCHER_CREDIT', `Quà tặng lên cấp ${nextConfig.level} (${nextConfig.gift.toLocaleString('vi')} VND)`, activatedAt);
          }
          hasLevelUp = true;
        }
      }
      currentUserIdToCheck = sysToCheck.refSysId;
    }
  }

  const now = new Date();
  const activeMembers = await prisma.system.findMany({ where: { onSystem: 4, status: 'ACTIVE' } });
  for (const m of activeMembers) {
    if (m.activatedAt && new Date(m.activatedAt.getTime() + 3 * 24 * 60 * 60 * 1000) <= now) {
      const cashbackAmt = (fee * 21) / 100;
        await creditBrkWallet(m.userId, cashbackAmt, 'RETURN_FEE', `Hoàn 21% phí tham gia sau 3 ngày cân nhắc`, new Date(m.activatedAt.getTime() + 3 * 24 * 60 * 60 * 1000));

      const brkdAmt = Math.round((BRKD_PER_ACTIVATION * 21) / 100);
        await creditBrkdWallet(m.userId, brkdAmt, 'BRKD_CREDIT', `BRKD hoàn 21% sau 3 ngày cân nhắc`, new Date(m.activatedAt.getTime() + 3 * 24 * 60 * 60 * 1000));
    }
  }

  // Chia đồng chia Kỳ 1 (từ 02/07/2026 đến 05/07/2026) cho Method A
  const period1Start = new Date(2026, 6, 2, 0, 0, 0); // 02/07/2026
  const period1End = new Date(2026, 6, 5, 0, 0, 0); // 05/07/2026
  const sharePct = Number(systemTree.revenueSharePct || 2.0);
  await distributeRevenueSharePeriod(4, period1Start, period1End, 1, fee, sharePct);
}

// 06:08 AM Vietnam (UTC+7) = 23:08 UTC previous day
function getEvalTime(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day - 1, 23, 8, 0));
}

// Returns the most recent 06:08 AM Vietnam time that is <= now
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

interface StateItem {
  userId: number;
  level: number;
  points: number;
  refSysId: number;
  autoId: number;
}

async function processConfirmations(
  due: PendingMember[],
  state: Map<number, StateItem>,
  fee: number,
  evalTime: Date
) {
  for (const member of due) {
    let currentRef = member.refSysId;
    let previousPct = 21;

    while (currentRef > 0) {
      const upState = state.get(currentRef);
      if (!upState) break;

      upState.points += BRKP_PER_ACTIVATION;
      await prisma.system.update({
        where: { autoId: upState.autoId },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      });

      const upConfig = LEVEL_CONFIGS.find(c => c.level === upState.level) || LEVEL_CONFIGS[0];
      const earnPct = upConfig.pct - previousPct;

      if (earnPct > 0) {
        const commAmt = (fee * earnPct) / 100;
        await creditBrkWallet(currentRef, commAmt, 'COMMISSION',
          `Hoa hồng cấp ${upState.level} (${earnPct}%) từ thành viên mới #${member.userId}`,
          evalTime
        );

        const brkdAmt = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100);
        await creditBrkdWallet(currentRef, brkdAmt, 'BRKD_CREDIT',
          `BRKD cấp ${upState.level} (${earnPct}%) từ thành viên mới #${member.userId}`,
          evalTime
        );

        previousPct = Math.max(previousPct, upConfig.pct);
      }

      currentRef = upState.refSysId;
    }

    // Return fee 21% after 24h cooling-off
    const cashbackAmt = (fee * 21) / 100;
    await creditBrkWallet(member.userId, cashbackAmt, 'RETURN_FEE',
      `Hoàn 21% phí tham gia sau 1 ngày cân nhắc`,
      evalTime
    );

    const brkdAmt2 = Math.round((BRKD_PER_ACTIVATION * 21) / 100);
    await creditBrkdWallet(member.userId, brkdAmt2, 'BRKD_CREDIT',
      `BRKD hoàn 21% sau 1 ngày cân nhắc`,
      evalTime
    );
  }
}

async function executeMethodB(enrollments: any[], systemTree: any, fee: number) {
  const enrollByDay: Map<string, any[]> = new Map();
  for (const e of enrollments) {
    const activatedAt = e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt;
    const dayStr = activatedAt.toLocaleDateString('vi-VN');
    if (!enrollByDay.has(dayStr)) {
      enrollByDay.set(dayStr, []);
    }
    enrollByDay.get(dayStr)!.push(e);
  }

  const sortedDays = Array.from(enrollByDay.keys());
  const now = new Date();
  let processedCount = 0;

  const state: Map<number, StateItem> = new Map();
  const pending: PendingMember[] = [];
  let daysProcessed = 0;
  let currentPeriodStart: Date | null = null;
  let periodNumber = 1;
  const SHARE_PCT = Number(systemTree.revenueSharePct || 2.0);

  for (const day of sortedDays) {
    const dayEnrollments = enrollByDay.get(day)!;
    const [d, m, y] = day.split('/');

    // 1. Process day D enrollments (no commissions/points yet)
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

      const system = await prisma.system.create({
        data: {
          userId,
          onSystem: 4,
          refSysId,
          status: 'ACTIVE',
          activatedAt,
          gracePeriodEnd: graceEnd,
          expiresAt,
          level: 1,
          totalPoints: BRKP_PER_ACTIVATION
        }
      });

      state.set(userId, { userId, level: 1, points: BRKP_PER_ACTIVATION, refSysId, autoId: system.autoId });
      await addUserToSystemClosure(userId, refSysId, 4);
      await ensureWallet(userId);

      pending.push({ userId, activatedAt, refSysId });
    }

    // 2. Process confirmations at 06:08 AM next day (Vietnam time)
    const evalTime = getEvalTime(Number(y), Number(m) - 1, Number(d) + 1);
    if (evalTime > now) break; // Skip future evaluations — not yet confirmed in real life
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

    await processConfirmations(due, state, fee, evalTime);

    // 3. Level-up checks (with points from confirmed members)
    let hasLevelUp = true;
    while (hasLevelUp) {
      hasLevelUp = false;
      for (const st of state.values()) {
        const currentLvl = st.level;
        const nextConfig = LEVEL_CONFIGS.find(c => c.level === currentLvl + 1);

        if (nextConfig && st.points >= nextConfig.req) {
          st.level = nextConfig.level;
          hasLevelUp = true;

          await prisma.system.update({
            where: { autoId: st.autoId },
            data: { level: nextConfig.level }
          });

          await prisma.brkLevelUpRecord.create({
            data: { userId: st.userId, onSystem: 4, fromLevel: currentLvl, toLevel: nextConfig.level, promotedAt: evalTime }
          });

          if (nextConfig.gift > 0) {
            await creditVoucherWallet(st.userId, nextConfig.gift, 'VOUCHER_CREDIT',
              `Quà tặng lên cấp ${nextConfig.level} (${nextConfig.gift.toLocaleString('vi')} VND)`,
              evalTime
            );
          }
        }
      }
    }

    // 4. Revenue share (every 3 days at 06:08)
    daysProcessed++;
    if (!currentPeriodStart) currentPeriodStart = getEvalTime(Number(y), Number(m) - 1, Number(d));

    if (daysProcessed % 3 === 0) {
      const periodEnd = getEvalTime(Number(y), Number(m) - 1, Number(d) + 1);
      await distributeRevenueSharePeriod(4, currentPeriodStart, periodEnd, periodNumber++, fee, SHARE_PCT, periodEnd);
      currentPeriodStart = periodEnd;
    }
  }

  // 5. Final: process remaining pending members whose 24h has passed by now
  if (pending.length > 0) {
    const due: PendingMember[] = [];
    for (const p of pending) {
      if (p.activatedAt.getTime() + 24 * 60 * 60 * 1000 <= now.getTime()) {
        due.push(p);
      }
    }

    if (due.length > 0) {
      const latestEval = getCurrentEvalTime();
      await processConfirmations(due, state, fee, latestEval);

      let hasLevelUp = true;
      while (hasLevelUp) {
        hasLevelUp = false;
        for (const st of state.values()) {
          const currentLvl = st.level;
          const nextConfig = LEVEL_CONFIGS.find(c => c.level === currentLvl + 1);
          if (nextConfig && st.points >= nextConfig.req) {
            st.level = nextConfig.level;
            hasLevelUp = true;
            await prisma.system.update({
              where: { autoId: st.autoId },
              data: { level: nextConfig.level }
            });
            await prisma.brkLevelUpRecord.create({
              data: { userId: st.userId, onSystem: 4, fromLevel: currentLvl, toLevel: nextConfig.level, promotedAt: latestEval }
            });
            if (nextConfig.gift > 0) {
              await creditVoucherWallet(st.userId, nextConfig.gift, 'VOUCHER_CREDIT',
                `Quà tặng lên cấp ${nextConfig.level} (${nextConfig.gift.toLocaleString('vi')} VND)`,
                latestEval
              );
            }
          }
        }
      }
    }
  }
}

export async function rebuildSystem4Data(method: 'A' | 'B') {
  // 1. Cleanup
  await cleanup();

  // 2. Write Config
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

  // 3. Load enrollments
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
