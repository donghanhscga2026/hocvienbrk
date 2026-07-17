import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { activateBrkMember, processGracePeriodExpirations } from './activation-service';
import { processRevenueShareForSystem } from './revenue-share-service';

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

async function executeMethodA(
  enrollments: any[],
  systemTree: any,
  fee: number,
  savedPlacements: Map<number, number>
) {
  const now = new Date();
  for (const enrollment of enrollments) {
    const userId = enrollment.userId;
    const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt;
    
    const forcedRefSysId = savedPlacements.get(userId) ?? 0;

    // Gọi code live của activation-service để kích hoạt và ép cứng cây bảo trợ gốc
    await activateBrkMember(userId, 4, undefined, activatedAt, forcedRefSysId);
  }

  const latestEval = getCurrentEvalTime();
  await processGracePeriodExpirations(latestEval);

  await processRevenueShareForSystem(
    4,
    getCurrentEvalTime()
  );
}

async function executeMethodB(
  enrollments: any[],
  systemTree: any,
  fee: number,
  savedPlacements: Map<number, number>
) {
  const enrollByDay: Map<string, any[]> = new Map();
  for (const e of enrollments) {
    const activatedAt = e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt;
    const dayStr = activatedAt.toLocaleDateString('vi-VN');
    if (!enrollByDay.has(dayStr)) enrollByDay.set(dayStr, []);
    enrollByDay.get(dayStr)!.push(e);
  }

  const sortedDays = Array.from(enrollByDay.keys());
  const now = new Date();
  let daysProcessed = 0;

  for (const day of sortedDays) {
    const dayEnrollments = enrollByDay.get(day)!;
    const [d, m, y] = day.split('/');

    for (const enrollment of dayEnrollments) {
      const userId = enrollment.userId;
      const activatedAt = enrollment.payment?.transferTime || enrollment.payment?.verifiedAt || enrollment.createdAt;

      const forcedRefSysId = savedPlacements.get(userId) ?? 0;

      // Gọi trực tiếp code live để kích hoạt ở trạng thái cân nhắc, bảo toàn 100% cây bảo trợ gốc
      await activateBrkMember(userId, 4, undefined, activatedAt, forcedRefSysId);
    }

    const evalTime = getEvalTime(Number(y), Number(m) - 1, Number(d) + 1);
    if (evalTime > now) break;

    // Chạy confirm cho toàn bộ những người hết hạn grace period tính đến thời điểm evalTime
    await processGracePeriodExpirations(evalTime);

    daysProcessed++;
    if (daysProcessed % 3 === 0) {
      await processRevenueShareForSystem(4, getEvalTime(Number(y), Number(m) - 1, Number(d) + 1));
    }
  }

  // Gọi confirm cho toàn bộ những người hết hạn grace period còn lại tính đến thời điểm hiện tại
  await processGracePeriodExpirations(now);
}

export async function rebuildSystem4Data(method: 'A' | 'B') {
  // 1. Lưu trữ cấu trúc cây bảo trợ (refSysId) hiện tại từ DB thực tế trước khi dọn dẹp
  const currentSystems = await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { userId: true, refSysId: true }
  });
  const savedPlacements = new Map(currentSystems.map(s => [s.userId, s.refSysId]));

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
    await executeMethodA(enrollments, systemTree, fee, savedPlacements);
  } else {
    await executeMethodB(enrollments, systemTree, fee, savedPlacements);
  }
}