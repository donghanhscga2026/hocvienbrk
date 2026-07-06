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
  const userIds = (await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { userId: true }
  })).map(r => r.userId);

  if (userIds.length === 0) return;

  // Clear old pool awards first due to foreign keys, then the pools themselves
  await prisma.brkRevenueAward.deleteMany({
    where: { pool: { systemId: 4 } }
  });
  await prisma.brkRevenuePool.deleteMany({
    where: { systemId: 4 }
  });

  await prisma.systemClosure.deleteMany({ where: { systemId: 4 } });
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
  const newActivations = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
      activatedAt: {
        gte: periodStart,
        lte: periodEnd
      }
    }
  });

  const totalRevenue = newActivations.length * fee;
  const poolAmount = (totalRevenue * sharePct) / 100;

  const distDate = distributedAt || periodEnd;

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
        await creditBrkWallet(upSys.userId, commAmt, 'COMMISSION', `Hoa hồng cấp ${upSys.level} (${earnPct}%) từ thành viên mới #${userId}`);

        const brkdAmt = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100);
        await creditBrkdWallet(upSys.userId, brkdAmt, 'BRKD_CREDIT', `BRKD cấp ${upSys.level} (${earnPct}%) từ thành viên mới #${userId}`);

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
            await creditVoucherWallet(sysToCheck.userId, nextConfig.gift, 'VOUCHER_CREDIT', `Quà tặng lên cấp ${nextConfig.level} (${nextConfig.gift.toLocaleString('vi')} VND)`);
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
      await creditBrkWallet(m.userId, cashbackAmt, 'RETURN_FEE', `Hoàn 21% phí tham gia sau 3 ngày cân nhắc`);

      const brkdAmt = Math.round((BRKD_PER_ACTIVATION * 21) / 100);
      await creditBrkdWallet(m.userId, brkdAmt, 'BRKD_CREDIT', `BRKD hoàn 21% sau 3 ngày cân nhắc`);
    }
  }

  // Chia đồng chia Kỳ 1 (từ 02/07/2026 đến 05/07/2026) cho Method A
  const period1Start = new Date(2026, 6, 2, 0, 0, 0); // 02/07/2026
  const period1End = new Date(2026, 6, 5, 0, 0, 0); // 05/07/2026
  const sharePct = Number(systemTree.revenueSharePct || 2.0);
  await distributeRevenueSharePeriod(4, period1Start, period1End, 1, fee, sharePct);
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
  let processedCount = 0;

  interface StateItem {
    userId: number;
    level: number;
    points: number;
    refSysId: number;
    autoId: number;
  }
  const state: Map<number, StateItem> = new Map();

  for (const day of sortedDays) {
    const dayEnrollments = enrollByDay.get(day)!;

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

      let currentRef = refSysId;
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
          await creditBrkWallet(currentRef, commAmt, 'COMMISSION', `Hoa hồng cấp ${upState.level} (${earnPct}%) từ thành viên mới #${userId}`);

          const brkdAmt = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100);
          await creditBrkdWallet(currentRef, brkdAmt, 'BRKD_CREDIT', `BRKD cấp ${upState.level} (${earnPct}%) từ thành viên mới #${userId}`);

          previousPct = Math.max(previousPct, upConfig.pct);
        }

        currentRef = upState.refSysId;
      }
    }

    let hasLevelUp = true;
    const [d, m, y] = day.split('/');
    const nextDayMidnight = new Date(Number(y), Number(m) - 1, Number(d) + 1, 0, 0, 0);

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
            data: { userId: st.userId, onSystem: 4, fromLevel: currentLvl, toLevel: nextConfig.level, promotedAt: nextDayMidnight }
          });

          if (nextConfig.gift > 0) {
            await creditVoucherWallet(st.userId, nextConfig.gift, 'VOUCHER_CREDIT', `Quà tặng lên cấp ${nextConfig.level} (${nextConfig.gift.toLocaleString('vi')} VND)`);
          }
        }
      }
    }

    for (const st of state.values()) {
      const dbNode = await prisma.system.findUnique({ where: { autoId: st.autoId } });
      if (dbNode && dbNode.activatedAt) {
        const isGraceExpired = new Date(dbNode.activatedAt.getTime() + 1 * 24 * 60 * 60 * 1000) <= nextDayMidnight;
        if (isGraceExpired) {
          const wallet = await prisma.brkWallet.findUnique({ where: { userId: st.userId } });
          const existing = await prisma.brkTransaction.findFirst({
            where: { walletId: wallet?.id, type: 'RETURN_FEE' }
          });

          if (!existing) {
            const cashbackAmt = (fee * 21) / 100;
            await creditBrkWallet(st.userId, cashbackAmt, 'RETURN_FEE', `Hoàn 21% phí tham gia sau 1 ngày cân nhắc`);

            const brkdAmt = Math.round((BRKD_PER_ACTIVATION * 21) / 100);
            await creditBrkdWallet(st.userId, brkdAmt, 'BRKD_CREDIT', `BRKD hoàn 21% sau 1 ngày cân nhắc`);
          }
        }
      }
    }

    // Chia đồng chia Kỳ 1 (từ 02/07/2026 đến 05/07/2026) cho Method B khi kết thúc xử lý ngày 04/07
    if (day === '4/7/2026') {
      const period1Start = new Date(2026, 6, 2, 0, 0, 0); // 02/07/2026
      const period1End = new Date(2026, 6, 5, 0, 0, 0); // 05/07/2026
      const sharePct = Number(systemTree.revenueSharePct || 2.0);
      const distributedAt = new Date(2026, 6, 5, 1, 0, 0); // 05/07/2026 01:00:00
      await distributeRevenueSharePeriod(4, period1Start, period1End, 1, fee, sharePct, distributedAt);
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
