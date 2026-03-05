
// Mock email content
const mockEmailContent = `
Sacombank thông báo giao dịch:
Tài khoản: 0123456789
Phát sinh: +386,868 VND
Thời gian: 05/03/2026 14:30
Nội dung: SDT 123456 HV 8286 COC LS03
Số dư cuối: 10,000,000 VND
`;

// Logic bóc tách rút gọn từ lib/email-parser.ts
function testParser(description, text) {
    const phoneMatch = description.match(/SDT[\s\._]*(\d{6})/i);
    const userIdMatch = description.match(/HV[\s\._]*(\d+)/i);
    const courseCodeMatch = description.match(/COC[\s\._]*(\w+)/i);
    const amountMatch = text.match(/(?:Transaction|Phát sinh)[\s:+]*([\d,\.]+)\s*VND/i);

    let amount = 0;
    if (amountMatch) {
        amount = parseInt(amountMatch[1].replace(/\./g, '').replace(/,/g, '')) || 0;
    }

    return {
        phone: phoneMatch ? phoneMatch[1] : null,
        userId: userIdMatch ? parseInt(userIdMatch[1]) : null,
        courseCode: courseCodeMatch ? courseCodeMatch[1].toUpperCase() : null,
        amount: amount
    };
}

console.log('🚀 Đang test logic bóc tách email (JS thuần)...');
const result = testParser("SDT 123456 HV 8286 COC LS03", mockEmailContent);

console.log('\n--- Kết quả bóc tách ---');
console.log(`Số điện thoại (6 số cuối): ${result.phone}`);
console.log(`Mã học viên (UserID): ${result.userId}`);
console.log(`Mã khóa học: ${result.courseCode}`);
console.log(`Số tiền: ${result.amount.toLocaleString()} VND`);

if (result.userId === 8286 && result.courseCode === 'LS03' && result.amount === 386868) {
    console.log('\n✅ TEST THÀNH CÔNG: Logic nhận diện hoàn hảo!');
} else {
    console.log('\n❌ TEST THẤT BẠI: Cần kiểm tra lại Regex.');
}
