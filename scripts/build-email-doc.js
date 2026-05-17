const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function readFile(p) {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf-8'); }
  catch(e) { return '// FILE NOT FOUND: ' + p; }
}

function codeBlock(lang, content) {
  return '```' + lang + '\n' + content + '\n```';
}

// Read all source files
const prisma = readFile('prisma/schema.prisma');

const emailModels = [];
const patterns = ['EmailSender', 'EmailCampaign', 'EmailCampaignSender', 'EmailCampaignLog', 'EmailBlacklist'];
for (const p of patterns) {
  const re = new RegExp('model\\s+' + p + '\\s*\\{[^}]+\\}', 'm');
  const match = prisma.match(re);
  if (match) emailModels.push({ name: p, content: match[0] });
}

const emailConfig = readFile('lib/email-config.ts');
const emailEncryptor = readFile('lib/email-encryptor.ts');
const emailSpin = readFile('lib/email-spin.ts');
const googleAuth = readFile('lib/google-auth.ts');
const campaignRunner = readFile('lib/email-campaign-runner.ts');
const notifications = readFile('lib/notifications.ts');
const emailParser = readFile('lib/email-parser.ts');

const apiCampaigns = [
  ['POST /api/admin/campaigns', readFile('app/api/admin/campaigns/route.ts')],
  ['GET /api/admin/campaigns/list', readFile('app/api/admin/campaigns/list/route.ts')],
  ['GET|PATCH|DELETE /api/admin/campaigns/[id]', readFile('app/api/admin/campaigns/[id]/route.ts')],
  ['GET /api/admin/campaigns/[id]/logs', readFile('app/api/admin/campaigns/[id]/logs/route.ts')],
  ['POST /api/admin/campaigns/[id]/send-batch', readFile('app/api/admin/campaigns/[id]/send-batch/route.ts')],
  ['POST /api/admin/campaigns/[id]/restart', readFile('app/api/admin/campaigns/[id]/restart/route.ts')],
  ['GET /api/admin/campaigns/[id]/progress', readFile('app/api/admin/campaigns/[id]/progress/route.ts')],
  ['POST /api/admin/campaigns/bounce-scan', readFile('app/api/admin/campaigns/bounce-scan/route.ts')],
  ['GET /api/admin/campaigns/potential-recipients', readFile('app/api/admin/campaigns/potential-recipients/route.ts')],
  ['POST /api/admin/campaigns/google-sheets', readFile('app/api/admin/campaigns/google-sheets/route.ts')],
];

const apiSenders = [
  ['GET /api/admin/senders/list', readFile('app/api/admin/senders/list/route.ts')],
  ['GET /api/admin/senders/validate', readFile('app/api/admin/senders/validate/route.ts')],
  ['DELETE /api/admin/senders/[id]', readFile('app/api/admin/senders/[id]/route.ts')],
];

const emailConfigRoute = readFile('app/api/admin/email-config/route.ts');
const googleOAuthRoute = readFile('app/api/admin/auth/google/route.ts');
const googleCallbackRoute = readFile('app/api/admin/auth/google/callback/route.ts');
const blacklistRoute = readFile('app/api/admin/blacklist/[email]/route.ts');
const unsubscribeRoute = readFile('app/api/unsubscribe/route.ts');
const resetQuotaCron = readFile('app/api/cron/reset-sender-quota/route.ts');
const gmailWatchCron = readFile('app/api/cron/gmail-watch/route.ts');
const vercelJson = readFile('vercel.json');

const pageServer = readFile('app/tools/email-mkt/page.tsx');
const clientContent = readFile('app/tools/email-mkt/ClientContent.tsx');
const newPage = readFile('app/tools/email-mkt/new/page.tsx');
const detailPage = readFile('app/tools/email-mkt/[id]/page.tsx');

// Build document
let doc = '';
function w(s) { doc += s + '\n'; }

