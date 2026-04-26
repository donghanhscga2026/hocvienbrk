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
function getVerificationTemplate1(name: string, verifyUrl: string, emailId: string): string {
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
  <div style="background: white; border-radius: 12px; padding: 30px; text-align: center;">
    <h2 style="color: #4f46e5; margin-bottom: 20px;">Xác Minh Email</h2>
    <p style="color: #374151; font-size: 16px;">Chào <b>${name}</b>,</p>
    <p style="color: #6b7280;">Cảm ơn bạn đã đăng ký. Nhấn nút below để kích hoạt tài khoản:</p>
    <div style="margin: 30px 0;">
      <a href="${verifyUrl}" style="background: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Kích Hoạt Tài Khoản</a>
    </div>
    <p style="font-size: 12px; color: #9ca3af;">Link: ${verifyUrl}</p>
    <p style="font-size: 11px; color: #d1d5db; margin-top: 20px;">ID: ${emailId}</p>
  </div>
</div>`;
}

// Template 2: Modern Card
function getVerificationTemplate2(name: string, verifyUrl: string, emailId: string, greeting: string): string {
  const quote = randomPick(quotes);
  return `
<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Xác Nhận Tài Khoản</h1>
    </div>
    <div style="padding: 30px;">
      <p style="color: #1f2937; font-size: 16px;">${greeting} <span style="font-weight: 600;">${name}</span></p>
      <p style="color: #4b5563; line-height: 1.6;">Bạn đã đăng ký thành công! Hãy xác nhận email để bắt đầu hành trình học tập.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background: #4f46e5; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(79,70,229,0.3);">Xác Nhận Ngay</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; font-style: italic;">"${quote}"</p>
      <p style="color: #9ca3af; font-size: 11px; margin-top: 20px; text-align: center;">ID: ${emailId}</p>
    </div>
  </div>
</div>`;
}

// Template 3: Minimal
function getVerificationTemplate3(name: string, verifyUrl: string, emailId: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #111827; font-size: 24px; margin-bottom: 24px;">Xác minh tài khoản</h1>
  <p style="color: #374151; font-size: 16px; line-height: 1.6;">Xin chào <b>${name}</b>,</p>
  <p style="color: #4b5563; line-height: 1.6;">Cảm ơn bạn đã đăng ký. Nhấn nút bên dưới để kích hoạt:</p>
  <div style="margin: 28px 0;">
    <a href="${verifyUrl}" style="background: #111827; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Kích hoạt</a>
  </div>
  <p style="color: #6b7280; font-size: 13px;">Hoặc dùng link: <span style="color: #4f46e5;">${verifyUrl}</span></p>
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
  
  // Random subject
  const subject = randomPick(verificationSubjects);
  
  // Random template (1, 2, or 3)
  const templateNum = Math.floor(Math.random() * 3) + 1;
  let html = '';
  
  if (templateNum === 1) {
    html = getVerificationTemplate1(name, verifyUrl, emailId);
  } else if (templateNum === 2) {
    html = getVerificationTemplate2(name, verifyUrl, emailId, greeting);
  } else {
    html = getVerificationTemplate3(name, verifyUrl, emailId);
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