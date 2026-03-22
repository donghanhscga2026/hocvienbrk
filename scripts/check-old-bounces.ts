import prisma from "../lib/prisma";

async function checkOldBounces() {
  console.log("=".repeat(60));
  console.log("KIỂM TRA BOUNCES TRƯỚC 15 NGÀY");
  console.log("=".repeat(60) + "\n");

  // Lấy tất cả BOUNCED logs sắp xếp theo thời gian
  const allBouncedLogs = await prisma.emailCampaignLog.findMany({
    where: { status: "BOUNCED" },
    orderBy: { sentAt: 'desc' },
    select: { toEmail: true, sentAt: true, errorCode: true, campaignId: true }
  });

  console.log(`📊 Tổng BOUNCED logs: ${allBouncedLogs.length}`);
  console.log(`   - Mới nhất: ${allBouncedLogs[0]?.sentAt.toLocaleDateString()}`);
  console.log(`   - Cũ nhất: ${allBouncedLogs[allBouncedLogs.length - 1]?.sentAt.toLocaleDateString()}`);

  // Phân chia theo thời gian
  const now = new Date();
  const days15 = 15 * 24 * 60 * 60 * 1000;
  const days30 = 30 * 24 * 60 * 60 * 1000;
  const days60 = 60 * 24 * 60 * 60 * 1000;

  const last15Days = allBouncedLogs.filter(l => (now.getTime() - l.sentAt.getTime()) <= days15);
  const last30Days = allBouncedLogs.filter(l => (now.getTime() - l.sentAt.getTime()) <= days30);
  const last60Days = allBouncedLogs.filter(l => (now.getTime() - l.sentAt.getTime()) <= days60);

  console.log(`\n📅 Phân bố theo thời gian:`);
  console.log(`   - Trong 15 ngày: ${last15Days.length}`);
  console.log(`   - Trong 30 ngày: ${last30Days.length}`);
  console.log(`   - Trong 60 ngày: ${last60Days.length}`);
  console.log(`   - Trước 60 ngày: ${allBouncedLogs.length - last60Days.length}`);

  // Tất cả SENT logs
  const allSentLogs = await prisma.emailCampaignLog.findMany({
    where: { status: "SENT" },
    orderBy: { sentAt: 'desc' },
    select: { toEmail: true, sentAt: true, campaignId: true }
  });

  const sentLast15 = allSentLogs.filter(l => (now.getTime() - l.sentAt.getTime()) <= days15);
  const sentLast30 = allSentLogs.filter(l => (now.getTime() - l.sentAt.getTime()) <= days30);
  const sentLast60 = allSentLogs.filter(l => (now.getTime() - l.sentAt.getTime()) <= days60);

  console.log(`\n📤 SENT logs:`);
  console.log(`   - Tổng: ${allSentLogs.length}`);
  console.log(`   - Trong 15 ngày: ${sentLast15.length}`);
  console.log(`   - Trong 30 ngày: ${sentLast30.length}`);
  console.log(`   - Trong 60 ngày: ${sentLast60.length}`);

  // Tính tỷ lệ bounce
  console.log(`\n📈 Tỷ lệ bounce:`);
  console.log(`   - 15 ngày: ${sentLast15.length > 0 ? ((last15Days.length / sentLast15.length) * 100).toFixed(2) : 0}%`);
  console.log(`   - 30 ngày: ${sentLast30.length > 0 ? ((last30Days.length / sentLast30.length) * 100).toFixed(2) : 0}%`);
  console.log(`   - 60 ngày: ${sentLast60.length > 0 ? ((last60Days.length / sentLast60.length) * 100).toFixed(2) : 0}%`);

  // Kiểm tra xem có BOUNCED nào từ SENT > 15 ngày không
  console.log("\n" + "-".repeat(50));
  console.log("📋 BOUNCED logs mà SENT ban đầu > 15 ngày:");
  
  const sentSet = new Set(allSentLogs.map(l => l.toEmail.toLowerCase()));
  
  let oldSentBounced = 0;
  const samples: { email: string; sentDate: Date; bouncedDate: Date }[] = [];
  
  for (const bounced of allBouncedLogs) {
    const sentLog = allSentLogs.find(s => 
      s.toEmail.toLowerCase() === bounced.toEmail.toLowerCase() && 
      s.campaignId === bounced.campaignId
    );
    
    if (sentLog && (now.getTime() - sentLog.sentAt.getTime()) > days15) {
      oldSentBounced++;
      if (samples.length < 10) {
        samples.push({
          email: bounced.toEmail,
          sentDate: sentLog.sentAt,
          bouncedDate: bounced.sentAt
        });
      }
    }
  }

  console.log(`  Tổng: ${oldSentBounced}`);
  if (samples.length > 0) {
    console.log("\n  Mẫu (10 bản ghi đầu):");
    samples.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.email}`);
      console.log(`       Sent: ${s.sentDate.toLocaleDateString()} → Bounced: ${s.bouncedDate.toLocaleDateString()}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("💡 KẾT LUẬN:");
  console.log("=".repeat(60));
  
  if (oldSentBounced > 0) {
    console.log(`\n  ⚠️  Có ${oldSentBounced} bounces xảy ra sau 15 ngày kể từ khi gửi.`);
    console.log("  Nên tăng thời gian quét lên 30-60 ngày.");
  } else {
    console.log("\n  ✅ Không có bounces xảy ra sau 15 ngày.");
    console.log("  Hệ thống đang hoạt động tốt.");
  }

  await prisma.$disconnect();
}

checkOldBounces().catch(console.error);
