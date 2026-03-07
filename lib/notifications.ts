import { google } from 'googleapis';

/**
 * Gửi thông báo đến Telegram Admin
 */
export async function sendTelegramAdmin(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('⚠️ Thiếu cấu hình Telegram Bot Token hoặc Chat ID');
    return;
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
  } catch (error) {
    console.error('❌ Lỗi gửi Telegram:', error);
  }
}

/**
 * Gửi Email thông báo thành công cho học viên sử dụng Gmail API
 */
export async function sendSuccessEmail(to: string, studentName: string, courseName: string) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  const subject = `[Học Viện BRK] Chúc mừng! Khóa học ${courseName} của bạn đã được kích hoạt`;
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  
  const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
  const fromName = 'Học Viện BRK';
  const encodedFromName = `=?utf-8?B?${Buffer.from(fromName).toString('base64')}?=`;
  
  const messageParts = [
    `From: ${encodedFromName} <${adminEmail}>`,
    `To: ${to}`,
    `Bcc: ${adminEmail}`, // Gửi ẩn danh cho Admin để theo dõi
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Subject: ${utf8Subject}`,
    ``,
    `Chào <b>${studentName}</b>,<br><br>`,
    `Chúc mừng bạn! Hệ thống đã xác nhận thanh toán và <b>kích hoạt thành công</b> khóa học: <b>${courseName}</b>.<br>`,
    `Bây giờ bạn có thể đăng nhập vào hệ thống để bắt đầu học ngay lập tức.<br><br>`,
    `Trân trọng,<br>`,
    `Đội ngũ Học Viện BRK`,
  ];
  const message = messageParts.join('\n');

  // The body needs to be base64url encoded.
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log(`✅ Đã gửi email thành công cho ${to}`);
  } catch (error) {
    console.error('❌ Lỗi gửi Email:', error);
  }
}
