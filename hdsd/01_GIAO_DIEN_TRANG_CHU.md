# 01. GIAO DIỆN TRANG CHỦ ĐỘNG
> **Mục đích**: Tài liệu này đặc tả logic hiển thị, cấu trúc dữ liệu và hướng dẫn sử dụng giao diện Trang chủ (Home Page) của Học viện BRK.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Luồng dữ liệu (Data Flow)
Trang chủ được tối ưu hóa bằng cách fetch dữ liệu song song (Parallel Data Fetching) tại Server Component trước khi render.

**Quy trình:**
1. **Server (Home Component)**: 
   - Gọi `getDefaultProfile()` để lấy giao diện định danh (Site Profile).
   - Gọi `Promise.all` để lấy đồng thời: Danh sách khóa học, Bài viết, Khảo sát, Thông điệp ngẫu nhiên và thông tin Enrollments (nếu đã đăng nhập).
   - Phân loại khóa học thành 2 nhóm chính: `myCourses` (đã đăng ký) và `otherCourses` (chưa đăng ký).
   - Nhóm `otherCourses` theo thuộc tính `category`.
2. **Client (HomePageClient & CourseSection)**: 
   - Tiếp nhận dữ liệu và render các section.
   - Quản lý trạng thái mở rộng/thu gọn thông qua Hook.

### 2. Logic Hiển thị & Tương tác Lõi
Tính năng nổi bật nhất của trang chủ là khả năng tự động quản lý không gian hiển thị để tránh tình trạng quá tải thông tin (Information Overload).

#### **Hook: `useExpandWithCountdown`**
Đây là bộ não điều khiển hành vi đóng/mở của các nhóm khóa học.
- **Input**: `countdownSeconds` (Mặc định 10 giây).
- **Trạng thái**: 
  - Khi `isExpanded = false`: Chỉ hiển thị **3 khóa học** (cố định cho cả Mobile và Desktop).
  - Khi `isExpanded = true`: Hiển thị toàn bộ khóa học trong danh mục.
- **Logic Tự động hóa**: 
  - Khi người dùng nhấn "Xem thêm", bộ đếm ngược 10 giây bắt đầu chạy.
  - Nếu hết 10 giây mà không có tương tác, danh sách tự động thu gọn.
  - **Reset Timer**: Bất kỳ hành động di chuột (`onMouseMove`) hoặc chạm màn hình (`onTouchStart`) vào khu vực section sẽ reset bộ đếm về 10 giây.

#### **Cấu trúc hiển thị động**:
```typescript
// Render logic trong CourseSection.tsx
const displayCount = 3
const visibleCourses = isExpanded ? courses : courses.slice(0, displayCount)
```

### 3. Các thành phần giao diện (UI Components)
- **MessageCard**: Hiển thị lời chào cá nhân hóa và thông điệp ngẫu nhiên từ hệ thống.
- **CourseSection**: Container lớn bọc ngoài, quản lý tiêu đề và layout lưới.
- **CourseCategoryGroup**: Sử dụng khi có phân loại theo danh mục (Category).
- **CourseCard**: Hiển thị thông tin chi tiết một khóa học (Video xem trước, tiến độ học tập).

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Dành cho Học viên
Trang chủ là trung tâm điều phối lộ trình học tập của bạn:

- **Khu vực Lời chào**: Xem thông điệp truyền cảm hứng mỗi ngày và thông tin định danh của bạn.
- **Khóa học của tôi**: Hiển thị các khóa học bạn đã tham gia. Các khóa học này được sắp xếp theo lộ trình gợi ý hoặc tiến độ cá nhân.
- **Khám phá Khóa học**: Các khóa học được chia theo chuyên mục (vd: Kỹ năng, Tư duy, Công cụ...).
- **Thao tác "Xem thêm"**:
  - Nhấn nút "Xem thêm" ở cuối mỗi phần để mở rộng toàn bộ danh sách.
  - Một đồng hồ đếm ngược màu vàng sẽ xuất hiện ở góc trên bên phải.
  - Để giữ danh sách không bị đóng, hãy di chuyển chuột hoặc cuộn trang trong khu vực đó.
- **Nút "Vào học ngay"**: Xuất hiện trên các khóa học bạn đã đăng ký và được kích hoạt.

### 2. Dành cho Quản trị viên (Admin)
Admin có thể kiểm soát nội dung hiển thị trên trang chủ thông qua các công cụ bổ trợ:

- **Thay đổi Category**: Trong mục Quản lý khóa học, việc thay đổi trường `Category` sẽ tự động tạo ra một nhóm mới trên trang chủ.
- **Cấu hình Profile**: Trang chủ lấy dữ liệu từ Site Profile mặc định. Bạn có thể thay đổi màu nền, tiêu đề trang chủ bằng cách chỉnh sửa Site Profile có ID mặc định (thường là ID 1 hoặc Profile do Admin thiết lập).

### 3. Các câu hỏi thường gặp (FAQ)
- **Tại sao danh sách khóa học tự đóng lại?**
  - Đây là tính năng giúp trang chủ luôn gọn gàng. Bạn chỉ cần tương tác (di chuyển chuột) là danh sách sẽ không đóng.
- **Tại sao chỉ thấy 3 khóa học đầu tiên?**
  - Hệ thống mặc định thu gọn để ưu tiên trải nghiệm cuộn trang nhanh. Hãy nhấn "Xem thêm" để thấy toàn bộ.
- **Tôi mới đăng ký khóa học nhưng chưa thấy ở "Khóa học của tôi"?**
  - Bạn cần chờ Admin phê duyệt thanh toán. Sau khi được duyệt, khóa học sẽ tự động chuyển từ mục khám phá sang mục của bạn.
