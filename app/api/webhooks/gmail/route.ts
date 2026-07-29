import { NextRequest, NextResponse } from 'next/server';
import { processPaymentEmails } from '@/lib/auto-verify';
import { isAuthorizedRequest } from '@/lib/request-auth';

export async function POST(req: NextRequest) {
  try {
    const authResult = isAuthorizedRequest(req, { secretEnv: 'CRON_SECRET' })

    if (!authResult.isAuthorized) {
      console.warn('⚠️ Gmail webhook: Unauthorized access attempt', {
        hasAuthHeader: authResult.hasAuthHeader,
        hasAlternateSecret: authResult.hasAlternateSecret,
        hasGooglePubSubHeaders: authResult.hasGooglePubSubHeaders,
        hasQuerySecret: authResult.hasQuerySecret,
        secretConfigured: authResult.secretConfigured,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📩 Nhận được thông báo Push từ Gmail!');

    // Gọi trực tiếp logic xử lý thanh toán
    const result = await processPaymentEmails();
    
    console.log(`✅ Kết quả Webhook: Đã quét ${result?.processed} email, khớp ${result?.matched} giao dịch.`);

    return NextResponse.json({ status: 'ok', ...result }, { status: 200 });
  } catch (error: any) {
    console.error('⚠️ Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
