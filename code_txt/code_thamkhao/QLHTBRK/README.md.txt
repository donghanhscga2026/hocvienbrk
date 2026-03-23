================================================================================
FILE: code_thamkhao\QLHTBRK\README.md
================================================================================

# 🎓 HỆ THỐNG QUẢN LÝ HỌC TẬP BRK

Hệ thống quản lý học viên và khóa học cho BRK - Nhân hiệu từ gốc.

## 📋 Tính năng

### ✅ Đã hoàn thành
- **Đăng ký tài khoản miễn phí**
  - Sinh mã học viên tự động (bỏ qua mã VIP)
  - Tạo link affiliate tự động
  - Hỗ trợ mã giới thiệu
  - Gửi email chào mừng với link kích hoạt

- **Đăng nhập**
  - Hỗ trợ đăng nhập bằng Email hoặc SĐT
  - Kiểm tra kích hoạt tài khoản
  - Ghi nhớ đăng nhập

- **Quên mật khẩu**
  - Reset về mật khẩu mặc định
  - Gửi email hướng dẫn

- **Dashboard**
  - Tách biệt khỏi trang đăng nhập
  - Kiểm tra session tự động
  - Hiển thị thông tin học viên

## 🏗️ Cấu trúc dự án

```
QLHTBRK/
├── hocxaykenh/
│   ├── Index.html              # Trang đăng nhập/đăng ký
│   ├── dashboard.html          # Dashboard (sau khi đăng nhập)
│   ├── forgot_password.html    # Quên mật khẩu
│   ├── dangky_account.html     # (Legacy - không dùng)
│   ├── login.html              # (Legacy - không dùng)
│   └── home.html               # Landing page
├── Backend.gs                  # Google Apps Script backend
├── TEST_GUIDE.md              # Hướng dẫn test
├── GIT_GUIDE.md               # Hướng dẫn Git
└── README.md                  # File này

```

## 🚀 Deployment

### Backend (Google Apps Script)
1. Mở https://script.google.com
2. Tạo project mới hoặc mở project hiện tại
3. Copy nội dung `Backend.gs` vào editor
4. Deploy as Web App:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy deployment URL

### Frontend (Vercel)
1. Push code lên GitHub (xem `GIT_GUIDE.md`)
2. Truy cập https://vercel.com
3. Import repository từ GitHub
4. Deploy

## 🔧 Cấu hình

### API URL
Cập nhật `API_URL` trong các file HTML:
- `Index.html`
- `dashboard.html`
- `forgot_password.html`

```javascript
const API_URL = "YOUR_APPS_SCRIPT_URL_HERE";
```

### Database
Google Sheet ID trong `Backend.gs`:
```javascript
const DB_ID = "1VWskTJhF6G_Y5SFMdaHsckeCn2H7hc03bEnGQ7UNn9A";
```

## 📊 Cấu trúc Sheet "Dky"

| Cột | Tên | Mô tả |
|-----|-----|-------|
| A | Timestamp | Thời gian đăng ký |
| B | Code | Mã học viên |
| C | Name | Họ tên |
| D | ReferralCode | Mã giới thiệu |
| E | ReferrerName | Tên người giới thiệu |
| F | Phone | Số điện thoại |
| G | Email | Email |
| N | AffiliateLink | Link tiếp thị |
| W | Note | Ghi chú |
| Y | Password | Mật khẩu |
| Z | Status | Trạng thái kích hoạt |
| AA | Token | Token kích hoạt |

## 🧪 Testing

Xem chi tiết trong `TEST_GUIDE.md`

## 📝 Changelog

### 2026-02-03
- ✅ Tách Index.html thành auth page và dashboard
- ✅ Sửa lỗi sinh mã CODE (tìm max code chính xác)
- ✅ Sửa lỗi mapping cột trong Backend.gs
- ✅ Thêm hàm getColumnIndex() để mapping theo tên cột

## 👥 Contributors

- Coach Cuong - Project Owner

## 📄 License

Private - All rights reserved


================================================================================
END OF FILE: code_thamkhao\QLHTBRK\README.md
================================================================================
