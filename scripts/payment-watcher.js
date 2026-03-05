require('dotenv').config()
const { exec } = require('child_process');

// Cấu hình thời gian quét (ví dụ: 3 phút = 180000ms)
const CHECK_INTERVAL = 3 * 60 * 1000; 

function runVerification() {
    const now = new Date().toLocaleString();
    console.log(`[${now}] 🔍 Đang quét email giao dịch mới...`);

    // Chạy file auto-verify-payment.js (Tôi sẽ tạo bản JS để tránh lỗi thực thi TS-node)
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
runVerification();

// Thiết lập vòng lặp chạy định kỳ
setInterval(runVerification, CHECK_INTERVAL);

console.log('🚀 Payment Watcher đã khởi động!');
console.log(`Hệ thống sẽ tự động quét Gmail mỗi ${CHECK_INTERVAL / 60000} phút.`);
console.log('Nhấn Ctrl+C để dừng.');
