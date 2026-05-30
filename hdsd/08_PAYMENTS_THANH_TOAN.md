# 08. THANH TOÁN VÀ KÍCH HOẠT (PAYMENTS)
> **Mục đích**: Tài liệu này đặc tả luồng giao dịch tài chính, cơ chế phê duyệt thanh toán thủ công và tự động kích hoạt quyền truy cập khóa học cho học viên.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Luồng Giao dịch (Transaction Flow)
Quy trình từ lúc học viên nhấn "Mua khóa học" đến khi được vào học:

1. **Khởi tạo (Enrollment)**: Tạo một bản ghi trong bảng `Enrollment` với trạng thái `PENDING`.
2. **Yêu cầu Thanh toán (Payment)**: Tạo bản ghi `Payment` liên kết với Enrollment. Hệ thống hiển thị QR Code và thông tin chuyển khoản (STK, Nội dung) đã được cấu hình riêng cho khóa học đó.
3. **Gửi minh chứng (Proof of Payment)**: Học viên tải ảnh biên lai chuyển khoản (Proof Image) lên hệ thống. Ảnh được lưu trữ an toàn trên Supabase Storage.
4. **Phê duyệt (Verification)**: 
   - Admin hoặc Giáo viên kiểm tra thông tin trong công cụ quản trị.
   - Khi nhấn "Xác nhận", Server Action `verifyPaymentAction` sẽ thực hiện đồng thời:
     - Cập nhật `Payment.status = VERIFIED`.
     - Cập nhật `Enrollment.status = ACTIVE`.
     - Gửi email thông báo kích hoạt thành công cho học viên.
     - (Nếu có) Tính toán và ghi nhận hoa hồng Affiliate cho người giới thiệu.

### 2. Mô hình Dữ liệu (Prisma Schema)
- **Enrollment**: Chứa mối quan hệ giữa `User` và `Course`.
- **Payment**: Chứa thông tin chi tiết về số tiền, ngân hàng, ảnh biên lai và trạng thái duyệt. Mối quan hệ là **1-1** với Enrollment thông qua `enrollmentId`.

### 3. Công cụ Quản lý Thanh toán (Payments Tool)
- **Lọc thông tin**: Mặc định hiển thị danh sách **PENDING** (Chờ duyệt) để tối ưu luồng xử lý của Admin.
- **Thống kê nhanh**: Hiển thị tổng số đơn Chờ, đơn Đã duyệt và đơn Bị từ chối ngay trên thanh công cụ.
- **Preview Biên lai**: Tích hợp trình xem ảnh (Image Viewer) để Admin kiểm tra tính xác thực của biên lai mà không cần tải về máy.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Dành cho Học viên
**Bước 1: Mua khóa học**
- Tại trang chi tiết khóa học, nhấn **"Đăng ký học ngay"**.
- Hệ thống sẽ hiện thông tin chuyển khoản. Bạn hãy thực hiện chuyển khoản đúng số tiền và nội dung hiển thị (Mẹo: Quét mã QR để tự động điền thông tin).

**Bước 2: Gửi biên lai**
- Sau khi chuyển khoản thành công, hãy chụp màn hình biên lai.
- Quay lại trang học của khóa học đó, tải ảnh biên lai lên và nhấn **"Gửi xác nhận"**.
- Trạng thái khóa học sẽ chuyển thành **"Đang chờ duyệt"**.

### 2. Dành cho Quản trị viên (Admin/Teacher)
**Bước 1: Kiểm tra yêu cầu**
- Truy cập **Tools** -> **Thanh toán**.
- Xem danh sách các yêu cầu đang chờ (PENDING). Kiểm tra khớp lệnh giữa ảnh biên lai học viên gửi và biến động số dư ngân hàng của bạn.

**Bước 2: Phê duyệt/Từ chối**
- **Xác nhận**: Nếu thông tin đã chính xác, nhấn nút **"Xác nhận"**. Học viên sẽ ngay lập tức vào học được.
- **Từ chối**: Nếu số tiền sai hoặc ảnh biên lai không hợp lệ, nhấn **"Từ chối"** và nhập lý do (vd: "Sai số tiền", "Nội dung chuyển khoản không khớp"). Học viên sẽ nhận được thông báo để thực hiện lại.

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao tôi đã chuyển khoản nhưng vẫn chưa được vào học?**
  - Hệ thống hiện tại sử dụng cơ chế **Duyệt thủ công** để đảm bảo an toàn. Quá trình này có thể mất từ 5-30 phút tùy vào thời điểm Admin kiểm tra.
- **Tôi lỡ tay từ chối một thanh toán đúng, phải làm sao?**
  - Bạn có thể chuyển sang Tab **"Tất cả"**, tìm lại đơn đó và thực hiện "Xác nhận" lại. Hệ thống sẽ cập nhật lại trạng thái cho học viên.
- **Học viên báo lỗi không tải được ảnh biên lai?**
  - Đảm bảo file ảnh của học viên không quá lớn (dưới 5MB) và có định dạng phổ biến (JPG, PNG). Nếu vẫn lỗi, Admin có thể duyệt trực tiếp nếu đã nhận được tiền trong tài khoản.
