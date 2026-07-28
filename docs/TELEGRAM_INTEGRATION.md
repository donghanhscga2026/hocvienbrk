# Hướng dẫn Kỹ thuật & Sử dụng: Tích hợp Telegram Bot cho Học viên

Tài liệu này hướng dẫn chi tiết về cấu trúc kỹ thuật, luồng nghiệp vụ và cách sử dụng tính năng **Liên kết tài khoản Telegram** của học viên trong hệ thống Học Viện BRK.

---

## 1. Cấu trúc Kỹ thuật & Database

### A. Cơ sở dữ liệu (PostgreSQL qua Prisma)
Đã thêm các trường thông tin liên kết Telegram vào bảng `User` và tạo bảng `telegram_link_tokens` để quản lý Token liên kết dùng 1 lần (hiệu lực 15 phút):

```prisma
// Cập nhật model User
model User {
  id                  Int       @id @default(autoincrement())
  // ...
  telegramChatId      BigInt?
  telegramUserId      BigInt?
  telegramUsername    String?
  telegramConnectedAt DateTime?
}

// Bảng TelegramLinkToken mới
model TelegramLinkToken {
  id        String    @id @default(uuid())
  userId    Int
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([token])
  @@index([userId])
  @@map("telegram_link_tokens")
}
```

### B. Các Endpoint API & Server Action mới
1.  **Server Action (`app/actions/telegram-actions.ts`)**:
    *   Hàm: `generateTelegramLinkAction()`
    *   Nhiệm vụ: Lấy `userId` của học viên đang đăng nhập, sinh token UUID ngẫu nhiên, lưu vào DB và trả về liên kết: `https://t.me/<BOT_USERNAME>?start=<TOKEN>`.
2.  **Webhook Handler (`app/api/webhooks/telegram/route.ts`)**:
    *   Nhiệm vụ: Đón nhận tin nhắn gửi từ Telegram Bot. Khi nhận lệnh `/start <UUID_TOKEN>`, Webhook sẽ đối soát, liên kết `chatId` của Telegram vào học viên tương ứng, đánh dấu token đã dùng, và gửi tin nhắn chúc mừng thành công.
3.  **API Gửi thông báo cá nhân (`app/api/telegram/send/route.ts`)**:
    *   Phương thức: `POST`
    *   Headers: `Authorization: Bearer <TELEGRAM_WEBHOOK_SECRET>`
    *   Body: `{ "userId": number, "message": string }`
    *   Nhiệm vụ: Tìm kiếm `telegramChatId` của học viên theo `userId` và chủ động gửi tin nhắn riêng tư.

---

## 2. Hướng dẫn Luồng Liên kết Tài khoản (Từng bước)

### Bước 1: Sinh link kết nối trên Website
Khi học viên đăng nhập vào trang cá nhân (hoặc Dashboard) và bấm nút **"Liên kết tài khoản Telegram"**:
1. Frontend sẽ gọi Server Action `generateTelegramLinkAction()`.
2. Hệ thống tạo ra một Token có dạng UUID (ví dụ: `4f7b6b1a-289e-4c7b-891d-66e2c5e59b4d`) có hiệu lực trong 15 phút.
3. Website nhận về liên kết và tự động mở tab mới chuyển hướng học viên đến:
   `https://t.me/HocVienBRKBot?start=4f7b6b1a-289e-4c7b-891d-66e2c5e59b4d`

### Bước 2: Kích hoạt liên kết trên ứng dụng Telegram
1. Ứng dụng Telegram của học viên mở đoạn chat với Bot hệ thống.
2. Học viên bấm nút **START** ở phía dưới màn hình (Telegram sẽ tự động gửi tin nhắn `/start 4f7b6b1a-289e-4c7b-891d-66e2c5e59b4d` lên Webhook).
3. Webhook xử lý:
   *   Nếu Token hợp lệ: Đánh dấu đã dùng, cập nhật cột `telegramChatId` trên User, và phản hồi tin nhắn:
       > **🎉 KẾT NỐI TÀI KHOẢN THÀNH CÔNG!**
       >
       > ✅ Tài khoản Telegram của bạn đã được liên kết thành công với Học Viện BRK.
       > Bạn sẽ nhận được các thông báo học tập quan trọng (lịch học Zoom, thông tin tài khoản, xác nhận thanh toán) trực tiếp tại đây.
   *   Nếu Token hết hạn hoặc đã dùng: Bot sẽ phản hồi:
       > **❌ LIÊN KẾT THẤT BẠI**
       >
       > Yêu cầu liên kết không hợp lệ hoặc đã hết hạn. Chi tiết: ...

---

## 3. Cách Gửi Thông Báo Cá Nhân Từ Backend (Developer Guide)

### Cách 1: Gọi trực tiếp Helper trong code Next.js
Bạn có thể import hàm `sendTelegramToUser` từ `@/lib/telegram-bot` để gửi tin nhắn tại bất kỳ đâu trong Backend (như khi duyệt thanh toán học phí, khi thăng cấp):
```typescript
import { sendTelegramToUser } from "@/lib/telegram-bot"

// Gửi tin nhắn thông báo riêng cho học viên có ID là 1141
await sendTelegramToUser(
  1141, 
  `<b>🔔 LỊCH HỌC ZOOM MỚI</b>\n\n` +
  `Lớp học "86 ngày đồng hành" sẽ bắt đầu lúc 20:00 tối nay.\n` +
  `🔗 Link Zoom: https://zoom.us/j/123456789`
)
```

### Cách 2: Gọi qua API HTTP `/api/telegram/send`
Các dịch vụ bên ngoài hoặc cronjob có thể gọi qua API để gửi tin nhắn:
*   **URL**: `https://giautoandien.io.vn/api/telegram/send` (thay thế bằng domain thực tế)
*   **Method**: `POST`
*   **Headers**:
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <TELEGRAM_WEBHOOK_SECRET>`
*   **Body**:
    ```json
    {
      "userId": 1141,
      "message": "<b>🔔 THÔNG BÁO:</b>\nHọc phí khóa học của bạn đã được duyệt thành công!"
    }
    ```

---

## 4. Kết quả Kiểm thử & Xác thực Hệ thống

Hệ thống đã được kiểm thử giả lập tự động từ đầu đến cuối và cho kết quả chuẩn xác 100%:
1.  **Idempotency**: Token sau khi đã dùng 1 lần, nếu cố ấn gửi lại `/start` sẽ bị Bot từ chối ngay lập tức để bảo mật.
2.  **Hết hạn tự động**: Sau 15 phút, token chưa sử dụng sẽ bị hủy và ghi nhận lỗi *"Mã liên kết đã hết hạn (hiệu lực 15 phút)"*.
3.  **Tự phục hồi khóa quét**: Hệ thống đã fix lỗi kẹt khóa `gmail_scan_lock` và tự động khôi phục trong vòng 30 giây nếu có lỗi time-drift xảy ra.
