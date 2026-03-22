import prisma from "../lib/prisma";
import { getOAuth2Client } from "../lib/google-auth";
import { decrypt } from "../lib/email-encryptor";
import { google } from "googleapis";

async function testBounceScan() {
  console.log("=".repeat(60));
  console.log("TEST BOUNCE SCAN - KIỂM TRA VỆ TINH VÀ QUYỀN TRUY CẬP");
  console.log("=".repeat(60) + "\n");

  // 1. Lấy danh sách tất cả vệ tinh
  console.log("📋 DANH SÁCH VỆ TINH TRONG DATABASE:\n");
  const allSenders = await prisma.emailSender.findMany({
    select: {
      id: true,
      email: true,
      label: true,
      isMain: true,
      isActive: true,
      dailyLimit: true,
      sentToday: true,
      refreshToken: true,
      clientId: true,
      clientSecret: true,
    },
    orderBy: { isMain: 'desc' }
  });

  if (allSenders.length === 0) {
    console.log("❌ Không có vệ tinh nào trong database!");
    return;
  }

  allSenders.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.email} ${s.isMain ? '(CHÍNH)' : ''}`);
    console.log(`     - Label: ${s.label}`);
    console.log(`     - Active: ${s.isActive ? '✅' : '❌'}`);
    console.log(`     - Hôm nay đã gửi: ${s.sentToday}/${s.dailyLimit}`);
    console.log("");
  });

  console.log("-".repeat(60));
  console.log("\n🔍 KIỂM TRA QUYỀN TRUY CẬP TỪNG VỆ TINH:\n");

  const results: {
    email: string;
    accessible: boolean;
    error?: string;
    bounceEmails?: number;
    sampleSubjects?: string[];
  }[] = [];

  for (const sender of allSenders) {
    const result: typeof results[0] = { email: sender.email, accessible: false };
    
    try {
      console.log(`  🔄 Testing: ${sender.email}`);
      
      const oauth2Client = getOAuth2Client();
      const clientId = sender.clientId || process.env.GMAIL_CLIENT_ID;
      const clientSecret = sender.clientSecret || process.env.GMAIL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        result.error = "Missing OAuth credentials";
        console.log(`     ❌ ${result.error}`);
        results.push(result);
        continue;
      }

      oauth2Client.setCredentials({
        refresh_token: decrypt(sender.refreshToken)
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Test 1: Lấy profile
      try {
        await gmail.users.getProfile({ userId: sender.email });
        result.accessible = true;
        console.log(`     ✅ Có thể truy cập inbox`);
      } catch (profileErr: any) {
        result.error = `Không truy cập được: ${profileErr.message}`;
        console.log(`     ❌ ${result.error}`);
        results.push(result);
        continue;
      }

      // Test 2: Tìm bounce emails với nhiều query
      const searchQueries = [
        'from:mailer-daemon newer_than:15d',
        'subject:bounced newer_than:15d',
        'subject:delivery failed newer_than:15d',
        'subject:undeliverable newer_than:15d',
      ];

      let totalBounceEmails = 0;
      const allSubjects: string[] = [];
      const allMessageIds = new Set<string>();

      for (const query of searchQueries) {
        try {
          const response = await gmail.users.messages.list({
            userId: sender.email,
            q: query,
            maxResults: 100
          });
          
          const messages = response.data.messages || [];
          messages.forEach(m => m.id && allMessageIds.add(m.id));
          totalBounceEmails += messages.length;

          // Lấy subject từ vài message đầu
          if (messages.length > 0 && allSubjects.length < 10) {
            for (const msg of messages.slice(0, 3)) {
              try {
                const msgDetail = await gmail.users.messages.get({
                  userId: sender.email,
                  id: msg.id!,
                  format: 'metadata',
                  metadataHeaders: ['Subject', 'From']
                });
                const subject = msgDetail.data.payload?.headers?.find(
                  (h: any) => h.name?.toLowerCase() === 'subject'
                )?.value;
                if (subject && !allSubjects.includes(subject)) {
                  allSubjects.push(subject);
                }
              } catch {}
            }
          }
        } catch (queryErr: any) {
          console.log(`     ⚠️ Query lỗi: ${queryErr.message}`);
        }
      }

      result.bounceEmails = allMessageIds.size;
      result.sampleSubjects = allSubjects;

      console.log(`     📧 Tìm thấy: ${allMessageIds.size} bounce emails`);
      if (allSubjects.length > 0) {
        console.log(`     📋 Subjects mẫu:`);
        allSubjects.slice(0, 5).forEach(s => console.log(`        - ${s}`));
      }
      console.log("");

    } catch (err: any) {
      result.error = err.message;
      console.log(`     ❌ Lỗi: ${err.message}\n`);
    }

    results.push(result);
  }

  // Tổng hợp
  console.log("-".repeat(60));
  console.log("\n📊 TỔNG HỢP:\n");
  
  const accessible = results.filter(r => r.accessible);
  const notAccessible = results.filter(r => !r.accessible);
  const totalBounces = results.reduce((sum, r) => sum + (r.bounceEmails || 0), 0);

  console.log(`  Tổng vệ tinh: ${results.length}`);
  console.log(`  ✅ Có thể truy cập: ${accessible.length}`);
  console.log(`  ❌ Không thể truy cập: ${notAccessible.length}`);
  console.log(`  📧 Tổng bounce emails tìm thấy: ${totalBounces}`);

  if (notAccessible.length > 0) {
    console.log("\n⚠️  VỆ TINH CẦN CẤP QUYỀN:");
    notAccessible.forEach(r => {
      console.log(`  - ${r.email}: ${r.error}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  
  await prisma.$disconnect();
}

testBounceScan().catch(console.error);
