import prisma from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-auth";
import { tryDecrypt, decrypt } from "@/lib/email-encryptor";
import { spinContent } from "@/lib/email-spin";
import { google } from "googleapis";
import { getEmailConfig, randomBetween, getEffectiveDailyLimit } from "@/lib/email-config";
import { sendEmailCampaignNotification } from "@/lib/notifications";
import { sendTransactionalEmail } from "@/lib/brevo";

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
  provider: string;
  refreshToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  apiKeyEncrypted: string | null;
  apiKeyEnvVar: string | null;
  senderName: string | null;
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

  // 1. Brevo pool — round-robin theo sentToday (thấp nhất trước)
  const brevoSenders = await prisma.emailSender.findMany({
    where: { isActive: true, provider: 'brevo' },
    orderBy: { id: 'asc' },
  });
  const brevoWithQuota = brevoSenders.filter(s => s.sentToday < s.dailyLimit);
  if (brevoWithQuota.length > 0) {
    brevoWithQuota.sort((a, b) => a.sentToday - b.sentToday);
    return brevoWithQuota[0] as any;
  }

  // 2. Gmail pool — chỉ vào đây khi Brevo đã hết quota
  const gmailSenders = await prisma.emailSender.findMany({
    where: {
      isActive: true,
      provider: { not: 'brevo' },
      OR: [
        { cooldownUntil: null },
        { cooldownUntil: { lt: now } }
      ],
    },
    orderBy: { id: 'asc' },
  });
  const gmailWithQuota = gmailSenders.filter(s => {
    const limit = getEffectiveDailyLimit({
      createdAt: s.createdAt,
      dailyLimit: s.dailyLimit,
      warmupPhase: s.warmupPhase,
    });
    return s.sentToday < limit;
  });
  if (gmailWithQuota.length > 0) {
    gmailWithQuota.sort((a, b) => a.sentToday - b.sentToday);
    return gmailWithQuota[0] as any;
  }

  return null;
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
  emailsSentSinceLastPause: number
): Promise<BatchStatus> {
  const config = await getEmailConfig();

  const maxPerBatch = randomBetween(config.emailsBeforePauseMin, config.emailsBeforePauseMax);
  const shouldPause = emailsSentSinceLastPause >= maxPerBatch;

  const pauseDuration = randomBetween(config.pauseDurationMin, config.pauseDurationMax);

  const nextResumeTime = new Date(Date.now() + pauseDuration * 60 * 1000)
    .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return {
    shouldPause,
    emailsInBatch: emailsSentSinceLastPause,
    nextPauseAt: maxPerBatch,
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
    refresh_token: tryDecrypt(sender.refreshToken), 
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const fromName = 'Cộng đồng MBC';

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

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });
  if (res.status < 200 || res.status >= 300) {
    console.error(`❌ sendGmailFromSender: Gmail API returned ${res.status}:`, res.statusText);
  } 
}

export async function sendViaBrevo(
  sender: { apiKeyEncrypted: string | null; apiKeyEnvVar: string | null; senderName: string | null; email: string },
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  let apiKey: string | null = null

  if (sender.apiKeyEnvVar) {
    apiKey = process.env[sender.apiKeyEnvVar] || null
    if (!apiKey) {
      console.warn(`[Brevo] Env var "${sender.apiKeyEnvVar}" not set, falling back...`)
    }
  }

  if (!apiKey && sender.apiKeyEncrypted) {
    apiKey = decrypt(sender.apiKeyEncrypted)
  }

  if (!apiKey) {
    apiKey = process.env.BREVO_API_KEY || null
  }

  if (!apiKey) throw new Error('Brevo API key not found')

  const result = await sendTransactionalEmail({
    to: [{ email: to }],
    subject,
    htmlContent: html,
    sender: {
      name: sender.senderName || process.env.BREVO_SENDER_NAME || 'Cộng đồng MBC',
      email: sender.email || process.env.BREVO_SENDER_EMAIL || 'hocvienbrk@gmail.com',
    },
    tags: [],
    apiKey,
  })

  if (!result.success) throw new Error('Brevo send failed')
}

/**
 * Lấy danh sách người nhận dựa trên cấu hình Campaign
 */
