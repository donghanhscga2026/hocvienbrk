import prisma from "../lib/prisma";

async function checkUnprocessedBounces() {
  console.log("=".repeat(60));
  console.log("TÌM EMAILS CÓ THỂ LÀ BOUNCE NHƯNG CHƯA XỬ LÝ");
  console.log("=".repeat(60) + "\n");

  // 1. Users có emailVerified = null (chưa verify) nhưng chưa trong blacklist
  console.log("📊 Users chưa verify email và CHƯA trong blacklist:");
  const unverifiedUsers = await prisma.user.findMany({
    where: {
      emailVerified: null,
      email: { contains: "@" }
    },
    select: { id: true, email: true, emailVerified: true }
  });

  console.log(`  Tổng users chưa verify: ${unverifiedUsers.length}`);

  let notBlacklisted = 0;
  const notBlacklistedEmails: string[] = [];

  for (const user of unverifiedUsers.slice(0, 30)) {
    const blacklist = await prisma.emailBlacklist.findUnique({
      where: { email: user.email.toLowerCase() }
    });
    
    if (!blacklist) {
      notBlacklisted++;
      notBlacklistedEmails.push(user.email);
      console.log(`  ⚠️ ${user.email} (ID: ${user.id})`);
    }
  }

  console.log(`\n  Tổng users CHƯA verify và CHƯA trong blacklist: ${notBlacklisted}`);

  // 2. Logs có status FAILED (không phải BOUNCED)
  console.log("\n" + "-".repeat(50));
  console.log("📊 Campaign Logs với status FAILED (30 ngày):");
  
  const failedLogs = await prisma.emailCampaignLog.findMany({
    where: {
      status: "FAILED",
      sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    select: { toEmail: true, errorCode: true, sentAt: true },
    take: 50
  });

  console.log(`  Tổng FAILED logs (30 ngày): ${failedLogs.length}`);
  
  if (failedLogs.length > 0) {
    console.log("\n  Chi tiết FAILED logs:");
    failedLogs.slice(0, 10).forEach((log, i) => {
      console.log(`    ${i + 1}. ${log.toEmail}`);
      console.log(`       Error: ${log.errorCode || 'N/A'}`);
      console.log(`       Time: ${log.sentAt.toLocaleString()}`);
    });
  }

  // 3. Kiểm tra tất cả users có email
  console.log("\n" + "-".repeat(50));
  console.log("📊 Tổng quan database:");
  
  const totalUsers = await prisma.user.count();
  const verifiedUsers = await prisma.user.count({ where: { emailVerified: { not: null } } });
  const unverifiedUsersCount = await prisma.user.count({ where: { emailVerified: null, email: { contains: "@" } } });
  const blacklistedCount = await prisma.emailBlacklist.count();
  const sentLogsCount = await prisma.emailCampaignLog.count({ where: { status: "SENT" } });
  const bouncedLogsCount = await prisma.emailCampaignLog.count({ where: { status: "BOUNCED" } });
  const failedLogsCount = await prisma.emailCampaignLog.count({ where: { status: "FAILED" } });

  console.log(`  - Tổng users: ${totalUsers}`);
  console.log(`  - Users đã verify email: ${verifiedUsers}`);
  console.log(`  - Users CHƯA verify email: ${unverifiedUsersCount}`);
  console.log(`  - Emails trong blacklist: ${blacklistedCount}`);
  console.log(`  - Campaign logs SENT: ${sentLogsCount}`);
  console.log(`  - Campaign logs BOUNCED: ${bouncedLogsCount}`);
  console.log(`  - Campaign logs FAILED: ${failedLogsCount}`);

  // 4. Các email đáng ngờ (có thể là test emails hoặc invalid)
  console.log("\n" + "-".repeat(50));
  console.log("📊 Emails có dạng test/invalid (mẫu):");
  
  const suspiciousEmails = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "noemail" } },
        { email: { contains: "test" } },
        { email: { contains: "example" } },
      ]
    },
    select: { email: true, emailVerified: true }
  });

  console.log(`  Tìm thấy ${suspiciousEmails.length} emails đáng ngờ`);
  suspiciousEmails.slice(0, 10).forEach(u => {
    const status = u.emailVerified ? '✅' : '❌';
    console.log(`    ${status} ${u.email}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("💡 GỢI Ý:");
  console.log("=".repeat(60));
  
  if (unverifiedUsersCount > blacklistedCount) {
    console.log(`\n  Có ${unverifiedUsersCount - blacklistedCount} users chưa verify`);
    console.log("  và chưa có trong blacklist. Có thể cần xem xét.");
  }
  
  console.log("\n  Nếu muốn quét tất cả bounces không giới hạn thời gian,");
  console.log("  cần thay đổi query từ 15 ngày sang toàn bộ dữ liệu.");

  await prisma.$disconnect();
}

checkUnprocessedBounces().catch(console.error);