w('# Hệ Thống Email Marketing (Email MKT) — Tài Liệu Đầy Đủ');
w('');
w('> Phiên bản: 2.0 — Cập nhật: 2026-05-16');
w('> Mục đích: Tài liệu này chứa TOÀN BỘ source code và giải thích chi tiết.');
w('> Nếu dự án bị xóa, chỉ cần file này là có thể build lại toàn bộ hệ thống Email MKT.');
w('');
w('---');
w('');
w('## Mục lục');
w('');
const toc = [
  'I. Kiến trúc tổng quan',
  'II. Database Schema',
  'III. Core Libraries',
  'IV. Campaign API',
  'V. Senders API',
  'VI. Email Config API',
  'VII. OAuth & Blacklist API',
  'VIII. Cron Jobs',
  'IX. UI Pages',
  'X. Hướng dẫn sử dụng',
  'XI. Xử lý sự cố',
];
for (const s of toc) {
  const anchor = s.toLowerCase().replace(/[^a-z0-9a-zà-ỹ]/g, '').replace(/[\s]+/g, '-');
  w('- [' + s + '](#' + anchor + ')');
}
w('');
w('---');
w('');

// I. Architecture
w('## I. Kiến trúc tổng quan');
w('');
w('### 1.1 Sơ đồ luồng gửi mail');
w('');
w('```');
w('┌──────────────┐         ┌──────────────────────┐         ┌─────────────────┐');
w('│  Browser UI  │  POST   │   send-batch/route   │  query  │   PostgreSQL    │');
w('│  (React 19)  │────────▶│   (Serverless fn)    │────────▶│   (Prisma ORM)  │');
w('│              │◀────────│                      │◀────────│                 │');
w('│  [id]/page   │  JSON   │  resolveRecipients   │  logs   │ EmailSender     │');
w('│  ClientCont  │         │  filter sent logs    │         │ EmailCampaign   │');
w('│  new/page    │         │  getAvailableSender  │         │ EmailCampaignLog│');
w('└──────────────┘         │  sendGmailFrom...    │         │ EmailBlacklist  │');
w('                         │  checkBatchStatus    │         │ SystemConfig    │');
w('                         └──────────┬───────────┘         └─────────────────┘');
w('                                    │');
w('                          ┌─────────▼──────────┐');
w('                          │    Gmail API        │');
w('                          │  (10 senders)       │');
w('                          │  googleapis npm     │');
w('                          └────────────────────┘');
w('```');
w('');
w('### 1.2 Giao thức gửi');
w('');
w('Hệ thống dùng **Gmail API** (OAuth2), KHÔNG dùng SMTP. Mỗi sender là 1 tài khoản Google có refresh token được mã hóa AES-256-CBC lưu trong DB.');
w('');
w('### 1.3 Ngôn ngữ & Framework');
w('');
w('| Công nghệ | Phiên bản | Ghi chú |');
w('|---|---|---|');
w('| Next.js | 16 | App Router |');
w('| React | 19 | Server & Client Components |');
w('| Prisma | 5.22 | ORM |');
w('| PostgreSQL | Via Supabase | Direct connection |');
w('| Tailwind CSS | 4 | Styling |');
w('| googleapis | Latest | Gmail API |');
w('| NextAuth | v5 | Authentication |');
w('| AES-256-CBC | Crypto | Mã hóa token |');
w('');
w('---');
w('');

// II. Database Schema
w('## II. Database Schema');
w('');
let mi = 1;
for (const m of emailModels) {
  w('### 2.' + mi + ' ' + m.name);
  w('');
  w(codeBlock('prisma', m.content));
  w('');
  mi++;
}
w('### 2.6 SystemConfig (cho email config)');
w('');
w('```prisma');
w('model SystemConfig {');
w('  key   String @id');
w('  value Json');
w('}');
w('// Key = "emailCampaignConfig"');
w('```');
w('');
w('---');
w('');

