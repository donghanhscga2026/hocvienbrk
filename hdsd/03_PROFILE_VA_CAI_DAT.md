# 03. TÀI KHOẢN VÀ CÀI ĐẶT
> **Mục đích**: Tài liệu này mô tả các tính năng quản lý thông tin cá nhân, cập nhật ảnh đại diện, bảo mật mật khẩu và hệ thống phân quyền người dùng (Role-based Access Control).

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Phân quyền Người dùng (Role-based Access Control)
Hệ thống sử dụng Enum `Role` trong database để phân cấp quyền hạn:

| Role | Quyền hạn chính |
|:---|:---|
| **ADMIN** | Toàn quyền hệ thống, quản lý mọi khóa học, người dùng và tài chính. |
| **TEACHER** | Quản lý các khóa học do mình sở hữu, duyệt học viên của chính khóa học đó. |
| **STUDENT** | (Mặc định) Tham gia học tập, xem phả hệ cá nhân và quản lý profile. |
| **INSTRUCTOR** | Role dự phòng cho trợ giảng (tương đương Teacher nhưng giới hạn hơn). |
| **AFFILIATE** | Role chuyên biệt cho các đối tác phát triển thị trường. |

### 2. Quản lý Ảnh đại diện (Avatar Proxy & Processing)
Để giải quyết vấn đề bảo mật và kích thước ảnh, hệ thống áp dụng 2 kỹ thuật quan trọng:

#### **A. Server-side Proxy (api/upload/url)**
Khi người dùng dán link ảnh từ bên ngoài (Google Drive, Facebook...), trình duyệt sẽ chặn do lỗi **CORS**.
- **Giải pháp**: Frontend gửi URL về Server. Server thực hiện `fetch` ảnh đó, chuyển đổi sang định dạng **Base64** và trả lại cho Frontend. Điều này giúp vượt qua mọi rào cản CORS của trình duyệt.

#### **B. Client-side Resizing (Nén ảnh)**
Để tránh lỗi "Header Too Large" (Cookie quá lớn) khi lưu session, ảnh đại diện được nén ngay tại trình duyệt.
- **Quy trình**: Sử dụng HTML5 Canvas để vẽ lại ảnh với kích thước chuẩn **400x400px** (cho profile) hoặc **50x50px** (cho các icon thu nhỏ), sau đó mới gửi lên Server để lưu trữ.

### 3. Logic Đổi mật khẩu
Hành động `changePassword` yêu cầu:
1. Xác thực mật khẩu cũ (`bcrypt.compare`).
2. Mật khẩu mới phải vượt qua bộ lọc Validation (8 ký tự, 1 hoa, 1 thường, 1 số, 1 đặc biệt).
3. Sau khi đổi thành công, trường `passwordChanged` được set thành `true` để hệ thống không còn nhắc nhở đối với các tài khoản dùng mật khẩu mặc định.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Cập nhật Thông tin cá nhân
- **Truy cập**: Nhấn vào Avatar ở Header -> Chọn **Cài đặt tài khoản**.
- **Họ tên & SĐT**: Bạn có thể tự do cập nhật. Số điện thoại sẽ được dùng để liên hệ khi cần duyệt khóa học.
- **Email & ID**: Đây là các trường định danh duy nhất, bạn không thể tự thay đổi.

### 2. Quản lý Ảnh đại diện (Avatar)
Bạn có 2 cách để thay đổi ảnh:
- **Cách 1 (Tải ảnh lên)**: Nhấn vào icon Camera trên ảnh đại diện để chọn file từ máy tính/điện thoại.
- **Cách 2 (Dùng link ảnh)**: Dán link ảnh từ Google Drive hoặc các trang lưu trữ ảnh vào ô văn bản. Hệ thống sẽ tự động tải và tối ưu ảnh cho bạn.

### 3. Đổi mật khẩu
- Nếu bạn đang dùng mật khẩu mặc định hoặc muốn tăng cường bảo mật.
- Nhấn vào mục **"Đổi mật khẩu"**.
- Nhấn vào biểu tượng 👁️ để ẩn/hiện mật khẩu trong khi gõ để tránh sai sót.
- Hệ thống có đèn báo **"Mật khẩu khớp"** màu xanh khi bạn nhập lại chính xác mật khẩu mới.

### 4. Tài khoản liên kết
- Hệ thống hiển thị trạng thái liên kết với Google. Nếu bạn đã đăng nhập qua Google, mục này sẽ hiển thị dấu tích xanh. Việc liên kết giúp bạn đăng nhập nhanh chóng mà không cần nhớ mật khẩu.

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao tôi không thể lưu SĐT mới?**
  - Có thể số điện thoại này đã được một học viên khác sử dụng. Mỗi SĐT chỉ được gắn với một ID duy nhất.
- **Tôi lỡ tay xóa ảnh đại diện, làm sao lấy lại?**
  - Bạn chỉ cần tải lại ảnh mới hoặc nhấn "Lưu thay đổi" với ô link ảnh trống để quay về Avatar mặc định (chữ cái đầu của tên).
