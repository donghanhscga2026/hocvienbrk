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