// III. Core Libraries
w('## III. Core Libraries');
w('');
const libs = [
  ['3.1', 'lib/prisma.ts', 'Singleton PrismaClient', 'typescript', 
   'import { PrismaClient } from "@prisma/client"\n\nconst globalForPrisma = globalThis as unknown as {\n  prisma: PrismaClient | undefined\n}\n\nexport const prisma =\n  globalForPrisma.prisma ??\n  new PrismaClient({\n    log: [\'error\', \'warn\'],\n  })\n\nif (process.env.NODE_ENV !== \'production\') globalForPrisma.prisma = prisma\n\nexport default prisma'],
  ['3.2', 'lib/email-config.ts', 'Cấu hình & Warmup', 'typescript', emailConfig],
  ['3.3', 'lib/email-encryptor.ts', 'Mã hóa Token', 'typescript', emailEncryptor],
  ['3.4', 'lib/email-spin.ts', 'Content Spinning', 'typescript', emailSpin],
  ['3.5', 'lib/google-auth.ts', 'OAuth2 Client', 'typescript', googleAuth],
  ['3.6', 'lib/email-campaign-runner.ts', 'Core Engine (836 dòng)', 'typescript', campaignRunner],
  ['3.7', 'lib/notifications.ts', 'Notifications (588 dòng)', 'typescript', notifications],
  ['3.8', 'lib/email-parser.ts', 'Phân tích email ngân hàng (311 dòng)', 'typescript', emailParser],
];

for (const [num, file, desc, lang, code] of libs) {
  w('### ' + num + ' `' + file + '` — ' + desc);
  w('');
  w(codeBlock(lang, code));
  w('');
}

w('---');
w('');

// IV. Campaign API
w('## IV. Campaign API');
w('');
let ci = 1;
for (const [name, code] of apiCampaigns) {
  w('### 4.' + ci + ' ' + name);
  w('');
  w(codeBlock('typescript', code));
  w('');
  ci++;
}

w('---');
w('');

// V. Senders API
w('## V. Senders API');
w('');
let si = 1;
for (const [name, code] of apiSenders) {
  w('### 5.' + si + ' ' + name);
  w('');
  w(codeBlock('typescript', code));
  w('');
  si++;
}

w('---');
w('');

// VI. Email Config
w('## VI. Email Config API');
w('');
w('### 6.1 GET|PUT /api/admin/email-config');
w('');
w(codeBlock('typescript', emailConfigRoute));
w('');
w('| Field | Min | Max |');
w('|---|---|---|');
w('| emailsBeforePauseMin/Max | 20 | 100 |');
w('| pauseDurationMin/Max | 5 | 60 |');
w('| interEmailDelayMin/Max | 1 | 30 |');
w('');
w('---');
w('');

// VII. OAuth & Blacklist
w('## VII. OAuth & Blacklist API');
w('');
w('### 7.1 GET /api/admin/auth/google');
w('');
w(codeBlock('typescript', googleOAuthRoute));
w('');
w('### 7.2 GET /api/admin/auth/google/callback');
w('');
w(codeBlock('typescript', googleCallbackRoute));
w('');
w('### 7.3 DELETE /api/admin/blacklist/[email]');
w('');
w(codeBlock('typescript', blacklistRoute));
w('');
w('### 7.4 GET /api/unsubscribe');
w('');
w(codeBlock('typescript', unsubscribeRoute));
w('');
w('---');
w('');

// VIII. Cron
w('## VIII. Cron Jobs');
w('');
w('### 8.1 Reset Sender Quota (Daily 00:00)');
w('');
w(codeBlock('typescript', resetQuotaCron));
w('');
w('### 8.2 Gmail Watch Renew (Weekly Monday 00:00)');
w('');
w(codeBlock('typescript', gmailWatchCron));
w('');
w('### 8.3 Vercel Cron Config');
w('');
w(codeBlock('json', vercelJson));
w('');
w('**Lưu ý:** Cả 2 cron cần deploy lên Vercel. `reset-sender-quota` chạy 00:00 UTC hàng ngày. `gmail-watch` chạy thứ Hai hàng tuần.');
w('');
w('---');
w('');

