# 10. CỘNG ĐỒNG VÀ SITE PROFILE
> **Mục đích**: Tài liệu này mô tả hệ thống trang cá nhân định danh (Site Profile) và trung tâm cộng đồng (Community Hub), nơi các thành viên có thể xây dựng thương hiệu cá nhân và kết nối đội nhóm.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Cơ chế Routing Động (Dynamic Slug)
Hệ thống sử dụng cơ chế bắt Slug thông minh tại thư mục `/app/[slug]`. Khi một người dùng truy cập một đường dẫn không thuộc danh sách các trang mặc định (vd: `/tuan-anh`), hệ thống sẽ thực hiện ưu tiên kiểm tra theo thứ tự:

1. **Landing Page**: Kiểm tra xem slug có trùng với trang đích bán hàng nào không.
2. **Course ID**: Kiểm tra xem slug có phải là mã khóa học (id_khoa) không.
3. **Site Profile**: Tìm kiếm trong bảng `SiteProfile` xem slug có thuộc về cá nhân hoặc đội nhóm nào không.
   - Nếu tìm thấy: Render giao diện cá nhân hóa của profile đó.
   - Nếu không tìm thấy: Yêu cầu đăng nhập hoặc báo lỗi 404.

### 2. Cấu trúc Site Profile
Mỗi Profile là một "tiểu ứng dụng" với các cấu hình riêng:
- **Giao diện**: Màu nền, ảnh bìa (Hero Image), màu chủ đạo (Accent Color).
- **Nội dung**: Thông điệp chào mừng riêng, danh sách khóa học đề xuất và bộ câu hỏi khảo sát (Survey) riêng.
- **SEO**: Tích hợp metadata tự động (Title, Description, OG Image) để khi chia sẻ lên Facebook/Zalo sẽ hiển thị thông tin của chủ Profile đó.

### 3. Logic Community Hub (Gộp nội dung)
Tính năng Cộng đồng cho phép các Profile "hút" nội dung từ nhiều nguồn:
- **Bài viết (Posts)**: Hiển thị các bài viết từ chủ Profile và các cộng sự (Associates) được gán trong bảng `SiteProfileMember`.
- **Khóa học**: Chủ Profile có thể chọn lọc các khóa học tiêu biểu để hiển thị lên đầu trang chủ của mình.
- **Thống kê**: Hệ thống theo dõi lượt xem (`viewCount`) cho từng Profile để đánh giá độ hiệu quả của việc xây dựng thương hiệu.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Tạo và Chỉnh sửa Profile cá nhân
1. Truy cập **Cài đặt** -> **Site Profile của tôi** (Yêu cầu quyền truy cập từ Admin).
2. **Thiết lập Slug**: Chọn một tên định danh viết liền không dấu (vd: `nguyen-van-a`). Đây sẽ là địa chỉ link của bạn: `giautoandien.io.vn/nguyen-van-a`.
3. **Tùy chỉnh giao diện**: 
   - Tải lên ảnh bìa đẹp mắt.
   - Chọn màu sắc phù hợp với thương hiệu cá nhân.
   - Viết thông điệp truyền cảm hứng cho những người ghé thăm trang của bạn.

### 2. Quản lý Cộng sự (Associates)
Nếu bạn là trưởng nhóm, bạn có thể thêm các thành viên khác vào Profile của mình:
- Thêm mã ID của học viên vào mục **Thành viên đội nhóm**.
- Các bài viết của thành viên này sẽ xuất hiện trên trang Profile chung của nhóm, giúp tạo ra một kho nội dung phong phú.

### 3. Sử dụng Link Profile để Tuyển dụng
- Thay vì gửi link trang chủ chung, hãy gửi link Site Profile của bạn cho người mới.
- **Lợi ích**: 
  - Người mới sẽ thấy sự chuyên nghiệp và uy tín của bạn.
  - Hệ thống tự động gắn mã giới thiệu (Affiliate) của bạn cho người mới khi họ nhấn đăng ký từ trang Profile của bạn.

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao tôi không đổi được Slug?**
  - Slug là duy nhất trên toàn hệ thống. Nếu bạn nhập một tên đã có người khác dùng, hệ thống sẽ báo lỗi.
- **Tôi muốn đổi màu nền nhưng không thấy nút lưu?**
  - Sau khi chọn màu, hãy kéo xuống cuối trang và nhấn nút **"Cập nhật Profile"** để áp dụng thay đổi.
- **Người khác có xem được bài viết của tôi trên trang của họ không?**
  - Chỉ khi bạn được gán là "Cộng sự" của Profile đó, hoặc bài viết của bạn được đặt ở chế độ Công khai toàn hệ thống.
