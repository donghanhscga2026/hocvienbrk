import { google } from 'googleapis';

/**
 * Gửi thông báo đến Telegram (Hỗ trợ 3 Group khác nhau)
 */
export async function sendTelegram(message: string, type: 'REGISTER' | 'ACTIVATE' | 'LESSON' = 'ACTIVATE') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  // Lấy Chat ID tương ứng với từng loại sự kiện
  const chatIdMap = {
    REGISTER: process.env.TELEGRAM_CHAT_ID_REGISTER || process.env.TELEGRAM_CHAT_ID,
    ACTIVATE: process.env.TELEGRAM_CHAT_ID_ACTIVATE || process.env.TELEGRAM_CHAT_ID,
    LESSON: process.env.TELEGRAM_CHAT_ID_LESSON || process.env.TELEGRAM_CHAT_ID,
  };

  const chatId = chatIdMap[type];

  if (!token || !chatId) {
    console.error(`⚠️ Thiếu cấu hình Telegram cho loại: ${type}`);
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    const result = await response.json();
    if (!result.ok) {
        console.error(`❌ Telegram API Error (${type}):`, result.description);
    } else {
        console.log(`✅ Telegram API Success (${type}): Tin nhắn đã được gửi đến ID ${chatId}`);
    }
  } catch (error) {
    console.error(`❌ Lỗi hệ thống khi gửi Telegram (${type}):`, error);
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

  const encodedMessage = Buffer.from(messageParts)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
    console.log(`✅ Đã gửi email thành công: ${subject} -> ${to}`);
  } catch (error) {
    console.error(`❌ Lỗi gửi Email (${subject}):`, error);
  }
}

/**
 * Email chào mừng học viên mới
 */
export async function sendWelcomeEmail(to: string, studentName: string, studentId: number) {
  const subject = `[Học Viện BRK] Chào mừng bạn gia nhập học viện - Mã học tập của bạn là #${studentId}`;
  const htmlBody = `
    Chào mừng <b>${studentName}</b> đến với Học Viện BRK,<br><br>
    Tài khoản của bạn đã được khởi tạo thành công.<br>
    <b>Mã số học tập của bạn là: <span style="font-size: 18px; color: #7c3aed;">#${studentId}</span></b><br><br>
    Mã số này rất quan trọng, bạn vui lòng ghi nhớ để sử dụng khi chuyển khoản cam kết hoặc nhận hỗ trợ từ học viện.<br><br>
    Chúc bạn có những trải nghiệm học tập tuyệt vời!<br><br>
    Trân trọng,<br>
    Đội ngũ Học Viện BRK
  `;
  await sendGmail(to, subject, htmlBody);
}

/**
 * Email thông báo kích hoạt khóa học (Dùng nội dung từ bảng Course)
 */
export async function sendActivationEmail(to: string, studentName: string, studentId: number, courseName: string, customContent: string | null) {
  const subject = `[Học Viện BRK] Kích hoạt thành công khóa học: ${courseName}`;
  const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
  
  const htmlBody = `
    Chào <b>${studentName}</b> (Mã số học tập: <b>#${studentId}</b>),<br><br>
    Chúc mừng bạn! Khóa học <b>${courseName}</b> của bạn đã được <b>kích hoạt thành công</b>.<br><br>
    ${customContent ? `---<br><b>Thông tin bổ sung từ giảng viên:</b><br>${customContent}<br>---<br><br>` : ''}
    Bây giờ bạn có thể đăng nhập để bắt đầu lộ trình học tập.<br><br>
    Trân trọng,<br>
    Đội ngũ Học Viện BRK
  `;
  await sendGmail(to, subject, htmlBody, adminEmail);
}

/**
 * Thông báo khi có người đăng nhập thành công
 */
export async function sendLoginNotification(user: any, ip: string, userAgent: string) {
  try {
    // 1. Tra cứu vị trí từ IP (Sử dụng IP-API miễn phí)
    let location = 'Không xác định';
    let isp = '';
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
        isp = geoData.isp || '';
      }
    } catch (e) {
      console.error('Lỗi tra cứu GeoIP:', e);
    }

    // 2. Phân tích User Agent đơn giản (Trình duyệt/Hệ điều hành)
    const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Trình duyệt khác';
    const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Android') ? 'Android' : userAgent.includes('iPhone') ? 'iPhone/iOS' : 'Hệ điều hành khác';

    const msg = `🔑 <b>THÔNG BÁO ĐĂNG NHẬP</b>\n\n` +
                `👤 Học viên: <b>${user.name}</b> (#${user.id})\n` +
                `📧 Email: ${user.email}\n` +
                `📍 Vị trí: <b>${location}</b>\n` +
                `🌐 IP: ${ip} (${isp})\n` +
                `📱 Thiết bị: ${browser} on ${os}\n` +
                `📅 Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`;

    await sendTelegram(msg, 'REGISTER');
  } catch (error) {
    console.error('Lỗi gửi thông báo đăng nhập:', error);
  }
}

// Giữ lại các hàm cũ để không làm gãy logic hiện tại (nhưng trỏ về hàm mới)
export const sendTelegramAdmin = (msg: string) => sendTelegram(msg, 'ACTIVATE');
export const sendSuccessEmail = (to: string, name: string, course: string) => sendActivationEmail(to, name, 0, course, null);
