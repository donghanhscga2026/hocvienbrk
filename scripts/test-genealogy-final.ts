
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFinal() {
  console.log('--- ĐANG KIỂM TRA DỮ LIỆU NHÂN MẠCH CUỐI CÙNG (TRỰC TIẾP DB) ---');
  
  // 1. Lấy dữ liệu từ bảng tca_member bao gồm chuc_danh
  const tcaMembers: any[] = await prisma.$queryRawUnsafe(`
    SELECT "userId", "name", "chuc_danh", "level", "personalScore", "totalScore"
    FROM "tca_member"
    WHERE "chuc_danh" IS NOT NULL AND "chuc_danh" != ''
  `);

  if (tcaMembers.length > 0) {
    console.log(`\n✅ Tìm thấy ${tcaMembers.length} thành viên có chức danh đặc biệt.`);
    
    console.table(tcaMembers.map(m => ({
        'Họ Tên': m.name,
        'Chức Danh': m.chuc_danh,
        'Cấp': m.level,
        'Màu sắc UI sẽ hiển thị': m.chuc_danh === 'C5' ? 'DA CAM (bg-orange-400)' : 
                                  m.chuc_danh === 'C20' ? 'VÀNG NHẠT (bg-yellow-100)' : 
                                  m.chuc_danh === 'DHTT' ? 'HỒNG (bg-pink-300)' : 'TRẮNG'
    })));

    // 2. Kiểm tra sự hiện diện của trường này trong model TCAMember của Prisma
    console.log('\n--- Kiểm tra mapping Prisma ---');
    try {
        const testPrisma = await (prisma.tCAMember as any).findFirst({
            where: { chuc_danh: { not: null } },
            select: { userId: true, name: true, chuc_danh: true }
        });
        if (testPrisma) {
            console.log('✅ Prisma Client đã nhận diện được trường chuc_danh!');
            console.log('Dữ liệu lấy qua Prisma:', testPrisma);
        }
    } catch (e: any) {
        console.error('❌ Prisma Client chưa nhận diện được trường chuc_danh:', e.message);
    }

  } else {
    console.log('⚠ Không có thành viên nào có chức danh đặc biệt trong DB.');
  }
}

testFinal()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
