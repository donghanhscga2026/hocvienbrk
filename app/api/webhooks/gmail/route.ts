import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Google gửi dữ liệu mã hóa Base64 trong body.message.data
    // Tuy nhiên, chúng ta chỉ cần biết là CÓ mail mới để kích hoạt script quét
    console.log('📩 Nhận được thông báo Push từ Gmail!');

    // Chạy script xử lý thanh toán
    // Lưu ý: Đường dẫn phải chính xác trên server của bạn
    const scriptPath = path.join(process.cwd(), 'scripts', 'auto-verify-payment.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Lỗi Webhook: ${error.message}`);
        return;
      }
      console.log(`✅ Kết quả xử lý từ Webhook: \n${stdout}`);
    });

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('⚠️ Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
