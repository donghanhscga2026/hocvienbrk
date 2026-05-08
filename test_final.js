const { google } = require('googleapis');
require('dotenv').config();

async function testGmail() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  const adminEmail = process.env.GMAIL_USER || 'hocvienbrk@gmail.com';
  const to = 'cuongchupanh009@gmail.com';
  const subject = 'Cấu hình Gmail - Học Viện BRK đã hoạt động!';
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #4f46e5; text-align: center;">Hệ thống Gửi Email Đã Sẵn Sàng</h2>
      <p>Chúc mừng! Hệ thống gửi email tự động của Học Viện BRK đã được cấu hình thành công.</p>
      <p>Kể từ bây giờ, học viên đăng ký mới sẽ nhận được email xác minh tài khoản tự động.</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">Học Viện BRK - Trân trọng biết ơn!</p>
    </div>
  `;

  const fromName = 'Học Viện BRK';
  const encodedFromName = `=?utf-8?B?${Buffer.from(fromName).toString('base64')}?=`;
  const encodedSubject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  
  const messageParts = [
    `From: ${encodedFromName} <${adminEmail}>`,
    `To: ${to}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Subject: ${encodedSubject}`,
    ``,
    htmlBody,
  ].join('\n');

  const encodedMessage = Buffer.from(messageParts).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  try {
    console.log('Đang thực hiện gửi email thử nghiệm...');
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage }
    });
    console.log('✅ THÀNH CÔNG! ID Email:', res.data.id);
  } catch (error) {
    console.error('❌ LỖI:', error.message);
    if (error.response) {
      console.error('CHI TIẾT:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testGmail();
