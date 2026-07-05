import { PrismaClient, Prisma } from '@prisma/client';
import { resolvePlacement } from '../lib/brk/placement-rules';
import { addUserToSystemClosure } from '../lib/system-closure-helpers';

const prisma = new PrismaClient();
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
  console.log('🧹 Cleaning up old data for onSystem=4...');
  const userIds = (await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { userId: true }
  })).map(r => r.userId);

  if (userIds.length === 0) {
    console.log('  No existing data to clean.');
    return;
  }

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
  console.log('  ✅ Cleanup complete.');
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

async function creditBrkWallet(userId: number, amount: number, type: any, description: string) {
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
      balanceAfter: newBalance
    }
  });
}

async function creditBrkdWallet(userId: number, amount: number, type: any, description: string) {
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
      balanceAfter: newBrkd
    }
  });
}

async function creditVoucherWallet(userId: number, amount: number, type: any, description: string) {
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
      balanceAfter: newVoucher
    }
  });
}

async function executeMethodA(enrollments: any[], systemTree: any, fee: number) {
  console.log("🚀 Executing Method A (Real-time thăng cấp + 3 ngày cân nhắc)...");
  let processedCount = 0;

  for (const enrollment of enrollments) {
    const userId = enrollment.userId;
    const userName = enrollment.user.name || `#${userId}`;
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

    // Chia hoa hồng chênh lệch & điểm số cho uplines real-time
    let currentRef = refSysId;
    let previousPct = 21; // F1 level 1 là 21%

    while (currentRef > 0) {
      const upSys = await prisma.system.findFirst({ where: { userId: currentRef, onSystem: 4 } });
      if (!upSys) break;

      // Cộng điểm BRKP
      await prisma.system.update({
        where: { autoId: upSys.autoId },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      });

      // Hoa hồng
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

    // Xét thăng cấp real-time
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
          // Thăng cấp!
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
          console.log(`   🔺 [Real-time Level Up] #${sysToCheck.userId} thăng lên Cấp ${nextConfig.level}`);
        }
      }

      currentUserIdToCheck = sysToCheck.refSysId;
    }
  }

  // Quét hoàn trả 21% cashback sau 3 ngày
  console.log("\n💸 Processing 21% cashback (3 days grace)...");
  const now = new Date();
  const activeMembers = await prisma.system.findMany({ where: { onSystem: 4, status: 'ACTIVE' } });
  let cashbackProcessed = 0;

  for (const m of activeMembers) {
    if (m.activatedAt && new Date(m.activatedAt.getTime() + 3 * 24 * 60 * 60 * 1000) <= now) {
      const cashbackAmt = (fee * 21) / 100;
      await creditBrkWallet(m.userId, cashbackAmt, 'RETURN_FEE', `Hoàn 21% phí tham gia sau 3 ngày cân nhắc`);

      const brkdAmt = Math.round((BRKD_PER_ACTIVATION * 21) / 100);
      await creditBrkdWallet(m.userId, brkdAmt, 'BRKD_CREDIT', `BRKD hoàn 21% sau 3 ngày cân nhắc`);
      cashbackProcessed++;
    }
  }
  console.log(`🎉 Cashback Method A processed for ${cashbackProcessed} members.`);
}

