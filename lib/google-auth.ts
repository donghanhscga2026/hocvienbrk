import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/admin/auth/google/callback';

export function getOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env');
  }

  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/**
 * Tạo URL để dẫn Admin sang Google đăng nhập
 */
export function getAuthUrl(state?: string) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // BẮT BUỘC để lấy refresh_token
    prompt: 'consent',     // BẮT BUỘC để luôn nhận được refresh_token mỗi lần kết nối
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });
}
