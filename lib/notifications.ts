
import { google } from 'googleapis';

/**
 * ─── HỆ THỐNG THÔNG BÁO BACKEND (TELEGRAM & EMAIL) ──────────────────────────
 * File này chỉ chạy phía Server. Tuyệt đối không import vào Client Component.
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
    console.log(`✅ Email sent to ${to}: ${result.data.id}`);
    
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error?.message || error?.message || error?.toString() || 'Unknown error';
    console.error(`❌ Email Error sending to ${to}:`, errorMsg);
    
    // Notify admin via Telegram when email fails
    const msgFail = `⚠️ <b>LỖI GỬI EMAIL</b>\n\n📧 To: ${to}\n📝 Subject: ${subject}\n❌ Error: ${errorMsg}`;
    await sendTelegram(msgFail, 'ACTIVATE');
    
    return { success: false, message: errorMsg };
  }
}

export async function sendWelcomeEmail(to: string, studentName: string, studentId: number) {
  const subject = `[Học Viện BRK] Chào mừng bạn gia nhập học viện - Mã học tập của bạn là #${studentId}`;
  const htmlBody = `Chào mừng <b>${studentName}</b> đến với Học Viện BRK,<br><br>Mã số học tập của bạn là: <b>#${studentId}</b>`;
  await sendGmail(to, subject, htmlBody);
}

export async function sendVerificationEmail(to: string, studentName: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'}/api/auth/verify?token=${token}`;
  const subject = `[Học Viện BRK] Xác minh tài khoản của bạn`;
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 8px;">
      <h2 style="color: #4f46e5; text-align: center;">Xác minh Email</h2>
      <p>Chào <b>${studentName}</b>,</p>
      <p>Cảm ơn bạn đã đăng ký gia nhập Học Viện BRK. Để hoàn tất quá trình đăng ký và kích hoạt tài khoản, vui lòng nhấn vào nút bên dưới:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
      </div>
      <p style="font-size: 12px; color: #6b7280;">Nếu nút trên không hoạt động, bạn có thể sao chép và dán liên kết này vào trình duyệt:</p>
      <p style="font-size: 12px; color: #4f46e5; word-break: break-all;">${verifyUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">Đây là email tự động, vui lòng không trả lời email này.</p>
    </div>
  `;
  const result = await sendGmail(to, subject, htmlBody);
  return result;
}

export async function sendActivationEmail(to: string, studentName: string, studentId: number, courseName: string, customContent: string | null) {
  const subject = `[Học Viện BRK] Kích hoạt thành công khóa học: ${courseName}`;
  const htmlBody = `Chào <b>${studentName}</b> (#${studentId}),<br><br>Khóa học <b>${courseName}</b> đã được kích hoạt.`;
  await sendGmail(to, subject, htmlBody);
}

export async function sendLoginNotification(user: any, ip: string, userAgent: string) {
  const msg = `🔑 <b>THÔNG BÁO ĐĂNG NHẬP</b>\n👤 Học viên: <b>${user.name}</b> (#${user.id})`;
  await sendTelegram(msg, 'LESSON');
}

export async function sendPasswordChangedNotification(user: { id: number; name: string; email: string }) {
  const msg = `🔐 <b>ĐỔI MẬT KHẨU</b>\n👤 Học viên: <b>${user.name}</b> (#${user.id})\n📧 Email: ${user.email}\n\n✅ Đã đổi từ mật khẩu mặc định sang mật khẩu cá nhân`;
  await sendTelegram(msg, 'LESSON');
}

export async function sendSurveyNotification(data: {
  studentName: string,
  studentId: number,
  goal: string,
  targetPointName: string,
  courses: string[],
  answers: Record<string, any>
}) {
  const coursesList = data.courses.length > 0 
    ? data.courses.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : 'Chưa xác định';

  // 1. Phân loại các câu trả lời
  const inputs: string[] = [];
  const selections: string[] = [];

  Object.entries(data.answers).forEach(([key, value]) => {
    if (key === 'goal_config') return;

    // Nhận diện các input văn bản (tên kênh, link, free text)
    if (key.endsWith('_name') || key.endsWith('_id') || key.endsWith('_url') || key === 'free_text_submit') {
      const label = key.endsWith('_name') ? 'Kênh' : key.endsWith('_id') ? 'Link/ID' : 'Nhập liệu';
      inputs.push(`<b>${label}:</b> ${value}`);
    } else if (typeof value === 'string' && value !== 'Xác nhận' && value !== 'Tiếp tục') {
      selections.push(`• ${value}`);
    }
  });

  // 2. Xử lý thông tin chi tiết từ cấu hình mục tiêu (goal_config)
  const config = data.answers['goal_config'];
  let configDetails = '';
  if (config) {
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
    `${configDetails}\n` +
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
