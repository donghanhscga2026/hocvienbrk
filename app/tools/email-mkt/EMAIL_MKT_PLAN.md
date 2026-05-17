# Hệ Thống Email Marketing (Email MKT) — Tài Liệu Đầy Đủ

> Phiên bản: 2.0 — Cập nhật: 2026-05-16
> Mục đích: Tài liệu này chứa TOÀN BỘ source code và giải thích chi tiết.
> Nếu dự án bị xóa, chỉ cần file này là có thể build lại toàn bộ hệ thống Email MKT.

---

## Mục lục

- [I. Kiến trúc tổng quan](#ikiếntrúctổngquan)
- [II. Database Schema](#iidatabaseschema)
- [III. Core Libraries](#iiicorelibraries)
- [IV. Campaign API](#ivcampaignapi)
- [V. Senders API](#vsendersapi)
- [VI. Email Config API](#viemailconfigapi)
- [VII. OAuth & Blacklist API](#viioauthblacklistapi)
- [VIII. Cron Jobs](#viiicronjobs)
- [IX. UI Pages](#ixuipages)
- [X. Hướng dẫn sử dụng](#xhướngdẫnsửdụng)
- [XI. Xử lý sự cố](#xixửlýsựcố)

---

## I. Kiến trúc tổng quan

### 1.1 Sơ đồ luồng gửi mail

```
┌──────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  Browser UI  │  POST   │   send-batch/route   │  query  │   PostgreSQL    │
│  (React 19)  │────────▶│   (Serverless fn)    │────────▶│   (Prisma ORM)  │
│              │◀────────│                      │◀────────│                 │
│  [id]/page   │  JSON   │  resolveRecipients   │  logs   │ EmailSender     │
│  ClientCont  │         │  filter sent logs    │         │ EmailCampaign   │
│  new/page    │         │  getAvailableSender  │         │ EmailCampaignLog│
└──────────────┘         │  sendGmailFrom...    │         │ EmailBlacklist  │
                         │  checkBatchStatus    │         │ SystemConfig    │
                         └──────────┬───────────┘         └─────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │    Gmail API        │
                          │  (10 senders)       │
                          │  googleapis npm     │
                          └────────────────────┘
```

### 1.2 Giao thức gửi

Hệ thống dùng **Gmail API** (OAuth2), KHÔNG dùng SMTP. Mỗi sender là 1 tài khoản Google có refresh token được mã hóa AES-256-CBC lưu trong DB.

### 1.3 Ngôn ngữ & Framework

| Công nghệ | Phiên bản | Ghi chú |
|---|---|---|
| Next.js | 16 | App Router |
| React | 19 | Server & Client Components |
| Prisma | 5.22 | ORM |
| PostgreSQL | Via Supabase | Direct connection |
| Tailwind CSS | 4 | Styling |
| googleapis | Latest | Gmail API |
| NextAuth | v5 | Authentication |
| AES-256-CBC | Crypto | Mã hóa token |

---

## II. Database Schema

### 2.1 EmailSender

```prisma
model EmailSender {
  id               Int                   @id @default(autoincrement())
  label            String
  email            String                @unique
  isMain           Boolean               @default(false)
  clientId         String
  clientSecret     String?
  refreshToken     String
  dailyLimit       Int                   @default(480)
  sentToday        Int                   @default(0)
  lastResetAt      DateTime              @default(now())
  isActive         Boolean               @default(true)
  createdAt        DateTime              @default(now())
  cooldownUntil    DateTime?
  lastUsedAt       DateTime?
  maxPerBatch      Int                   @default(20)
  pauseDurationMax Int                   @default(30)
  pauseDurationMin Int                   @default(10)
  staggerDelayMax  Int                   @default(15)
  staggerDelayMin  Int                   @default(5)
  warmupPhase      Int                   @default(0)
  campaigns        EmailCampaignSender[]
}
```

### 2.2 EmailCampaign

```prisma
model EmailCampaign {
  id               Int                   @id @default(autoincrement())
  title            String
  status           CampaignStatus        @default(DRAFT)
  notificationType String
  linkedEntityId   String?
  recipientSource  String
  recipientFilter  Json?
  recipientCsvData String?
  subject          String
  htmlContent      String
  totalRecipients  Int                   @default(0)
  sentCount        Int                   @default(0)
  failedCount      Int                   @default(0)
  startedAt        DateTime?
  completedAt      DateTime?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
  createdBy        Int
  creator          User                  @relation("UserToEmailCampaign", fields: [createdBy], references: [id])
  logs             EmailCampaignLog[]
  senders          EmailCampaignSender[]
}
```

### 2.3 EmailCampaignSender

```prisma
model EmailCampaignSender {
  id            Int           @id @default(autoincrement())
  campaignId    Int
  senderId      Int
  assignedCount Int           @default(0)
  sentCount     Int           @default(0)
  campaign      EmailCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  sender        EmailSender   @relation(fields: [senderId], references: [id])
}
```

### 2.4 EmailCampaignLog

```prisma
model EmailCampaignLog {
  id         Int           @id @default(autoincrement())
  campaignId Int
  senderId   Int?
  toEmail    String
  status     String
  errorCode  String?
  errorType  String?
  sentAt     DateTime      @default(now())
  campaign   EmailCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}
```

### 2.5 EmailBlacklist

```prisma
model EmailBlacklist {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  reason     String
  campaignId Int?
  createdAt  DateTime @default(now())
}
```

### 2.6 SystemConfig (cho email config)

```prisma
model SystemConfig {
  key   String @id
  value Json
}
// Key = "emailCampaignConfig"
```

---

## III. Core Libraries

### 3.1 `lib/prisma.ts` — Singleton PrismaClient

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

### 3.2 `lib/email-config.ts` — Cấu hình & Warmup

```typescript
import prisma from "@/lib/prisma";

export interface EmailCampaignConfig {
  emailsBeforePauseMin: number;
  emailsBeforePauseMax: number;
  pauseDurationMin: number;
  pauseDurationMax: number;
  interEmailDelayMin: number;
  interEmailDelayMax: number;
  enableTelegramAlert: boolean;
  telegramChatId: string;
  enableRandomMessageFooter: boolean;
}

export const DEFAULT_EMAIL_CONFIG: EmailCampaignConfig = {
  emailsBeforePauseMin: 30,
  emailsBeforePauseMax: 50,
  pauseDurationMin: 10,
  pauseDurationMax: 30,
  interEmailDelayMin: 2,
  interEmailDelayMax: 8,
  enableTelegramAlert: true,
  telegramChatId: process.env.TELEGRAM_CHAT_ID_EMAIL || "",
  enableRandomMessageFooter: false,
};

export const WARMUP_LIMITS = {
  0: 10,
  1: 25,
  2: 50,
  3: 100,
  4: 200,
};

export async function getEmailConfig(): Promise<EmailCampaignConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "emailCampaignConfig" },
    });

    if (config?.value) {
      return { ...DEFAULT_EMAIL_CONFIG, ...(config.value as any) };
    }
  } catch (error) {
    console.error("[EmailConfig] Lỗi khi đọc config:", error);
  }

  return DEFAULT_EMAIL_CONFIG;
}

export async function saveEmailConfig(config: Partial<EmailCampaignConfig>): Promise<void> {
  const currentConfig = await getEmailConfig();
  const newConfig = { ...currentConfig, ...config };

  await prisma.systemConfig.upsert({
    where: { key: "emailCampaignConfig" },
    update: { value: newConfig as any },
    create: { key: "emailCampaignConfig", value: newConfig as any },
  });
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function calculateWarmupLimit(createdAt: Date): number {
  const now = new Date();
  const days = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 7) return WARMUP_LIMITS[0];
  if (days < 14) return WARMUP_LIMITS[1];
  if (days < 21) return WARMUP_LIMITS[2];
  if (days < 30) return WARMUP_LIMITS[3];
  return WARMUP_LIMITS[4];
}

export function getEffectiveDailyLimit(sender: {
  createdAt: Date;
  dailyLimit: number;
  warmupPhase: number;
}): number {
  const warmupLimit = sender.warmupPhase > 0
    ? WARMUP_LIMITS[sender.warmupPhase as keyof typeof WARMUP_LIMITS] ?? WARMUP_LIMITS[4]
    : calculateWarmupLimit(sender.createdAt);
  const configuredLimit = sender.dailyLimit;
  const effectiveLimit = Math.min(warmupLimit, configuredLimit);
  return effectiveLimit;
}

```

### 3.3 `lib/email-encryptor.ts` — Mã hóa Token

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || ''; // Phải là 64 ký tự hex (32 bytes)
const IV_LENGTH = 16; // Đối với AES, IV luôn là 16 bytes

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function tryDecrypt(text: string): string {
  try {
    return decrypt(text);
  } catch {
    return text;
  }
}

export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }

  const textParts = text.split(':');
  const ivPart = textParts.shift();
  if (!ivPart) throw new Error('Invalid encrypted format');
  
  const iv = Buffer.from(ivPart, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

```

### 3.4 `lib/email-spin.ts` — Content Spinning

```typescript
/**
 * Xử lý cú pháp content spinning {option1|option2|option3}
 * Ví dụ: "Chào {bạn|anh|chị}, {hôm nay|ngày mai} sẽ có buổi học."
 */
export function spinContent(content: string): string {
  if (!content) return "";
  
  // Biểu thức chính quy tìm các khối {a|b|c}
  const spinRegex = /\{([^{}]*)\}/g;
  
  let spun = content;
  let match;
  
  // Lặp cho đến khi không còn khối nào (hỗ trợ nested sơ bộ nếu cần, nhưng cơ bản là 1 cấp)
  while ((match = spinRegex.exec(spun)) !== null) {
    const fullMatch = match[0];
    const options = match[1].split('|');
    const randomOption = options[Math.floor(Math.random() * options.length)];
    
    // Thay thế khối bằng lựa chọn ngẫu nhiên
    spun = spun.replace(fullMatch, randomOption);
    
    // Reset regex index vì chuỗi đã thay đổi
    spinRegex.lastIndex = 0;
  }
  
  return spun;
}

/**
 * Tạo bản xem trước N phiên bản để admin kiểm tra
 */
export function previewSpin(content: string, count: number = 3): string[] {
  const previews: string[] = [];
  for (let i = 0; i < count; i++) {
    previews.push(spinContent(content));
  }
  return previews;
}

```

### 3.5 `lib/google-auth.ts` — OAuth2 Client

```typescript
import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

function getRedirectUri() {
  const authUrl = process.env.AUTH_URL || 'http://localhost:3000/api/auth';
  const baseUrl = authUrl.replace('/api/auth', '');
  return `${baseUrl}/api/admin/auth/google/callback`;
}

export function getOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env');
  }

  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, getRedirectUri());
}

export function getAuthUrl(state?: string) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
}

```

### 3.6 `lib/email-campaign-runner.ts` — Core Engine (836 dòng)

```typescript
import prisma from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/google-auth";
import { tryDecrypt } from "@/lib/email-encryptor";
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

```

### 3.7 `lib/notifications.ts` — Notifications (588 dòng)

```typescript
import { google } from 'googleapis';

/**
 * ─── HỆ THỐNG THÔNG BÁO BACKEND (TELEGRAM & EMAIL) ──────────────────────────
 * File này chỉ chạy phía Server. Tuyệt đối không import vào Client Component.
 * Version: 2.0.0 - Nâng cấp ngày 2026-04-26
 * - Randomize subject line và HTML template
 * - Telegram notification chi tiết khi gửi email thành công/thất bại
 * - Fallback sang Resend khi Gmail lỗi
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RANDOMIZATION HELPERS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Random subject lines cho verification email (7 biến thể)
const verificationSubjects = [
  '[Học Viện BRK] Xác minh tài khoản của bạn',
  '[Học Viện BRK] Kích hoạt tài khoản ngay',
  '[Học Viện BRK] Hoàn tất đăng ký - Xác nhận email của bạn',
  '[Học Viện BRK] Verify your account để bắt đầu học',
  'Xác nhận đăng ký thành công - Học Viện BRK',
  '[Học Viện BRK] Chào mừng! Xác minh email để tiếp tục',
  'Kích hoạt tài khoản Học Viện BRK của bạn',
];

// Random greeting styles
const greetings = ['Chào bạn,', 'Chào', 'Xin chào,', 'Chào buổi sáng tốt lành,', 'Hey,'];

// Motivational quotes ngẫu nhiên
const quotes = [
  'Hành trình nghìn dặm bắt đầu từ một bước nhỏ.',
  'Thành công không đến từ may mắn, mà từ sự kiên trì.',
  'Học hỏ�i là chìa khóa của mọi thành công.',
  'Đừng chờ đợi cơ hội, hãy tạo ra nó.',
  'Mỗi ngày là một cơ hội để trở nên tốt hơn.',
];

// Random timestamp cho unique tracking
function getTimestamp(): string {
  return new Date().toISOString();
}

// Random ID cho tracking
function generateEmailId(): string {
  return `HV${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// Random array picker
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TELEGRAM NOTIFICATIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Gửi thông báo đến Telegram (Hỗ trợ 3 Group khác nhau)
 */
export async function sendTelegram(message: string, type: 'REGISTER' | 'ACTIVATE' | 'LESSON' | 'TOOL_CLICK' = 'ACTIVATE') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdMap = {
    REGISTER: process.env.TELEGRAM_CHAT_ID_REGISTER || process.env.TELEGRAM_CHAT_ID,
    ACTIVATE: process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID,
    LESSON: process.env.TELEGRAM_CHAT_ID_LESSON || process.env.TELEGRAM_CHAT_ID,
    TOOL_CLICK: process.env.TELEGRAM_CHAT_ID_AFFILIATE || process.env.TELEGRAM_CHAT_ID,
  };
  const chatId = chatIdMap[type];
  if (!token || !chatId) return;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error(`❌ Telegram Error:`, error);
  }
}

/**
 * Gửi notification chi tiết khi email được gửi thành công
 */
async function notifyEmailSuccess(to: string, subject: string, emailId: string, provider: string) {
  const time = new Date().toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const msg = `📧 <b>EMAIL ĐƯỢC GỬI THÀNH CÔNG</b>\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `📧 To: <code>${to}</code>\n` +
    `📝 Subject: ${subject}\n` +
    `🆔 Email ID: <code>${emailId}</code>\n` +
    `📡 Provider: <code>${provider}</code>\n` +
    `⏰ Time: ${time}`;
  
  await sendTelegram(msg, 'ACTIVATE');
}

/**
 * Gửi notification chi tiết khi email gửi thất bại
 */
async function notifyEmailError(to: string, subject: string, errorMsg: string, provider: string, attemptFallback: boolean) {
  const time = new Date().toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const fallbackMsg = attemptFallback ? '\n🔄 Fallback: <b>Đang thử provider khác...</b>' : '';
  
  const msg = `⚠️ <b>LỖI GỬI EMAIL</b>\n\n` +
    `━━━━━━━━━━━━━━\n` +
    `📧 To: <code>${to}</code>\n` +
    `📝 Subject: ${subject}\n` +
    `📡 Provider: <code>${provider}</code>\n` +
    `❌ Error: ${errorMsg}${fallbackMsg}\n` +
    `⏰ Time: ${time}`;
  
  await sendTelegram(msg, 'ACTIVATE');
}

export async function sendToolShareClickNotification(data: {
  refUserId: number
  url: string
  deviceType: string | null
  referer: string | null
  ipAddress: string | null
  city: string | null
}) {
  const time = new Date().toLocaleString('vi-VN', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const message = `🔗 <b>Tool Share Click!</b>
━━━━━━━━━━━━━━
👤 Người chia sẻ: #${data.refUserId}
🔗 Link: ${data.url}
📱 Device: ${data.deviceType || 'Unknown'}
🌐 Referrer: ${data.referer || 'Direct'}
🌍 IP: ${data.ipAddress || 'Unknown'}
🏙️ City: ${data.city || 'Unknown'}
⏰ Time: ${time}`

  await sendTelegram(message, 'TOOL_CLICK')
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * GMAIL CLIENT
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Cấu hình OAuth2 Client cho Gmail
 */
function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

/**
 * ══════════════════════════════════════════════════════════════════════════��════
 * RESEND (FALLBACK PROVIDER)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Gửi email qua Resend API
 */
async function sendViaResend(to: string, subject: string, htmlBody: string): Promise<{ success: boolean; message: string; emailId?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { success: false, message: 'RESEND_API_KEY not configured' };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Học Viện BRK <onboarding@resend.dev>',
        to: to,
        subject: subject,
        html: htmlBody,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, message: data.message || 'Resend API error' };
    }

    return { success: true, message: 'Email sent via Resend', emailId: data.id };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Resend error';
    return { success: false, message: errMsg };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CORE EMAIL FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Hàm chung để gửi Email qua Gmail API
 * @returns { success: boolean, message: string }
 */
async function sendGmail(to: string, subject: string, htmlBody: string, bcc?: string): Promise<{ success: boolean; message: string }> {
  try {
    const gmail = getGmailClient();
    const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
    const fromName = 'Học Viện BRK';
    const encodedFromName = `=?utf-8?B?${Buffer.from(fromName).toString('base64')}?=`;
    const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `From: ${encodedFromName} <${adminEmail}>`,
      `To: ${to}`,
      bcc ? `Bcc: ${bcc}` : '',
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: ${encodedSubject}`,
      ``,
      htmlBody,
    ].filter(line => line !== '').join('\n');
    const encodedMessage = Buffer.from(messageParts).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
    const emailId = result.data.id as string;
    console.log(`✅ Email sent to ${to}: ${emailId}`);
    
    // Notify success via Telegram
    await notifyEmailSuccess(to, subject, emailId, 'Gmail API');
    
    return { success: true, message: 'Email sent successfully' };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Email Error sending to ${to}:`, errorMsg);
    
    // Notify error via Telegram - Try fallback
    const hasResendKey = !!process.env.RESEND_API_KEY;
    await notifyEmailError(to, subject, errorMsg, 'Gmail API', hasResendKey);
    
    // Try fallback to Resend if available
    if (hasResendKey) {
      console.log(`🔄 Trying fallback to Resend for ${to}...`);
      const resendResult = await sendViaResend(to, subject, htmlBody);
      
      if (resendResult.success) {
        await notifyEmailSuccess(to, subject, resendResult.emailId || 'N/A', 'Resend (fallback)');
        return { success: true, message: 'Email sent via Resend fallback' };
      } else {
        await notifyEmailError(to, subject, resendResult.message, 'Resend (fallback)', false);
        return { success: false, message: `Gmail failed, Resend also failed: ${resendResult.message}` };
      }
    }
    
    return { success: false, message: errorMsg };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EMAIL TEMPLATES
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Template 1: Simple Clean
function getVerificationTemplate1(name: string, verifyUrl: string, emailId: string, code: string): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
  <div style="background: white; border-radius: 12px; padding: 30px; text-align: center;">
    <h2 style="color: #4f46e5; margin-bottom: 20px;">Xác Minh Email</h2>
    <p style="color: #374151; font-size: 16px;">Chào <b>${name}</b>,</p>
    <p style="color: #6b7280;">Mã xác minh của bạn là:</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
      <h1 style="color: #4f46e5; font-size: 32px; margin: 0; letter-spacing: 8px;">${code}</h1>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Hoặc nhấn nút below để kích hoạt tài khoản:</p>
    <div style="margin: 20px 0;">
      <a href="${verifyUrl}" style="background: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Kích Hoạt Tài Khoản</a>
    </div>
    <p style="font-size: 11px; color: #d1d5db; margin-top: 20px;">ID: ${emailId}</p>
  </div>
</div>`;
}

// Template 2: Modern Card
function getVerificationTemplate2(name: string, verifyUrl: string, emailId: string, greeting: string, code: string): string {
  const quote = randomPick(quotes);
  return `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Xác Nhận Tài Khoản</h1>
    </div>
    <div style="padding: 30px;">
      <p style="color: #1f2937; font-size: 16px;">${greeting} <span style="font-weight: 600;">${name}</span></p>
      <p style="color: #4b5563; line-height: 1.6;">Chào mừng bạn tham gia Học Viện BRK. Nhập mã này để xác nhận:</p>
      <div style="background: #f9fafb; border: 2px dashed #4f46e5; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <h1 style="color: #4f46e5; font-size: 40px; margin: 0; letter-spacing: 10px;">${code}</h1>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">Hoặc click vào link:</p>
        <a href="${verifyUrl}" style="background: #4f46e5; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(79,70,229,0.3);">Xác Nhận Ngay</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; font-style: italic;">"${quote}"</p>
      <p style="color: #9ca3af; font-size: 11px; margin-top: 20px; text-align: center;">ID: ${emailId}</p>
    </div>
  </div>
</div>`;
}

// Template 3: Minimal
function getVerificationTemplate3(name: string, verifyUrl: string, emailId: string, code: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #111827; font-size: 24px; margin-bottom: 24px;">Xác minh tài khoản</h1>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">Xin chào <b>${name}</b>,</p>
  <p style="color: #4b5563;">Mã xác minh của bạn:</p>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; text-align: center; margin: 15px 0;">
    <span style="font-size: 28px; font-weight: 700; color: #111827; letter-spacing: 5px;">${code}</span>
  </div>
  <p style="color: #4b5563; line-height: 1.6;">Hoặc nhấn nút bên dưới để kích hoạt:</p>
  <div style="margin: 28px 0;">
    <a href="${verifyUrl}" style="background: #111827; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Kích hoạt</a>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #9ca3af; font-size: 11px;">Email ID: ${emailId}</p>
</div>`;
}

/**
 * Get random verification template
 */
function getRandomVerificationTemplate(name: string, token: string): { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn';
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
  const emailId = generateEmailId();
  const greeting = randomPick(greetings);
  
  // Extract numeric code if token is a 6-digit number
  const code = /^\d{6}$/.test(token) ? token : "Mã link";
  
  // Random subject
  const subject = randomPick(verificationSubjects);
  
  // Random template (1, 2, or 3)
  const templateNum = Math.floor(Math.random() * 3) + 1;
  let html = '';
  
  if (templateNum === 1) {
    html = getVerificationTemplate1(name, verifyUrl, emailId, code);
  } else if (templateNum === 2) {
    html = getVerificationTemplate2(name, verifyUrl, emailId, greeting, code);
  } else {
    html = getVerificationTemplate3(name, verifyUrl, emailId, code);
  }
  
  return { subject, html };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTED EMAIL FUNCTIONS
 * ═════════════════════════════════════���═���═══════════════════════════════════════
 */

export async function sendWelcomeEmail(to: string, studentName: string, studentId: number) {
  const subject = `[Học Viện BRK] Chào mừng bạn gia nhập học viện - Mã học tập của bạn là #${studentId}`;
  const htmlBody = `Chào mừng <b>${studentName}</b> đến với Học Viện BRK,<br><br>Mã số học tập của bạn là: <b>#${studentId}</b>`;
  const result = await sendGmail(to, subject, htmlBody);
  return result;
}

export async function sendVerificationEmail(to: string, studentName: string, token: string) {
  // Sử dụng template ngẫu nhiên với random subject và HTML
  const { subject, html } = getRandomVerificationTemplate(studentName, token);
  const result = await sendGmail(to, subject, html);
  return result;
}

export async function sendActivationEmail(to: string, studentName: string, studentId: number, courseName: string, _customContent: string | null) {
  const subject = `[Học Viện BRK] Kích hoạt thành công khóa học: ${courseName}`;
  const htmlBody = `Chào <b>${studentName}</b> (#${studentId}),<br><br>Khóa học <b>${courseName}</b> đã được kích hoạt.`;
  const result = await sendGmail(to, subject, htmlBody);
  return result;
}

export async function sendLoginNotification(user: { id: number; name: string }, _ip: string, _userAgent: string) {
  const msg = `🔑 <b>THÔNG BÁO ĐĂNG NHẬP</b>\n👤 Học viên: <b>${user.name}</b> (#${user.id})`;
  await sendTelegram(msg, 'LESSON');
}

export async function sendPasswordChangedNotification(user: { id: number; name: string; email: string }) {
  const msg = `🔐 <b>ĐỔI MẬT KHẨU</b>\n👤 Học viên: <b>${user.name}</b> (#${user.id})\n📧 Email: ${user.email}\n\n✅ Đã đổi từ mật khẩu mặc định sang mật khẩu cá nhân`;
  await sendTelegram(msg, 'LESSON');
}

interface GoalConfig {
  videoPerDay?: number;
  days?: number;
  isLivestream?: boolean;
  livePerDay?: number;
  liveDays?: number;
  moneyGoal?: number;
  targetVal?: number;
}

export async function sendSurveyNotification(data: {
  studentName: string,
  studentId: number,
  goal: string,
  targetPointName: string,
  courses: string[],
  answers: Record<string, unknown>
}) {
  const coursesList = data.courses.length > 0 
    ? data.courses.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : 'Chưa xác định';

  const inputs: string[] = [];
  const selections: string[] = [];

  Object.entries(data.answers).forEach(([key, value]) => {
    if (key === 'goal_config') return;

    if (key.endsWith('_name') || key.endsWith('_id') || key.endsWith('_url') || key === 'free_text_submit') {
      const label = key.endsWith('_name') ? 'Kênh' : key.endsWith('_id') ? 'Link/ID' : 'Nhập liệu';
      inputs.push(`<b>${label}:</b> ${value}`);
    } else if (typeof value === 'string' && value !== 'Xác nhận' && value !== 'Tiếp tục') {
      selections.push(`• ${value}`);
    }
  });

  const config = data.answers['goal_config'] as GoalConfig | undefined;
  let configDetails = '';
  if (config && typeof config === 'object') {
    configDetails = `📝 <b>CHI TIẾT CAM KẾT:</b>\n` +
      `• Đăng bài: ${config.videoPerDay} video/ngày trong ${config.days} ngày\n`;
    
    if (config.isLivestream) {
      configDetails += `• Livestream: ${config.livePerDay} phút/ngày trong ${config.liveDays} ngày\n`;
    }
    
    if (config.moneyGoal) configDetails += `• Mục tiêu tài chính: ${config.moneyGoal} VNĐ\n`;
    if (config.targetVal) configDetails += `• Mục tiêu Follow: ${config.targetVal}\n`;
  }

  const msg = `🎯 <b>HỌC VIÊN HOÀN THÀNH KHẢO SÁT</b>\n\n` +
    `👤 Học viên: <b>${data.studentName}</b> (#${data.studentId})\n` +
    `🏁 Đích đến: <b>Nút ${data.targetPointName}</b>\n` +
    `🏆 Mục tiêu: <b>${data.goal}</b>\n\n` +
    (inputs.length > 0 ? `<b>⌨️ THÔNG TIN NHẬP:</b>\n${inputs.join('\n')}\n\n` : '') +
    `<b>📊 LỰA CHỌN KHẢO SÁT:</b>\n${selections.join('\n')}\n\n` +
    `${configDetails}` +
    `<b>📚 LỘ TRÌNH KHÓA HỌC:</b>\n${coursesList}\n\n` +
    `#Survey #Roadmap #HocVienBRK`;

  await sendTelegram(msg, 'ACTIVATE');
}

export const sendTelegramAdmin = (msg: string) => sendTelegram(msg, 'ACTIVATE');
export const sendSuccessEmail = (to: string, name: string, course: string) => sendActivationEmail(to, name, 0, course, null);
export { sendGmail };

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EMAIL CAMPAIGN TELEGRAM NOTIFICATIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

type EmailCampaignEventType = 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'ERROR';

interface CampaignNotificationData {
  event: EmailCampaignEventType;
  campaignTitle: string;
  total: number;
  sent: number;
  success: number;
  failed: number;
  pauseMinutes?: number;
  resumeTime?: string;
  error?: string;
}

export async function sendEmailCampaignNotification(data: CampaignNotificationData): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID_EMAIL_CAMPAIGN;

  if (!token || !chatId) {
    console.log("[EmailCampaign] Telegram: Missing bot token or chat ID");
    return;
  }

  let message = "";
  const { event, campaignTitle, total, sent, success, failed, pauseMinutes, resumeTime, error } = data;

  switch (event) {
    case 'START':
      message = `📤 <b>BẮT ĐẦU CAMPAIGN</b>\n\n` +
        `📋 Chiến dịch: <b>${campaignTitle}</b>\n` +
        `📧 Tổng: <b>${total}</b> emails\n` +
        `⏱️ Dự kiến: ~${Math.ceil(total / 30)} phút`;
      break;

    case 'PAUSE':
      message = `⏸️ <b>PAUSE - ${sent}/${total}</b>\n\n` +
        `📋 Chiến dịch: ${campaignTitle}\n` +
        `⏳ Pause: <b>${pauseMinutes} phút</b>\n` +
        `▶️ Tiếp tục: <b>${resumeTime}</b>\n\n` +
        `📊 Đã gửi: ${sent} | ✅ Thành công: ${success} | ❌ Thất bại: ${failed}`;
      break;

    case 'RESUME':
      message = `▶️ <b>TIẾP TỤC GỬI</b>\n\n` +
        `📋 Chiến dịch: ${campaignTitle}\n` +
        `📧 Đã: <b>${sent}/${total}</b>\n` +
        `✅ Thành công: ${success} | ❌ Thất bại: ${failed}`;
      break;

    case 'COMPLETE':
      const rate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;
      message = `✅ <b>HOÀN THÀNH</b>\n\n` +
        `📋 Chiến dịch: <b>${campaignTitle}</b>\n` +
        `📧 Tổng: ${total}\n` +
        `✅ Thành công: <b>${success}</b>\n` +
        `❌ Thất bại: ${failed}\n\n` +
        `📈 Tỷ lệ thành công: <b>${rate}%</b>`;
      break;

    case 'ERROR':
      message = `⚠️ <b>LỖI CAMPAIGN</b>\n\n` +
        `📋 Chiến dịch: ${campaignTitle}\n` +
        `📧 Đã gửi: ${sent}/${total}\n` +
        `❌ Lỗi: <b>${error}</b>`;
      break;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error("[EmailCampaign] Telegram error:", err);
  }
}
```

### 3.8 `lib/email-parser.ts` — Phân tích email ngân hàng (311 dòng)

```typescript
export interface ParsedTransfer {
  phone: string | null;
  userId: number | null; // Thêm userId
  amount: number;
  courseCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  transferTime: Date | null;
  rawContent: string;
}

interface BankParser {
  pattern: RegExp;
  extract: (matches: RegExpMatchArray) => ParsedTransfer;
}

const bankParsers: BankParser[] = [
  // Mới: SDT 123456 HV 8286 COC LS03 (linh hoạt khoảng trống, dấu chấm, gạch dưới)
  {
    pattern: /SDT[\s\._]*(\d{6})[\s\._]*HV[\s\._]*(\d+)[\s\._]*COC[\s\._]*(\w+)/i,
    extract: (matches) => ({
      phone: matches[1],
      userId: parseInt(matches[2]),
      courseCode: matches[3].toUpperCase(), // Chuyển sang chữ hoa ngay lập tức
      amount: 0,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  },
  {
    pattern: /(\d{10,11})\s*c[oó]\s*(\w+)|(\w+)\s*c[oó]\s*(\d{10,11})/i,
    extract: (matches) => ({
      phone: matches[1] || matches[4] || null,
      userId: null,
      amount: 0,
      courseCode: matches[2] || matches[3] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  },
  {
    pattern: /ND:\s*(\d{10,11})\s+(\w+)|(\w+)\s+(\d{10,11})/i,
    extract: (matches) => ({
      phone: matches[1] || matches[4] || null,
      userId: null,
      amount: 0,
      courseCode: matches[2] || matches[3] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  },
  {
    pattern: /(\d{10,11}).*?(c[oó]?|nạp).*?(\w{2,10})/i,
    extract: (matches) => ({
      phone: matches[1] || null,
      userId: null,
      amount: 0,
      courseCode: matches[3] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: matches[0]
    })
  }
];

export function parseBankEmail(content: string): ParsedTransfer | null {
  const normalizedContent = content.replace(/\s+/g, ' ').trim();
  
  for (const parser of bankParsers) {
    const matches = normalizedContent.match(parser.pattern);
    if (matches) {
      return parser.extract(matches);
    }
  }
  
  const phoneMatch = normalizedContent.match(/(\d{10,11})/);
  const courseMatch = normalizedContent.match(/c[oó]\s*(\w{2,10})|(\w{2,10})\s*c[oó]/i);
  
  if (phoneMatch || courseMatch) {
    return {
      phone: phoneMatch?.[1] || null,
      userId: null,
      amount: 0,
      courseCode: courseMatch?.[1] || courseMatch?.[2] || null,
      bankName: null,
      accountNumber: null,
      transferTime: null,
      rawContent: normalizedContent.substring(0, 200)
    };
  }
  
  return null;
}

export function extractAmount(content: string): number {
  const amountPatterns = [
    /(\d{1,3}(?:\.\d{3})*)\s*đ/gi,
    /SMT:\s*(\d{1,3}(?:\.\d{3})*)/gi,
    /(\d{6,12})/g
  ];
  
  for (const pattern of amountPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      const amountStr = matches[0]
        .replace(/\D/g, '')
        .replace(/^0+/, '');
      const amount = parseInt(amountStr, 10);
      if (amount >= 10000 && amount <= 1000000000) {
        return amount;
      }
    }
  }
  
  return 0;
}

export function extractBankName(content: string): string | null {
  const bankNames = [
    'Vietcombank', 'VCB',
    'Techcombank', 'TCB',
    'MB Bank', 'MBBank', 'MB',
    'BIDV',
    'Agribank', 'AGRIBANK',
    'ACB',
    'Vietinbank', 'VTB',
    'TPBank', 'TPB',
    'Sacombank', 'SCB',
    'SHB',
    'SeABank',
    'Eximbank', 'EIB',
    'HD Bank',
    'Bac A Bank', 'BAB',
    'Oceanbank',
    'GPBank',
    'Kiên Long', 'KLB',
    'Nam A Bank', 'NAB',
    'PGBank',
    'Public Bank', 'PB',
    'Saigonbank', 'SGB'
  ];
  
  const upperContent = content.toUpperCase();
  
  for (const bank of bankNames) {
    if (upperContent.includes(bank.toUpperCase())) {
      return bank;
    }
  }
  
  return null;
}

export function extractAccountNumber(content: string): string | null {
  const patterns = [
    /STK[:\s]*(\d{6,20})/i,
    /TK[:\s]*(\d{6,20})/i,
    /(\d{6,20})/g
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches && matches[1]) {
      return matches[1];
    }
  }
  
  return null;
}

export function extractTransferTime(content: string): Date | null {
  const patterns = [
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/,
    /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    /(\d{1,2}):(\d{2})\s+(\d{2})[\/\-](\d{2})[\/\-](\d{4})/
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      try {
        if (matches.length >= 6) {
          const [_, d1, d2, y, h, min] = matches;
          return new Date(`${y}-${d2}-${d1}T${h || '00'}:${min || '00'}:00`);
        }
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

export interface FullParsedTransfer {
  phone: string | null;
  userId: number | null; // Thêm userId
  amount: number;
  courseCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  transferTime: Date | null;
  rawContent: string;
}

export function parseFullTransferEmail(content: string): FullParsedTransfer {
  const parsed = parseBankEmail(content);
  const amount = extractAmount(content);
  const bankName = extractBankName(content);
  const accountNumber = extractAccountNumber(content);
  const transferTime = extractTransferTime(content);
  
  return {
    phone: parsed?.phone || null,
    userId: parsed?.userId || null,
    amount,
    courseCode: parsed?.courseCode || null,
    bankName,
    accountNumber,
    transferTime,
    rawContent: content.substring(0, 500)
  };
}

export function matchWithEnrollment(
  transfer: FullParsedTransfer,
  enrollments: Array<{
    id: number;
    userId: number; // Thêm userId vào input
    courseId: number;
    course: {
      id_khoa: string;
      phi_coc: number;
      noidung_stk: string | null;
    };
    user: {
      phone: string | null;
    };
    status: string;
  }>
): { matched: boolean; enrollmentId: number | null; reason: string } {
  
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'PENDING') continue;
    
    const courseCode = enrollment.course.id_khoa.toUpperCase();
    const transferCourseCode = transfer.courseCode?.toUpperCase();
    
    // Khớp mã khóa học
    const courseCodeMatch = transferCourseCode && 
      (courseCode.includes(transferCourseCode) || transferCourseCode.includes(courseCode));
    
    // Khớp số tiền
    const amountMatch = transfer.amount >= enrollment.course.phi_coc;

    // Ưu tiên 1: Khớp theo userId
    const userIdMatch = transfer.userId && transfer.userId === enrollment.userId;
    
    if (userIdMatch && courseCodeMatch && amountMatch) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp tuyệt đối: Mã HV ${transfer.userId} + Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
      };
    }

    // Ưu tiên 2: Khớp theo SĐT (6 số cuối hoặc full)
    const userPhone = enrollment.user.phone?.replace(/\D/g, '') || '';
    const transferPhone = transfer.phone?.replace(/\D/g, '') || '';
    const phoneMatch = transferPhone && userPhone && userPhone.includes(transferPhone);
    
    if (phoneMatch && courseCodeMatch && amountMatch) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp: SĐT ${transfer.phone} + Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
      };
    }
    
    // Ưu tiên 3: Chỉ khớp SĐT + Số tiền
    if (phoneMatch && amountMatch && !transfer.courseCode) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp: SĐT ${transfer.phone} + Số tiền ${transfer.amount}`
      };
    }
    
    // Ưu tiên 4: Chỉ khớp Mã KH + Số tiền
    if (courseCodeMatch && amountMatch && !transfer.phone && !transfer.userId) {
      return {
        matched: true,
        enrollmentId: enrollment.id,
        reason: `Khớp: Mã KH ${transfer.courseCode} + Số tiền ${transfer.amount}`
      };
    }
  }
  
  return {
    matched: false,
    enrollmentId: null,
    reason: 'Không tìm thấy enrollment phù hợp'
  };
}

```

---

## IV. Campaign API

### 4.1 POST /api/admin/campaigns

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveRecipients } from "@/lib/email-campaign-runner";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const data = await req.json();
    const { 
      title, 
      notificationType, 
      recipientSource, 
      recipientFilter, 
      recipientCsvData,
      subject, 
      htmlContent 
    } = data;

    // Tạo chiến dịch DRAFT trước để lấy ID
    const campaign = await prisma.emailCampaign.create({
      data: {
        title,
        notificationType,
        recipientSource,
        recipientFilter,
        recipientCsvData,
        subject,
        htmlContent,
        createdBy: parseInt(session.user.id || "0"),
        status: "DRAFT",
      }
    });

    // Tính toán tổng số người nhận ngay lúc này
    const recipients = await resolveRecipients(campaign.id);
    
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { totalRecipients: recipients.length }
    });

    return NextResponse.json(updatedCampaign);

  } catch (error: any) {
    console.error("Create campaign error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.2 GET /api/admin/campaigns/list

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
        notificationType: true, // Thêm trường này vì UI đang sử dụng
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.3 GET|PATCH|DELETE /api/admin/campaigns/[id]

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  
  // LOG để debug (Bạn sẽ thấy trong Terminal)
  console.log(`🔍 [GET Campaign] Đang truy vấn ID: ${idStr}`);

  if (!idStr || idStr === "undefined" || isNaN(parseInt(idStr))) {
    return new NextResponse("ID chiến dịch không hợp lệ", { status: 400 });
  }

  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        creator: { select: { name: true } },
        senders: { include: { sender: true } },
      }
    });

    if (!campaign) {
      console.log(`❌ [GET Campaign] Không tìm thấy ID: ${id} trong Database`);
      return new NextResponse("Chiến dịch không tồn tại", { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("❌ [GET Campaign] Lỗi Prisma:", error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const data = await req.json();
    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        title: data.title,
        notificationType: data.notificationType,
        recipientSource: data.recipientSource,
        recipientFilter: data.recipientFilter,
        recipientCsvData: data.recipientCsvData,
        subject: data.subject,
        htmlContent: data.htmlContent,
        status: data.status || "DRAFT", // Mặc định về Draft nếu sửa nội dung quan trọng
        totalRecipients: data.totalRecipients || 0,
      }
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prisma.emailCampaign.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.4 GET /api/admin/campaigns/[id]/logs

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const logs = await prisma.emailCampaignLog.findMany({
      where: { campaignId: id },
      orderBy: { sentAt: "desc" },
    });

    const allSenders = await prisma.emailSender.findMany({
      select: { id: true, email: true, label: true },
      orderBy: { id: 'asc' }
    });

    const logsBySender: Record<number, typeof logs> = {};
    const logsNoSender: typeof logs = [];

    for (const log of logs) {
      if (log.senderId && allSenders.find(s => s.id === log.senderId)) {
        if (!logsBySender[log.senderId]) {
          logsBySender[log.senderId] = [];
        }
        logsBySender[log.senderId].push(log);
      } else {
        logsNoSender.push(log);
      }
    }

    const senderStats = allSenders.map(sender => ({
      ...sender,
      total: logsBySender[sender.id]?.length || 0,
      sent: logsBySender[sender.id]?.filter(l => l.status === 'SENT').length || 0,
      bounced: logsBySender[sender.id]?.filter(l => l.status === 'BOUNCED').length || 0,
      failed: logsBySender[sender.id]?.filter(l => l.status === 'FAILED').length || 0,
    }));

    const issueLogsRaw = logs.filter(l => l.status === 'FAILED' || l.status === 'SKIPPED' || l.status === 'BOUNCED');
    const uniqueEmails = [...new Set(issueLogsRaw.map(l => l.toEmail))];
    const users = await prisma.user.findMany({
      where: { email: { in: uniqueEmails } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map(u => [u.email.toLowerCase(), u]));

    const issueLogs = issueLogsRaw.map(l => {
      const user = userMap.get(l.toEmail.toLowerCase());
      const sender = l.senderId ? allSenders.find(s => s.id === l.senderId) : null;
      return {
        id: l.id,
        toEmail: l.toEmail,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        senderEmail: sender?.email ?? null,
        senderLabel: sender?.label ?? null,
        status: l.status,
        errorType: l.errorType,
        errorCode: l.errorCode,
        sentAt: l.sentAt,
      };
    });

    return NextResponse.json({
      logsBySender,
      senders: allSenders,
      senderStats,
      logsNoSender,
      issueLogs,
      summary: {
        total: logs.length,
        sent: logs.filter(l => l.status === 'SENT').length,
        bounced: logs.filter(l => l.status === 'BOUNCED').length,
        failed: logs.filter(l => l.status === 'FAILED').length,
        skipped: logs.filter(l => l.status === 'SKIPPED').length,
      }
    });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.5 POST /api/admin/campaigns/[id]/send-batch

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { 
  resolveRecipients, 
  sendGmailFromSender, 
  getRandomMessageFooter, 
  injectFooter,
  getAvailableSender,
  updateSenderCooldown,
  incrementSenderSentCount,
  checkBatchStatus
} from "@/lib/email-campaign-runner";
import { spinContent } from "@/lib/email-spin";
import { getEmailConfig, randomBetween } from "@/lib/email-config";
import { sendEmailCampaignNotification } from "@/lib/notifications";
import { NextResponse } from "next/server";

let campaignStats: Map<number, { total: number; sent: number; success: number; failed: number; emailsInBatch: number }> = new Map();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const campaignId = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { batchSize = 20 } = await req.json();
    const config = await getEmailConfig();

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        senders: {
          include: { sender: true }
        }
      }
    });

    if (!campaign) {
      return new NextResponse("Campaign not found", { status: 404 });
    }

    const allRecipients = await resolveRecipients(campaignId);

    const existingLogs = await prisma.emailCampaignLog.findMany({
      where: { campaignId, status: { in: ['SENT', 'SKIPPED', 'FAILED'] } },
      select: { toEmail: true }
    });
    const sentEmails = new Set(existingLogs.map(l => l.toEmail));

    const unsentRecipients = allRecipients.filter(r => !sentEmails.has(r.email));
    const recipientsBatch = unsentRecipients.slice(0, batchSize);

    if (recipientsBatch.length === 0) {
      return NextResponse.json({ success: true, finished: true });
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

    const results = {
      sent: 0,
      failed: 0,
    };

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

        return NextResponse.json({ 
          success: false, 
          error: "Tất cả email sender đã hết quota hoặc đang trong thời gian chờ.",
          needsCooldown: true,
          pauseMinutes
        }, { status: 429 });
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
          where: { email: recipient.email }
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

        let subject = spinContent(campaign.subject || "").trim();
        subject = subject.replace(/\[Tên\]/g, recipient.name || "Học viên");
        subject = subject.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");

        let rawHtml = spinContent(campaign.htmlContent || "").trim();
        rawHtml = rawHtml.replace(/\[Tên\]/g, recipient.name || "bạn");
        rawHtml = rawHtml.replace(/\[MãHV\]/g, recipient.userId?.toString() || "");
        
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
                <img src="https://giautoandien.io.vn/logobrk-50px.png" alt="HỌC VIỆN BRK" style="height: 40px; display: block; margin: 0 auto; color: #FACC15; font-weight: bold; font-size: 20px; border: 0;">
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
                Bạn nhận được thông báo này vì là thành viên của <b>Học Viện BRK</b>.<br>
                Nếu không muốn nhận những email này, bạn có thể <a href="${unsubscribeUrl}" style="color: #000000; text-decoration: underline;">Hủy đăng ký tại đây</a>.
              </p>
            </div>
          </div>
        `;
        
        await sendGmailFromSender(sender, recipient.email, subject, finalHtml);

        await prisma.emailCampaignLog.create({
          data: {
            campaignId,
            senderId: sender.id,
            toEmail: recipient.email,
            status: "SENT",
          }
        });

        await incrementSenderSentCount(sender.id);
        stats.sent++;
        stats.success++;
        stats.emailsInBatch++;
        results.sent++;

        const batchStatus = await checkBatchStatus(stats.emailsInBatch);

        if (batchStatus.shouldPause) {
          console.log(`[EmailCampaign] Đã gửi ${stats.emailsInBatch} emails. Bắt đầu pause ${batchStatus.pauseDuration} phút.`);

          stats.emailsInBatch = 0;

          await updateSenderCooldown(sender.id, batchStatus.pauseDuration);

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

          await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: {
              sentCount: { increment: results.sent },
              failedCount: { increment: results.failed },
              status: "RUNNING",
              startedAt: campaign.startedAt || new Date(),
            }
          });

          return NextResponse.json({
            success: true,
            sentInBatch: results.sent,
            needsCooldown: true,
            pauseMinutes: batchStatus.pauseDuration,
            finished: false,
            stats: {
              totalSent: stats.sent,
              totalSuccess: stats.success,
              totalFailed: stats.failed
            }
          });
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
      }
    }

    const remainingAfterBatch = unsentRecipients.length - recipientsBatch.length;
    const isCompleted = remainingAfterBatch <= 0;

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: results.sent },
        failedCount: { increment: results.failed },
        status: isCompleted ? "COMPLETED" : "RUNNING",
        startedAt: campaign.startedAt || new Date(),
        completedAt: isCompleted ? new Date() : null,
      }
    });

    if (isCompleted) {
      campaignStats.delete(campaignId);

      if (config.enableTelegramAlert) {
        await sendEmailCampaignNotification({
          event: 'COMPLETE',
          campaignTitle: campaign.title,
          total: allRecipients.length,
          sent: allRecipients.length,
          success: stats.success,
          failed: stats.failed
        });
      }
    }

    return NextResponse.json({
      success: true,
      sentInBatch: results.sent,
      failedInBatch: results.failed,
      finished: isCompleted,
      stats: {
        totalSent: stats.sent,
        totalSuccess: stats.success,
        totalFailed: stats.failed
      }
    });

  } catch (error: any) {
    console.error("Batch send error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.6 POST /api/admin/campaigns/[id]/restart

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Xóa toàn bộ nhật ký cũ của chiến dịch này
    await prisma.emailCampaignLog.deleteMany({
      where: { campaignId: id }
    });

    // 2. Đặt lại các thông số về 0 và trạng thái về ACTIVE
    const updated = await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: "ACTIVE",
        sentCount: 0,
        failedCount: 0,
        startedAt: null,
        completedAt: null,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.7 GET /api/admin/campaigns/[id]/progress

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  
  if (!idStr || idStr === "undefined" || isNaN(parseInt(idStr))) {
    return new NextResponse("ID chiến dịch không hợp lệ", { status: 400 });
  }

  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
      }
    });

    if (!campaign) {
      return new NextResponse("Chiến dịch không tồn tại", { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("❌ [GET Progress] Lỗi Prisma:", error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.8 POST /api/admin/campaigns/bounce-scan

```typescript
import { auth } from "@/auth";
import { processBounceEmails } from "@/lib/email-campaign-runner";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const stats = await processBounceEmails();
    
    return NextResponse.json({
      success: true,
      ...stats
    });
  } catch (error: any) {
    console.error("Bounce scan error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.9 GET /api/admin/campaigns/potential-recipients

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const courseId = searchParams.get("courseId");

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let users: any[] = [];

    if (source === "DB_ALL") {
      users = await prisma.user.findMany({
        where: {
          emailVerified: { not: null },
          email: { contains: "@" }
        },
        select: { id: true, email: true, name: true, role: true, emailVerified: true },
        orderBy: { createdAt: "desc" }
      });
    } else if (source === "DB_ACTIVE" && courseId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          courseId: parseInt(courseId),
          status: "ACTIVE",
          user: { emailVerified: { not: null } }
        },
        include: {
          user: { 
            select: { id: true, email: true, name: true, role: true, emailVerified: true }
          }
        }
      });
      users = enrollments.map(e => e.user);
    }

    return NextResponse.json(users);
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 4.10 POST /api/admin/campaigns/google-sheets

```typescript
import { auth } from "@/auth";
import { getOAuth2Client } from "@/lib/google-auth";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { tryDecrypt } from "@/lib/email-encryptor";

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { spreadsheetId, range = "Sheet1!A:B" } = await req.json();

    // Lấy token của một sender bất kỳ đã kết nối để mượn quyền đọc Sheet
    // Hoặc tốt nhất là dùng một tài khoản đã kết nối
    const sender = await prisma.emailSender.findFirst({
      where: { isActive: true }
    });

    if (!sender) {
      return new NextResponse("Vui lòng kết nối ít nhất 1 Google Account trong Email Pool để sử dụng tính năng này.", { status: 400 });
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: tryDecrypt(sender.refreshToken),
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json([]);
    }

    // Giả định cột 1 là Email, cột 2 là Tên
    const recipients = rows.slice(1).map((row, index) => ({
      id: 9000 + index, // ID tạm để bảng chọn hoạt động
      email: row[0],
      name: row[1] || "Học viên",
    })).filter(r => r.email && r.email.includes("@"));

    return NextResponse.json(recipients);

  } catch (error: any) {
    console.error("Google Sheets Error:", error);
    return new NextResponse(`Lỗi Google Sheets: ${error.message}`, { status: 500 });
  }
}

```

---

## V. Senders API

### 5.1 GET /api/admin/senders/list

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const senders = await prisma.emailSender.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(senders);
  } catch (error: any) {
    console.error("[Senders List] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

```

### 5.2 GET /api/admin/senders/validate

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google-auth";
import { tryDecrypt } from "@/lib/email-encryptor";

interface SenderValidation {
  id: number;
  email: string;
  label: string;
  isValid: boolean;
  error?: string;
}

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const senders = await prisma.emailSender.findMany({
      orderBy: { createdAt: "desc" },
    });

    const results: SenderValidation[] = [];
    const invalidSenders: number[] = [];

    for (const sender of senders) {
      try {
        const oauth2Client = getOAuth2Client();
        
        oauth2Client.setCredentials({
          refresh_token: tryDecrypt(sender.refreshToken),
        });

        // Thử refresh token để kiểm tra
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        if (credentials.access_token) {
          results.push({
            id: sender.id,
            email: sender.email,
            label: sender.label,
            isValid: true,
          });
        } else {
          results.push({
            id: sender.id,
            email: sender.email,
            label: sender.label,
            isValid: false,
            error: "Không nhận được access token",
          });
          invalidSenders.push(sender.id);
        }
      } catch (error: any) {
        let errorMessage = "Lỗi không xác định";
        
        if (error.message?.includes("invalid_grant")) {
          errorMessage = "Token đã hết hạn hoặc bị revoke. Cần re-authenticate.";
        } else if (error.message?.includes("invalid_client")) {
          errorMessage = "Client credentials không hợp lệ.";
        } else if (error.message?.includes(" unauthorized")) {
          errorMessage = "Không có quyền truy cập Gmail API.";
        } else {
          errorMessage = error.message || "Lỗi kết nối";
        }

        results.push({
          id: sender.id,
          email: sender.email,
          label: sender.label,
          isValid: false,
          error: errorMessage,
        });
        invalidSenders.push(sender.id);
      }
    }

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.filter(r => !r.isValid).length;

    return NextResponse.json({
      results,
      summary: {
        total: senders.length,
        valid: validCount,
        invalid: invalidCount,
        readyToSend: validCount > 0,
      },
      invalidSenders,
    });
  } catch (error: any) {
    console.error("[Validate Senders] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

```

### 5.3 DELETE /api/admin/senders/[id]

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 1. Cập nhật các Logs liên quan: Chuyển senderId về null thay vì xóa log 
    // (để bạn vẫn giữ được lịch sử gửi của Campaign)
    await prisma.emailCampaignLog.updateMany({
      where: { senderId: id },
      data: { senderId: null }
    });

    // 2. Xóa các bản ghi trong bảng trung gian EmailCampaignSender
    await prisma.emailCampaignSender.deleteMany({
      where: { senderId: id }
    });

    // 3. Cuối cùng mới xóa Sender
    await prisma.emailSender.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Lỗi khi xóa Sender:", error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}

```

---

## VI. Email Config API

### 6.1 GET|PUT /api/admin/email-config

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { getEmailConfig, saveEmailConfig, WARMUP_LIMITS } from "@/lib/email-config"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await getEmailConfig()

    const messages = await prisma.message.findMany({
      select: { id: true, content: true },
      orderBy: { id: 'asc' }
    })

    const satellites = await prisma.emailSender.findMany({
      select: {
        id: true,
        label: true,
        email: true,
        isActive: true,
        sentToday: true,
        dailyLimit: true,
        createdAt: true,
      },
      orderBy: { label: 'asc' }
    })

    const satellitesWithWarmup = satellites.map(s => {
      const days = Math.floor((Date.now() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      let warmupStage = "Ready"
      if (days < 7) warmupStage = "W1 (10d)"
      else if (days < 14) warmupStage = "W2 (25d)"
      else if (days < 21) warmupStage = "W3 (50d)"
      else if (days < 30) warmupStage = "W4 (100d)"

      return {
        ...s,
        warmupStage,
        remainingQuota: s.dailyLimit - s.sentToday
      }
    })

    return NextResponse.json({
      config,
      messages,
      satellites: satellitesWithWarmup,
      warmupLimits: WARMUP_LIMITS
    })
  } catch (error: any) {
    console.error("[EmailConfig] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      emailsBeforePauseMin,
      emailsBeforePauseMax,
      pauseDurationMin,
      pauseDurationMax,
      interEmailDelayMin,
      interEmailDelayMax,
      enableTelegramAlert,
      telegramChatId,
      enableRandomMessageFooter
    } = body

    const configUpdates: any = {}

    if (emailsBeforePauseMin !== undefined) configUpdates.emailsBeforePauseMin = Math.max(20, Math.min(100, emailsBeforePauseMin))
    if (emailsBeforePauseMax !== undefined) configUpdates.emailsBeforePauseMax = Math.max(20, Math.min(100, emailsBeforePauseMax))
    if (pauseDurationMin !== undefined) configUpdates.pauseDurationMin = Math.max(5, Math.min(60, pauseDurationMin))
    if (pauseDurationMax !== undefined) configUpdates.pauseDurationMax = Math.max(5, Math.min(60, pauseDurationMax))
    if (interEmailDelayMin !== undefined) configUpdates.interEmailDelayMin = Math.max(1, Math.min(30, interEmailDelayMin))
    if (interEmailDelayMax !== undefined) configUpdates.interEmailDelayMax = Math.max(1, Math.min(30, interEmailDelayMax))
    if (enableTelegramAlert !== undefined) configUpdates.enableTelegramAlert = Boolean(enableTelegramAlert)
    if (telegramChatId !== undefined) configUpdates.telegramChatId = telegramChatId
    if (enableRandomMessageFooter !== undefined) configUpdates.enableRandomMessageFooter = Boolean(enableRandomMessageFooter)

    await saveEmailConfig(configUpdates)

    const updatedConfig = await getEmailConfig()

    return NextResponse.json({
      success: true,
      config: updatedConfig
    })
  } catch (error: any) {
    console.error("[EmailConfig] PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

```

| Field | Min | Max |
|---|---|---|
| emailsBeforePauseMin/Max | 20 | 100 |
| pauseDurationMin/Max | 5 | 60 |
| interEmailDelayMin/Max | 1 | 30 |

---

## VII. OAuth & Blacklist API

### 7.1 GET /api/admin/auth/google

```typescript
import { auth } from "@/auth";
import { getAuthUrl } from "@/lib/google-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  // Kiểm tra quyền Admin
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}

```

### 7.2 GET /api/admin/auth/google/callback

```typescript
import { auth } from "@/auth";
import { getOAuth2Client } from "@/lib/google-auth";
import { encrypt } from "@/lib/email-encryptor";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!code) {
    return new NextResponse("Code is missing", { status: 400 });
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return new NextResponse("Refresh token is missing. Please disconnect and reconnect again.", { status: 400 });
    }

    // Lấy thông tin email từ Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      return new NextResponse("Could not fetch email from Google", { status: 400 });
    }

    // Mã hóa refresh_token
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Lưu hoặc cập nhật EmailSender
    await prisma.emailSender.upsert({
      where: { email },
      update: {
        refreshToken: encryptedRefreshToken,
        clientId: process.env.GMAIL_CLIENT_ID || "",
        // Không cập nhật label nếu đã có
        isActive: true,
      },
      create: {
        email,
        label: `Vệ tinh ${email.split('@')[0]}`,
        refreshToken: encryptedRefreshToken,
        clientId: process.env.GMAIL_CLIENT_ID || "",
        dailyLimit: 480,
        isMain: email === "hocvienbrk@gmail.com", // Giả định email chính
      },
    });

    // Quay lại trang quản lý (trang này sẽ được tạo ở bước sau)
    return NextResponse.redirect(new URL("/tools/email-mkt", req.url));

  } catch (error: any) {
    console.error("OAuth Callback Error:", error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}

```

### 7.3 DELETE /api/admin/blacklist/[email]

```typescript
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);

  try {
    await prisma.emailBlacklist.delete({
      where: { email: decodedEmail },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

```

### 7.4 GET /api/unsubscribe

```typescript
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return new NextResponse("Email is required", { status: 400 });
  }

  try {
    // Thêm vào blacklist
    await prisma.emailBlacklist.upsert({
      where: { email },
      update: { reason: "UNSUBSCRIBED" },
      create: { email, reason: "UNSUBSCRIBED" },
    });

    return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>Đã hủy đăng ký thành công</h1>
        <p>Bạn sẽ không nhận được các email thông báo từ Học Viện BRK nữa.</p>
        <a href="/">Quay lại trang chủ</a>
      </div>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } catch (error: any) {
    return new NextResponse("Error: " + error.message, { status: 500 });
  }
}

```

---

## VIII. Cron Jobs

### 8.1 Reset Sender Quota (Daily 00:00)

```typescript
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Kiểm tra Header bảo mật của Vercel Cron (tùy chọn)
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

  try {
    await prisma.emailSender.updateMany({
      data: {
        sentToday: 0,
        lastResetAt: new Date(),
      }
    });

    return NextResponse.json({ success: true, message: "Đã reset quota gửi email." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

```

### 8.2 Gmail Watch Renew (Weekly Monday 00:00)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { processPaymentEmails } from '@/lib/auto-verify';

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  console.log('🚀 Bắt đầu chạy Cron Job quét email...');

  // 1. Kiểm tra Header bảo mật
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Lỗi: Unauthorized - Sai CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Kiểm tra các biến môi trường thiết yếu
  const requiredEnv = [
    'GMAIL_CLIENT_ID', 
    'GMAIL_CLIENT_SECRET', 
    'GMAIL_REFRESH_TOKEN', 
    'GCP_PROJECT_ID'
  ];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);
  
  if (missingEnv.length > 0) {
    const errorMsg = `Thiếu biến môi trường: ${missingEnv.join(', ')}`;
    console.error(`❌ ${errorMsg}`);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }

  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost'
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    console.log(`📡 Đang gọi Gmail Watch cho dự án: ${process.env.GCP_PROJECT_ID}`);
    
    // 3. Gia hạn Watch
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
        labelIds: ['INBOX'],
      },
    });

    console.log('📧 Đang tiến hành quét email giao dịch...');
    
    // 4. Quét mail mới
    const scanResult = await processPaymentEmails();

    console.log('✅ Cron Job hoàn thành thành công!');
    return NextResponse.json({ 
      success: true, 
      watch: watchResponse.data,
      scan: scanResult 
    });
  } catch (error: any) {
    // IN LỖI CHI TIẾT RA CONSOLE ĐỂ KIỂM TRA TRÊN VERCEL LOGS
    console.error('❌ LỖI CRON JOB CHI TIẾT:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data || 'No response data'
    });

    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || undefined
    }, { status: 500 });
  }
}

