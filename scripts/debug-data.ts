import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const users = [150, 129];
  for (const id of users) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        referrals: {
          select: {
            id: true,
            referrals: {
              select: { id: true },
              take: 5
            }
          }
        }
      }
    });

    console.log(`\n--- USER ID: ${id} (${user?.name}) ---`);
    console.log(`Số lượng F1 (F2 của Gốc): ${user?.referrals.length}`);
    
    let totalF3 = 0;
    user?.referrals.forEach(f1 => {
      totalF3 += f1.referrals.length;
    });
    
    console.log(`Số lượng F2 (F3 của Gốc) tìm thấy: ${totalF3}`);
    
    if (totalF3 > 0) {
      console.log(`=> KẾT LUẬN: Đủ điều kiện NHÁNH SÂU (Dấu Đỏ)`);
    } else {
      console.log(`=> KẾT LUẬN: Chỉ dừng ở NHÁNH CẠN (Dấu Xanh dương)`);
    }
  }
}

check().finally(() => prisma.$disconnect());
