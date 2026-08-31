
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDbStructure() {
  console.log('--- KIỂM TRA CẤU TRÚC BẢNG TRỰC TIẾP TỪ DB ---');
  
  const tablesToTry = ['TCAMember', 'tca_member', 'tcaMember'];
  
  for (const tableName of tablesToTry) {
    try {
      console.log(`\nĐang thử bảng: "${tableName}"...`);
      
      // 1. Kiểm tra danh sách cột
      const columns: any = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
      `);
      
      if (columns.length > 0) {
        console.log(`Đã tìm thấy bảng "${tableName}"!`);
        console.table(columns);

        // 2. Kiểm tra dữ liệu mẫu của trường chuc_danh
        // Lưu ý: Dùng dấu ngoặc kép cho tên bảng và cột để tránh lỗi case-sensitive
        const sampleData: any = await prisma.$queryRawUnsafe(`
          SELECT "userId", "name", "chuc_danh" 
          FROM "${tableName}" 
          WHERE "chuc_danh" IS NOT NULL AND "chuc_danh" != ''
          LIMIT 10
        `);

        console.log('\n2. DỮ LIỆU MẪU CÓ CHỨC DANH:');
        console.table(sampleData);
        return; // Dừng lại khi đã tìm thấy
      } else {
        console.log(`Bảng "${tableName}" không tồn tại hoặc không có cột.`);
      }
    } catch (error: any) {
      console.log(`Lỗi khi thử bảng "${tableName}":`, error.message);
    }
  }
}

verifyDbStructure()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
