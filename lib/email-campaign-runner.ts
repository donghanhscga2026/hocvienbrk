import prisma from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-auth";
import { decrypt } from "@/lib/email-encryptor";
import { spinContent } from "@/lib/email-spin";
import { google } from "googleapis";
import { getEmailConfig, randomBetween, getEffectiveDailyLimit } from "@/lib/email-config";
import { sendEmailCampaignNotification } from "@/lib/notifications";

export interface Recipient {
  email: string;
  name?: string;
  userId?: number;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RANDOM MESSAGE FOOTER - Lấy ngẫu nhiên từ bảng Message để chèn vào email
 * ═══════════════════════════════════════════════════════════════════════════════
 */

let cachedMessages: { content: string }[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getRandomMessageFooter(): Promise<string> {
  const now = Date.now();

  if (!cachedMessages || now - lastCacheTime > CACHE_TTL) {
    const messages = await prisma.message.findMany({
      where: { isActive: true },
      select: { content: true },
    });
    cachedMessages = messages;
    lastCacheTime = now;
  }

  if (cachedMessages.length === 0) {
    return "";
  }

  const randomIndex = Math.floor(Math.random() * cachedMessages.length);
  const rawContent = cachedMessages[randomIndex].content;
  const content = spinContent(rawContent);

  return `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 12px; font-style: italic; margin: 0;">
      — ${content}
    </p>
  </div>`;
}

export function injectFooter(html: string, footer: string): string {
  const bodyCloseIndex = html.lastIndexOf('</body>');
  if (bodyCloseIndex !== -1) {
    return html.slice(0, bodyCloseIndex) + footer + html.slice(bodyCloseIndex);
  }
  return html + footer;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SMART SENDER SELECTION - Chọn satellite với cooldown thông minh
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export async function getAvailableSender(campaignId?: number): Promise<{
  id: number;
  email: string;
  refreshToken: string;
  clientId: string | null;
  clientSecret: string | null;
  isActive: boolean;
  dailyLimit: number;
  sentToday: number;
  staggerDelayMin: number;
  staggerDelayMax: number;
  maxPerBatch: number;
  cooldownUntil: Date | null;
  createdAt: Date;
} | null> {
  const now = new Date();

  const availableSenders = await prisma.emailSender.findMany({
    where: {
      isActive: true,
      OR: [
        { cooldownUntil: null },
        { cooldownUntil: { lt: now } }
      ]
    },
    orderBy: [
      { cooldownUntil: 'asc' },
      { sentToday: 'asc' }
    ],
  });

  if (availableSenders.length === 0) {
    return null;
  }

  const sendersWithQuota = availableSenders.filter(sender => {
    const effectiveLimit = getEffectiveDailyLimit({
      createdAt: sender.createdAt,
      dailyLimit: sender.dailyLimit,
      warmupPhase: sender.warmupPhase
    });
    return sender.sentToday < effectiveLimit;
  });

  if (sendersWithQuota.length === 0) {
    return null;
  }

  const weights = sendersWithQuota.map(sender => {
    const effectiveLimit = getEffectiveDailyLimit({
      createdAt: sender.createdAt,
      dailyLimit: sender.dailyLimit,
      warmupPhase: sender.warmupPhase
    });
    return effectiveLimit - sender.sentToday;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < sendersWithQuota.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return sendersWithQuota[i] as any;
    }
  }

  return sendersWithQuota[0] as any;
}

export async function updateSenderCooldown(senderId: number, minutes: number): Promise<void> {
  const cooldownUntil = new Date(Date.now() + minutes * 60 * 1000);

  await prisma.emailSender.update({
    where: { id: senderId },
    data: {
      cooldownUntil,
      lastUsedAt: new Date()
    }
  });
}

export async function incrementSenderSentCount(senderId: number): Promise<void> {
  await prisma.emailSender.update({
    where: { id: senderId },
    data: {
      sentToday: { increment: 1 }
    }
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BATCH CONTROL - Kiểm tra và xử lý pause/cooldown
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface BatchStatus {
  shouldPause: boolean;
  emailsInBatch: number;
  nextPauseAt: number;
  pauseDuration: number;
  nextResumeTime: string;
}

export async function checkBatchStatus(
  senderId: number,
  emailsSentSinceLastPause: number
): Promise<BatchStatus> {
  const sender = await prisma.emailSender.findUnique({
    where: { id: senderId },
    select: {
      maxPerBatch: true,
      staggerDelayMin: true,
      staggerDelayMax: true,
      pauseDurationMin: true,
      pauseDurationMax: true,
    }
  });

  const config = await getEmailConfig();

  const maxPerBatch = sender?.maxPerBatch || 15;
  const staggerDelayMin = sender?.staggerDelayMin || config.pauseDurationMin;
  const staggerDelayMax = sender?.staggerDelayMax || config.pauseDurationMax;

  const nextPauseAt = maxPerBatch;
  const shouldPause = emailsSentSinceLastPause >= nextPauseAt;

  const pauseDuration = randomBetween(
    staggerDelayMin || config.pauseDurationMin,
    staggerDelayMax || config.pauseDurationMax
  );

  const nextResumeTime = new Date(Date.now() + pauseDuration * 60 * 1000)
    .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return {
    shouldPause,
    emailsInBatch: emailsSentSinceLastPause,
    nextPauseAt,
    pauseDuration,
    nextResumeTime
  };
}

export async function performCooldown(
  campaignTitle: string,
  senderId: number,
  totalSent: number,
  totalEmails: number,
  successCount: number,
  failCount: number,
  pauseMinutes: number
): Promise<void> {
  await updateSenderCooldown(senderId, pauseMinutes);

  const resumeTime = new Date(Date.now() + pauseMinutes * 60 * 1000)
    .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  await sendEmailCampaignNotification({
    event: 'PAUSE',
    campaignTitle,
    total: totalEmails,
    sent: totalSent,
    success: successCount,
    failed: failCount,
    pauseMinutes,
    resumeTime
  });

  console.log(`[EmailCampaign] ⏸️ Pause ${pauseMinutes} phút. Tiếp tục lúc ${resumeTime}`);

  await new Promise(resolve => setTimeout(resolve, pauseMinutes * 60 * 1000));
}

/**
 * Giải mã Quoted-Printable (Cần thiết cho email Gmail)
 */
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-F]{2})/gi, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
}

/**
 * Gửi 1 email duy nhất từ 1 sender cụ thể 
 */ 
export async function sendGmailFromSender( 
  sender: { email: string; refreshToken: string }, 
  to: string, 
  subject: string, 
  html: string 
) { 
  const oauth2Client = getOAuth2Client(); 
  oauth2Client.setCredentials({ 
    refresh_token: decrypt(sender.refreshToken), 
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const fromName = 'Học Viện BRK';

  const encodeHeader = (str: string) => { 
    if (!str) return ""; 
    const cleanStr = str.replace(/[\r\n]/g, " ").trim(); 
    const base64 = Buffer.from(cleanStr, 'utf-8').toString("base64");
    return `=?UTF-8?B?${base64}?=`;
  };

  // TÌM VÀ TRÍCH XUẤT ẢNH BASE64 TỪ NỘI DUNG HTML
  // Chuyển đổi từ <img src="data:image..."> sang <img src="cid:image_n">
  const images: { cid: string, base64: string, type: string }[] = [];
  let updatedHtml = html;
  
  const imgRegex = /<img[^>]*src="(data:(image\/[^;]+);base64,([^">]+))"[^>]*>/g;
  let match;
  let imgCount = 0;
  
  while ((match = imgRegex.exec(html)) !== null) {
    imgCount++;
    const fullTag = match[0];
    const dataUri = match[1];
    const mimeType = match[2];
    const base64Data = match[3];
    const cid = `img_${imgCount}@brk.academy`;
    
    images.push({ cid, base64: base64Data, type: mimeType });
    
    // Thay thế URL data bằng CID trong HTML
    const newTag = fullTag.replace(dataUri, `cid:${cid}`);
    updatedHtml = updatedHtml.replace(fullTag, newTag);
  }

  const boundary = `----=_Part_${Math.random().toString(36).substring(2)}`;

  // KHỞI TẠO CẤU TRÚC MULTIPART/RELATED (Dành cho Email có nội dung kèm ảnh nội khối)
  const messageParts = [
    `From: "${encodeHeader(fromName)}" <${sender.email}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/related; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(updatedHtml, 'utf-8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '',
  ];

  // CHÈN CÁC PHẦN ĐÍNH KÈM ẢNH (INLINE ATTACHMENTS)
  for (const img of images) {
    messageParts.push(
      `--${boundary}`,
      `Content-Type: ${img.type}`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <${img.cid}>`,
      `Content-Disposition: inline; filename="${img.cid}"`,
      ``,
      img.base64.match(/.{1,76}/g)?.join('\r\n') || ''
    );
  }

  messageParts.push(`--${boundary}--`);

  const rawMessage = messageParts.join('\r\n');

  const encodedMessage = Buffer.from(rawMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({ 
    userId: 'me', 
    requestBody: { raw: encodedMessage }, 
  }); 
}

/**
 * Lấy danh sách người nhận dựa trên cấu hình Campaign
 */
export async function resolveRecipients(campaignId: number): Promise<Recipient[]> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return [];

  if (campaign.recipientSource === "CSV" || campaign.recipientSource === "SELECTED_LIST" || campaign.recipientSource === "GOOGLE_SHEET") {
    // Giả định recipientCsvData là chuỗi JSON mảng [{email, name, userId}]
    return JSON.parse(campaign.recipientCsvData || "[]");
  }

  if (campaign.recipientSource === "DB_ALL") {
    const users = await prisma.user.findMany({
      where: {
        emailVerified: { not: null },
        email: { contains: "@" }
      },
      select: { email: true, name: true, id: true },
    });
    return users.map(u => ({ email: u.email, name: u.name || "", userId: u.id }));
  }

  if (campaign.recipientSource === "DB_ACTIVE") {
    const filter = campaign.recipientFilter as any;
    const courseId = filter?.courseId ? parseInt(filter.courseId) : null;

    if (!courseId) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: courseId,
        status: "ACTIVE",
        user: { emailVerified: { not: null } }
      },
      include: {
        user: { select: { email: true, name: true, id: true } }
      }
    });

    return enrollments.map(e => ({
      email: e.user.email,
      name: e.user.name || "",
      userId: e.user.id
    }));
  }

  return [];
}