// IX. UI Pages
w('## IX. UI Pages');
w('');
w('### 9.1 `app/tools/email-mkt/page.tsx` — Server Component');
w('');
w(codeBlock('typescript', pageServer));
w('');
w('### 9.2 `app/tools/email-mkt/ClientContent.tsx` — Client Component (354 dòng)');
w('');
w(codeBlock('tsx', clientContent));
w('');
w('### 9.3 `app/tools/email-mkt/new/page.tsx` — Create/Edit (367 dòng)');
w('');
w(codeBlock('tsx', newPage));
w('');
w('### 9.4 `app/tools/email-mkt/[id]/page.tsx` — Campaign Detail (485 dòng)');
w('');
w(codeBlock('tsx', detailPage));
w('');
w('---');
w('');

// X. Usage
w('## X. Hướng dẫn sử dụng');
w('');
w('### 10.1 Thêm tài khoản gửi (sender)');
w('1. Vào **Email Marketing** → tab **Senders**');
w('2. Bấm **"Kết nối tài khoản Google"**');
w('3. Đăng nhập Google, cấp quyền Gmail');
w('4. Token tự động mã hóa và lưu');
w('5. Bấm **"Kiểm tra token"** để xác nhận');
w('');
w('### 10.2 Tạo chiến dịch');
w('1. Vào **Email Marketing** → **"Tạo chiến dịch"**');
w('2. Nhập tiêu đề, chọn loại thông báo');
w('3. Chọn nguồn người nhận: DB_ALL / DB_ACTIVE / CSV');
w('4. Soạn nội dung (hỗ trợ spin, placeholder)');
w('5. Bấm **"Lưu"**');
w('');
w('### 10.3 Gửi chiến dịch');
w('1. Vào detail campaign, bấm **"Bắt đầu gửi"**');
w('2. Hệ thống tự động gửi 30-50 email → pause 10-30 phút');
w('3. Refresh tab, bấm "Gửi tiếp" để tiếp tục');
w('');
w('### 10.4 Kiểm tra & xử lý lỗi');
w('1. Mục **"Email lỗi, bounce & bỏ qua"** hiển thị chi tiết');
w('2. Email bị blacklist → bấm **"Bỏ chặn"**');
w('3. Bấm **"Quét bounce"** để kiểm tra email không tồn tại');
w('');
w('### 10.5 Cấu hình');
w('Tab **Cấu hình**: emailsBeforePause (20-100), pauseDuration (5-60 phút), interEmailDelay (1-30 giây)');
w('');
w('---');
w('');

// XI. Troubleshooting
w('## XI. Xử lý sự cố');
w('');
w('### 11.1 "Không có sender khả dụng"');
w('- Nguyên nhân: Hết quota, đang cooldown, bị tắt.');
w('- Xử lý: Kiểm tra tab Senders, chờ 00:00, hoặc bấm "Gửi tiếp".');
w('');
w('### 11.2 Token hết hạn');
w('- Nguyên nhân: Refresh token bị Google thu hồi.');
w('- Xử lý: Kiểm tra token → Xóa → Kết nối lại.');
w('');
w('### 11.3 Campaign stuck ở RUNNING');
w('- Nguyên nhân: Client refresh khi đang gửi.');
w('- Xử lý: Bấm "Gửi tiếp" — server tự filter email đã gửi.');
w('');
w('### 11.4 Email không đến');
w('- Nguyên nhân: Địa chỉ sai, vào spam, mail server từ chối.');
w('- Xử lý: Quét bounce, kiểm tra blacklist, xem log.');
w('');
w('### 11.5 Gửi chậm');
w('- Nguyên nhân: Batch nhỏ, pause dài, ít sender.');
w('- Xử lý: Vào Cấu hình tăng batch, giảm pause. Thêm sender.');
w('');
w('---');
w('');
w('*Hết tài liệu.*');

const target = path.join(ROOT, 'app/tools/email-mkt/EMAIL_MKT_PLAN.md');
fs.writeFileSync(target, doc, 'utf-8');
const lines = doc.split('\n').length;
const kb = (doc.length / 1024).toFixed(0);
console.log('OK: ' + lines + ' dòng, ' + kb + ' KB');
