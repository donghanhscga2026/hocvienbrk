# 07. QUẢN TRỊ KHÓA HỌC (CHO ADMIN & TEACHER)
> **Mục đích**: Tài liệu này hướng dẫn cách sử dụng công cụ quản trị để tạo, chỉnh sửa khóa học, quản lý danh sách bài học và phân quyền nội dung.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Phân quyền Quản lý (Ownership)
Hệ thống áp dụng cơ chế phân quyền dựa trên quyền sở hữu (Owner-based):
- **ADMIN**: Có quyền xem và chỉnh sửa toàn bộ các khóa học trên hệ thống.
- **TEACHER**: Chỉ nhìn thấy và chỉnh sửa được các khóa học mà mình được gán làm `teacherId`.
- **Giao diện**: Các Server Action như `getAdminCoursesAction` sẽ tự động lọc danh sách dựa trên `session` của người đang đăng nhập.

### 2. Quản lý Bài học (Lesson Management)
Để tối ưu hiệu năng cho các khóa học có hàng trăm bài học, hệ thống sử dụng các kỹ thuật:
- **Lazy Loading Modals**: Các Form thêm mới (`AddLessonModal`), chỉnh sửa (`LessonEditModal`) và Import (`ImportLessonsModal`) chỉ được tải khi người dùng nhấn nút tương ứng.
- **Tự động sắp xếp (Order)**: Khi thêm bài học mới, hệ thống tự động gợi ý số `order` tiếp theo. Khi xóa một bài học, các bài học sau không bị ảnh hưởng (giữ nguyên order) để tránh làm xáo trộn lộ trình học viên đang học.
- **Import hàng loạt**: Hỗ trợ import danh sách bài học từ file Excel hoặc định dạng văn bản thô để tiết kiệm thời gian khởi tạo.

### 3. Tối ưu hóa Nội dung
- **Trình xử lý `<br>`**: Trong các ô nhập liệu mô tả (`moTaDai`, `noidung_email`), khi nhấn phím **Enter**, hệ thống tự động chuyển thành thẻ `<br>` để đảm bảo khi hiển thị ở Frontend, nội dung được xuống dòng đúng ý đồ của giáo viên.
- **Upload Ảnh**: Tích hợp API `/api/upload/course` để lưu trữ ảnh bìa khóa học, tự động tối ưu dung lượng ảnh trước khi lưu.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Tạo Khóa học mới
1. Truy cập **Tools** -> **Khóa học**.
2. Nhấn nút **"+"** màu vàng ở góc trên bên phải.
3. Điền các thông tin cơ bản: Tên khóa học, Mã khóa học (id_khoa), Học phí.
4. **Quan trọng**: Chọn đúng **Loại khóa học** (NORMAL: Khóa học thường, CHALLENGE: Khóa học rèn luyện theo ngày, LIB: Kho tài liệu).

### 2. Chỉnh sửa chi tiết Khóa học
Nhấn vào biểu tượng **Settings (Bánh răng)** tại dòng khóa học tương ứng:
- **Tab Nội dung**: Cập nhật mô tả ngắn, mô tả dài và ảnh bìa.
- **Tab Thanh toán**: Cấu hình Số tài khoản ngân hàng, Tên chủ tài khoản và nội dung chuyển khoản dành riêng cho khóa học này.
- **Tab Email**: Soạn thảo nội dung email tự động gửi cho học viên khi họ đăng ký hoặc được duyệt vào khóa học.

### 3. Quản lý Danh sách Bài học
Kéo xuống phần **"Danh sách bài học"** trong trang chỉnh sửa:
- **Thêm bài mới**: Nhấn nút "Thêm bài học". Bạn cần điền Tiêu đề và Link Video (YouTube).
- **Chỉnh sửa bài**: Nhấn vào tên bài học để mở cửa sổ sửa. Bạn có thể thay đổi link video, nội dung văn bản hoặc tài liệu đính kèm.
- **Sắp xếp**: Thay đổi số thứ tự (Order) để điều chỉnh vị trí bài học trong lộ trình.
- **Xóa**: Nhấn icon Thùng rác. *Lưu ý: Hành động này không thể hoàn tác.*

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao tôi (Giáo viên) không thấy khóa học mình vừa tạo?**
  - Hãy kiểm tra xem bạn đã được gán làm "Giáo viên phụ trách" của khóa học đó chưa (Liên hệ Admin nếu cần).
- **Làm sao để học viên thấy link trong phần mô tả bài học?**
  - Bạn chỉ cần dán link (vd: `https://google.com`) vào phần nội dung, hệ thống sẽ tự động chuyển nó thành link có thể nhấn được cho học viên.
- **Làm sao để bài học chỉ hiện văn bản mà không hiện Video?**
  - Trong phần chỉnh sửa bài học, chọn **Loại bài học: TEXT**. Khi đó trình phát video sẽ biến mất, nhường chỗ cho nội dung văn bản của bạn.
