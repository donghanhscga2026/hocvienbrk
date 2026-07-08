# Hệ thống cảnh báo đăng nhập thất bại (Login Failed Alert)

> **Kiến trúc**: Client-side gọi API → API lookup user → Telegram notify  
> **Phiên bản**: 1.1.0 (2026-07-08)  
> **Session**: `SESSION-20260707_01` (sửa bổ sung 2026-07-08)

---

## 1. Tổng quan

Khi học viên đăng nhập sai, hệ thống:

1. **Server** (`auth.ts` authorize): throw `CustomLoginError` với error code — **không gửi Telegram**
2. **Client** (login page / Account Assistant): bắt lỗi, gọi API `/api/auth/report-failed-login`
3. **API** (`report-failed-login` route): phân tích identifier, lookup user, trả về error type + **gửi Telegram duy nhất**
4. **UI**: hiển thị thông báo lỗi cụ thể + link hành động (Quên mật khẩu, Tìm tài khoản, Đăng ký)

> Chỉ có **1 tin Telegram** cho mỗi lần login fail — từ API `report-failed-login`. Tin từ `auth.ts` đã được loại bỏ vì không có thông tin user cụ thể.

## 2. Error types & Messages

| ErrorType | IdentifierType | Message hiển thị | Action link |
|---|---|---|---|
| `NOT_FOUND` | `student_id` | "Mã học viên này không tồn tại." | Tìm tài khoản |
| `NOT_FOUND` | `email` | "Email này chưa đăng ký tài khoản." | Đăng ký |
| `NOT_FOUND` | `phone` | "Số điện thoại này chưa đăng ký tài khoản." | Đăng ký |
| `INVALID_PASSWORD` | *any* | "Mật khẩu không chính xác." | Quên mật khẩu? |
| `NO_PASSWORD` | *any* | "Tài khoản này chưa thiết lập mật khẩu." | Quên mật khẩu? |

## 3. API Reference

### `POST /api/auth/report-failed-login`

**Request:**
```json
{ "identifier": "12345" }
```

**Response:**
```json
{
  "identifierType": "student_id",
  "errorType": "INVALID_PASSWORD",
  "userFound": true,
  "userInfo": {
    "id": 12345,
    "name": "Nguyễn Văn A",
    "email": "a@example.com",
    "phone": "0912345678"
  }
}
```

### Logic phát hiện identifier type:
- `identifier` all digits → `student_id`
- `identifier` chứa `@` → `email`
- `identifier` có 8-15 digits → `phone`
- Khác → `unknown`

## 4. Telegram Notification

### Nhóm FAILED_LOGIN

**Chat ID**: `TELEGRAM_CHAT_ID_FAILED_LOGIN=-1004466932240`

Các tình huống gửi:
| Tình huống | Nguồn | Nội dung |
|---|---|---|
| Login sai → API báo cáo | `report-failed-login` route | `⚠️ ĐĂNG NHẬP THẤT BẠI` — có userInfo đầy đủ |
| Login thành công | `sendLoginNotification` → `FAILED_LOGIN` | `🔑 THÔNG BÁO ĐĂNG NHẬP` — thông báo HV đã vào được |

### Format message (login fail):
```
⚠️ ĐĂNG NHẬP THẤT BẠI
━━━━━━━━━━━━━━━━━━━━━
📍 Định danh nhập vào: <code>12345</code>
📋 Loại định danh: Mã học viên
❌ Lỗi: <b>Sai mật khẩu</b>
📋 Thông tin user:
  🆔 Mã HV: #12345
  👤 Họ tên: Nguyễn Văn A
  📧 Email: a@example.com
  📞 SĐT: 0912345678
⏰ Thời gian: 07/07/2026 21:30:00
━━━━━━━━━━━━━━━━━━━━━
💡 Học viên nên: Kiểm tra lại thông tin hoặc dùng tính năng Quên tài khoản/Quên mật khẩu
```

### Các nhóm Telegram khác liên quan
| Nhóm | Env | Chat ID |
|---|---|---|
| `FAILED_LOGIN` | `TELEGRAM_CHAT_ID_FAILED_LOGIN` | `-1004466932240` |
| `REGISTER` | `TELEGRAM_CHAT_ID_REGISTER` | `-5122660746` |
| `CHANGE` | `TELEGRAM_CHAT_ID_CHANGE` | `-1004458102417` |

## 5. Code cũ (Shared Account #2689 Fallback)

Code fallback vào tài khoản chung #2689 được **giữ lại dạng comment** ở các file:

| File | Tag |
|---|---|
| `app/login/page.tsx` | `/* OLD - Shared Account #2689 Fallback START */` |
| `components/auth/AccountAssistantModal.tsx` | `/* OLD - Shared Account #2689 Fallback START */` |
| `components/layout/MainHeader.tsx` | `/* OLD - Temp Login Banner START */` |

**Cách kích hoạt lại**: Bỏ comment, deploy lại.

## 6. Cấu hình

### Biến môi trường
```
TELEGRAM_CHAT_ID_FAILED_LOGIN=-1004466932240
TELEGRAM_CHAT_ID_CHANGE=-1004458102417
TELEGRAM_BOT_TOKEN=8630082731:AAENKynjPOEAK_ZKQE35hwbeEoBgx14TiQ0
```

### Backup patches (trong `plan_temp/`)
| Patch | Nội dung |
|---|---|
| `report-failed-login_backup_20260707_001.patch` | API report-failed-login |
| `auth_backup_20260707_002.patch` | auth.ts authorize callback |
| `login_page_backup_20260707_003.patch` | login page |
| `AccountAssistantModal_backup_20260707_004.patch` | Account Assistant Modal |
| `MainHeader_backup_20260707_005.patch` | MainHeader |
| `notifications_ts_backup_20260708_002.patch` | notifications.ts (thêm CHANGE, sửa FAILED_LOGIN) |

## 7. Flow chi tiết

```
User nhập sai thông tin
  │
  ├─► Server authorize (auth.ts)
  │     ├─ Lookup: ID → Phone → Email
  │     └─ Nếu fail: throw CustomLoginError(code) — KHÔNG gửi Telegram
  │
  ├─► Client (login page)
  │     ├─ result?.error = "CredentialsSignin"
  │     ├─ fetch /api/auth/report-failed-login
  │     ├─ Nhận errorType + identifierType
  │     ├─ Hiển thị lỗi cụ thể + link hành động
  │     └─ Hiển thị contact card (Zalo 0876473257)
  │
  └─► API /api/auth/report-failed-login (nguồn Telegram DUY NHẤT)
        ├─ detectIdentifierType(identifier)
        ├─ Lookup user
        ├─ Xác định errorType
        ├─ Gửi Telegram (FAILED_LOGIN) — có userInfo đầy đủ
        └─ Return JSON
```
