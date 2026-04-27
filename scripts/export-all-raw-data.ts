
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportAllRawData() {
  const systemId = 1; // Hệ thống TCA
  
  console.log('Đang truy xuất dữ liệu từ Database...');

  // 1. Lấy toàn bộ Membership (Bảng System)
  const membership = await prisma.system.findMany({
    where: { onSystem: systemId },
  });

  // 2. Lấy toàn bộ Quan hệ thứ bậc (Bảng SystemClosure)
  const relationships = await prisma.systemClosure.findMany({
    where: { systemId },
  });

  // 3. Lấy toàn bộ Dữ liệu kinh doanh (Bảng TCAMember)
  const userIds = membership.map(m => m.userId);
  const businessData = await (prisma as any).tCAMember.findMany({
    where: { 
        OR: [
            { userId: { in: userIds } },
            { tcaId: { in: userIds } }
        ]
    },
  });

  // Đóng gói dữ liệu
  const fullData = {
    metadata: {
        exportedAt: new Date().toLocaleString('vi-VN'),
        systemName: 'TCA',
        systemId: systemId,
        totalMembers: membership.length,
        totalClosures: relationships.length,
        totalTcaRecords: businessData.length
    },
    membership,
    relationships,
    businessData: businessData.map((d: any) => ({
        ...d,
        personalScore: d.personalScore ? Number(d.personalScore) : 0,
        totalScore: d.totalScore ? Number(d.totalScore) : 0
    }))
  };

  // Tạo thư mục plan_temp nếu chưa có
  const dir = path.join(process.cwd(), 'plan_temp');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const filePath = path.join(dir, 'tca_full_raw_data.json');
  fs.writeFileSync(filePath, JSON.stringify(fullData, null, 2), 'utf-8');

  console.log('\n--- XUẤT DỮ LIỆU THÀNH CÔNG ---');
  console.log(`Đường dẫn file: ${filePath}`);
  console.log(`- Số lượng TV hệ thống: ${membership.length}`);
  console.log(`- Số lượng quan hệ thứ bậc: ${relationships.length}`);
  console.log(`- Số lượng bản ghi kinh doanh: ${businessData.length}`);
}

exportAllRawData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