```

### 8.3 Vercel Cron Config

```json
{
  "crons": [
    {
      "path": "/api/cron/gmail-watch",
      "schedule": "0 0 * * 1"
    },
    {
      "path": "/api/cron/reset-sender-quota",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Lưu ý:** Cả 2 cron cần deploy lên Vercel. `reset-sender-quota` chạy 00:00 UTC hàng ngày. `gmail-watch` chạy thứ Hai hàng tuần.

---

## IX. UI Pages

### 9.1 `app/tools/email-mkt/page.tsx` — Server Component

```typescript
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import MainHeader from '@/components/layout/MainHeader'
import { Suspense } from 'react'
import ClientContent from './ClientContent'

interface Campaign {
  id: number
  title: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: Date
  notificationType: string
}

export default async function EmailMktPage() {
  const campaigns = await prisma.emailCampaign.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      totalRecipients: true,
      sentCount: true,
      failedCount: true,
      createdAt: true,
      notificationType: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MainHeader title="EMAIL MKT" toolSlug="email-mkt" />
      <div className="max-w-lg mx-auto p-4">
        <div className="flex justify-end mb-4">
          <Link href="/tools/email-mkt/new">
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm rounded-lg px-3 py-2">
              + Tạo Mới
            </Button>
          </Link>
        </div>
        <Suspense fallback={<div className="text-center py-12">Đang tải...</div>}>
          <ClientContent initialCampaigns={campaigns} />
        </Suspense>
      </div>
    </div>
  )
}
```

### 9.2 `app/tools/email-mkt/ClientContent.tsx` — Client Component (354 dòng)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

interface Campaign {
  id: number
  title: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: Date
  notificationType: string
}

interface SenderValidation {
  id: number
  email: string
  label: string
  isValid: boolean
  error?: string
}

interface EmailConfig {
  emailsBeforePauseMin: number
  emailsBeforePauseMax: number
  pauseDurationMin: number
  pauseDurationMax: number
  interEmailDelayMin: number
  interEmailDelayMax: number
  enableTelegramAlert: boolean
  telegramChatId: string
  enableRandomMessageFooter: boolean
}

function CampaignsList({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'RUNNING': return 'bg-blue-100 text-blue-700'
      case 'ACTIVE': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (initialCampaigns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 font-medium">
        Chưa có chiến dịch nào
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {initialCampaigns.map((campaign) => (
        <div key={campaign.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{campaign.title}</h3>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(campaign.createdAt).toLocaleDateString('vi-VN')} • {campaign.totalRecipients} người nhận
              </p>
            </div>
            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatusColor(campaign.status)}`}>
              {campaign.status === 'COMPLETED' ? 'Hoàn thành' : 
               campaign.status === 'RUNNING' ? 'Đang gửi' :
               campaign.status === 'ACTIVE' ? 'Hoạt động' : 'Nháp'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600">✓ Đã gửi: {campaign.sentCount}</span>
            {campaign.failedCount > 0 && (
              <span className="text-red-500">✗ Thất bại: {campaign.failedCount}</span>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <Link href={`/tools/email-mkt/${campaign.id}`}>
              <Button className="bg-gray-100 text-gray-700 font-bold text-xs py-1.5 px-3 rounded-lg">
                Xem chi tiết
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

function SendersTab() {
  const [senders, setSenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<Record<number, SenderValidation>>({})
  const [validationSummary, setValidationSummary] = useState<{total: number; valid: number; invalid: number} | null>(null)

  useEffect(() => {
    fetch('/api/admin/senders/list')
      .then(res => res.ok ? res.json() : [])
      .then(data => { setSenders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const validateAllTokens = async () => {
    setValidating(true)
    try {
      const res = await fetch('/api/admin/senders/validate')
      if (res.ok) {
        const data = await res.json()
        const resultsMap: Record<number, SenderValidation> = {}
        data.results.forEach((r: SenderValidation) => { resultsMap[r.id] = r })
        setValidationResults(resultsMap)
        setValidationSummary(data.summary)
      }
    } catch (error) { console.error(error) }
    finally { setValidating(false) }
  }

  const removeSender = async (id: number) => {
    if (!confirm('Bạn có chắc muốn gỡ tài khoản này?')) return
    try {
      const res = await fetch(`/api/admin/senders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSenders(prev => prev.filter(s => s.id !== id))
        setValidationResults(prev => { const n = {...prev}; delete n[id]; return n })
      }
    } catch (error) { console.error(error) }
  }

  const sortedSenders = [...senders].sort((a, b) => {
    const sa = validationResults[a.id]
    const sb = validationResults[b.id]
    if (sa && !sb) return -1
    if (!sa && sb) return 1
    if (sa && sb) return Number(sa.isValid) - Number(sb.isValid)
    return 0
  })

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      <a href="/api/admin/auth/google"
        className="block w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-xl text-center">
        + Kết Nối Tài Khoản
      </a>

      <Button 
        onClick={validateAllTokens}
        disabled={validating || senders.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        {validating ? <><Loader2 className="w-5 h-5 animate-spin" />Đang kiểm tra...</> : 'Kiểm tra Token'}
      </Button>

      {validationSummary && (
        <div className={`p-4 rounded-xl border ${
          validationSummary.invalid === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className={`font-bold ${validationSummary.invalid === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
              Kết quả kiểm tra
            </h3>
            <span className={`text-2xl font-black ${validationSummary.invalid === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
              {validationSummary.valid}/{validationSummary.total}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" /> {validationSummary.valid} hợp lệ
            </span>
            {validationSummary.invalid > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" /> {validationSummary.invalid} không hợp lệ
              </span>
            )}
          </div>
        </div>
      )}

      {senders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Chưa có tài khoản nào</div>
      ) : (
        sortedSenders.map((sender) => {
          const status = validationResults[sender.id]
          const borderColor = status
            ? status.isValid ? 'border-green-300 bg-green-50/30' : 'border-red-300 bg-red-50/30'
            : 'border-gray-100'
          return (
            <div key={sender.id} className={`bg-white rounded-xl border-2 p-4 shadow-sm ${borderColor}`}>
              {status && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  status.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {status.isValid ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {status.isValid ? 'Token hợp lệ' : `Token không hợp lệ: ${status.error}`}
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{sender.label}</h3>
                  <p className="text-sm text-gray-400">{sender.email}</p>
                  {sender.isMain && (
                    <span className="mt-1 inline-block bg-black text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">Main</span>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  sender.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {sender.isActive ? 'Active' : 'Tạm ngưng'}
                </span>
              </div>
              <div className="mt-3 mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Quota hôm nay</span>
                  <span>{sender.sentToday}/{sender.dailyLimit}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(sender.sentToday / sender.dailyLimit) * 100}%` }} />
                </div>
              </div>
              <Button onClick={() => removeSender(sender.id)} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm py-2 rounded-lg">
                Gỡ bỏ
              </Button>
            </div>
          )
        })
      )}

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
        <h3 className="text-blue-900 font-bold text-sm mb-2">💡 Hướng dẫn</h3>
        <ul className="text-blue-700/80 text-xs space-y-1 list-disc list-inside">
          <li>Thêm email vào "Test Users" trong Google Cloud</li>
          <li>Tối đa 480 email/ngày</li>
        </ul>
      </div>
    </div>
  )
}

function SettingsTab() {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ type: string, text: string } | null>(null)
  const [config, setConfig] = useState<EmailConfig>({
    emailsBeforePauseMin: 30, emailsBeforePauseMax: 50,
    pauseDurationMin: 10, pauseDurationMax: 30,
    interEmailDelayMin: 2, interEmailDelayMax: 8,
    enableTelegramAlert: true, telegramChatId: '-1003871041367', enableRandomMessageFooter: false
  })

  useEffect(() => {
    fetch('/api/admin/email-config')
      .then(res => res.ok ? res.json() : { config: {} })
      .then(data => { 
        if (data.config) setConfig(prev => ({ ...prev, ...data.config })) 
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/email-config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config)
      })
      setToast({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Đã lưu!' : 'Lỗi' })
    } catch { setToast({ type: 'error', text: 'Lỗi' }) }
    finally { setIsSaving(false) }
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Đang tải...</div>
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleSave} disabled={isSaving} className="w-full bg-yellow-400 font-bold py-3 rounded-xl">
        {isSaving ? '...' : '💾 Lưu Cài Đặt'}
      </Button>
      {toast && <div className={`p-4 rounded-xl ${toast.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>{toast.text}</div>}
      
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold mb-4">📤 Batch & Pause</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Pause sau (emails)</label>
            <div className="flex gap-2">
              <input type="number" value={config.emailsBeforePauseMin} onChange={e => setConfig({...config, emailsBeforePauseMin: +e.target.value})} className="flex-1 border rounded-lg p-2" />
              <input type="number" value={config.emailsBeforePauseMax} onChange={e => setConfig({...config, emailsBeforePauseMax: +e.target.value})} className="flex-1 border rounded-lg p-2" />
            </div>
          </div>
          <div>
            <label className="text-sm">Thời gian pause (phút)</label>
            <div className="flex gap-2">
              <input type="number" value={config.pauseDurationMin} onChange={e => setConfig({...config, pauseDurationMin: +e.target.value})} className="flex-1 border rounded-lg p-2" />
              <input type="number" value={config.pauseDurationMax} onChange={e => setConfig({...config, pauseDurationMax: +e.target.value})} className="flex-1 border rounded-lg p-2" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-bold mb-4">⏱️ Delay</h3>
        <div className="flex gap-2">
          <input type="number" value={config.interEmailDelayMin} onChange={e => setConfig({...config, interEmailDelayMin: +e.target.value})} className="flex-1 border rounded-lg p-2" />
          <span>-</span>
          <input type="number" value={config.interEmailDelayMax} onChange={e => setConfig({...config, interEmailDelayMax: +e.target.value})} className="flex-1 border rounded-lg p-2" />
          <span className="text-sm">giây</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">✉️ Footer Ngẫu Nhiên</h3>
            <p className="text-xs text-gray-500">Thêm message ngẫu nhiên vào cuối email</p>
          </div>
          <button onClick={() => setConfig({...config, enableRandomMessageFooter: !config.enableRandomMessageFooter})} className={`w-12 h-7 rounded-full ${config.enableRandomMessageFooter ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-5 h-5 bg-white rounded-full transition ${config.enableRandomMessageFooter ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientContent({ initialCampaigns }: { initialCampaigns: Campaign[] }) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam === 'senders' ? 'senders' : tabParam === 'settings' ? 'settings' : 'campaigns'
  const [activeTab, setActiveTab] = useState<'campaigns' | 'senders' | 'settings'>(initialTab)

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 flex">
        <button onClick={() => setActiveTab('campaigns')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'campaigns' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>📋 Chiến dịch</button>
        <button onClick={() => setActiveTab('senders')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'senders' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>📡 Tài Khoản</button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 rounded-xl font-bold text-xs ${activeTab === 'settings' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>⚙️ Cấu Hình</button>
      </div>

      {activeTab === 'campaigns' && <CampaignsList initialCampaigns={initialCampaigns} />}
      {activeTab === 'senders' && <SendersTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </>
  )
}
```

### 9.3 `app/tools/email-mkt/new/page.tsx` — Create/Edit (367 dòng)

```tsx
'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, Image, Shuffle, User, Hash, Link2 } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { Button } from '@/components/ui/button'
import { previewSpin } from '@/lib/email-spin'

function CreateCampaignContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('id')
  const isEditMode = !!campaignId

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditMode)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [title, setTitle] = useState('')
  const [notificationType, setNotificationType] = useState('THONG_BAO')
  const [recipientSource, setRecipientSource] = useState('DB_ALL')
  const [recipientCourseId, setRecipientCourseId] = useState('')
  const [recipientCsvData, setRecipientCsvData] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')

  const [courses, setCourses] = useState<any[]>([])
  const [recipientPreview, setRecipientPreview] = useState<any[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showSpinPreview, setShowSpinPreview] = useState(false)
  const [spinPreviews, setSpinPreviews] = useState<string[]>([])

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = htmlContent.substring(0, start) + text + htmlContent.substring(end)
    setHtmlContent(newContent)
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + text.length
    }, 0)
  }

  const wrapSpin = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = htmlContent.substring(start, end)
    if (selected) {
      insertAtCursor(`{${selected}}`)
    } else {
      insertAtCursor('{option1|option2}')
    }
  }

  const insertImage = () => {
    const url = prompt('Nhập URL hình ảnh:')
    if (url) {
      insertAtCursor(`<img src="${url}" alt="" style="max-width:100%;height:auto;" />`)
    }
  }

  const handlePreviewSpin = () => {
    if (!htmlContent.trim()) return
    const raw = previewSpin(htmlContent, 3)
    setSpinPreviews(raw.map(text => {
      if (!text.includes('<p>') && !text.includes('<br')) {
        return text.replace(/\n/g, '<br/>')
      }
      return text
    }))
    setShowSpinPreview(true)
  }

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.ok ? res.json() : { courses: [] })
      .then(data => setCourses(data.courses || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!campaignId) return
    setFetching(true)
    fetch(`/api/admin/campaigns/${campaignId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setTitle(data.title || '')
          setNotificationType(data.notificationType || 'THONG_BAO')
          setRecipientSource(data.recipientSource || 'DB_ALL')
          setSubject(data.subject || '')
          setHtmlContent(data.htmlContent || '')
          if (data.recipientFilter?.courseId) {
            setRecipientCourseId(data.recipientFilter.courseId.toString())
          }
          if (data.recipientCsvData) {
            setRecipientCsvData(data.recipientCsvData)
          }
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [campaignId])

  const getNotificationTypes = () => [
    { value: 'THONG_BAO', label: 'Thông báo chung' },
    { value: 'KICH_HOAT', label: 'Kích hoạt khóa học' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'CHUC_MUNG', label: 'Chúc mừng' },
  ]

  const getRecipientSources = () => [
    { value: 'DB_ALL', label: 'Tất cả học viên (đã xác thực email)' },
    { value: 'DB_ACTIVE', label: 'Học viên đang học trong khóa' },
    { value: 'CSV', label: 'Danh sách CSV/JSON tự nhập' },
  ]

  const handlePreviewRecipients = async () => {
    setPreviewLoading(true)
    setRecipientPreview(null)
    try {
      let url = `/api/admin/campaigns/potential-recipients?source=${recipientSource}`
      if (recipientSource === 'DB_ACTIVE' && recipientCourseId) {
        url += `&courseId=${recipientCourseId}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecipientPreview(Array.isArray(data) ? data : [])
      }
    } catch {}
    setPreviewLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const body: any = {
      title,
      notificationType,
      recipientSource,
      subject,
      htmlContent,
    }

    if (recipientSource === 'DB_ACTIVE') {
      body.recipientFilter = { courseId: parseInt(recipientCourseId) || 0 }
    }

    if (recipientSource === 'CSV') {
      body.recipientCsvData = recipientCsvData
    }

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const campaign = await res.json()
        setMessage({ type: 'success', text: 'Đã tạo chiến dịch thành công!' })
        setTimeout(() => router.push(`/tools/email-mkt/${campaign.id}`), 1200)
      } else {
        const errText = await res.text()
        setMessage({ type: 'error', text: errText || 'Lỗi khi tạo chiến dịch' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối' })
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MainHeader title={isEditMode ? 'CHỈNH SỬA CHIẾN DỊCH' : 'TẠO CHIẾN DỊCH MỚI'} toolSlug="email-mkt" />
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <Link href="/tools/email-mkt" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-orange-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Thông tin chiến dịch</h2>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                placeholder="VD: Khuyến mãi tháng 6" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Loại thông báo</label>
              <select value={notificationType} onChange={e => setNotificationType(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                {getNotificationTypes().map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Người nhận</h2>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nguồn</label>
              <select value={recipientSource} onChange={e => { setRecipientSource(e.target.value); setRecipientPreview(null) }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                {getRecipientSources().map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {recipientSource === 'DB_ACTIVE' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Chọn khóa học *</label>
                <select value={recipientCourseId} onChange={e => setRecipientCourseId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none">
                  <option value="">-- Chọn khóa --</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name_lop} ({c.id_khoa})</option>
                  ))}
                </select>
              </div>
            )}

            {recipientSource === 'CSV' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Dữ liệu CSV/JSON</label>
                <textarea value={recipientCsvData} onChange={e => setRecipientCsvData(e.target.value)}
                  rows={5}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none resize-y font-mono"
                  placeholder='[{"email":"user@example.com","name":"Nguyen Van A"}]' />
              </div>
            )}

            <Button type="button" onClick={handlePreviewRecipients} disabled={previewLoading}
              className="w-full bg-gray-100 text-gray-700 font-bold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2">
              {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Xem trước người nhận
            </Button>

            {recipientPreview && (
              <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-gray-500 mb-1">Tổng: {recipientPreview.length} người</p>
                {recipientPreview.slice(0, 10).map((u: any, i: number) => (
                  <div key={i} className="text-xs text-gray-600 truncate">{u.email}{u.name ? ` (${u.name})` : ''}</div>
                ))}
                {recipientPreview.length > 10 && (
                  <p className="text-xs text-gray-400 mt-1">...và {recipientPreview.length - 10} người khác</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Nội dung email</h2>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tiêu đề email *</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                placeholder="Tiêu đề email..." required />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nội dung HTML</label>
              <div className="flex flex-wrap gap-1 mb-2">
                <button type="button" onClick={insertImage}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Image className="w-3.5 h-3.5" /> Ảnh
                </button>
                <button type="button" onClick={wrapSpin}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Shuffle className="w-3.5 h-3.5" /> Spin
                </button>
                <button type="button" onClick={() => insertAtCursor('[Tên]')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <User className="w-3.5 h-3.5" /> [Tên]
                </button>
                <button type="button" onClick={() => insertAtCursor('[MãHV]')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Hash className="w-3.5 h-3.5" /> [MãHV]
                </button>
                <button type="button" onClick={() => insertAtCursor('<unsubscribe></unsubscribe>')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600">
                  <Link2 className="w-3.5 h-3.5" /> Hủy ĐK
                </button>
                <button type="button" onClick={handlePreviewSpin}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-xs font-bold text-blue-600">
                  <Eye className="w-3.5 h-3.5" /> Xem Spin
                </button>
              </div>
              <textarea ref={textareaRef} value={htmlContent} onChange={e => setHtmlContent(e.target.value)}
                rows={12}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none resize-y font-mono"
                placeholder="<html><body>...</body></html>" />
              <p className="text-[10px] text-gray-400">
                Hỗ trợ: {'{Tên}'}, {'{MãHV}'}, {'{option1|option2}'} (spin content), 
                {'<unsubscribe>'}</p>
              {showSpinPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-blue-700">Xem trước Spin (3 phiên bản)</span>
                    <button type="button" onClick={() => setShowSpinPreview(false)}
                      className="text-blue-400 hover:text-blue-600 text-xs font-bold">Đóng</button>
                  </div>
                  {spinPreviews.map((preview, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 text-xs text-gray-700 border border-blue-100 max-h-32 overflow-y-auto">
                      <span className="font-bold text-blue-500 mr-2">#{i + 1}:</span>
                      <div dangerouslySetInnerHTML={{ __html: preview }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading || !title || !subject}
            className="w-full bg-black text-yellow-400 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isEditMode ? 'Lưu thay đổi' : 'Tạo chiến dịch'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <CreateCampaignContent />
    </Suspense>
  )
}

```

### 9.4 `app/tools/email-mkt/[id]/page.tsx` — Campaign Detail (485 dòng)

```tsx
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Play, Trash2, RefreshCw, XCircle, Ban, Search } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { Button } from '@/components/ui/button'

const STATUS_MAP: Record<string, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Hoạt động',
  RUNNING: 'Đang gửi',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Thất bại',
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  ACTIVE: 'bg-green-100 text-green-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

interface CampaignDetail {
  id: number
  title: string
  status: string
  notificationType: string
  recipientSource: string
  recipientFilter: any
  subject: string
  htmlContent: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  creator: { name: string } | null
  senders: { sender: { email: string; label: string } }[]
}

interface LogSummary {
  total: number
  sent: number
  bounced: number
  failed: number
  skipped: number
}

interface SenderStat {
  id: number
  email: string
  label: string
  total: number
  sent: number
  bounced: number
  failed: number
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState('')
  const [logSummary, setLogSummary] = useState<LogSummary | null>(null)
  const [senderStats, setSenderStats] = useState<SenderStat[]>([])
  const [issueLogs, setIssueLogs] = useState<any[]>([])
  const [bounceScanning, setBounceScanning] = useState(false)
  const [bounceResult, setBounceResult] = useState<string | null>(null)

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`)
      if (!res.ok) {
        setError('Không tìm thấy chiến dịch')
        return
      }
      const data = await res.json()
      setCampaign(data)
    } catch {
      setError('Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/logs`)
      if (res.ok) {
        const data = await res.json()
        setLogSummary(data.summary)
        setSenderStats(data.senderStats || [])
        setIssueLogs(data.issueLogs || [])
      }
    } catch {}
  }

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/progress`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(prev => prev ? { ...prev, ...data } : prev)
      }
    } catch {}
  }

  useEffect(() => {
    fetchCampaign()
    fetchLogs()
  }, [id])

  useEffect(() => {
    if (!campaign) return
    const shouldPoll = campaign.status === 'RUNNING' || sending
    if (!shouldPoll) return
    const interval = setInterval(() => {
      fetchProgress()
      fetchLogs()
    }, 5000)
    return () => clearInterval(interval)
  }, [campaign?.status, sending])

  const handleSendBatch = async () => {
    const isResume = (campaign?.sentCount || 0) > 0
    if (!confirm(isResume ? 'Tiếp tục gửi những email còn lại?' : 'Bắt đầu gửi chiến dịch này?')) return
    setSending(true)
    setSendProgress('Đang khởi tạo...')

    const batchSize = 20
    let finished = false

    try {
      await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RUNNING' }),
      })

      while (!finished) {
        const res = await fetch(`/api/admin/campaigns/${id}/send-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize }),
        })

        if (!res.ok) {
          let errData: any
          try { errData = await res.json() } catch { errData = {} }
          if (errData.needsCooldown) {
            const pauseMin = errData.pauseMinutes || 7
            setSendProgress(`⏸️ Pause ${pauseMin} phút (chờ sender hết cooldown)`)
            await new Promise(r => setTimeout(r, pauseMin * 60 * 1000))
            continue
          }
          setSendProgress(`Lỗi: ${errData.error || 'Lỗi không xác định'}`)
          break
        }

        const data = await res.json()

        if (data.needsCooldown) {
          const pauseMin = data.pauseMinutes || 7
          setSendProgress(`⏸️ Pause ${pauseMin} phút (đã gửi ${data.stats?.totalSent || 0})`)
          await new Promise(r => setTimeout(r, pauseMin * 60 * 1000))
          setSendProgress(`▶️ Tiếp tục gửi...`)
          continue
        }

        finished = data.finished
        fetchProgress()
        fetchLogs()
        await new Promise(r => setTimeout(r, 2000))
      }

      setSendProgress(finished ? 'Hoàn tất!' : 'Đã dừng')
      await fetchCampaign()
      await fetchLogs()
    } catch (err: any) {
      setSendProgress(`Lỗi: ${err.message}`)
    }
    setSending(false)
  }

  const handleRestart = async () => {
    if (!confirm('Xóa log cũ và gửi lại toàn bộ?')) return
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/restart`, { method: 'POST' })
      if (res.ok) {
        await fetchCampaign()
        await fetchLogs()
      }
    } catch {}
  }

  const handleDelete = async () => {
    if (!confirm('Xóa chiến dịch này?')) return
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/tools/email-mkt')
    } catch {}
  }

  const handleBounceScan = async () => {
    setBounceScanning(true)
    setBounceResult(null)
    try {
      const res = await fetch('/api/admin/campaigns/bounce-scan', { method: 'POST' })
      const data = await res.json()
      const total = (data.hardBounced || 0) + (data.softBounced || 0)
      setBounceResult(`🔴 ${data.hardBounced || 0} hard bounce, 🟡 ${data.softBounced || 0} soft bounce${data.fakeEmails ? `, 🚫 ${data.fakeEmails} email ảo` : ''}`)
      if (total > 0) {
        await fetchLogs()
        await fetchCampaign()
      }
    } catch {
      setBounceResult('Lỗi khi quét bounce')
    }
    setBounceScanning(false)
  }

  const handleRemoveFromBlacklist = async (email: string) => {
    try {
      const res = await fetch(`/api/admin/blacklist/${encodeURIComponent(email)}`, { method: 'DELETE' })
      if (res.ok) {
        setIssueLogs(prev => prev.filter(l => l.toEmail !== email))
      }
    } catch {}
  }

  const handleUpdateStatus = async (status: string) => {
    try {
      await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await fetchCampaign()
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="CHIẾN DỊCH" toolSlug="email-mkt" />
        <div className="max-w-lg mx-auto p-4 text-center py-12 text-gray-400 font-medium">{error || 'Không tìm thấy'}</div>
      </div>
    )
  }

  const progressPercent = campaign.totalRecipients > 0
    ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MainHeader title={campaign.title} toolSlug="email-mkt" />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Link href="/tools/email-mkt" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-orange-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-black text-gray-900 text-lg">{campaign.title}</h1>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(campaign.createdAt).toLocaleDateString('vi-VN')} • {campaign.notificationType}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${STATUS_COLOR[campaign.status] || 'bg-gray-100 text-gray-500'}`}>
              {STATUS_MAP[campaign.status] || campaign.status}
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tiến độ</span>
              <span>{campaign.sentCount}/{campaign.totalRecipients} ({progressPercent}%)</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-lg font-black text-green-600">{campaign.sentCount}</div>
              <div className="text-[10px] font-bold text-green-500 uppercase">Đã gửi</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-lg font-black text-red-600">{campaign.failedCount}</div>
              <div className="text-[10px] font-bold text-red-500 uppercase">Thất bại</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-lg font-black text-gray-600">{campaign.totalRecipients}</div>
              <div className="text-[10px] font-bold text-gray-400 uppercase">Tổng</div>
            </div>
          </div>

          {logSummary && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-black uppercase text-gray-400">Thống kê gửi</p>
              <div className="flex gap-4 text-xs font-bold">
                <span className="text-blue-600">✓ {logSummary.sent} sent</span>
                <span className="text-yellow-600">↻ {logSummary.bounced} bounced</span>
                <span className="text-red-600">✗ {logSummary.failed} failed</span>
                <span className="text-gray-400">– {logSummary.skipped} skipped</span>
              </div>
            </div>
          )}

          {senderStats.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400">Theo sender</p>
              {senderStats.map(s => (
                <div key={s.id} className="flex justify-between text-xs">
                  <span className="font-bold text-gray-600">{s.label}</span>
                  <span className="text-gray-500">{s.sent}/{s.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Thao tác</h2>

          {sendProgress && (
            <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              {sendProgress}
            </div>
          )}

          {campaign.status === 'DRAFT' && (
            <>
              <Button onClick={handleSendBatch} disabled={sending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> {(campaign.sentCount || 0) > 0 ? 'Tiếp tục gửi' : 'Bắt đầu gửi'}
              </Button>
              {(campaign.sentCount || 0) === 0 && (
                <Link href={`/tools/email-mkt/new?id=${campaign.id}`}>
                  <Button className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl">
                    Chỉnh sửa
                  </Button>
                </Link>
              )}
            </>
          )}

          {campaign.status === 'RUNNING' && (
            <>
              <Button onClick={handleSendBatch} disabled={sending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Gửi tiếp
              </Button>
              <Button onClick={() => handleUpdateStatus('DRAFT')} disabled={sending}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-xl">
                Tạm dừng
              </Button>
            </>
          )}

          {(campaign.status === 'COMPLETED' || campaign.status === 'FAILED') && (
            <Button onClick={handleRestart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Gửi lại
            </Button>
          )}

          <Button onClick={handleDelete}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Xóa chiến dịch
          </Button>

          {campaign.sentCount > 0 && (
            <Button onClick={handleBounceScan} disabled={bounceScanning}
              className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              {bounceScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )} Quét bounce
            </Button>
          )}

          {bounceResult && (
            <div className="bg-purple-50 rounded-xl p-3 text-xs font-bold text-purple-700">
              {bounceResult}
            </div>
          )}
        </div>

        {issueLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Email lỗi, bounce & bỏ qua ({issueLogs.length})
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {issueLogs.map(log => (
                <div key={log.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-xl p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{log.toEmail}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 space-x-2">
                      {log.userId ? (
                        <span className="font-bold text-orange-600">#{log.userId} — {log.userName || 'Không tên'}</span>
                      ) : (
                        <span className="text-gray-400">(không có trong hệ thống)</span>
                      )}
                      <span className="text-gray-400">
                        {log.senderEmail ? `qua ${log.senderLabel || log.senderEmail}` : '(không dùng sender)'}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        log.status === 'FAILED' ? 'bg-red-100 text-red-600'
                        : log.status === 'BOUNCED' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-200 text-gray-500'
                      }`}>
                        {log.status === 'FAILED' ? 'Lỗi' : log.status === 'BOUNCED' ? 'Bounce' : 'Bỏ qua'}
                      </span>
                      {log.errorType && (
                        <span className="text-[10px] text-gray-400">{log.errorType}</span>
                      )}
                      {log.errorCode && (
                        <span className="text-[10px] text-gray-400 truncate">{log.errorCode}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(log.sentAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {log.errorType === 'BLACKLISTED' && (
                    <button
                      onClick={() => handleRemoveFromBlacklist(log.toEmail)}
                      className="shrink-0 text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"
                    >
                      Bỏ chặn
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h2 className="font-black text-gray-900 uppercase tracking-tight text-sm">Nội dung email</h2>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tiêu đề</p>
            <p className="text-sm font-bold text-gray-900">{campaign.subject}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Nội dung</p>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 max-h-60 overflow-y-auto font-mono whitespace-pre-wrap break-all">
              {campaign.htmlContent}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Nguồn người nhận</p>
            <p className="text-sm font-bold text-gray-900">{campaign.recipientSource}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

```

---

## X. Hướng dẫn sử dụng

### 10.1 Thêm tài khoản gửi (sender)
1. Vào **Email Marketing** → tab **Senders**
2. Bấm **"Kết nối tài khoản Google"**
3. Đăng nhập Google, cấp quyền Gmail
4. Token tự động mã hóa và lưu
5. Bấm **"Kiểm tra token"** để xác nhận

### 10.2 Tạo chiến dịch
1. Vào **Email Marketing** → **"Tạo chiến dịch"**
2. Nhập tiêu đề, chọn loại thông báo
3. Chọn nguồn người nhận: DB_ALL / DB_ACTIVE / CSV
4. Soạn nội dung (hỗ trợ spin, placeholder)
5. Bấm **"Lưu"**

### 10.3 Gửi chiến dịch
1. Vào detail campaign, bấm **"Bắt đầu gửi"**
2. Hệ thống tự động gửi 30-50 email → pause 10-30 phút
3. Refresh tab, bấm "Gửi tiếp" để tiếp tục

### 10.4 Kiểm tra & xử lý lỗi
1. Mục **"Email lỗi, bounce & bỏ qua"** hiển thị chi tiết
2. Email bị blacklist → bấm **"Bỏ chặn"**
3. Bấm **"Quét bounce"** để kiểm tra email không tồn tại

### 10.5 Cấu hình
Tab **Cấu hình**: emailsBeforePause (20-100), pauseDuration (5-60 phút), interEmailDelay (1-30 giây)

---

## XI. Xử lý sự cố

### 11.1 "Không có sender khả dụng"
- Nguyên nhân: Hết quota, đang cooldown, bị tắt.
- Xử lý: Kiểm tra tab Senders, chờ 00:00, hoặc bấm "Gửi tiếp".

### 11.2 Token hết hạn
- Nguyên nhân: Refresh token bị Google thu hồi.
- Xử lý: Kiểm tra token → Xóa → Kết nối lại.

### 11.3 Campaign stuck ở RUNNING
- Nguyên nhân: Client refresh khi đang gửi.
- Xử lý: Bấm "Gửi tiếp" — server tự filter email đã gửi.

### 11.4 Email không đến
- Nguyên nhân: Địa chỉ sai, vào spam, mail server từ chối.
- Xử lý: Quét bounce, kiểm tra blacklist, xem log.

### 11.5 Gửi chậm
- Nguyên nhân: Batch nhỏ, pause dài, ít sender.
- Xử lý: Vào Cấu hình tăng batch, giảm pause. Thêm sender.

---

*Hết tài liệu.*
