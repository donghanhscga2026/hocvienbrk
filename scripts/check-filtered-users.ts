import prisma from "../lib/prisma";

async function checkFilteredUsers() {
  console.log("=".repeat(60));
  console.log("KIỂM TRA USERS BỊ LOẠI KHỎI CHIẾN DỊCH");
  console.log("=".repeat(60) + "\n");

  // Tất cả users có email
  const totalUsers = await prisma.user.count({
    where: { email: { contains: "@" } }
  });

  // Users có email hợp lệ (emailVerified không null)
  const validUsers = await prisma.user.count({
    where: { 
      email: { contains: "@" },
      emailVerified: { not: null }
    }
  });

  // Users có email nhưng chưa verify (bị loại)
  const invalidUsers = await prisma.user.count({
    where: { 
      email: { contains: "@" },
      emailVerified: null
    }
  });

  console.log(`📊 TỔNG QUAN:`);
  console.log(`   - Tổng users có email: ${totalUsers}`);
  console.log(`   - Users HỢP LỆ (được gửi): ${validUsers}`);
  console.log(`   - Users KHÔNG HỢP LỆ (bị loại): ${invalidUsers}`);
  console.log(`   - Tỷ lệ loại: ${((invalidUsers / totalUsers) * 100).toFixed(1)}%`);

  // Chi tiết users không hợp lệ
  console.log("\n" + "-".repeat(50));
  console.log("\n📋 CHI TIẾT USERS BỊ LOẠI (mẫu 30):");
  
  const invalidUserList = await prisma.user.findMany({
    where: { 
      email: { contains: "@" },
      emailVerified: null
    },
    select: { id: true, email: true, name: true },
    take: 30
  });

  invalidUserList.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.email} ${u.name ? `(${u.name})` : ''}`);
  });

  // Kiểm tra blacklist
  console.log("\n" + "-".repeat(50));
  console.log("\n📋 TRONG BLACKLIST:");
  
  const blacklistCount = await prisma.emailBlacklist.count();
  const hardBounceCount = await prisma.emailBlacklist.count({
    where: { reason: "HARD_BOUNCE" }
  });
  
  console.log(`   - Tổng blacklist: ${blacklistCount}`);
  console.log(`   - HARD_BOUNCE: ${hardBounceCount}`);

  // Kiểm tra email ảo
  console.log("\n" + "-".repeat(50));
  console.log("\n📋 EMAIL ẢO (noemailxxx):");
  
  const noemailUsers = await prisma.user.findMany({
    where: { 
      email: { contains: "@" },
      emailVerified: null
    },
    select: { email: true },
    orderBy: { email: 'asc' },
    take: 100
  });
  
  const noemailFiltered = noemailUsers.filter(u => u.email.toLowerCase().startsWith('noemail'));
  
  console.log(`   - Tổng: ${noemailFiltered.length}`);
  if (noemailFiltered.length > 0) {
    console.log(`   - Mẫu: ${noemailFiltered.slice(0, 5).map(u => u.email).join(', ')}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("💡 KẾT LUẬN:");
  console.log("=".repeat(60));
  
  if (invalidUsers > 0) {
    console.log(`\n  ⚠️  Có ${invalidUsers} users sẽ bị loại khỏi chiến dịch`);
    console.log("  vì emailVerified = null (email không tồn tại hoặc bounce).");
  } else {
    console.log("\n  ✅ Tất cả users đều có email hợp lệ.");
  }

  await prisma.$disconnect();
}

checkFilteredUsers().catch(console.error);