export async function resolveRecipients(campaignId: number): Promise<Recipient[]> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) return [];

  // 1. Nguồn danh sách CSV/JSON hoặc Google Sheet hoặc Nhập thủ công dán text
  if (campaign.recipientSource === "CSV" || campaign.recipientSource === "SELECTED_LIST") {
    const rawData = campaign.recipientCsvData || "[]";
    // Kiểm tra xem có phải JSON hợp lệ hay không, nếu không phải thì tự động parse từ text thô
    try {
      if (rawData.trim().startsWith("[")) {
        return JSON.parse(rawData);
      }
    } catch {}
    const { parseEmailsFromRawText } = await import("./email-campaign-parser");
    return parseEmailsFromRawText(rawData);
  }

  if (campaign.recipientSource === "GOOGLE_SHEET") {
    const { parseEmailsFromGoogleSheet } = await import("./email-campaign-parser");
    try {
      return await parseEmailsFromGoogleSheet(campaign.recipientCsvData || "");
    } catch (err) {
      console.error("[resolveRecipients] Lỗi parse Google Sheet:", err);
      return [];
    }
  }

  // 2. Tất cả thành viên đã xác thực email
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

  // 3. Tất cả thành viên (gồm cả chưa xác thực email)
  if (campaign.recipientSource === "DB_ALL_INCLUDING_UNVERIFIED") {
    const users = await prisma.user.findMany({
      where: {
        email: { contains: "@" }
      },
      select: { email: true, name: true, id: true },
    });
    return users.map(u => ({ email: u.email, name: u.name || "", userId: u.id }));
  }

  // 4. Thành viên đang active trong khóa học cụ thể
  if (campaign.recipientSource === "DB_ACTIVE") {
    const filter = campaign.recipientFilter as any;
    const courseId = filter?.courseId ? parseInt(filter.courseId) : null;

    if (!courseId) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: courseId,
        status: "ACTIVE",
        user: { email: { contains: "@" } } // cho phép cả chưa active email
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
  refreshToken: string | null;
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

  if (!sender.refreshToken) {
    result.error = 'Missing refreshToken (Brevo sender?)';
    console.log(`[BOUNCE-SCAN] ❌ ${sender.email}: Không có refresh token`);
    return result;
  }

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
      refresh_token: tryDecrypt(sender.refreshToken)
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

            // Cập nhật log + gắn sender gây bounce
            await prisma.emailCampaignLog.updateMany({
              where: { toEmail: { equals: lowerEmail, mode: 'insensitive' }, status: "SENT" },
              data: {
                status: "BOUNCED",
                errorType: bounceType,
                errorCode: `${reason} (Quét vệ tinh: ${sender.email})`,
                senderId: sender.id
              }
            });

            // Ghi bounce vào sender log
            const today = new Date(); today.setHours(0, 0, 0, 0)
            await prisma.emailSenderLog.upsert({
              where: { senderId_date: { senderId: sender.id, date: today } },
              update: { bounceCount: { increment: 1 } },
              create: { senderId: sender.id, date: today, sentCount: 0, failedCount: 0, bounceCount: 1, cooldownCount: 0, cooldownMinutes: 0 }
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

  // [OPTIMIZE] Trước đây tải TOÀN BỘ log SENT (không giới hạn, tăng dần theo
  // thời gian) về rồi đếm bằng JavaScript. Đếm ngay trong database bằng
  // groupBy — chỉ trả về số dòng bằng số email khác nhau, không phải tổng số
  // lần gửi.
  const sentCounts = await prisma.emailCampaignLog.groupBy({
    by: ["toEmail"],
    where: { status: "SENT" },
    _count: { toEmail: true }
  });

  // Đếm số lần xuất hiện của mỗi email (gộp các biến thể hoa/thường)
  const emailCounts: Record<string, number> = {};
  for (const row of sentCounts) {
    const email = row.toEmail.toLowerCase();
    emailCounts[email] = (emailCounts[email] || 0) + row._count.toEmail;
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

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CAMPAIGN BATCH PROCESSING - Logic gửi 1 batch, dùng chung cho route tương tác
 * (admin bấm nút, xem tiến trình trực tiếp) và cron job chạy nền (tiếp tục
 * chiến dịch khi admin đã đóng tab trình duyệt).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface CampaignBatchResult {
  success: boolean;
  finished: boolean;
  notFound?: boolean;
  sentInBatch?: number;
  failedInBatch?: number;
  needsCooldown?: boolean;
  pauseMinutes?: number;
  error?: string;
  stats?: { totalSent: number; totalSuccess: number; totalFailed: number };
}

const campaignStats: Map<number, { total: number; sent: number; success: number; failed: number; emailsInBatch: number }> = new Map();
const recipientsCache: Map<number, Recipient[]> = new Map();

export async function processCampaignBatch(campaignId: number, batchSize: number = 20): Promise<CampaignBatchResult> {
  const config = await getEmailConfig();

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { senders: { include: { sender: true } } }
  });

  if (!campaign) {
    return { success: false, finished: false, notFound: true, error: "Campaign not found" };
  }

  let allRecipients = recipientsCache.get(campaignId);
  if (!allRecipients) {
    allRecipients = await resolveRecipients(campaignId);
    recipientsCache.set(campaignId, allRecipients);
  }

  const existingLogs = await prisma.emailCampaignLog.findMany({
    where: { campaignId, status: { in: ['SENT', 'SKIPPED', 'FAILED'] } },
    select: { toEmail: true }
  });
  const sentEmails = new Set(existingLogs.map(l => l.toEmail.toLowerCase().trim()));

  const unsentRecipients = allRecipients.filter(r => !sentEmails.has(r.email.toLowerCase().trim()));
  const recipientsBatch = unsentRecipients.slice(0, batchSize);

  if (recipientsBatch.length === 0) {
    const stats = campaignStats.get(campaignId) || { total: allRecipients.length, sent: allRecipients.length, success: 0, failed: 0, emailsInBatch: 0 };
    return {
      success: true,
      finished: true,
      stats: { totalSent: stats.sent, totalSuccess: stats.success, totalFailed: stats.failed }
    };
  }

  if (campaign.totalRecipients !== allRecipients.length) {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { totalRecipients: allRecipients.length }
    });
  }

  if (!campaignStats.has(campaignId)) {
    campaignStats.set(campaignId, { total: allRecipients.length, sent: 0, success: 0, failed: 0, emailsInBatch: 0 });

    if (config.enableTelegramAlert) {
      await sendEmailCampaignNotification({
        event: 'START',
        campaignTitle: campaign.title,
        total: allRecipients.length,
        sent: 0,
        success: 0,
        failed: 0
      });
    }
  }

  const stats = campaignStats.get(campaignId)!;

  const results = { sent: 0, failed: 0 };

  for (let i = 0; i < recipientsBatch.length; i++) {
    const recipient = recipientsBatch[i];

    const sender = await getAvailableSender(campaignId);

    if (!sender) {
      console.log("[EmailCampaign] Không có sender khả dụng (hết quota hoặc đang cooldown)");

      let pauseMinutes = 7
      const soonestCooldown = await prisma.emailSender.findFirst({
        where: { cooldownUntil: { gt: new Date() } },
        orderBy: { cooldownUntil: 'asc' },
        select: { cooldownUntil: true }
      })
      if (soonestCooldown?.cooldownUntil) {
        pauseMinutes = Math.ceil((soonestCooldown.cooldownUntil.getTime() - Date.now()) / 60000)
        if (pauseMinutes < 1) pauseMinutes = 1
      }

      if (config.enableTelegramAlert) {
        await sendEmailCampaignNotification({
          event: 'PAUSE',
          campaignTitle: campaign.title,
          total: allRecipients.length,
          sent: stats.sent,
          success: stats.success,
          failed: stats.failed,
          pauseMinutes,
          resumeTime: new Date(Date.now() + pauseMinutes * 60 * 1000)
            .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
      }

      return {
        success: false,
        finished: false,
        error: "Tất cả email sender đã hết quota hoặc đang trong thời gian chờ.",
        needsCooldown: true,
        pauseMinutes
      };
    }

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!recipient.email || !emailRegex.test(recipient.email)) {
        await prisma.emailCampaignLog.create({
          data: {
            campaignId,
            toEmail: recipient.email || "N/A",
            status: "FAILED",
            errorType: "INVALID_FORMAT",
            errorCode: "Định dạng email không hợp lệ",
          }
        });
        results.failed++;
        stats.failed++;
        continue;
      }

      const isBlacklisted = await prisma.emailBlacklist.findUnique({
        where: { email: recipient.email.toLowerCase().trim() }
      });

      if (isBlacklisted) {
        await prisma.emailCampaignLog.create({
          data: {
            campaignId,
            toEmail: recipient.email,
            status: "SKIPPED",
            errorType: "BLACKLISTED",
          }
        });
        stats.sent++;
        results.sent++;
        continue;
      }

      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

      let subject = spinContent(campaign.subject || "").trim();
      subject = subject.replace(/\[Tên\]/g, recipient.name || "Thành viên");
      subject = subject.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");
      subject = subject.replace(/\[NgauNhien\]/g, randomCode).replace(/\[Random\]/g, randomCode);

      let rawHtml = spinContent(campaign.htmlContent || "").trim();
      rawHtml = rawHtml.replace(/\[Tên\]/g, recipient.name || "bạn");
      rawHtml = rawHtml.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");
      rawHtml = rawHtml.replace(/\[NgauNhien\]/g, randomCode).replace(/\[Random\]/g, randomCode);

      if (!rawHtml.includes('<p>') && !rawHtml.includes('<br')) {
        rawHtml = rawHtml.replace(/\n/g, '<br/>');
      }

      if (config.enableRandomMessageFooter) {
        const footer = await getRandomMessageFooter();
        rawHtml = injectFooter(rawHtml, footer);
      }

      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'}/api/unsubscribe?email=${encodeURIComponent(recipient.email)}`;

      const finalHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; border: 1px solid #eeeeee; border-radius: 20px; overflow: hidden;">
          <div style="background-color: #000000; padding: 30px; text-align: center;">
            <a href="https://giautoandien.io.vn" style="text-decoration: none;">
              <img src="https://giautoandien.io.vn/logobrk-50px.png" alt="CỘNG ĐỒNG MBC" style="height: 40px; display: block; margin: 0 auto; color: #FACC15; font-weight: bold; font-size: 20px; border: 0;">
            </a>
            <div style="color: #FACC15; font-size: 10px; font-weight: bold; margin-top: 5px; letter-spacing: 2px;">NGÂN HÀNG PHƯỚC BÁU</div>
          </div>
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <div style="font-size: 16px; color: #333333;">
              ${rawHtml}
            </div>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #eeeeee; text-align: center;">
            <p style="font-size: 11px; color: #999999; margin: 0; line-height: 1.8;">
              Bạn nhận được thông báo này vì là thành viên của <b>Cộng đồng MBC</b>.<br>
              Nếu không muốn nhận những email này, bạn có thể <a href="${unsubscribeUrl}" style="color: #000000; text-decoration: underline;">Hủy đăng ký tại đây</a>.
            </p>
          </div>
        </div>
      `;

      if (sender.provider === 'brevo') {
        await sendViaBrevo(sender, recipient.email, subject, finalHtml);
      } else {
        await sendGmailFromSender(sender as any, recipient.email, subject, finalHtml);
      }

      await prisma.emailCampaignLog.create({
        data: {
          campaignId,
          senderId: sender.id,
          toEmail: recipient.email,
          status: "SENT",
        }
      });

      await incrementSenderSentCount(sender.id);
      await upsertSenderLogEntry(sender.id, 'sentCount', 1);
      stats.sent++;
      stats.success++;
      stats.emailsInBatch++;
      results.sent++;

      if (sender.provider === 'brevo') {
        const min = config.brevoInterEmailDelayMin ?? 0.5;
        const max = config.brevoInterEmailDelayMax ?? 1.5;
        const delay = +(min + Math.random() * (max - min)).toFixed(1);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
        continue;
      }

      const batchStatus = await checkBatchStatus(stats.emailsInBatch);

      if (batchStatus.shouldPause) {
        console.log(`[EmailCampaign] Đã gửi ${stats.emailsInBatch} emails. Bắt đầu pause ${batchStatus.pauseDuration} phút.`);

        stats.emailsInBatch = 0;

        await updateSenderCooldown(sender.id, batchStatus.pauseDuration);
        await upsertSenderLogEntry(sender.id, 'cooldownCount', 1);
        await upsertSenderLogEntry(sender.id, 'cooldownMinutes', batchStatus.pauseDuration);

        if (config.enableTelegramAlert) {
          await sendEmailCampaignNotification({
            event: 'PAUSE',
            campaignTitle: campaign.title,
            total: allRecipients.length,
            sent: stats.sent,
            success: stats.success,
            failed: stats.failed,
            pauseMinutes: batchStatus.pauseDuration,
            resumeTime: new Date(Date.now() + batchStatus.pauseDuration * 60 * 1000)
              .toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          });
        }

        const currentSentCount = await prisma.emailCampaignLog.count({
          where: { campaignId, status: { in: ['SENT', 'SKIPPED'] } }
        });
        const currentFailedCount = await prisma.emailCampaignLog.count({
          where: { campaignId, status: 'FAILED' }
        });

        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            sentCount: currentSentCount,
            failedCount: currentFailedCount,
            status: "RUNNING",
            startedAt: campaign.startedAt || new Date(),
          }
        });

        return {
          success: true,
          sentInBatch: results.sent,
          needsCooldown: true,
          pauseMinutes: batchStatus.pauseDuration,
          finished: false,
          stats: { totalSent: stats.sent, totalSuccess: stats.success, totalFailed: stats.failed }
        };
      } else {
        const delay = randomBetween(config.interEmailDelayMin, config.interEmailDelayMax);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }

    } catch (error: any) {
      console.error(`Gửi email thất bại tới ${recipient.email}:`, error);
      results.failed++;
      stats.failed++;

      await prisma.emailCampaignLog.create({
        data: {
          campaignId,
          senderId: sender.id,
          toEmail: recipient.email,
          status: "FAILED",
          errorCode: error.message,
        }
      });
      await upsertSenderLogEntry(sender.id, 'failedCount', 1);
      await incrementSenderSentCount(sender.id);
    }
  }

  const remainingAfterBatch = unsentRecipients.length - recipientsBatch.length;
  const isCompleted = remainingAfterBatch <= 0;

  const finalSentCount = await prisma.emailCampaignLog.count({
    where: { campaignId, status: { in: ['SENT', 'SKIPPED'] } }
  });
  const finalFailedCount = await prisma.emailCampaignLog.count({
    where: { campaignId, status: 'FAILED' }
  });

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: finalSentCount,
      failedCount: finalFailedCount,
      status: isCompleted ? "COMPLETED" : "RUNNING",
      startedAt: campaign.startedAt || new Date(),
      completedAt: isCompleted ? new Date() : null,
    }
  });

  if (isCompleted) {
    campaignStats.delete(campaignId);
    recipientsCache.delete(campaignId);

    let sheetUrl: string | undefined;
    if (campaign.notificationType !== "VERIFY_TEST") {
      const { exportCampaignToSheet } = await import("./email-campaign-export");
      const exportResult = await exportCampaignToSheet(campaignId, campaign.title);
      sheetUrl = exportResult?.sheetUrl || undefined;
      if (exportResult?.sheetUrl) {
        console.log(`[EmailCampaign] 📊 Sheet kết quả: ${exportResult.sheetUrl}`);
      }
    }

    if (config.enableTelegramAlert) {
      await sendEmailCampaignNotification({
        event: 'COMPLETE',
        campaignTitle: campaign.title,
        total: allRecipients.length,
        sent: allRecipients.length,
        success: stats.success,
        failed: stats.failed,
        sheetUrl,
      });
    }
  }

  return {
    success: true,
    sentInBatch: results.sent,
    failedInBatch: results.failed,
    finished: isCompleted,
    stats: { totalSent: stats.sent, totalSuccess: stats.success, totalFailed: stats.failed }
  };
}

async function upsertSenderLogEntry(senderId: number, field: 'sentCount' | 'failedCount' | 'cooldownCount' | 'cooldownMinutes', value: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  await prisma.emailSenderLog.upsert({
    where: { senderId_date: { senderId, date: today } },
    update: { [field]: { increment: value } },
    create: { senderId, date: today, sentCount: 0, failedCount: 0, bounceCount: 0, cooldownCount: 0, cooldownMinutes: 0, [field]: value }
  })
}

/**
 * Xử lý 1 chiến dịch cho tới khi hoàn thành hoặc hết ngân sách thời gian —
 * dùng bởi cron job nền để tiếp tục gửi ngay cả khi admin đã đóng tab.
 * Không sleep chờ cooldown (khác với vòng lặp phía client) — nếu gặp
 * needsCooldown thì dừng lại ngay, để lượt cron kế tiếp (15 phút sau) tự
 * tiếp tục khi cooldown trong DB đã hết hạn.
 */
export async function runCampaignQueueUntilBudget(
  campaignId: number,
  maxDurationMs: number,
  batchSize: number = 20
): Promise<{ finished: boolean; batchesRun: number; lastResult: CampaignBatchResult | null }> {
  const deadline = Date.now() + maxDurationMs;
  let batchesRun = 0;
  let lastResult: CampaignBatchResult | null = null;

  while (Date.now() < deadline) {
    const result = await processCampaignBatch(campaignId, batchSize);
    lastResult = result;
    batchesRun++;

    if (result.finished) return { finished: true, batchesRun, lastResult };
    if (result.needsCooldown) return { finished: false, batchesRun, lastResult };
    if (!result.success) return { finished: false, batchesRun, lastResult };
  }

  return { finished: false, batchesRun, lastResult };
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
    where: { isActive: true, provider: 'gmail' },
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
