import { NextRequest, NextResponse } from 'next/server';
import { processPaymentEmails } from '@/lib/auto-verify';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const querySecret = req.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.CRON_SECRET?.trim()
    const hasGooglePubSubHeaders = ['x-goog-topic', 'x-goog-message-id', 'x-goog-subscription-name'].some((header) =>
      Boolean(req.headers.get(header))
    )

    const isAuthorized = Boolean(
      expectedSecret && (
        authHeader === `Bearer ${expectedSecret}` ||
        querySecret === expectedSecret
      )
    ) || hasGooglePubSubHeaders

    if (!isAuthorized) {
      console.warn('⚠️ Gmail webhook: Unauthorized access attempt')
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
