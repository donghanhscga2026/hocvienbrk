# SESSION_LOG.md — Nhật ký phiên làm việc

> **Mục đích**: Lưu trữ lịch sử các phiên làm việc của AI Agent để tra cứu sau này.  
> **Quy tắc**: Mỗi phiên làm việc (session) ghi 1 entry mới vào cuối file.  
> **Cách tra cứu**: Dùng `2026-07-07_ses_01` (YYYY-MM-DD_ses_NN) làm session ID.

---

## ✅ SESSION-20260707_01 — Loại bỏ fallback tài khoản chung #2689, thêm Telegram FAILED_LOGIN

- **Ngày**: 2026-07-07
- **Thời gian**: ~21:00 - 22:30
- **Trạng thái**: ✅ Hoàn thành (chờ deploy + add bot vào group)

### Mục tiêu
Khi học viên đăng nhập sai thông tin:
- **Không** tự động fallback vào tài khoản chung #2689
- Hiển thị lỗi cụ thể: sai mã HV / sai email / sai SĐT / sai mật khẩu
- Gửi cảnh báo Telegram vào group `FAILED_LOGIN` riêng cho bộ phận hỗ trợ
- Có link hướng dẫn: Quên mật khẩu? / Tìm tài khoản / Đăng ký mới

### Kiến trúc giải pháp

```
Client (login form/modal)
  → signIn() thất bại → result?.error truthy
  → fetch /api/auth/report-failed-login → { identifierType, errorType, userInfo }
  → Hiển thị lỗi cụ thể + link hành động

Server (auth.ts authorize)
  → Lookup user by ID → Phone → Email
  → Nếu fail → throw CustomLoginError(code) + sendTelegram(FAILED_LOGIN)
  → KHÔNG fallback vào #2689

API /api/auth/report-failed-login
  → Phân tích identifier (student_id / email / phone)
  → Lookup user
  → Trả về error type + user info
  → Gửi Telegram vào FAILED_LOGIN group
```

### Telegram Group mới
- **Chat ID**: `-1004466932240`
- **Bot token**: `8630082731:AAENKynjPOEAK_ZKQE35hwbeEoBgx14TiQ0`
- **Mục đích**: Gửi cảnh báo khi có đăng nhập thất bại (kèm chi tiết user)

### Các file đã thay đổi

#### `lib/notifications.ts`
- Thêm type `FAILED_LOGIN` vào union type
- Thêm mapping `FAILED_LOGIN: process.env.TELEGRAM_CHAT_ID_FAILED_LOGIN`

#### `app/api/auth/report-failed-login/route.ts`
- **Viết lại hoàn toàn**
- Bỏ logic tạo user #2689
- Thêm `detectIdentifierType()`: phân biệt student_id / email / phone
- Thêm `normalizePhone()`: chuẩn hóa SĐT
- Trả về JSON: `{ identifierType, errorType, userFound, userInfo }`
- Gửi Telegram vào `FAILED_LOGIN` group

#### `auth.ts` (authorize callback)
- **CŨ**: fallback về #2689 + sendTelegram(type: 'LESSON')
- **MỚI**: throw `CustomLoginError(code)` + sendTelegram(type: 'FAILED_LOGIN')
- Error codes: `STUDENT_ID_NOT_FOUND`, `EMAIL_NOT_FOUND`, `PHONE_NOT_FOUND`, `INVALID_PASSWORD`, `NO_PASSWORD`

#### `app/login/page.tsx`
- **CŨ**: signIn lần 2 với #2689, redirect sau 5s
- **MỚI**: gọi API `/api/auth/report-failed-login`, hiển thị lỗi cụ thể
- Thêm `actionType` state + link hành động động dưới error
- Code cũ comment lại: `/* OLD - Shared Account #2689 Fallback START */`

#### `components/auth/AccountAssistantModal.tsx`
- **CŨ**: signIn lần 2 với #2689
- **MỚI**: gọi API, hiển thị lỗi, gợi ý đặt lại mật khẩu qua OTP
- `handleCheckStudentId`: thêm nút "Tìm tài khoản bằng email/SĐT" khi không tìm thấy mã HV
- Thêm hàm `goToFindAccount()` → `goToStep('check')`
- Code cũ comment lại

#### `components/layout/MainHeader.tsx`
- Comment banner `isTempLogin` (amber warning)

### Các file backup (trong `plan_temp/`)
| File backup | File gốc |
|---|---|
| `report-failed-login_backup_20260707_001.patch` | `report-failed-login/route.ts` |
| `auth_backup_20260707_002.patch` | `auth.ts` |
| `login_page_backup_20260707_003.patch` | `login/page.tsx` |
| `AccountAssistantModal_backup_20260707_004.patch` | `AccountAssistantModal.tsx` |
| `MainHeader_backup_20260707_005.patch` | `MainHeader.tsx` |

### Biến môi trường mới
```
TELEGRAM_CHAT_ID_FAILED_LOGIN=-1004466932240
```

### Kiểm tra
- ✅ TypeScript: `npx tsc --noEmit` → 0 errors
- ✅ API test `identifier=999999` → `{ identifierType: "student_id", errorType: "NOT_FOUND" }`
- ✅ API test `identifier=1` → `{ identifierType: "student_id", errorType: "INVALID_PASSWORD" }`
- ✅ API test email → `{ identifierType: "email", errorType: "NOT_FOUND" }`

### Công việc còn lại
- [ ] Add bot `8630082731:AAENKynjPOEAK_ZKQE35hwbeEoBgx14TiQ0` vào group `-1004466932240`
- [ ] Deploy lên Vercel (kèm env `TELEGRAM_CHAT_ID_FAILED_LOGIN`)
- [ ] Test đăng nhập sai trên production → kiểm tra Telegram
