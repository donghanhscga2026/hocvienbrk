# 02. XÁC THỰC VÀ BẢO MẬT
> **Mục đích**: Tài liệu này mô tả chi tiết các phương thức xác thực, luồng bảo vệ người dùng, cơ chế cấp phát định danh (ID) và các chính sách an toàn thông tin của dự án Học viện BRK.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Phương thức Xác thực (Authentication Providers)
Dự án sử dụng **NextAuth v5 (Auth.js)** với chiến lược session là **JWT**.

| Loại | Chi tiết kỹ thuật | Mô tả |
|:---|:---|:---|
| **Credentials** | Email/SĐT/ID + Password | Cho phép học viên đăng nhập bằng bất kỳ định danh nào. |
| **Google OAuth**| `@auth/google` | Đăng ký/Đăng nhập nhanh qua tài khoản Google. |

### 2. Luồng Đăng ký & Kích hoạt (OTP)
Hệ thống áp dụng cơ chế xác minh email bắt buộc cho mọi tài khoản đăng ký mới từ ngày **29/03/2026**.

**Quy trình nghiệp vụ:**
1. **Mutation**: Server Action `registerUser` kiểm tra trùng lặp Email/SĐT.
2. **ID Generation**: Gọi helper `getNextAvailableId()` để lấy ID tăng dần, tự động bỏ qua các "số đẹp" trong danh sách `ReservedID`.
3. **OTP Creation**: Tạo một mã OTP 6 số lưu vào bảng `VerificationToken`.
    - **Thời hạn**: **24 giờ** kể từ lúc tạo.
4. **Email Delivery**: Gửi mã OTP qua hệ thống email chuyên dụng.
5. **Activation**: Chỉ khi `emailVerified` trong database có giá trị (không null), người dùng mới được phép đăng nhập.

### 3. Bảo mật Định danh (User ID)
Hệ thống sử dụng ID kiểu số (`Int4`) để định danh người dùng.
- **Dải ID Normal**: Bắt đầu từ 1.
- **Reserved IDs**: Các số như 1111, 2222, 6666, 8888... được bảo vệ. 
- **Logic**: Khi tạo user mới, hệ thống sẽ tìm ID cao nhất hiện có (không thuộc nhóm Reserved) và cộng thêm 1.

### 4. Middleware & "Hoàn tất hồ sơ"
Hệ thống áp dụng chính sách bảo vệ nghiêm ngặt đối với người dùng đăng nhập qua Google OAuth.

**Logic Interceptor (proxy.ts):**
- Nếu người dùng đã đăng nhập nhưng **thiếu Số điện thoại**, hệ thống sẽ chặn mọi truy cập và ép buộc chuyển hướng về trang `/complete-profile`.
- **Mục tiêu**: Đảm bảo 100% người dùng trên hệ thống đều có Name + Phone để phục vụ quản lý đội nhóm.

### 5. An toàn Mật khẩu
- **Mã hóa**: Sử dụng `bcryptjs` với độ muối (salt) là 10.
- **Validation**: Mật khẩu bắt buộc tối thiểu 8 ký tự, bao gồm: Chữ Hoa, chữ thường, số và ký tự đặc biệt.
- **Default Password**: Một số tài khoản đồng bộ từ TCA được gán mật khẩu mặc định. Hệ thống sẽ yêu cầu đổi mật khẩu ngay trong lần đầu đăng nhập (`needsPasswordChange`).

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Dành cho Học viên mới
**Bước 1: Đăng ký**
- Truy cập trang `/register`.
- Điền đầy đủ thông tin: Họ tên, Email, Số điện thoại và Mật khẩu.
- Lưu ý: Nếu bạn truy cập qua link giới thiệu, mã giới thiệu sẽ được tự động khóa để bảo vệ quyền lợi người giới thiệu.

**Bước 2: Xác minh Email**
- Kiểm tra hòm thư (kiểm tra cả mục Spam/Quảng cáo).
- Lấy mã OTP 6 số và điền vào ô xác nhận trên màn hình.
- **Lưu ý**: Mã có hiệu lực trong **24 tiếng**. Sau thời gian này, bạn cần thực hiện lại quy trình.

**Bước 3: Đăng nhập**
- Bạn có thể dùng Email hoặc Mã học viên (#ID) được cấp để đăng nhập.

### 2. Dành cho người dùng Google OAuth
- Khi nhấn "Tiếp tục với Google", nếu là lần đầu, bạn sẽ được đưa đến trang **Hoàn tất hồ sơ**.
- Bạn **bắt buộc** phải cung cấp Số điện thoại để kích hoạt tài khoản.
- Bạn có thể tùy chọn đặt mật khẩu tại đây để đăng nhập bằng mã học viên sau này.

### 3. Xử lý sự cố (Troubleshooting)
- **Không nhận được OTP**: 
  - Chờ 1-2 phút và kiểm tra mục Spam.
  - Đảm bảo Email nhập vào là chính xác.
- **Lỗi "Số điện thoại đã tồn tại"**: 
  - Một số điện thoại chỉ được gắn với một tài khoản duy nhất. Nếu bạn đã có tài khoản cũ, hãy sử dụng chức năng "Quên mật khẩu".
- **Quên mật khẩu**:
  - Sử dụng tính năng "Quên mật khẩu" tại trang đăng nhập.
  - Hệ thống sẽ gửi mã OTP mới vào Email (Mã này chỉ có hiệu lực trong **10 phút** vì lý do bảo mật cao).
