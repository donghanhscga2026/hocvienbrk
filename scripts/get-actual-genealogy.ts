
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getFullData() {
  const systemId = 1; // Hệ thống TCA
  console.log(`--- TOÀN BỘ DỮ LIỆU HỆ THỐNG TCA (ID: ${systemId}) ---`);

  // 1. Lấy tất cả các bản ghi trong hệ thống TCA
  const systemRecords = await prisma.system.findMany({
    where: { onSystem: systemId },
    include: { 
      user: { 
        select: { id: true, name: true, email: true, phone: true, role: true } 
      } 
    }
  });

  // 2. Thu thập dữ liệu chi tiết cho từng thành viên
  const fullData = await Promise.all(systemRecords.map(async (rec) => {
    // Lấy thông tin từ bảng TCAMember (nếu có)
    const tca = await (prisma as any).tCAMember.findFirst({
      where: { userId: rec.userId }
    });

    // Tính toán số lượng thành viên bên dưới (từ Closure Table)
    const subCount = await prisma.systemClosure.count({
      where: { systemId, ancestorId: rec.autoId, depth: { gt: 0 } }
    });

    // Xác định quan hệ cha-con (Ai là người bảo trợ trực tiếp trong hệ thống này)
    const parent = rec.refSysId !== 0 ? await prisma.user.findUnique({
      where: { id: rec.refSysId },
      select: { name: true }
    }) : { name: 'ROOT' };

    return {
      ID: rec.userId,
      AutoID: rec.autoId, // ID định danh trong bảng System
      Name: rec.user?.name || 'N/A',
      ParentID: rec.refSysId, // ID của người cấp trên
      ParentName: parent?.name || 'N/A',
      Level: tca?.level || 0,
      P_Score: Number(tca?.personalScore || 0).toFixed(2), // Điểm cá nhân
      T_Score: Number(tca?.totalScore || 0).toFixed(2),   // Điểm đội nhóm
      Group: tca?.groupName || 'Chưa Active',
      Subs: subCount, // Tổng số người dưới quyền
      Email: rec.user?.email || 'N/A'
    };
  }));

  // Sắp xếp theo ID để dễ theo dõi
  fullData.sort((a, b) => a.ID - b.ID);

  console.table(fullData);
  
  console.log(`\nTổng cộng: ${fullData.length} thành viên.`);
}

getFullData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
