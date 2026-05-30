# 04. AFFILIATE VÀ HỆ THỐNG GIỚI THIỆU
> **Mục đích**: Tài liệu này mô tả logic vận hành của hệ thống Tiếp thị liên kết (Affiliate), bao gồm cơ chế theo dõi chuyển đổi, tính toán hoa hồng đa cấp và quản lý ví điện tử của học viên.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Cơ chế Theo dõi (Tracking Mechanism)
Hệ thống sử dụng mô hình **Cookie-based Tracking** kết hợp với **First Click/Last Click** logic (tùy cấu hình).

- **Middleware Tracking (proxy.ts)**: 
  - Khi có tham số `?ref=...` trên URL, middleware sẽ trích xuất mã giới thiệu.
  - Lưu thông tin vào cookie `aff_ref` (JSON string) gồm: `r` (Mã giới thiệu), `l` (Landing Page ID), `t` (Timestamp).
  - Thời hạn cookie: **30 ngày**.
- **Registration Locking**: Trong trang đăng ký, nếu phát hiện cookie `aff_ref`, ô "Mã giới thiệu" sẽ được điền sẵn và bị vô hiệu hóa (Disabled) để đảm bảo tính minh bạch.

### 2. Mô hình Hoa hồng Đa cấp (Multi-level Commission)
Dự án hỗ trợ trả hoa hồng lên tới nhiều tầng (mặc định là 3 tầng: F1, F2, F3).

- **Hệ thống Campaign**:
  - `pointsPerRegistration`: Số điểm thưởng khi giới thiệu 1 người đăng ký mới (vd: 1 điểm).
  - `percentage`: Tỷ lệ % hoa hồng dựa trên giá trị khóa học cho từng cấp bậc (F1: 10%, F2: 5%, F3: 2%).
- **Logic Tính toán (commission-calculator.ts)**:
  - Sử dụng **Closure Table** (`traceUpline`) để tìm ngược danh sách người giới thiệu (Ancestor) của người mua.
  - Tính số tiền thực nhận (`netAmount`) sau khi trừ thuế (`taxRate`) và phí hệ thống (`feeAmount`).
  - Ghi nhận ở trạng thái **PENDING** và tự động chuyển sang **AVAILABLE** sau một khoảng thời gian chờ (vd: 30 ngày) để tránh rủi ro hoàn tiền.

### 3. Quản lý Ví và Giao dịch (Wallet & Transactions)
Mỗi học viên có một ví điện tử (`AffiliateWallet`) gồm các số dư:
- **Balance**: Số dư khả dụng (có thể rút).
- **Pending Balance**: Hoa hồng đang chờ duyệt.
- **Points**: Điểm thưởng tích lũy từ việc giới thiệu đăng ký.

**Wallet Service**:
- Toàn bộ việc cập nhật số dư được thực hiện qua hàm `ensureWalletAndUpdate` (sử dụng `upsert` để đảm bảo ví luôn tồn tại).
- Mọi biến động số dư đều được ghi log vào bảng `AffiliateTransaction` để đối soát.

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Cách lấy Link giới thiệu
- Truy cập vào menu **Cá nhân** -> **Hệ thống Affiliate** (nếu có quyền).
- Copy mã học viên (#ID) của bạn. Link giới thiệu của bạn sẽ có định dạng: `https://giautoandien.io.vn/?ref=YOUR_ID`.
- Bạn có thể gửi link này cho bạn bè hoặc chia sẻ lên mạng xã hội.

### 2. Xem Thống kê & Thu nhập
- **Tổng quan**: Theo dõi số lượt Click, số người đã Đăng ký và số đơn hàng thành công.
- **Ví tiền**:
  - **Tiền chờ duyệt**: Hoa hồng từ các đơn hàng mới, cần thời gian xác minh.
  - **Tiền khả dụng**: Tiền bạn có thể thực hiện lệnh rút về ngân hàng.
  - **Điểm thưởng**: Điểm tích lũy (có thể dùng để đổi quà hoặc trừ vào học phí sau này).

### 3. Quy trình Rút tiền (Payout)
- Đảm bảo số dư khả dụng đạt mức tối thiểu (vd: 200.000 VNĐ).
- Cập nhật thông tin ngân hàng trong phần cài đặt Affiliate.
- Nhấn "Yêu cầu rút tiền". Admin sẽ kiểm tra và thực hiện chuyển khoản cho bạn trong vòng 24-48 giờ làm việc.

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao tôi giới thiệu bạn đăng ký nhưng không thấy hoa hồng?**
  - Hệ thống chỉ tính hoa hồng khi bạn của bạn thực hiện **thanh toán khóa học** và được Admin duyệt. Nếu bạn của bạn chỉ mới đăng ký tài khoản, bạn sẽ nhận được **Điểm thưởng (Points)** thay vì tiền mặt.
- **Mã giới thiệu bị sai/nhầm thì làm sao?**
  - Vì lý do bảo mật và công bằng, mã giới thiệu đã được khóa khi đăng ký sẽ không thể thay đổi. Tuy nhiên, Admin có thể hỗ trợ điều chỉnh trong trường hợp đặc biệt qua bảng điều khiển hệ thống.
