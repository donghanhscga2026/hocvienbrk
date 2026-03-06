import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { processPaymentEmails } from '@/lib/auto-verify';

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  console.log('🚀 Bắt đầu chạy Cron Job quét email...');

  // 1. Kiểm tra Header bảo mật
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Lỗi: Unauthorized - Sai CRON_SECRET');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Kiểm tra các biến môi trường thiết yếu
  const requiredEnv = [
    'GMAIL_CLIENT_ID', 
    'GMAIL_CLIENT_SECRET', 
    'GMAIL_REFRESH_TOKEN', 
    'GCP_PROJECT_ID'
  ];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);
  
  if (missingEnv.length > 0) {
    const errorMsg = `Thiếu biến môi trường: ${missingEnv.join(', ')}`;
    console.error(`❌ ${errorMsg}`);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }

  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'http://localhost'
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    console.log(`📡 Đang gọi Gmail Watch cho dự án: ${process.env.GCP_PROJECT_ID}`);
    
    // 3. Gia hạn Watch
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GCP_PROJECT_ID}/topics/gmail-notifications`,
        labelIds: ['INBOX'],
      },
    });

    console.log('📧 Đang tiến hành quét email giao dịch...');
    
    // 4. Quét mail mới
    const scanResult = await processPaymentEmails();

    console.log('✅ Cron Job hoàn thành thành công!');
    return NextResponse.json({ 
      success: true, 
      watch: watchResponse.data,
      scan: scanResult 
    });
  } catch (error: any) {
    // IN LỖI CHI TIẾT RA CONSOLE ĐỂ KIỂM TRA TRÊN VERCEL LOGS
    console.error('❌ LỖI CRON JOB CHI TIẾT:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data || 'No response data'
    });

    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || undefined
    }, { status: 500 });
  }
}
