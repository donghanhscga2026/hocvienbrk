# 05. NHÂN MẠCH (GENEALOGY TREE)
> **Mục đích**: Tài liệu này đặc tả hệ thống Sơ đồ phả hệ (Genealogy) - linh hồn của dự án Học viện BRK, bao gồm mô hình dữ liệu Closure Table, các chế độ hiển thị và logic xây dựng cây đa cấp.

---

## A. ĐẶC TẢ KỸ THUẬT (TECHNICAL)

### 1. Mô hình Dữ liệu Closure Table
Để quản lý cây phả hệ với độ sâu không giới hạn và khả năng truy vấn cực nhanh, hệ thống sử dụng mô hình **Closure Table** thông qua bảng `UserClosure`.

- **Cấu trúc bảng**:
  - `ancestorId`: ID của người cấp trên (Tổ tiên).
  - `descendantId`: ID của người cấp dưới (Hậu duệ).
  - `depth`: Khoảng cách giữa 2 người (0: chính mình, 1: con trực tiếp F1, 2: cháu F2...).
- **Ưu điểm**: 
  - Lấy toàn bộ cây con của một người chỉ bằng 1 câu lệnh `JOIN` đơn giản.
  - Tìm toàn bộ cấp trên (Upline) để tính hoa hồng cực kỳ hiệu quả.
  - Không bị giới hạn độ sâu như mô hình Adjacency List truyền thống.

### 2. Logic Phân loại Node (A/B/C)
Để tối ưu hóa không gian hiển thị (đặc biệt khi hệ thống có hàng ngàn thành viên), cây phả hệ áp dụng cơ chế phân loại node thông minh:

| Nhóm | Đặc điểm | Giao diện hiển thị |
|:---:|:---|:---|
| **LÁ (A)** | Node chưa có bất kỳ thành viên nào bên dưới. | Chỉ hiện tên và ảnh đại diện. |
| **CẠN (B)** | Node đã có F1 (con) nhưng chưa có F2 (cháu). | Nút bấm "CẠN" kèm số lượng thành viên. |
| **SÂU (C)** | Node có hệ thống phát triển sâu (có từ F2, F3 trở đi). | Hiển thị nút "N nhánh" để mở rộng cây con. |

### 3. Các chế độ hiển thị (View Modes)
- **Chế độ GỌN (Mặc định)**: Ẩn các nhóm LÁ và CẠN vào các Modal để làm gọn sơ đồ, chỉ tập trung vào các nhánh đang phát triển (Nhóm C).
- **Chế độ ĐẦY ĐỦ**: Bung toàn bộ các node trên sơ đồ để có cái nhìn tổng cảnh (Cần cấu hình trong Toolbar).
- **Focus Subtree**: Khi nhấn vào một node, hệ thống sẽ lấy node đó làm gốc (Root) và hiển thị trọn vẹn cây con của người đó.

### 4. Tích hợp dữ liệu TCA
Đối với hệ thống TCA (systemId=1), mỗi node được bổ sung các thông tin nghiệp vụ:
- **Cấp bậc**: Hiển thị qua Badge (Cấp 1 -> 8).
- **Điểm số**: Điểm cá nhân và điểm đội nhóm (Decimal 10,3).
- **Chức danh**: Chuyên gia, Trưởng phòng, Giám đốc...

---

## B. HƯỚNG DẪN SỬ DỤNG (USER GUIDE)

### 1. Thao tác trên Sơ đồ
- **Di chuyển**: Nhấn giữ và kéo chuột (hoặc ngón tay trên mobile) để di chuyển toàn bộ sơ đồ.
- **Phóng to/Thu nhỏ**: Sử dụng con lăn chuột hoặc bảng điều khiển ở góc dưới bên trái.
- **Xem chi tiết**: Nhấn vào **Hình bán nguyệt (Avatar)** của bất kỳ thành viên nào để xem thông tin liên hệ (SĐT, Email, Ngày tham gia).
- **Mở rộng nhánh**: Nhấn vào nút **"N nhánh"** (màu indigo) để xem các thành viên cấp dưới của người đó.

### 2. Công cụ Tìm kiếm & Lọc
- **Tìm ID**: Nhập mã học viên (#ID) vào ô tìm kiếm để định vị nhanh thành viên đó trên sơ đồ. Hệ thống sẽ tự động vẽ đường dẫn từ gốc đến người đó.
- **Đội của tôi (My Team)**: Tích vào ô này để sơ đồ chỉ hiển thị bạn và hệ thống cấp dưới của bạn.
- **Lọc Active**: Chỉ hiển thị các thành viên đã được kích hoạt tài khoản/khóa học.

### 3. Dành cho Admin (Quản trị hệ thống)
- **Tạo cây mới**: Nếu một hệ thống (vd: KTC) chưa có dữ liệu, Admin nhấn nút **"Tạo cây"** và chọn một thành viên làm Gốc (Root).
- **Thêm/Xóa Node**: Trong chế độ **SỬA**, Admin có thể nhấn nút `+` để thêm F1 cho một người hoặc nút `x` để loại bỏ một thành viên khỏi sơ đồ (Lưu ý: Việc xóa node sẽ ảnh hưởng đến toàn bộ nhánh con bên dưới).

---

## C. CÁC TÌNH HUỐNG THƯỜNG GẶP (FAQ)
- **Tại sao tôi không thấy thành viên mới đăng ký trên sơ đồ?**
  - Thành viên mới cần được Admin duyệt thanh toán hoặc kích hoạt tài khoản thì mới xuất hiện trên sơ đồ (nếu đang bật lọc Active).
- **Sơ đồ bị rối, làm sao để quay lại ban đầu?**
  - Nhấn nút **"Cây chính"** (màu xanh lá) trên thanh công cụ để đưa sơ đồ về trạng thái mặc định của bạn.
