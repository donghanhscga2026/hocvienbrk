
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showRawIngredients() {
  const systemId = 1; // TCA
  console.log('=== BẢNG 1: THÀNH VIÊN HỆ THỐNG (Bảng System) ===');
  const systemMembers = await prisma.system.findMany({
    where: { onSystem: systemId },
    select: { autoId: true, userId: true, refSysId: true }
  });
  console.table(systemMembers);

  console.log('\n=== BẢNG 2: QUAN HỆ THỨ BẬC (Bảng SystemClosure - Top 20) ===');
  const closures = await prisma.systemClosure.findMany({
    where: { systemId },
    take: 20,
    select: { ancestorId: true, descendantId: true, depth: true }
  });
  console.table(closures);

  console.log('\n=== BẢNG 3: DỮ LIỆU KINH DOANH (Bảng TCAMember) ===');
  const userIds = systemMembers.map(m => m.userId);
  const tcaData = await (prisma as any).tCAMember.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, level: true, personalScore: true, totalScore: true, groupName: true }
  });
  console.table(tcaData.map((d: any) => ({
    ...d,
    personalScore: Number(d.personalScore).toFixed(2),
    totalScore: Number(d.totalScore).toFixed(2)
  })));
}

showRawIngredients()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