type EmailSenderRecord = {
  id: number;
  email: string;
  refreshToken: string;
  clientId: string | null;
  clientSecret: string | null;
  isActive: boolean;
};

type BounceType = 'HARD_BOUNCE' | 'SOFT_BOUNCE';

interface BouncePattern {
  pattern: RegExp;
  type: BounceType;
  reason: string;
}

const FAKE_EMAIL_PATTERNS = [
  /^noemail\d+@/i,
  /^test\d+@/i,
  /^fake\d+@/i,
  /^mailinator\.com$/i,
];

function isLikelyFakeEmail(email: string): { isFake: boolean; reason?: string } {
  const lowerEmail = email.toLowerCase();
  
  for (const pattern of FAKE_EMAIL_PATTERNS) {
    if (pattern.test(lowerEmail)) {
      return { isFake: true, reason: 'Email có dạng test/fake (noemail, test, fake)' };
    }
  }
  
  return { isFake: false };
}

const BOUNCE_PATTERNS: BouncePattern[] = [
  // HARD BOUNCE - Địa chỉ không tồn tại
  { pattern: /user unknown|user not found|no such user|invalid recipient|recipient rejected/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /does not exist|doesn't exist|not exist/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /550 5\.1\.1|5\.1\.1 bounce|address not found/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /mailbox.*not found|not listed in directory/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /bad-mailbox|bad destination|unrouteable address/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ không tồn tại' },
  { pattern: /invalid email|invalid address/i, type: 'HARD_BOUNCE', reason: 'Địa chỉ email không hợp lệ' },
  
  // SOFT BOUNCE - Tạm thời, thử lại sau
  { pattern: /mailbox full|quota exceeded|storage full|user over quota/i, type: 'SOFT_BOUNCE', reason: 'Hộp thư đầy' },
  { pattern: /temporary failure|temporary error|try again later|retry timeout/i, type: 'SOFT_BOUNCE', reason: 'Lỗi tạm thời' },
  { pattern: /service unavailable|server too busy|deferred|delay/i, type: 'SOFT_BOUNCE', reason: 'Server bận, thử lại sau' },
  { pattern: /rate limit|too many requests|excessive recipients/i, type: 'SOFT_BOUNCE', reason: 'Vượt giới hạn gửi' },
  { pattern: /greylisted|grey list|please try again/i, type: 'SOFT_BOUNCE', reason: 'Bị greylist, thử lại sau' },
  { pattern: /dns failure|dns error|nameserver|domain not found/i, type: 'SOFT_BOUNCE', reason: 'Lỗi DNS tạm thời' },
  { pattern: /authentication required|authorization failed/i, type: 'SOFT_BOUNCE', reason: 'Lỗi xác thực' },
];

