# TÀI LIỆU KỸ THUẬT HỆ THỐNG BREVO EMAIL
## HocVien-BRK - Brevo (Sendinblue) Email Integration

**Phiên bản:** 1.0
**Ngày:** 2026-06-10
**Trạng thái:** ✅ Hoàn thành & Đã kiểm thử

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc Multi-Brevo Sender](#2-kiến-trúc-multi-brevo-sender)
3. [Cấu trúc Database](#3-cấu-trúc-database)
4. [Core Service (lib/brevo.ts)](#4-core-service-libbrevots)
5. [API Endpoints](#5-api-endpoints)
6. [Notification Chain](#6-notification-chain)
7. [Campaign Routing](#7-campaign-routing)
8. [Webhook Handler](#8-webhook-handler)
9. [Hướng dẫn thêm Brevo Sender](#9-hướng-dẫn-thêm-brevo-sender)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mục đích

Tích hợp **Brevo (formerly Sendinblue)** làm provider gửi email chính cho Học Viện BRK, hỗ trợ kiến trúc multi-sender (nhiều tài khoản Brevo free trong pool), tự động chia đều tải. Gmail API và Resend giữ nguyên làm fallback.

### 1.2 Luồng gửi email

```
Gửi email (transactional / campaign)
  → Brevo available? → Gửi qua Brevo API
  → Gmail available?  → Gửi qua Gmail API
  → Resend            → Gửi qua Resend API
```

### 1.3 Các tính năng chính

| Tính năng | Mô tả |
|---|---|
| Multi-sender pool | Nhiều tài khoản Brevo free hoạt động song song |
| Round-robin routing | Tự động chia email đều giữa các sender |
| Webhook events | Xử lý bounce, open, click, spam, unsub theo thời gian thực |
| AES-256 encryption | API key Brevo được mã hóa khi lưu DB |
| Skip cooldown/warmup | Brevo không cần nghỉ giữa batch, không có warmup |
| Fallback chain | Brevo → Gmail → Resend — tự động chuyển khi có lỗi |

---

## 2. KIẾN TRÚC MULTI-BREVO SENDER

### 2.1 Mô hình

```
┌─────────────────────────────────────────────────────────────┐
│                    Brevo Sender Pool                         │
├─────────────────────────────────────────────────────────────┤
│  #60 Brevo Main      (hocvienbrk@gmail.com)    300/ngày     │
│  #63 Brevo 2         (donghanh.scga2025@gmail)  300/ngày     │
│  #64 Brevo 3         (donghanhbrk@gmail.com)    300/ngày     │
│  ... (thêm tùy ý qua UI/api)                                 │
├─────────────────────────────────────────────────────────────┤
│  TỔNG: N sender × 300 = N×300 email/ngày                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Cách hoạt động

1. Mỗi Brevo account = 1 `EmailSender` record với `provider='brevo'`
2. API key được encrypt AES-256-CBC, lưu ở `apiKeyEncrypted`
3. Khi gửi, `getAvailableSender()` lấy sender Brevo có `sentToday < dailyLimit`
4. Gọi Brevo API với API key decrypt
5. Sau gửi: upsert `EmailSenderLog.sentCount`, tăng `EmailSender.sentToday`
6. `dailyLimit` mặc định = 300 (free plan)

### 2.3 Khác biệt Brevo vs Gmail

| Thuộc tính | Gmail | Brevo |
|---|---|---|
| Cooldown giữa batch | ✅ 15-45 phút | ❌ Không cần |
| Warmup phase | ✅ 5-100/ngày | ❌ Không cần |
| Inter-email delay | ✅ 5-15 giây | ❌ Không cần |
| Routing | Token bucket | Round-robin |

---

## 3. CẤU TRÚC DATABASE

### 3.1 EmailSender (modified)

```prisma
model EmailSender {
  id               Int      @id @default(autoincrement())
  label            String
  email            String   // Bỏ @unique — cho phép nhiều sender chung email
  provider         String   @default("gmail")  // 'gmail' | 'brevo'
  senderName       String?  // Tên hiển thị khi gửi (Brevo)
  apiKeyEncrypted  String?  // AES-256-CBC encrypted (chỉ Brevo)
  clientId         String?  // Nullable (chỉ Gmail)
  clientSecret     String?  // Nullable (chỉ Gmail)
  refreshToken     String?  // Nullable (chỉ Gmail)
  dailyLimit       Int      @default(300)
  sentToday        Int      @default(0)
  lastResetAt      DateTime @default(now())
  isActive         Boolean  @default(true)
  isMain           Boolean  @default(false)
  pauseDurationMin Int      @default(15)
  pauseDurationMax Int      @default(45)
  warmupLimit      Int?     // Không áp dụng cho Brevo
  warmupPhase      Int      @default(0)  // Không áp dụng cho Brevo
  createdAt        DateTime @default(now())
  senderLogs       EmailSenderLog[]
  campaignLogs     EmailCampaignLog[]
}
```

### 3.2 EmailSenderLog (existing)

```prisma
model EmailSenderLog {
  id              Int      @id @default(autoincrement())
  senderId        Int
  sender          EmailSender @relation(fields: [senderId], references: [id])
  date            DateTime @default(now())
  sentCount       Int      @default(0)
  failedCount     Int      @default(0)
  bounceCount     Int      @default(0)
  cooldownCount   Int      @default(0)
  cooldownMinutes Int      @default(0)
  @@unique([senderId, date])
}
```

---

## 4. CORE SERVICE (lib/brevo.ts)

### 4.1 File: `lib/brevo.ts`

```typescript
const BREVO_API_URL = 'https://api.brevo.com/v3'
```

### 4.2 Functions

| Function | Params | Returns | Description |
|---|---|---|---|
| `sendTransactionalEmail` | `SendEmailParams` | `SendEmailResult` | Gửi 1 email transactional |
| `sendBatchTransactionalEmail` | `SendBatchEmailParams` | `{ messageIds, success }` | Gửi batch email |
| `getBrevoAccount` | none | `BrevoAccountInfo` | Thông tin tài khoản/quota |
| `getBrevoQuota` | `apiKey?` | `BrevoQuota` | Số email còn lại trong ngày |
| `getBlockedContacts` | none | `BlockedContact[]` | Danh sách email bị block |
| `unblockContact` | `email` | void | Bỏ block email |
| `createWebhook` | `BrevoWebhookConfig` | `{ id }` | Tạo webhook |
| `getExistingWebhooks` | none | Webhook[] | Danh sách webhook |
| `createBrevoContact` | `email, attributes?, listIds?` | void | Tạo contact |
| `validateApiKey` | `apiKey` | `BrevoAccountInfo` | Xác thực API key |

### 4.3 Interfaces

```typescript
interface SendEmailParams {
  to: { email: string; name?: string }[]
  subject: string
  htmlContent: string
  sender?: { name: string; email: string }
  bcc?: { email: string; name?: string }[]
  replyTo?: { email: string; name?: string }
  tags?: string[]
  headers?: Record<string, string>
}

interface BrevoAccountInfo {
  email: string
  firstName: string
  lastName: string
  companyName: string
  plan: { type: string; credits: number; creditsType: string }[]
  relay: { enabled: boolean }
}
```

### 4.4 Internal helpers

| Helper | Description |
|---|---|
| `brevoFetch<T>(method, path, body?, apiKey?)` | HTTP request wrapper với Brevo API |
| `getApiKey(overrideKey?)` | Lấy API key (env hoặc từ param) |
| `getDefaultSender()` | Lấy sender mặc định từ env |

---

## 5. API ENDPOINTS

### 5.1 Thêm Brevo sender

**`POST /api/admin/senders/brevo`**

```json
// Request
{ "label": "Brevo 2", "apiKey": "xkeysib-..." }

// Response
{
  "success": true,
  "sender": { "id": 63, "label": "Brevo 2", "email": "...", "senderName": "...", "provider": "brevo" },
  "account": { "email": "...", "company": "...", "plan": [...] }
}
```

### 5.2 Danh sách Brevo sender

**`GET /api/admin/senders/brevo`**

Trả về array `senders` kèm 10 senderLogs gần nhất.

### 5.3 Webhook receiver

**`POST /api/webhooks/brevo`**

Nhận events từ Brevo. Xem chi tiết tại [Phần 8](#8-webhook-handler).

---

## 6. NOTIFICATION CHAIN

### 6.1 File: `lib/notifications.ts`

```typescript
async function sendGmail(
  to: string,
  subject: string,
  htmlBody: string,
  bcc?: string,
): Promise<{ success: boolean; message: string }>
```

### 6.2 Luồng xử lý

```
sendGmail(to, subject, htmlBody)
  ├── Brevo: sendViaBrevo(to, subject, htmlBody)
  │     ├── ✅ Thành công → return success
  │     └── ❌ Thất bại → fallback Gmail
  ├── Gmail: sendViaGmail(to, subject, htmlBody)
  │     ├── ✅ Thành công → return success
  │     └── ❌ Thất bại → fallback Resend
  └── Resend: sendViaResend(to, subject, htmlBody)
        ├── ✅ Thành công → return success
        └── ❌ Thất bại → return error
```

---

## 7. CAMPAIGN ROUTING

### 7.1 File: `lib/email-campaign-runner.ts`

Hàm `getAvailableSender()` mở rộng để include Brevo senders:

```typescript
const candidate = await prisma.emailSender.findFirst({
  where: {
    isActive: true,
    provider: 'brevo',  // Chỉ lấy Brevo
    sentToday: { lt: prisma.emailSender.fields.dailyLimit },
    // Không check lastCooldownAt (Brevo không cần cooldown)
  },
  orderBy: { sentToday: 'asc' },  // Round-robin
});
```

### 7.2 Gửi campaign qua Brevo

```typescript
async function sendViaBrevo(
  campaignLog: EmailCampaignLog,
  sender: EmailSender,
): Promise<{ success: boolean; errorMessage?: string }> {
  const apiKey = decrypt(sender.apiKeyEncrypted!);
  await sendTransactionalEmail({
    to: [{ email: campaignLog.toEmail, name: campaignLog.toName || undefined }],
    subject: campaignLog.subject || '(No subject)',
    htmlContent: campaignLog.content || '',
    tags: [`campaign:${campaignLog.campaignId}`],
  });
}
```

### 7.3 Provider routing

File: `app/api/admin/campaigns/[id]/send-batch/route.ts`

```typescript
if (sender.provider === 'brevo') {
  result = await sendViaBrevo(logEntry, sender);
  // Không upsert cooldown log cho Brevo
} else {
  result = await sendViaGmail(logEntry, sender);
  // Upsert cooldown log cho Gmail
}
```

---

## 8. WEBHOOK HANDLER

### 8.1 File: `app/api/webhooks/brevo/route.ts`

Endpoint nhận HTTP POST từ Brevo khi có sự kiện email (bounce, open, click, v.v.).

### 8.2 Events được xử lý

| Event (Brevo gửi) | Event (code) | Hành động |
|---|---|---|
| `hard_bounce` | `hard_bounce` | Update EmailCampaignLog → BOUNCED, null emailVerified, add blacklist |
| `soft_bounce` | `soft_bounce` | Update EmailCampaignLog → BOUNCED (soft) |
| `delivered` | `delivered` | Update EmailCampaignLog.errorCode = "DELIVERED" |
| `opened` | `opened` | Update EmailCampaignLog.errorCode = "OPENED" |
| `click` | `click` | Update EmailCampaignLog.errorCode = "CLICKED: {link}" |
| `unsubscribed` | `unsubscribed` | Add email to blacklist (reason: "Hủy đăng ký") |
| `spam` | `spam` | Add email to blacklist (reason: "SPAM") |

### 8.3 Payload mẫu

```json
{
  "event": "hard_bounce",
  "email": "user@example.com",
  "message-id": "<xxxxxxxx.xxxxx@domain.com>",
  "reason": "550 5.1.1 The email account does not exist",
  "ts_epoch": 1598634509223,
  "tags": ["campaign:123"]
}
```

### 8.4 Response

Luôn trả về `{"received": true}` (kể cả khi xử lý lỗi) để Brevo không retry.

---

## 9. HƯỚNG DẪN THÊM BREVO SENDER

### 9.1 Tạo tài khoản Brevo free

1. Vào https://www.brevo.com → **Sign up** (miễn phí, 300 email/ngày)
2. Cần email + SĐT khác nhau cho mỗi tài khoản
3. Xác thực email và SĐT

### 9.2 Lấy API key

1. Login Brevo → Click tên account → **SMTP & API** → **API Keys**
2. Click **Create a new API key**
3. Copy key (dạng `xkeysib-...`)

### 9.3 Thêm vào hệ thống

**Qua UI (khuyên dùng):**
- Tools → Email MKT → tab **Senders**
- Mở rộng **"➕ Thêm Brevo Sender"**
- Nhập label + API key → **Xác thực & Thêm**

**Qua API:**
```bash
curl -X POST https://giautoandien.io.vn/api/admin/senders/brevo \
  -H "Content-Type: application/json" \
  -d '{"label":"Brevo 4","apiKey":"xkeysib-..."}'
```

### 9.4 Kiểm tra

Mỗi sender mới được Brevo xác thực trước khi lưu. Vào tab **📊 Hiệu suất** để xem thống kê gửi/nhận.

---

## PHỤ LỤC

### A. Environment variables

| Variable | Required | Description |
|---|---|---|
| `BREVO_API_KEY` | ✅ | API key mặc định (tài khoản Brevo chính) |
| `BREVO_SENDER_EMAIL` | ✅ | Email sender mặc định |
| `BREVO_SENDER_NAME` | ✅ | Tên hiển thị khi gửi |
| `EMAIL_ENCRYPTION_KEY` | ✅ | AES-256 key (64 hex chars) |

### B. Backup files

- `plan_temp/brevo.ts.backup_20260610.ts`
- `plan_temp/brevo-api-route_backup_20260610/`
- `plan_temp/webhooks-brevo_backup_20260610/`
- `plan_temp/notifications_backup_20260610.patch`
- `plan_temp/email-campaign-runner_backup_20260610.patch`
- `plan_temp/send-batch_backup_20260610.patch`
- `plan_temp/schema_backup_20260610.patch`
- `plan_temp/schema.backup_20260610_phase2.patch`
- `plan_temp/google-callback_backup_20260610.patch`
- `plan_temp/validate-route_backup_20260610.patch`
- `plan_temp/google-sheets_backup_20260610.patch`
- `plan_temp/email-campaign-export_backup_20260610.patch`
- `plan_temp/ClientContent_backup_20260610.patch`
- `plan_temp/email-config_backup_20260610.patch`
- `plan_temp/email-config-route_backup_20260610.patch`
- `plan_temp/EmailSettingsClient_backup_20260610.patch`
- `plan_temp/brevo_backup_before_fix_20260610.patch`
- `plan_temp/webhook-route_backup_20260610.patch`
