
import { google } from 'googleapis';

/**
 * ─── HỆ THỐNG THÔNG BÁO BACKEND (TELEGRAM & EMAIL) ──────────────────────────
 * File này chỉ chạy phía Server. Tuyệt đối không import vào Client Component.
 */

/**
 * Gửi thông báo đến Telegram (Hỗ trợ 3 Group khác nhau)
 */
export async function sendTelegram(message: string, type: 'REGISTER' | 'ACTIVATE' | 'LESSON' = 'ACTIVATE') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdMap = {
    REGISTER: process.env.TELEGRAM_CHAT_ID_REGISTER || process.env.TELEGRAM_CHAT_ID,
    ACTIVATE: process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID,
    LESSON: process.env.TELEGRAM_CHAT_ID_LESSON || process.env.TELEGRAM_CHAT_ID,
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
 */
async function sendGmail(to: string, subject: string, htmlBody: string, bcc?: string) {
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
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
  } catch (error) {
    console.error(`❌ Email Error:`, error);
  }
}

export async function sendWelcomeEmail(to: string, studentName: string, studentId: number) {
  const subject = `[Học Viện BRK] Chào mừng bạn gia nhập học viện - Mã học tập của bạn là #${studentId}`;
  const htmlBody = `Chào mừng <b>${studentName}</b> đến với Học Viện BRK,<br><br>Mã số học tập của bạn là: <b>#${studentId}</b>`;
  await sendGmail(to, subject, htmlBody);
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