function detectBounceType(content: string, subject: string): BounceType | null {
  const text = `${subject} ${content}`.toLowerCase();
  
  for (const bp of BOUNCE_PATTERNS) {
    if (bp.pattern.test(text)) {
      return bp.type;
    }
  }
  
  // Default: nếu là bounce notification thì coi là HARD
  if (/bounced|undeliverable|delivery failed|mailer-daemon/i.test(subject)) {
    return 'HARD_BOUNCE';
  }
  
  return null;
}

function getBounceReason(content: string, subject: string): string {
  const text = `${subject} ${content}`.toLowerCase();
  
  for (const bp of BOUNCE_PATTERNS) {
    if (bp.pattern.test(text)) {
      return bp.reason;
    }
  }
  
  return 'Lỗi không xác định';
}

async function scanSenderForBounces(
  sender: EmailSenderRecord,
  sentSet: Set<string>,
  processedEmails: Set<string>,
  scanDays: number = 30
): Promise<{ 
  scanned: number; 
  hardBounced: number; 
  softBounced: number; 
  error: string | null; 
  foundEmails: { email: string; type: BounceType; reason: string }[];
}> {
  const result = { 
    scanned: 0, 
    hardBounced: 0, 
    softBounced: 0, 
    error: null as string | null, 
    foundEmails: [] as { email: string; type: BounceType; reason: string }[]
  };

  console.log(`\n[BOUNCE-SCAN] ===== Bắt đầu quét vệ tinh: ${sender.email} =====`);

  try {
    const oauth2Client = getOAuth2Client();
    
    const clientId = sender.clientId || process.env.GMAIL_CLIENT_ID;
    const clientSecret = sender.clientSecret || process.env.GMAIL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      result.error = 'Missing OAuth credentials';
      console.log(`[BOUNCE-SCAN] ❌ ${sender.email}: Thiếu OAuth credentials`);
      return result;
    }
    
    oauth2Client.setCredentials({
      refresh_token: decrypt(sender.refreshToken)
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const searchQueries = [
      `from:mailer-daemon newer_than:${scanDays}d`,
      `subject:bounced newer_than:${scanDays}d`,
      `subject:delivery failed newer_than:${scanDays}d`,
      `subject:undeliverable newer_than:${scanDays}d`,
      `subject:"mail delivery failed" newer_than:${scanDays}d`,
      `from:postmaster newer_than:${scanDays}d`,
      `subject:failure newer_than:${scanDays}d`,
      `subject:"returned mail" newer_than:${scanDays}d`,
    ];

    const allMessageIds = new Set<string>();

    for (const query of searchQueries) {
      try {
        const response = await gmail.users.messages.list({
          userId: sender.email,
          q: query,
          maxResults: 300
        });
        
        const messages = response.data.messages || [];
        messages.forEach(m => m.id && allMessageIds.add(m.id));
        
        console.log(`[BOUNCE-SCAN]   Query "${query}": ${messages.length} emails`);
      } catch (err: any) {
        console.log(`[BOUNCE-SCAN]   Query lỗi: ${err.message}`);
      }
    }

    console.log(`[BOUNCE-SCAN]   Tổng bounce emails tìm thấy: ${allMessageIds.size}`);
    result.scanned = allMessageIds.size;

    const messageList = Array.from(allMessageIds);
    let processedCount = 0;

    for (const msgId of messageList) {
      try {
        const message = await gmail.users.messages.get({
          userId: sender.email,
          id: msgId,
          format: 'full'
        });

        const payload = message.data.payload;
        const headers = payload?.headers || [];
        const subjectHeader = headers.find((h: any) => h.name?.toLowerCase() === 'subject');
        const subject = subjectHeader?.value || 'No Subject';

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
        const bounceType = detectBounceType(content, subject);
        
        if (!bounceType) continue;

        const reason = getBounceReason(content, subject);
        const allEmails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        
        const uniqueEmails = [...new Set(allEmails.map(e => e.toLowerCase().trim()))];

        processedCount++;
        if (processedCount % 20 === 0) {
          console.log(`[BOUNCE-SCAN]   Đã xử lý ${processedCount}/${messageList.length} emails...`);
        }

        for (const email of uniqueEmails) {
          const lowerEmail = email.toLowerCase().trim();

          // Bỏ qua email của chính vệ tinh và các email hệ thống
          if (lowerEmail.includes(sender.email) || 
              lowerEmail.includes('mailer-daemon') ||
              lowerEmail.includes('postmaster') ||
              lowerEmail.includes('noreply') ||
              lowerEmail.includes('no-reply') ||
              lowerEmail.includes('@googlemail.com')) {
            continue;
          }

          if (sentSet.has(lowerEmail) && !processedEmails.has(lowerEmail)) {
            processedEmails.add(lowerEmail);

            console.log(`[BOUNCE-SCAN]   ✅ ${bounceType === 'HARD_BOUNCE' ? '🔴' : '🟡'} ${lowerEmail} - ${reason}`);

            // Cập nhật log
            await prisma.emailCampaignLog.updateMany({
              where: { toEmail: { equals: lowerEmail, mode: 'insensitive' }, status: "SENT" },
              data: {
                status: "BOUNCED",
                errorType: bounceType,
                errorCode: `${reason} (Quét vệ tinh: ${sender.email})`
              }
            });

            // Chỉ hard bounce mới đánh dấu emailVerified = null
            if (bounceType === 'HARD_BOUNCE') {
              await prisma.user.updateMany({
                where: { email: { equals: lowerEmail, mode: 'insensitive' } },
                data: { emailVerified: null }
              });
            }

            // Thêm vào blacklist
            const existing = await prisma.emailBlacklist.findUnique({ where: { email: lowerEmail } });
            if (!existing) {
              await prisma.emailBlacklist.create({ 
                data: { 
                  email: lowerEmail, 
                  reason: bounceType 
                } 
              });
            } else if (bounceType === 'HARD_BOUNCE') {
              // Update reason nếu là HARD_BOUNCE
              await prisma.emailBlacklist.update({
                where: { email: lowerEmail },
                data: { reason: 'HARD_BOUNCE' }
              });
            }

            result.foundEmails.push({ email: lowerEmail, type: bounceType, reason });
            
            if (bounceType === 'HARD_BOUNCE') {
              result.hardBounced++;
            } else {
              result.softBounced++;
            }
          }
        }
      } catch (err: any) {
        console.log(`[BOUNCE-SCAN]   Lỗi đọc message ${msgId}: ${err.message}`);
      }
    }

    console.log(`[BOUNCE-SCAN] ✓ Hoàn thành ${sender.email}:`);
    console.log(`[BOUNCE-SCAN]   - Tổng bounce emails: ${result.scanned}`);
    console.log(`[BOUNCE-SCAN]   - HARD BOUNCE: ${result.hardBounced}`);
    console.log(`[BOUNCE-SCAN]   - SOFT BOUNCE: ${result.softBounced}`);

  } catch (err: any) {
    console.error(`[BOUNCE-SCAN] ❌ Lỗi quét vệ tinh ${sender.email}:`, err.message);
    result.error = err.message;
  }

  return result;
}

async function detectFakeEmails(
  sentSet: Set<string>,
  processedEmails: Set<string>
): Promise<{ detected: number; emails: { email: string; reason: string }[] }> {
  const result = { detected: 0, emails: [] as { email: string; reason: string }[] };

  console.log(`\n[FAKE-EMAIL] ===== Phát hiện email ảo =====`);

  // Lấy tất cả SENT logs
  const sentLogs = await prisma.emailCampaignLog.findMany({
    where: { status: "SENT" },
    select: { toEmail: true }
  });

  // Đếm số lần xuất hiện của mỗi email
  const emailCounts: Record<string, number> = {};
  for (const log of sentLogs) {
    const email = log.toEmail.toLowerCase();
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  }

  // Kiểm tra từng email trong sentSet
  for (const email of sentSet) {
    if (processedEmails.has(email)) continue; // Đã xử lý rồi

    const fakeCheck = isLikelyFakeEmail(email);
    if (fakeCheck.isFake) {
      processedEmails.add(email);

      console.log(`[FAKE-EMAIL]   🚫 ${email} - ${fakeCheck.reason}`);

      // Cập nhật log
      await prisma.emailCampaignLog.updateMany({
        where: { toEmail: { equals: email, mode: 'insensitive' }, status: "SENT" },
        data: {
          status: "BOUNCED",
          errorType: "HARD_BOUNCE",
          errorCode: `Email ảo: ${fakeCheck.reason}`
        }
      });

      // Đánh dấu user
      await prisma.user.updateMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        data: { emailVerified: null }
      });

      // Thêm vào blacklist
      const existing = await prisma.emailBlacklist.findUnique({ where: { email: email } });
      if (!existing) {
        await prisma.emailBlacklist.create({ 
          data: { 
            email: email, 
            reason: "HARD_BOUNCE" 
          } 
        });
      }

      result.emails.push({ email, reason: fakeCheck.reason || 'Unknown' });
      result.detected++;
    }
  }

  console.log(`[FAKE-EMAIL] ===== Phát hiện ${result.detected} email ảo =====`);

  return result;
}

