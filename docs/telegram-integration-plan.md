# Kế hoạch triển khai: Tích hợp Telegram Bot cho Thành viên

Tài liệu này lập kế hoạch chi tiết để tích hợp Telegram Bot vào hệ thống **Cộng đồng MBC**, chuyển đổi từ đặc tả thiết kế Supabase gốc sang kiến trúc hiện tại của dự án (**Next.js 16 App Router + Prisma ORM + NextAuth v5 + PostgreSQL**).

---

## 1. Kiến trúc & Công nghệ áp dụng

*   **Database**: PostgreSQL qua Prisma ORM (Thêm trường vào bảng `User` và tạo bảng `TelegramLinkToken`).
*   **Authentication**: NextAuth v5 (lấy thông tin user hiện tại qua `auth()` server-side).
*   **API Routes**: Next.js App Router API Route Handlers (`app/api/telegram/webhook/route.ts` và `app/api/telegram/send/route.ts`).
*   **Telegram API**: Sử dụng HTTP requests tiêu chuẩn (qua `fetch`) để tương tác với Telegram Bot API, không phụ thuộc vào thư viện bên ngoài để tối ưu bundle và kiểm soát tốt lỗi.

---

## 2. Thiết kế Cơ sở dữ liệu (Prisma Schema)

### A. Cập nhật Model `User` trong `prisma/schema.prisma`
Thêm các trường để lưu vết liên kết Telegram:
```prisma
model User {
  // ... các trường hiện có giữ nguyên
  telegramChatId      BigInt?
  telegramUserId      BigInt?
  telegramUsername    String?
  telegramConnectedAt DateTime?
}
```

### B. Tạo Model `TelegramLinkToken` trong `prisma/schema.prisma`
Dùng để xác thực liên kết an toàn (hết hạn sau 15-30 phút, dùng 1 lần):
```prisma
model TelegramLinkToken {
  id        String    @id @default(uuid())
  userId    Int
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([token])
  @@index([userId])
}
```

---

## 3. Các bước triển khai chi tiết (4 Phases)

### 🚀 Phase 1: Chuẩn bị & Database Migration
1.  **Chỉnh sửa file `prisma/schema.prisma`**: Bổ sung các trường và model mới.
2.  **Khởi tạo Database**: Chạy `npx prisma db push` hoặc tạo migration để đồng bộ lên PostgreSQL database.
3.  **Tạo Bot trên Telegram**:
    *   Tạo bot mới qua `@BotFather` để lấy `TELEGRAM_BOT_TOKEN` và `TELEGRAM_BOT_USERNAME`.
4.  **Cấu hình Environment Variables** trong `.env`:
    ```env
    TELEGRAM_BOT_TOKEN="your_bot_token"
    TELEGRAM_BOT_USERNAME="your_bot_username"
    TELEGRAM_WEBHOOK_SECRET="random_secure_string_for_signature_verification"
    ```

### 🛠️ Phase 2: Phát triển Telegram Service Layer & Webhook
1.  **Xây dựng Telegram Client Helper (`lib/telegram/client.ts`)**:
    *   Hàm `sendTelegramMessage(chatId, text, options)` gửi tin nhắn với cơ chế tự động thử lại (Retry) khi gặp lỗi mạng tạm thời hoặc Rate Limit (HTTP 429).
2.  **Xây dựng Webhook Endpoint (`app/api/telegram/webhook/route.ts`)**:
    *   Xác thực webhook gửi tới từ Telegram bằng tiêu đề bí mật `X-Telegram-Bot-Api-Secret-Token`.
    *   Xử lý lệnh `/start <TOKEN>`:
        1. Trích xuất `<TOKEN>`.
        2. Tìm kiếm token trong bảng `TelegramLinkToken`, kiểm tra tính hợp lệ (chưa dùng, chưa hết hạn).
        3. Liên kết `telegramChatId`, `telegramUserId`, `telegramUsername` vào bảng `User` tương ứng.
        4. Đánh dấu token đã sử dụng (`usedAt = now`).
        5. Gửi tin nhắn chào mừng (Welcome message) kèm liên kết đăng nhập/thiết lập tài khoản.

### 🔗 Phase 3: Giao diện Liên kết (Frontend)
1.  **Tạo Action (`app/actions/telegram-actions.ts`)**:
    *   Server Action tạo link token dùng 1 lần cho User đang đăng nhập, trả về liên kết dạng `https://t.me/<BOT_USERNAME>?start=<TOKEN>`.
2.  **Thiết kế UI Nút kết nối Telegram**:
    *   Thêm mục "Kết nối Telegram" trong Trang cá nhân hoặc trang đăng ký thành công của thành viên.
    *   Khi click, gọi Action để sinh link và chuyển hướng thành viên sang ứng dụng Telegram.

### 📢 Phase 4: Kênh Gửi Thông Báo Nội Bộ
1.  **Xây dựng API Endpoint Gửi tin nhắn nội bộ (`app/api/telegram/send/route.ts`)**:
    *   Endpoint bảo mật bằng API Key / Bearer Token hoặc phân quyền Admin.
    *   Nhận `userId` và `message`, tìm `telegramChatId` của user và chuyển tiếp tin nhắn qua Telegram Bot.
2.  **Tích hợp thông báo**:
    *   Gửi thông báo tự động khi thành viên Đăng ký thành công, Thanh toán thành công, hoặc có lịch học mới.

---

## 4. Kế hoạch xác nhận & Kiểm thử (Testing)

*   **Test Case 1**: Thành viên click "Kết nối", bot mở ra, ấn `/start` ➔ Lưu đúng `chat_id` và gửi tin nhắn chào mừng.
*   **Test Case 2**: Sử dụng token đã hết hạn (> 15 phút) ➔ Bot báo lỗi token hết hạn, yêu cầu lấy link mới.
*   **Test Case 3**: Sử dụng token đã dùng rồi ➔ Bot từ chối kích hoạt.
*   **Test Case 4**: Gọi API nội bộ `/api/telegram/send` để gửi tin nhắn thử nghiệm tới thành viên.
