import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { processPaymentEmails } from '@/lib/auto-verify';
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Kiểm tra Header bảo mật của Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'http://localhost'
  )
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

  try {
    // 1. Gia hạn Watch
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
        labelIds: ['INBOX'],
      },
    })

    // 2. Tiện tay quét luôn mail mới (đảm bảo không sót giao dịch)
    const scanResult = await processPaymentEmails();

    return NextResponse.json({ 
      success: true, 
      watch: watchResponse.data,
      scan: scanResult 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