export async function processBounceEmails(scanDays: number = 3) {
  console.log('\n[BOUNCE-SCAN] ============================================');
  console.log(`[BOUNCE-SCAN] BẮT ĐẦU QUÉT BOUNCE - ${scanDays} NGÀY - TẤT CẢ VỆ TINH`);
  console.log('[BOUNCE-SCAN] ============================================\n');

  const recentSentLogs = await prisma.emailCampaignLog.findMany({
    where: {
      status: "SENT",
      sentAt: { gte: new Date(Date.now() - scanDays * 24 * 60 * 60 * 1000) }
    },
    select: { toEmail: true }
  });

  const sentSet = new Set(recentSentLogs.map(l => l.toEmail.toLowerCase().trim()));
  const processedEmails = new Set<string>();

  console.log(`[BOUNCE-SCAN] Tổng emails đã gửi trong ${scanDays} ngày: ${sentSet.size}`);

  const allSenders = await prisma.emailSender.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      refreshToken: true,
      clientId: true,
      clientSecret: true,
      isActive: true
    }
  });

  console.log(`[BOUNCE-SCAN] Tổng vệ tinh hoạt động: ${allSenders.length}\n`);

  const stats = {
    totalSenders: allSenders.length,
    totalSentEmails: sentSet.size,
    scanned: 0,
    hardBounced: 0,
    softBounced: 0,
    fakeEmails: 0,
    errors: 0,
    scanDays,
    senderDetails: [] as { 
      email: string; 
      scanned: number; 
      hardBounced: number;
      softBounced: number;
      error: string | null;
      foundEmails: { email: string; type: BounceType; reason: string }[];
    }[]
  };

  for (const sender of allSenders) {
    const senderResult = await scanSenderForBounces(sender, sentSet, processedEmails, scanDays);

    stats.senderDetails.push({
      email: sender.email,
      scanned: senderResult.scanned,
      hardBounced: senderResult.hardBounced,
      softBounced: senderResult.softBounced,
      error: senderResult.error,
      foundEmails: senderResult.foundEmails
    });

    stats.scanned += senderResult.scanned;
    stats.hardBounced += senderResult.hardBounced;
    stats.softBounced += senderResult.softBounced;
    if (senderResult.error) stats.errors++;
  }

  // Phát hiện email ảo dựa trên pattern
  console.log('\n[BOUNCE-SCAN] Đang phát hiện email ảo...');
  const fakeEmailResult = await detectFakeEmails(sentSet, processedEmails);
  stats.fakeEmails = fakeEmailResult.detected;
  stats.hardBounced += fakeEmailResult.detected;

  console.log('\n[BOUNCE-SCAN] ============================================');
  console.log('[BOUNCE-SCAN] KẾT QUẢ QUÉT BOUNCE');
  console.log('[BOUNCE-SCAN] ============================================');
  console.log(`[BOUNCE-SCAN] Thời gian quét: ${scanDays} ngày`);
  console.log(`[BOUNCE-SCAN] Tổng vệ tinh: ${stats.totalSenders}`);
  console.log(`[BOUNCE-SCAN] Tổng emails đã gửi: ${stats.totalSentEmails}`);
  console.log(`[BOUNCE-SCAN] Tổng bounce emails tìm thấy: ${stats.scanned}`);
  console.log(`[BOUNCE-SCAN] 🔴 HARD BOUNCE: ${stats.hardBounced} (bao gồm ${stats.fakeEmails} email ảo)`);
  console.log(`[BOUNCE-SCAN] 🟡 SOFT BOUNCE: ${stats.softBounced}`);
  console.log(`[BOUNCE-SCAN] 🚫 Email ảo phát hiện: ${stats.fakeEmails}`);
  console.log(`[BOUNCE-SCAN] Số vệ tinh lỗi: ${stats.errors}`);
  
  if (stats.errors > 0) {
    console.log('[BOUNCE-SCAN] VỆ TINH CÓ LỖI:');
    stats.senderDetails.filter(s => s.error).forEach(s => {
      console.log(`[BOUNCE-SCAN]   - ${s.email}: ${s.error}`);
    });
  }
  
  console.log('\n[BOUNCE-SCAN] CHI TIẾT TỪNG VỆ TINH:');
  stats.senderDetails.forEach(s => {
    const status = s.error ? '❌ LỖI' : '✓ OK';
    console.log(`[BOUNCE-SCAN]   ${status} ${s.email}:`);
    console.log(`[BOUNCE-SCAN]      Tổng: ${s.scanned} | 🔴: ${s.hardBounced} | 🟡: ${s.softBounced}`);
  });
  console.log('[BOUNCE-SCAN] ============================================\n');

  return stats;
}
