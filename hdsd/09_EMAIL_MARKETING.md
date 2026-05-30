# 09. EMAIL MARKETING CHUYÊN NGHIỆP
> **Mục đích**: Tài liệu này đặc tả hệ thống gửi Email hàng loạt (Bulk Email), cơ chế quản lý tài khoản gửi (Senders), và các kỹ thuật "Warm-up" để đảm bảo tỷ lệ vào hòm thư chính (Inbox) cao nhất.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Cơ chế Gửi thư (Delivery Engine)
Hệ thống không sử dụng các dịch vụ SMTP truyền thống (thường dễ bị đánh spam) mà sử dụng **Gmail OAuth API** trực tiếp.

- **Sender Management**: Quản lý nhiều tài khoản Gmail cùng lúc. Mỗi tài khoản có một `dailyLimit` riêng (mặc định 480 email/ngày cho tài khoản Gmail cá nhân).
- **Token Validation**: Hệ thống tự động kiểm tra tính hợp lệ của Refresh Token trước mỗi chiến dịch. Nếu token hết hạn, tài khoản đó sẽ bị tạm ngưng để không làm gián đoạn tiến trình gửi.

### 2. Kỹ thuật "Chống Spam" (Anti-Spam Logic)
Đây là phần cốt lõi của hệ thống để vượt qua các bộ lọc của Google:

- **Batch & Pause (Giãn cách theo lô)**: 
  - Thay vì gửi dồn dập, hệ thống gửi theo từng lô (vd: 30-50 email).
  - Sau mỗi lô, hệ thống sẽ tạm dừng (`pauseDuration`) từ 10-30 phút để "nghỉ ngơi".
- **Inter-email Delay (Độ trễ giữa các thư)**: 
  - Mỗi email gửi đi cách nhau một khoảng thời gian ngẫu nhiên (vd: 5-15 giây). Điều này mô phỏng hành vi gửi thư của con người.
- **Random Footer**: Tự động thêm một thông điệp ngẫu nhiên vào cuối mỗi email để nội dung mỗi bức thư không giống nhau 100%, tránh bị bộ lọc phát hiện là thư rác.

### 3. Quản lý Blacklist & Bounce
- **Blacklist**: Danh sách các email yêu cầu không nhận thư hoặc email đã bị xác định là không tồn tại. Hệ thống sẽ tự động bỏ qua các email này trước khi gửi.
- **Bounce Tracking**: Ghi nhận các trường hợp gửi lỗi để Admin có thể dọn dẹp danh sách khách hàng, giữ cho "độ uy tín" (Sender Reputation) của tài khoản luôn ở mức cao.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Kết nối Tài khoản gửi (Sender)
1. Truy cập **Tools** -> **Email Marketing** -> Tab **📡 Tài khoản**.
2. Nhấn **"+ Kết nối Tài khoản"**. Hệ thống sẽ đưa bạn đến trang xác thực của Google.
3. **Lưu ý**: Bạn cần thêm email của mình vào mục "Test Users" trong Google Cloud Console trước khi kết nối (Liên hệ kỹ thuật để được hỗ trợ).

### 2. Tạo Chiến dịch mới
1. Nhấn **"+ Tạo chiến dịch"**.
2. **Chọn Người nhận**: Bạn có thể chọn gửi cho Toàn bộ học viên, Học viên một khóa học cụ thể, hoặc Tải lên file Excel/CSV.
3. **Soạn thảo**: Viết Tiêu đề và Nội dung thư. Hệ thống hỗ trợ định dạng HTML để bạn có thể chèn ảnh và nút bấm chuyên nghiệp.
4. **Kiểm tra**: Luôn nhấn "Gửi thử" đến email cá nhân của bạn để xem định dạng hiển thị trước khi chạy chiến dịch thật.

### 3. Theo dõi Tiến độ
- Tại Tab **📋 Chiến dịch**, bạn có thể thấy biểu đồ phần trăm hoàn thành.
- **Trạng thái RUNNING**: Hệ thống đang tự động gửi thư theo các quy tắc giãn cách đã cấu hình. Bạn không cần phải mở trình duyệt liên tục, hệ thống chạy ngầm ở Server.

### 4. Cấu hình chuyên sâu (Settings)
Bạn có thể điều chỉnh các thông số giãn cách tại Tab **⚙️ Cấu hình**:
- **Pause sau (emails)**: Số lượng thư gửi đi trước khi hệ thống tạm nghỉ.
- **Delay (giây)**: Khoảng thời gian nghỉ giữa 2 bức thư liên tiếp.
- **Telegram Alert**: Bật thông báo về điện thoại mỗi khi một chiến dịch hoàn thành hoặc gặp lỗi lớn.

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao chiến dịch của tôi gửi rất chậm?**
  - Đây là cài đặt mặc định để đảm bảo an toàn cho tài khoản của bạn. Gửi chậm giúp Google tin tưởng tài khoản hơn và giúp thư vào hòm thư chính thay vì mục Spam.
- **Tôi thấy báo lỗi "Token không hợp lệ"?**
  - Hãy gỡ bỏ tài khoản đó và thực hiện "Kết nối" lại để cập nhật khóa bí mật mới từ Google.
- **Làm sao để biết ai đã mở email?**
  - Hiện tại hệ thống tập trung vào việc "Gửi thành công". Tính năng theo dõi lượt mở (Open Tracking) sẽ được cập nhật trong các phiên bản sau.
