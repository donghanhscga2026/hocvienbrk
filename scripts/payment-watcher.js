require('dotenv').config()
const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Cấu hình thời gian quét (ví dụ: 3 phút = 180000ms)
const CHECK_INTERVAL = 3 * 60 * 1000; 

async function runVerification() {
    const now = new Date().toLocaleString();
    
    // 1. Kiểm tra mốc phạt Google Rate Limit từ DB trước khi khởi chạy tiến trình quét
    try {
        const penalty = await prisma.systemConfig.findUnique({
            where: { key: 'gmail_rate_limit_until' }
        });
        if (penalty && penalty.value) {
            const penaltyTime = new Date(penalty.value).getTime();
            if (Date.now() < penaltyTime) {
                const diffSec = Math.ceil((penaltyTime - Date.now()) / 1000);
                console.log(`[${now}] ⏳ Gmail API đang bị Google phạt. Bỏ qua lượt quét local này trong ${diffSec} giây nữa để tránh bị cộng dồn phạt...`);
                return;
            }
        }
    } catch (dbErr) {
        console.error(`[${now}] ⚠️ Lỗi kiểm tra penalty lock trong DB:`, dbErr.message);
    }

    console.log(`[${now}] 🔍 Đang quét email giao dịch mới...`);

    // Chạy file auto-verify-payment.js
    exec('node scripts/auto-verify-payment.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`[${now}] ❌ Lỗi khi chạy xác thực: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`[${now}] ⚠️ Cảnh báo: ${stderr}`);
        }
        console.log(`[${now}] ✅ Kết quả: \n${stdout}`);
    });
}

// Chạy lần đầu tiên ngay khi khởi động
runVerification().catch(console.error);

// Thiết lập vòng lặp chạy định kỳ
setInterval(() => {
    runVerification().catch(console.error);
}, CHECK_INTERVAL);

console.log('🚀 Payment Watcher đã khởi động!');
console.log(`Hệ thống sẽ tự động kiểm tra DB và quét Gmail mỗi ${CHECK_INTERVAL / 60000} phút.`);
console.log('Nhấn Ctrl+C để dừng.');
