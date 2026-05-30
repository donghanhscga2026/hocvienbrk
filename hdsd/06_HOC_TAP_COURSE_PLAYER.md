# 06. HỆ THỐNG HỌC TẬP (COURSE PLAYER)
> **Mục đích**: Tài liệu này đặc tả giao diện và logic xử lý của trình phát bài giảng (Course Player), cơ chế theo dõi tiến độ học tập và hệ thống ghi nhận kết quả bài học.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Phân loại bài học (Lesson Types)
Hệ thống hỗ trợ 4 định dạng bài học linh hoạt thông qua trường `type` trong bảng `Lesson`:

| Type | Cách hiển thị trong Player | Ứng dụng |
|:---:|:---|:---|
| **VIDEO** | Hiển thị trình phát YouTube hoặc Video URL. | Bài giảng video truyền thống. |
| **TEXT** | Trình phát chuyển thành khu vực hiển thị văn bản (Rich Text). | Bài đọc, thông báo, hướng dẫn. |
| **ALL** | Hiển thị cả Video và danh sách Playlist (nhiều video trong 1 bài). | Khóa học chuyên sâu có nhiều phần nhỏ. |
| **DOCS** | Hiển thị nhúng (Embed) các tài liệu Google Docs/PDF. | Tài liệu tham khảo, bài tập mẫu. |

### 2. Logic Trình phát Video (VideoPlayer)
- **YouTube Integration**: Sử dụng `react-player` để nhúng video. Hệ thống tự động trích xuất `videoId` từ link YouTube để tối ưu hóa việc tải.
- **Tiến độ (Progress Tracking)**: 
  - Hệ thống tự động lưu vị trí đang xem (`maxTime`) mỗi khi người dùng xem thêm 10% thời lượng.
  - Sử dụng Server Action `saveVideoProgressAction` để đảm bảo dữ liệu không bị mất khi học viên tắt trình duyệt đột ngột.
- **Auto-links**: Toàn bộ các đường dẫn URL trong mô tả bài học được tự động chuyển thành link clickable nhờ hàm `makeLinksClickable`.

### 3. Hệ thống Ghi nhận & Chấm điểm (Assignment)
Mỗi bài học (trừ khóa học kho tài liệu - LIB) đều có một Form ghi nhận:
- **Tiêu chí chấm điểm (10 điểm)**:
  - **Video (3đ)**: Điểm dựa trên tỷ lệ % đã xem video.
  - **Thời gian (2đ)**: Điểm thưởng nếu hoàn thành đúng hạn (trong ngày quy định của lộ trình).
  - **Nội dung (5đ)**: Điểm từ phần ghi nhận cảm nhận và gửi link bài tập (Cần độ dài ký tự tối thiểu).
- **Trạng thái Hoàn thành**: Bài học được coi là **COMPLETED** khi tổng điểm đạt từ **5/10** trở lên.

### 4. Lộ trình học tập (Roadmap Logic)
- **Khóa bài học**: Học viên bắt buộc phải hoàn thành bài học trước (Status: COMPLETED) thì bài học tiếp theo mới được mở khóa (`unlocked`).
- **Ngày bắt đầu**: Học viên phải xác nhận "Ngày bắt đầu học" để hệ thống tính toán điểm thưởng hoàn thành đúng hạn.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Giao diện Học tập (Desktop)
- **Cột Trái (Sidebar)**: Danh sách bài học và tiến độ tổng thể. Các bài học có biểu tượng 🔒 là bài học chưa được mở.
- **Khu vực Trung tâm**: 
  - **Trình phát**: Xem video hoặc đọc nội dung văn bản.
  - **Thảo luận**: Chat trực tiếp với giáo viên và các học viên khác ngay dưới mỗi bài học.
- **Cột Phải (Form ghi nhận)**: Nơi bạn viết cảm nhận và nộp bài tập sau khi xem xong video.

### 2. Trải nghiệm trên Mobile
Giao diện Mobile được tối ưu hóa với các Tab chức năng ở dưới cùng màn hình:
- **Tab Danh sách**: Xem lộ trình và chọn bài học.
- **Tab Nội dung**: Xem video và thảo luận (Hệ thống ưu tiên hiển thị Chat để tăng tính tương tác).
- **Tab Ghi nhận**: Nộp bài tập (Chỉ hiện khi đã xem xong video để tiết kiệm không gian).

### 3. Cách hoàn thành bài học nhanh chóng
1. Xem hết video bài giảng (Thanh tiến độ video đạt 100%).
2. Viết cảm nhận ngắn gọn về những điều tâm đắc nhất vào ô "Ghi nhận".
3. Gửi link bài tập (nếu có) vào ô tương ứng.
4. Nhấn **"Xác nhận hoàn thành"**. Nếu tổng điểm ≥ 5, bài tiếp theo sẽ tự động mở ra.

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao tôi không thể nhấn vào bài học tiếp theo?**
  - Bạn cần hoàn thành bài học hiện tại (đạt ít nhất 5 điểm) để hệ thống mở khóa bài tiếp theo. Hãy kiểm tra xem bạn đã nộp bài ghi nhận chưa.
- **Tôi lỡ nộp bài sai, có sửa được không?**
  - Có. Bạn có thể nhấn nút **"Cập nhật bài học"** ở Form ghi nhận để sửa lại nội dung. Tuy nhiên, điểm "Hoàn thành đúng hạn" sẽ không được tính lại nếu bạn đã quá hạn.
- **Video bị lỗi không xem được?**
  - Hãy thử tải lại trang (F5) hoặc kiểm tra kết nối internet. Nếu vẫn lỗi, hãy báo cho Admin thông qua mục Thảo luận.
