import 'dotenv/config';
import { google } from 'googleapis';
import prisma from '../lib/prisma';
import { decrypt, tryDecrypt } from '../lib/email-encryptor';

async function main() {
  console.log("=== BẮT ĐẦU TÌM KIẾM EMAIL GIAO DỊCH TRÊN GMAIL ===\n");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  );
  
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Tim kiem email co chua so tien 26.868 (dang viet lien hoac co cham) hoac chua HV 1164
  const query = `26868 OR "1164" OR "964957"`;
  console.log(`Tìm kiếm với Query: ${query}`);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 5
  });

  const messages = response.data.messages || [];
  console.log(`Tìm thấy ${messages.length} email phù hợp.`);

  for (const msg of messages) {
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id || '',
      format: 'full'
    });

    const headers = message.data.payload?.headers || [];
    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
    const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || 'No Date';
    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'No From';

    let body = '';
    const payload = message.data.payload;
    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }

    console.log('\n----------------------------------------');
    console.log(`ID: ${msg.id}`);
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`Date: ${date}`);
    console.log(`Nội dung (trích dẫn 500 ký tự đầu):`);
    const cleanText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(cleanText.substring(0, 500));
  }
}

main().catch(err => console.error(err));
