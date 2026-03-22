import prisma from "../lib/prisma";
import { getOAuth2Client } from "../lib/google-auth";
import { decrypt } from "../lib/email-encryptor";
import { google } from "googleapis";

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
}

type BounceType = 'HARD_BOUNCE' | 'SOFT_BOUNCE';

interface BouncePattern {
  pattern: RegExp;
  type: BounceType;
  reason: string;
}

const BOUNCE_PATTERNS: BouncePattern[] = [
  { pattern: /user unknown|user not found|no such user|invalid recipient|recipient rejected/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /does not exist|doesn't exist|not exist/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /550 5\.1\.1|5\.1\.1 bounce|address not found/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /mailbox.*not found|not listed in directory/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /bad-mailbox|bad destination|unrouteable address/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /mailbox full|quota exceeded|storage full|user over quota/i, type: 'SOFT_BOUNCE', reason: 'Hộp thư đầy' },
  { pattern: /temporary failure|temporary error|try again later|retry timeout/i, type: 'SOFT_BOUNCE', reason: 'Lỗi tạm thời' },
  { pattern: /service unavailable|server too busy|deferred|delay/i, type: 'SOFT_BOUNCE', reason: 'Server bận, thử lại sau' },
  { pattern: /rate limit|too many requests|excessive recipients/i, type: 'SOFT_BOUNCE', reason: 'Vượt giới hạn gửi' },
  { pattern: /greylisted|grey list|please try again/i, type: 'SOFT_BOUNCE', reason: 'Bị greylist, thử lại sau' },
  { pattern: /dns failure|dns error|nameserver|domain not found/i, type: 'SOFT_BOUNCE', reason: 'Lỗi DNS tạm thời' },
];

function detectBounceType(content: string, subject: string): BounceType | null {
  const text = `${subject} ${content}`.toLowerCase();
  for (const bp of BOUNCE_PATTERNS) {
    if (bp.pattern.test(text)) return bp.type;
  }
  if (/bounced|undeliverable|delivery failed|mailer-daemon/i.test(subject)) {
    return 'HARD_BOUNCE';
  }
  return null;
}

function getBounceReason(content: string, subject: string): string {
  const text = `${subject} ${content}`.toLowerCase();
  for (const bp of BOUNCE_PATTERNS) {
    if (bp.pattern.test(text)) return bp.reason;
  }
  return 'Lỗi không xác định';
}

async function testNewBounceLogic() {
  console.log("=".repeat(60));
  console.log("TEST BOUNCE SCAN VỚI LOẠI BOUNCE MỚI");
  console.log("=".repeat(60) + "\n");

  const allSenders = await prisma.emailSender.findMany({
    where: { isActive: true },
    select: {
      email: true,
      refreshToken: true,
      clientId: true,
      clientSecret: true,
    },
    orderBy: { email: 'asc' }
  });

  const recentSentLogs = await prisma.emailCampaignLog.findMany({
    where: {
      status: "SENT",
      sentAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    select: { toEmail: true }
  });

  const sentSet = new Set(recentSentLogs.map(l => l.toEmail.toLowerCase().trim()));
  console.log(`📤 Emails đã gửi (30 ngày): ${sentSet.size}\n`);

  const totalResults = {
    scanned: 0,
    hardBounced: 0,
    softBounced: 0,
    noMatch: 0,
  };

  for (const sender of allSenders) {
    console.log(`\n📬 ${sender.email}`);
    console.log("-".repeat(50));

    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: decrypt(sender.refreshToken) });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const response = await gmail.users.messages.list({
        userId: sender.email,
        q: 'from:mailer-daemon OR subject:bounced OR subject:delivery failed OR subject:undeliverable newer_than:30d',
        maxResults: 300
      });

      const messages = response.data.messages || [];
      console.log(`  Tổng bounce emails: ${messages.length}`);

      let senderHard = 0, senderSoft = 0, senderNoMatch = 0;
      const foundBounces: { email: string; type: BounceType; reason: string }[] = [];

      for (const msg of messages) {
        const message = await gmail.users.messages.get({
          userId: sender.email,
          id: msg.id!,
          format: 'full'
        });

        const payload = message.data.payload;
        const headers = payload?.headers || [];
        const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
        const bounceType = detectBounceType('', subject);

        if (!bounceType) {
          senderNoMatch++;
          continue;
        }

        const extractText = (p: any): string => {
          let text = "";
          if (p.body?.data) {
            try {
              const base64 = p.body.data.replace(/-/g, '+').replace(/_/g, '/');
              const rawText = Buffer.from(base64, 'base64').toString('utf-8');
              text += decodeQuotedPrintable(rawText) + " ";
            } catch {}
          }
          if (p.parts) {
            for (const part of p.parts) {
              text += extractText(part) + " ";
            }
          }
          return text;
        };

        const content = extractText(payload);
        const reason = getBounceReason(content, subject);
        const allEmails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const uniqueEmails = [...new Set(allEmails.map(e => e.toLowerCase().trim()))];

        for (const email of uniqueEmails) {
          if (email.includes(sender.email) || email.includes('mailer-daemon') || 
              email.includes('postmaster') || email.includes('@googlemail.com')) continue;

          if (sentSet.has(email)) {
            foundBounces.push({ email, type: bounceType, reason });
            
            if (bounceType === 'HARD_BOUNCE') senderHard++;
            else senderSoft++;
          }
        }
      }

      console.log(`  🔴 HARD BOUNCE: ${senderHard}`);
      console.log(`  🟡 SOFT BOUNCE: ${senderSoft}`);
      console.log(`  ⚪ Không xác định: ${senderNoMatch}`);

      if (foundBounces.length > 0) {
        console.log(`\n  📋 Chi tiết bounces:`);
        foundBounces.slice(0, 10).forEach((b, i) => {
          console.log(`     ${i + 1}. ${b.email}`);
          console.log(`        ${b.type === 'HARD_BOUNCE' ? '🔴' : '🟡'} ${b.reason}`);
        });
        if (foundBounces.length > 10) {
          console.log(`     ... và ${foundBounces.length - 10} bounces khác`);
        }
      }

      totalResults.scanned += messages.length;
      totalResults.hardBounced += senderHard;
      totalResults.softBounced += senderSoft;
      totalResults.noMatch += senderNoMatch;

    } catch (err: any) {
      console.log(`  ❌ Lỗi: ${err.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 TỔNG HỢP:");
  console.log("=".repeat(60));
  console.log(`  Tổng bounce emails: ${totalResults.scanned}`);
  console.log(`  🔴 HARD BOUNCE: ${totalResults.hardBounced}`);
  console.log(`  🟡 SOFT BOUNCE: ${totalResults.softBounced}`);
  console.log(`  ⚪ Không xác định: ${totalResults.noMatch}`);
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

testNewBounceLogic().catch(console.error);
