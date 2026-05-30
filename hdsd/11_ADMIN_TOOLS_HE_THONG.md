# 11. CÔNG CỤ QUẢN TRỊ VÀ HỆ THỐNG
> **Mục đích**: Tài liệu này đặc tả các công cụ nâng cao dành riêng cho Quản trị viên (Super Admin) để duy trì tính toàn vẹn của dữ liệu, đồng bộ hóa đa hệ thống và quản lý học viên quy mô lớn.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Quản lý Học viên Nâng cao (Student Management)
Công cụ tại `/tools/students` cung cấp các tính năng mạnh mẽ hơn trang Profile thông thường:
- **Bulk Operations (Xử lý hàng loạt)**: Cho phép chọn nhiều học viên cùng lúc để thực hiện các thao tác (vd: Gửi thông báo, Chuyển lớp).
- **Preview Xóa (Safe Delete)**: Trước khi xóa một học viên, hệ thống sẽ thực hiện "Truy quét ảnh hưởng" để thống kê xem học viên đó đang sở hữu bao nhiêu F1, F2 và các bài viết liên quan. Điều này giúp Admin tránh việc làm gãy cây phả hệ một cách vô ý.

### 2. Đồng bộ đa hệ thống (Multi-System Sync)
Dự án hỗ trợ quản lý dữ liệu từ nhiều nguồn khác nhau (vd: TCA, KTC, Hệ thống riêng):
- **TCA Sync Engine**: 
  - Tích hợp với Chrome Extension để trích xuất dữ liệu từ Portal TCA.
  - Sử dụng bảng `TCASyncHistory` để ghi lại nhật ký từng lần đồng bộ, giúp đối soát dữ liệu cũ và mới (`beforeData` vs `afterData`).
  - Tự động ánh xạ (Map) ID TCA sang ID Học viên trên hệ thống Học viện BRK.
- **System Closure**: Mỗi hệ thống có một cây phả hệ riêng biệt (vd: `systemId=1` cho TCA) được lưu trữ độc lập để không làm ảnh hưởng đến cây nhân mạch gốc của Học viện.

### 3. Công cụ YouTube (YouTube Tools)
Hệ thống tích hợp trực tiếp với **YouTube Data API v3**:
- **OAuth Token Management**: Lưu trữ `accessToken` và `refreshToken` của kênh YouTube giáo viên để tự động hóa các tác vụ.
- **Video Scanner**: Tự động quét danh sách video trong các Playlist để đồng bộ vào danh sách bài học, giúp tiết kiệm thời gian nhập liệu thủ công.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Quản lý Danh sách Học viên
- **Tìm kiếm thông minh**: Tìm học viên bằng Tên, Email, SĐT hoặc Mã số ID.
- **Phân quyền nhanh**: Tại danh sách học viên, Admin có thể thay đổi Role (vd: Nâng cấp một Student lên Teacher) chỉ bằng vài cú click.
- **Dọn dẹp dữ liệu**: Sử dụng tính năng "Xóa hàng loạt" cho các tài khoản ảo hoặc tài khoản đã hết hạn tham gia mà không gửi minh chứng thanh toán.

### 2. Đồng bộ dữ liệu TCA
1. Cài đặt Chrome Extension của Học viện BRK.
2. Đăng nhập vào Portal TCA của bạn.
3. Nhấn nút **"Đồng bộ về Học viện"**. Dữ liệu về doanh số, cấp bậc và đội nhóm sẽ được cập nhật tự động lên hệ thống `giautoandien.io.vn`.
4. Xem nhật ký đồng bộ tại mục **Tools** -> **TCA Sync** để kiểm tra các thay đổi mới nhất.

### 3. YouTube Tools (Dành cho Giáo viên)
- Truy cập **Tools** -> **YouTube Tools**.
- Nhấn **"Kết nối kênh YouTube"** để cho phép hệ thống đọc danh sách video của bạn.
- Bạn có thể thực hiện:
  - **Quét Playlist**: Lấy toàn bộ link video từ 1 Playlist vào kho bài giảng.
  - **Cập nhật Metadata**: Đồng bộ tiêu đề và mô tả từ YouTube về khóa học trên hệ thống.

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tôi lỡ xóa nhầm một học viên có hệ thống lớn, có khôi phục được không?**
  - Hệ thống áp dụng chính sách **Xóa cứng (Hard Delete)** để bảo mật. Tuy nhiên, nếu bạn có bản backup hàng ngày của Database, kỹ thuật có thể hỗ trợ khôi phục. Hãy luôn sử dụng tính năng "Preview" trước khi xóa.
- **Tại sao đồng bộ TCA báo lỗi "Unauthorized"?**
  - Có thể phiên đăng nhập của bạn trên Portal TCA đã hết hạn hoặc Token của Extension cần được làm mới. Hãy đăng nhập lại Portal TCA và thử lại.
- **Tính năng "Cây phả hệ TCA" khác gì với "Nhân mạch"?**
  - Cây Nhân mạch dựa trên quan hệ giới thiệu trực tiếp của Học viện BRK. Cây TCA dựa trên sơ đồ tổ chức thực tế của bạn tại công ty TCA. Hai cây này có thể khác nhau tùy vào cách bạn sắp xếp đội nhóm.