async function executeMethodB(enrollments: any[], systemTree: any, fee: number) {
  console.log("🚀 Executing Method B (Daily batch thăng cấp lúc 00:00 + 24h cân nhắc)...");

  // Gom enrollment theo ngày
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

  // Cấu trúc theo dõi cấp bậc, điểm số giả lập trong ngày
  interface StateItem {
    userId: number;
    level: number;
    points: number;
    refSysId: number;
    autoId: number;
  }
  const state: Map<number, StateItem> = new Map();

  for (const day of sortedDays) {
    console.log(`\n📅 --- Processing Day: ${day} ---`);
    const dayEnrollments = enrollByDay.get(day)!;

    // 1. Kích hoạt và chia hoa hồng theo Cấp bậc cũ
    for (const enrollment of dayEnrollments) {
      const userId = enrollment.userId;
      const userName = enrollment.user.name || `#${userId}`;
      const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt;
      const graceEnd = new Date(activatedAt.getTime() + 1 * 24 * 60 * 60 * 1000); // 24h grace
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

      // Điểm số và hoa hồng lên uplines
      let currentRef = refSysId;
      let previousPct = 21;

      while (currentRef > 0) {
        const upState = state.get(currentRef);
        if (!upState) break;

        // Cộng điểm BRKP
        upState.points += BRKP_PER_ACTIVATION;
        await prisma.system.update({
          where: { autoId: upState.autoId },
          data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
        });

        // Hoa hồng chênh lệch
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

    // 2. Xét thăng cấp cuối ngày (Giả lập 00:00 ngày hôm sau)
    // Phải lặp đi lặp lại để thăng cấp nhiều tầng (ví dụ F lên cấp giúp Upline thăng cấp tiếp)
    console.log(`  ⚙️ Running batch level promotion check at 00:00...`);
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

          // Cập nhật DB
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
          console.log(`   🔺 [Batch Level Up] #${st.userId} thăng lên Cấp ${nextConfig.level} vào 00:00`);
        }
      }
    }

    // 3. Hoàn trả 21% cashback cho những ai đã quá 24h
    let dayCashbackCount = 0;
    for (const st of state.values()) {
      const dbNode = await prisma.system.findUnique({ where: { autoId: st.autoId } });
      if (dbNode && dbNode.activatedAt) {
        // Kiểm tra xem thời điểm 00:00 hôm sau có lớn hơn activatedAt + 24h không
        const isGraceExpired = new Date(dbNode.activatedAt.getTime() + 1 * 24 * 60 * 60 * 1000) <= nextDayMidnight;
        
        if (isGraceExpired) {
          // Kiểm tra xem đã hoàn tiền chưa
          const wallet = await prisma.brkWallet.findUnique({ where: { userId: st.userId } });
          const existing = await prisma.brkTransaction.findFirst({
            where: { walletId: wallet?.id, type: 'RETURN_FEE' }
          });

          if (!existing) {
            const cashbackAmt = (fee * 21) / 100;
            await creditBrkWallet(st.userId, cashbackAmt, 'RETURN_FEE', `Hoàn 21% phí tham gia sau 1 ngày cân nhắc`);

            const brkdAmt = Math.round((BRKD_PER_ACTIVATION * 21) / 100);
            await creditBrkdWallet(st.userId, brkdAmt, 'BRKD_CREDIT', `BRKD hoàn 21% sau 1 ngày cân nhắc`);
            dayCashbackCount++;
          }
        }
      }
    }
    if (dayCashbackCount > 0) {
      console.log(`  💸 Completed 21% Cashback for ${dayCashbackCount} members who completed 24h grace.`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const method = args[0]?.toUpperCase();

  if (method !== 'A' && method !== 'B') {
    console.error("❌ Invalid method! Please run: npx ts-node scripts/rebuild-system.ts <A|B>");
    process.exit(1);
  }

  console.log(`\n=================== REBUILD SYSTEM 4 ===================`);
  console.log(`Method selected: ${method}`);

  // 1. Cleanup old data
  await cleanup();

  // 2. Set Config in DB
  console.log(`⚙️ Writing configuration method ${method} to SystemConfig & SystemTree...`);
  await prisma.systemConfig.upsert({
    where: { key: 'brk_promotion_logic' },
    update: { value: method },
    create: { key: 'brk_promotion_logic', value: method }
  });

  const graceDays = method === 'A' ? 3 : 1;
  await prisma.systemTree.update({
    where: { onSystem: 4 },
    data: { graceDays }
  });

  // 3. Load enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, referrerId: true } },
      payment: { select: { transferTime: true, verifiedAt: true } },
    },
  });

  // Sắp xếp
  enrollments.sort((a, b) => {
    const ta = a.payment?.transferTime || a.payment?.verifiedAt || a.createdAt;
    const tb = b.payment?.transferTime || b.payment?.verifiedAt || b.createdAt;
    return ta.getTime() - tb.getTime();
  });

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } });
  const fee = Number(systemTree?.fee || 26868);

  // 4. Run calculations
  if (method === 'A') {
    await executeMethodA(enrollments, systemTree, fee);
  } else {
    await executeMethodB(enrollments, systemTree, fee);
  }

  // 5. Final report
  const total = await prisma.system.count({ where: { onSystem: 4 } });
  const levels = await prisma.brkLevelUpRecord.count({ where: { onSystem: 4 } });
  console.log(`\n=================== REBUILD COMPLETE ===================`);
  console.log(`System 4 active members: ${total}`);
  console.log(`Level promotion records created: ${levels}`);
  console.log(`Promotion logic saved: ${method} (${graceDays} day(s) grace period)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
