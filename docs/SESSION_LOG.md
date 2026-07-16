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


## ✅ SESSION-20260709_01 — Nâng cấp tính năng và giao diện Giao dịch thanh toán (tools/payments)

- **Ngày**: 2026-07-09
- **Thời gian**: ~17:00 - 18:00
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Hiển thị thêm thông tin số điện thoại của học viên và hỗ trợ sao chép nhanh SĐT (tách ô copy riêng biệt).
- Hiển thị chi tiết thông tin Nhân mạch chia sẻ khóa học #[id_khoa] và Nhân mạch kết nối để đối chiếu (rút gọn nhãn, bỏ tên khóa học ở nhân mạch chia sẻ).
- Tự động sinh cú pháp chuyển khoản chuẩn của hệ thống và hiển thị so sánh với nội dung học viên chuyển thực tế (phát hiện khớp/lệch).
- Bổ sung nút sinh mã QR chuyển khoản VietQR tự động theo đúng tài khoản nhận của giảng viên dạy khóa, đúng số tiền và cú pháp chuẩn.
- Đồng bộ nội dung tin nhắn Telegram khi phê duyệt thủ công có đầy đủ thông tin (Số tiền, Ngân hàng, Mã khóa học) giống hệt tin nhắn khi tự động kích hoạt.
- Tối ưu giao diện đáp ứng (responsive), hạn chế tràn chữ và thiếu nội dung trên thiết bị di động.

### Các file đã thay đổi
#### `app/actions/payment-actions.ts`
- Cập nhật hàm `getPendingPayments` và `getAllPayments` để include thông tin của `enrollment.referrer`, `enrollment.user.referrer` và `enrollment.course.teacherBankAccount`.
- Cập nhật hàm `verifyPaymentAction` (duyệt thủ công) để lấy thêm `teacherBankAccount` và đồng bộ nội dung tin nhắn Telegram báo về (thêm Số tiền, Ngân hàng nhận, Mã khóa học) giống hệt định dạng của kích hoạt tự động.

#### `app/tools/payments/page.tsx`
- Cập nhật interface `PaymentData` và import `QrCode`, `resolveBankBin`.
- Sắp xếp lại giao diện hiển thị gọn gàng: thông tin học viên (bao gồm mã số học viên `#`, họ tên, email, ngày đăng ký, nút Copy số điện thoại riêng), thông tin 2 loại nhân mạch (rút gọn nhãn nhã, bỏ chữ user.referrer), thông tin khóa học (tên, giá cọc, số tiền nhận được, STK từ Gmail), cú pháp đối chiếu, nút sinh QR và biên lai.
- Tối ưu hóa CSS Tailwind và layout responsive trên mobile.

### Các file backup (trong `plan_temp/`)
| File backup | File gốc |
|---|---|
| `payment-actions.backup_20260709_1733.ts` | `app/actions/payment-actions.ts` |
| `payment-actions.backup_20260709_1800.ts` | `app/actions/payment-actions.ts` |
| `page.backup_20260709_1733.tsx` | `app/tools/payments/page.tsx` |

### Kiểm tra
- ✅ TypeScript: `npx tsc --noEmit` → 0 errors


## ✅ SESSION-20260709_02 — Cập nhật giao diện thông tin chi tiết thành viên (tools/genealogy)

- **Ngày**: 2026-07-09
- **Thời gian**: ~18:20 - 18:50
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Hiển thị Số điện thoại của thành viên thay thế cho email ngay dưới tên thành viên.
- Rút gọn và hiển thị Mã học viên `#[id]` cùng dòng họ tên học viên.
- Đưa Cấp bậc (ví dụ Cấp 3, Học viên) làm nổi bật ở góc bên phải của header thay vào vị trí cũ của Mã học viên.
- Bổ sung hiển thị đầy đủ 4 dòng Nhân mạch & Upline:
  1. Nhân mạch kết nối (`user.referrer`)
  2. Nhân mạch chia sẻ (`enrollment.referrer` lấy từ khóa 22)
  3. MB upline 1 (Tuyến trên trực tiếp)
  4. MB upline 2 (Tuyến trên của upline 1)
- Chỉnh nhãn Điểm tăng trưởng dời chữ `(MP)` ra sau giá trị điểm (ví dụ: `357 (MP)`).
- Loại bỏ các đường kẻ ngăn cách `border-t` và giảm khoảng cách margins/paddings giữa các khu vực thông tin để thu gọn diện tích hiển thị.

### Các file đã thay đổi
#### `app/actions/admin-actions.ts`
- Cập nhật hàm `getMemberDetailsAction` để include thêm `referrer` trong query select của `user` và `enrollment`, đồng thời trả về `enrollment` trong response object.

#### `app/tools/genealogy/page.tsx`
- Cập nhật interface `MemberDetailInfo` thêm property `enrollment?: any` vào `data`.
- Chỉnh sửa component `MemberDetailsModal`: thay đổi layout header, định dạng họ tên font chữ gọn gàng hơn (`font-bold tracking-tight` cỡ `text-sm sm:text-base`), dời badge Cấp bậc xuống góc dưới bên phải, loại bỏ ô số điện thoại ở phần chi tiết, hiển thị 4 dòng Upline/Nhân mạch kết nối/chia sẻ, chỉnh nhãn MP và thu gọn khoảng cách.

### Các file backup (trong `plan_temp/`)
| File backup | File gốc |
|---|---|
| `admin-actions.backup_20260709_1823.ts` | `app/actions/admin-actions.ts` |

### Kiểm tra
- ✅ TypeScript: `npx tsc --noEmit` → 0 errors

## ✅ SESSION-20260709_03 — Đồng bộ dữ liệu Affiliate Enroll Referrer cho khóa học #22

- **Ngày**: 2026-07-09
- **Thời gian**: ~19:40 - 20:05
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Đồng bộ và backfill trường `Enrollment.referrerId` (Nhân mạch chia sẻ khóa học #22) bị thiếu của các học viên đăng ký từ ngày 02/07/2026 trở đi.
- Đảm bảo dữ liệu affiliate nhất quán, hỗ trợ tính toán chính xác hoa hồng và phả hệ theo Phương án B.

### Công việc đã thực hiện
- Chạy script cập nhật dữ liệu database:
  - **Lượt 1**: Đồng bộ `referrerId = 3773` cho 20 học viên đầu tiên tham gia ngày 02/07 và 03/07 xếp tràn tầng F1/F2 của Root.
  - **Lượt 2**: Đồng bộ theo quy tắc tràn tầng cho 26 học viên còn lại:
    - Nếu người giới thiệu gốc (`User.referrerId`) **có đăng ký/active** khóa #22 $\rightarrow$ Cập nhật `Enrollment.referrerId` về đúng người giới thiệu đó.
    - Nếu người giới thiệu gốc **không đăng ký** khóa #22 (hoặc không có ref gốc) $\rightarrow$ Cập nhật `Enrollment.referrerId` về Root **`3773`** (vì họ bị xếp tràn tầng).
- Loại trừ an toàn root `#3773` tự làm referrer của chính mình.
- Dọn dẹp sạch các script backfill tạm thời trong thư mục `plan_temp`.

- ✅ Đồng bộ thành công tổng cộng 46 học viên bị thiếu `referrerId` trong DB.
- ✅ TypeScript: `npx tsc --noEmit` → 0 errors

## ✅ SESSION-20260709_04 — Xây dựng trang giao diện Lượt Đăng Ký Affiliate (conversions)

- **Ngày**: 2026-07-09
- **Thời gian**: ~20:10 - 20:15
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Xây dựng giao diện web tập trung cho Admin để tra cứu lịch sử học viên đăng ký qua link ref giới thiệu (Affiliate Conversions).
- Giúp Admin đối chiếu và sắp xếp vị trí phả hệ dễ dàng dựa trên người giới thiệu gốc.

### Các file đã thay đổi / Tạo mới
#### `app/tools/affiliate/conversions/page.tsx` (Tạo mới)
- Trang giao diện bảng danh sách Conversions: Hiển thị thời gian, thông tin học viên (Họ tên, SĐT), link ref đã bấm, người giới thiệu gốc, khóa học đăng ký và trạng thái kích hoạt thực tế.
- Thiết kế tối giản, loại bỏ thông tin email của học viên và người giới thiệu để tối ưu cột, sử dụng size chữ nhỏ (`text-xs` / `text-[11px]`) và giảm padding (`px-3 py-2`) giúp các cột khít hơn theo đúng yêu cầu của Admin.
- Bổ sung số điện thoại của người giới thiệu (quét từ DB qua Prisma và render dưới tên người giới thiệu) và thời gian kích hoạt cụ thể (quét từ `updatedAt` của ACTIVE enrollment) hiển thị nhỏ gọn ngay dưới trạng thái kích hoạt.
#### `app/tools/affiliate/affiliate-nav.ts` (Sửa đổi)
- Thêm tab "Lượt Đăng Ký" (URL `/tools/affiliate/conversions`) vào thanh menu phụ của Affiliate.
#### `app/tools/affiliate/page.tsx` (Sửa đổi)
- Sử dụng `useSession` để nhận diện vai trò `ADMIN` và tự động hiển thị thanh điều hướng phụ `AdminSubNav` ở đầu trang, giúp Admin nhanh chóng truy cập và chuyển đổi giữa các tab quản trị từ trang Dashboard chính.
#### `app/actions/course-actions.ts` (Sửa đổi)
- Gọi `trackAffiliateConversion` (loại `PURCHASE`) ngay sau khi tạo `Enrollment` thành công qua form web để đảm bảo không bị bỏ sót lượt đăng ký mua khóa học.
#### `app/api/enroll-after-register/route.ts` (Sửa đổi)
- Gọi `trackAffiliateConversion` (loại `PURCHASE`) sau khi tạo `Enrollment` thành công ngay sau khi đăng ký tài khoản.
#### `components/AffiliateTracker.tsx` (Sửa đổi)
- Sửa lỗi phương thức gửi dữ liệu nhấp chuột (log-click) từ `GET` thành `POST` để API lưu trữ đúng thông tin click thô của người dùng.

### Các file backup (trong `plan_temp/`)
| File backup | File gốc |
|---|---|
| `affiliate-nav.backup_20260709_2012.ts` | `app/tools/affiliate/affiliate-nav.ts` |
| `page.backup_20260709_2034.tsx` | `app/tools/affiliate/page.tsx` |
| `course-actions.backup_20260709_2052.ts` | `app/actions/course-actions.ts` |
| `enroll-after-register.backup_20260709_2052.ts` | `app/api/enroll-after-register/route.ts` |
| `AffiliateTracker.backup_20260709_2052.tsx` | `components/AffiliateTracker.tsx` |

### Kiểm tra
- ✅ Đã sửa lỗi track click thô (POST method) và bổ sung ghi nhận conversion khi mua khóa học.
- ✅ Đồng bộ (backfill) thành công 54 bản ghi `AffiliateConversion` bị thiếu cho học viên khóa #22 từ ngày 2/7 trở đi.
- ✅ Giao diện xem danh sách Conversions hiển thị trực quan, khít và gọn gàng, không bị tràn.
- ✅ Loại bỏ hoàn toàn email học viên & người giới thiệu để bảng thoáng hơn.
- ✅ Số điện thoại người giới thiệu và Ngày giờ kích hoạt hiển thị chuẩn xác.
- ✅ AdminSubNav hiển thị tự động trên Dashboard chính khi đăng nhập Admin.
- ✅ TypeScript: `npx tsc --noEmit` → 0 errors

## ✅ SESSION-20260714_01 — Sửa lỗi đăng nhập ID #0, trợ lý modal falsy ID, chuẩn hóa email API quên mật khẩu

- **Ngày**: 2026-07-14
- **Thời gian**: ~08:10 - 10:50
- **Trạng thái**: ✅ Hoàn thành & Đã deploy PROD

### Mục tiêu
- Sửa lỗi không nhận được email OTP đổi mật khẩu cho tài khoản admin ID `#0` (`cuonghamhoc.hn@gmail.com`) khi đặt lại mật khẩu từ popup báo sai mật khẩu.
- Sửa lỗi đăng nhập ID `0` báo không tìm thấy tài khoản học viên.
- Sửa lỗi modal trợ lý đăng nhập báo không tìm thấy mã học viên khi nhập ID `0`.
- Khắc phục lỗi quên mật khẩu báo 404 do phân biệt chữ hoa/thường hoặc khoảng trắng trong email input.

### Các file đã thay đổi
#### `auth.ts`
- Sửa điều kiện nhận diện ID học viên `potentialId > 0` thành `potentialId >= 0` để nhận diện ID `0` đăng nhập.

#### `components/auth/AccountAssistantModal.tsx`
- Sửa `goToStep('forgot_otp')` thành `handleSendOtp()` ở logic popup để thực sự gọi API gửi email OTP.
- Sửa `if (json.id)` thành `if (json.id != null)` để tránh việc ID `0` bị hiểu là falsy.

#### `app/actions/course-actions.ts`
- Sửa lỗi build TypeScript: Đổi `course.id` thành tham số `courseId` ở dòng 270.

#### `app/api/auth/forgot-password/route.ts`
#### `app/api/auth/verify-forgot-otp/route.ts`
#### `app/api/auth/reset-password/route.ts`
- Chuẩn hóa email đầu vào thành `.toLowerCase().trim()` và sử dụng `findFirst` với `mode: 'insensitive'` thay vì `findUnique` phân biệt chữ hoa/thường để tránh lỗi 404.

### Các file backup (trong `plan_temp/`)
| File backup | File gốc |
|---|---|
| `auth.backup_20260714_0838.ts` | `auth.ts` |
| `AccountAssistantModal.backup_20260714_0838.tsx` | `components/auth/AccountAssistantModal.tsx` |
| `forgot-password_route.backup_20260714_0838.ts` | `app/api/auth/forgot-password/route.ts` |
| `verify-forgot-otp_route.backup_20260714_0838.ts` | `app/api/auth/verify-forgot-otp/route.ts` |
| `reset-password_route.backup_20260714_0838.ts` | `app/api/auth/reset-password/route.ts` |

### Kiểm tra
- ✅ `npx tsc --noEmit` → 0 errors
- ✅ Code đã deploy thành công lên master (PROD) qua GitHub.

## ✅ SESSION-20260715_01 — Fix dữ liệu Hệ thống 4 (BRK), đồng bộ múi giờ Cron & chốt giờ thực tế, fix site profile

- **Ngày**: 2026-07-15
- **Thời gian**: ~17:00 - 19:45
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Khắc phục lỗi lệch dữ liệu Hệ thống 4 (MB Ngân hàng Phước Báu): ví sai số dư, điểm MP tăng lạm phát (do AI cũ cộng lặp điểm tuyến trên và bỏ sót 22 học viên lặp hoàn phí).
- Đồng bộ lịch chạy toàn bộ Cron Job của Vercel về đúng giờ Việt Nam (6:00 sáng, 7:00 sáng...) thay vì giờ UTC lệch sang chiều.
- Thay đổi cơ chế chốt giờ giao dịch `evalTime` từ mốc cứng `06:08` sáng sang thời gian thực chạy `now` của máy chủ.
- Sửa lỗi site-profile không hiển thị ảnh nền Hero Card được thiết lập riêng và sửa lỗi 404 khi ấn nút quay lại.
- Chẩn đoán lỗi `401 Unauthorized - Sai CRON_SECRET` trên Vercel.

### Các file đã thay đổi
#### `lib/brk/commission-calculator.ts`
- Sửa logic cộng điểm MP: Đưa lệnh cộng điểm lên trước kiểm tra `earnPct <= 0` để đảm bảo tất cả tuyến trên phả hệ đều được cộng điểm (+17), tránh lệch điểm so với Rebuild. Đồng thời bọc trong `!alreadyProcessed` check để chống lặp điểm.

#### `vercel.json`
- Điều chỉnh lịch chạy Vercel Crons từ UTC sang GMT+7 (Việt Nam): `brk-daily-eval` & `brk-grace-processing` chạy lúc 06:00 sáng (`0 23 * * *`), `brk-expiration` lúc 07:00 sáng (`0 0 * * *`), `brk-level-check` lúc 08:00 sáng (`0 1 * * *`), `brk-revenue-share` lúc 09:00 sáng (`0 2 */3 * *`).

#### `app/api/cron/brk-daily-eval/route.ts`
- Đổi giá trị `evalTime` từ `getCurrentEvalTime()` (mốc cứng 6:08 sáng) thành thời gian thực chạy `now` (`new Date()`).

#### `app/api/cron/gmail-watch/route.ts`
- Thêm log chi tiết chẩn đoán tình trạng thiết lập `CRON_SECRET` ở Vercel env và trạng thái Header gửi đến để dễ xác định lý do lỗi 401.

#### `components/home/MessageCard.tsx`
- Sửa thứ tự ưu tiên render ảnh nền để `profile.heroImage` có mức ưu tiên cao nhất, tránh bị ảnh mặc định của fallback đè lên.

#### Nút Back & Route site profile (4 file)
- Sửa các liên kết quay lại trong tab `site-profiles` và edit page từ đường dẫn lỗi 404 về đúng trang `/tools/pages?tab=site-profiles`.

#### `app/tools/genealogy/page.tsx`
- Loại bỏ hoàn toàn khối 2 tab ở Header đầu trang. Chuyển giao diện Quản trị hệ thống (`GenealogyAdminTab`) thành một popup Modal (max-w-4xl) mở ra khi click vào nút icon "⚡" Quản trị mới trên thanh công cụ (toolbar).
- Tăng chiều rộng ô chọn Hệ thống lên `w-64 sm:w-72` để hiện đầy đủ tên các hệ thống dài.
- Bỏ nhãn "Phương án:", chỉ để dropdown select đang chọn (mặc định Phương án B).
- Ẩn hoàn toàn 3 thông số (Active, BĐH, ĐHTT) khi chọn hệ thống khác #1 (chỉ hiển thị khi chọn hệ thống #1).

### Dọn dẹp dữ liệu (Database Cleanup)
- Chạy script `scripts/fix-duplicate-return-fee-final.js --execute` quét động và xử lý:
  - Cập nhật số dư thực tế khớp với giao dịch cho **41 ví** bị lệch (tài khoản `#269` về đúng CASH `5,642.28đ`).
  - Tính lại điểm MP chuẩn dựa trên số descendants F1/F2... đã confirmed (những người đã qua grace period và có RETURN_FEE) cho **15 tài khoản** (tài khoản `#269` về đúng `17` điểm do F1 `#18` vẫn trong grace period, root `#3773` về đúng `1224` điểm).
  - Hạ cấp bậc ảo và xóa **3 bản ghi thăng cấp Cấp 2 sai** (của `#837`, `#1093`, `#611`).
  - Đạt trạng thái: **Passed: 83/83. All users verified ✓**.

### Các file backup (trong `plan_temp/`)
| File backup | File gốc |
|---|---|
| `commission-calculator.backup_20260715_1933.ts` | `lib/brk/commission-calculator.ts` |
| `fix-duplicate-return-fee-final.backup_20260715_1933.js` | `scripts/fix-duplicate-return-fee-final.js` |
| `vercel.backup_20260715_1941.json` | `vercel.json` |
| `route.backup_20260715_1941.ts` | `app/api/cron/brk-daily-eval/route.ts` |
| `page.backup_20260715_1952.tsx` | `app/tools/genealogy/page.tsx` |
| `page.backup_20260715_2128.tsx` | `app/tools/genealogy/page.tsx` |

### Kiểm tra
- ✅ Script chạy thành công, đưa toàn bộ lỗi dữ liệu của 83 thành viên về 0.
- ✅ TypeScript: `npx tsc --noEmit` → 0 errors.

---

## ✅ SESSION-20260716_01 — Tách biệt Timing 3 Script mô phỏng & Sửa lỗi đếm F1 phả hệ trên memory

- **Ngày**: 2026-07-16
- **Thời gian**: ~01:45 - 02:05
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Tách rời thời gian vận hành và ghi nhận dữ liệu của 3 script chạy độc lập: Confirm (23:50 VNT), Daily Eval thăng cấp & commission (01:13 VNT sáng hôm sau), và Đồng chia (02:14 VNT sáng ngày thứ 4).
- Khắc phục lỗi đếm F1 và lookup parent trên memory do so khớp `m.refSysId` với `member.autoId` trong khi Database lưu `refSysId` là `userId` của cha.

### Các file đã thay đổi
#### `scripts/replay/runner.ts`
- **Confirm thành viên (23:50 VNT)**: Chỉ cập nhật trạng thái `isConfirmed: true` và ghi nhận ví cá nhân học viên (MBDT gốc, hoàn phí 21%) tại mốc `gracePeriodEnd`.
- **Daily Eval (01:13 VNT sáng ngày hôm sau)**: Cộng dồn điểm ancestors, chia commission ancestors, check 2F1 voucher, thăng cấp và voucher quà lên cấp tại mốc `evalTime` (01:13 sáng ngày hôm sau).
- **Đồng chia (02:14 VNT sáng ngày thứ 4)**: Độc lập hoàn toàn, chia đều bể doanh thu CASH/MBDT cho các học viên đủ điều kiện tại mốc `shareTime` (02:14 sáng hôm sau của ngày target thứ 3).
- **Sửa đếm F1**: Sửa logic so khớp từ `m.refSysId === member.autoId` thành `m.refSysId === member.userId` và parent lookup từ `s.autoId === refSysId` thành `memberStates.get(member.refSysId)`.
- **Sửa filter log**: Lọc in thăng tiến ở cuối ngày theo cả ngày target và `evalTime` sáng hôm sau.

### Kiểm tra
- ✅ `npx tsc --noEmit` → Exit code: 0 (không lỗi TypeScript).
- ✅ Chạy thành công chuỗi 14 ngày giả lập. Số lượng học viên đủ điều kiện đồng chia tăng đúng tỷ lệ (kỳ 1 có 8 người, kỳ 2 có 12 người).

---

## ✅ SESSION-20260716_02 — Đồng bộ Simulation vào DB & Cấu hình Cron chạy thực tế cho System 4

- **Ngày**: 2026-07-16
- **Thời gian**: ~02:05 - 02:22
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Sửa lỗi mapping thuộc tính thăng cấp nhánh F1 trong Replay Simulation.
- Đồng bộ toàn bộ dữ liệu 14 ngày đã mô phỏng chuẩn xác từ Simulation vào Database thực tế.
- Tách biệt logic và mốc thời gian chạy cron của dự án tương ứng khớp 100% logic Simulation, đồng bộ cấu hình trong `vercel.json`.

### Các file đã thay đổi
#### `scripts/replay/runner.ts`
- Sửa mapping thuộc tính thăng cấp nhánh F1 từ `reqLevel: r.reqLevel` (undefined) sang `reqLevel: r.branchLevel`. Khôi phục thăng cấp Cấp 3, Cấp 4 chuẩn xác cho các Leader.

#### `lib/brk/activation-service.ts`
- Cập nhật `processGracePeriodExpirations` (cron confirm 23:50 VNT) để không bị skip đối với Method B. Dưới Method B, nó tự động confirm và hoàn phí/credit ví MBDT gốc cá nhân tại mốc `gracePeriodEnd`, bỏ qua logic dồn lên upline.

#### `app/api/cron/brk-daily-eval/route.ts`
- Bỏ phần tự động confirm và hoàn phí cá nhân trùng lặp trong Daily Eval (01:13 VNT). Chỉ dồn điểm, commission, 2F1 voucher, check thăng cấp cho các học viên đã được confirm bởi grace processing.

#### `lib/brk/revenue-share-service.ts`
- Thêm điều kiện lọc `gracePeriodEnd: { lte: periodEnd }` cho cả active members và các nhánh F1 của họ khi xét điều kiện bể đồng chia, đảm bảo chỉ tính toán trên các tài khoản đã confirm chính thức.

#### `vercel.json`
- Đồng bộ schedules Vercel Crons đúng múi giờ VNT: grace-processing lúc 23:50 VNT (`50 16 * * *`), daily-eval lúc 01:13 VNT (`13 18 * * *`), revenue-share lúc 02:14 VNT (`14 19 */3 * *`). Loại bỏ cron level-check thừa.

### Các file đã tạo
#### `scripts/replay/apply-simulation-to-db.ts`
- Script backfill đọc Simulation state, dọn sạch transactions và promotions cũ của System 4, update số dư ví chuẩn của 84 học viên (bù đắp ví MBDT gốc bị thiếu), và insert lại toàn bộ 666 transactions (tính toán running balance liên tục) + 187 promotions mới vào DB thật.

### Kiểm tra
- ✅ Đã sửa đổi loại bỏ MBDT gốc khỏi ví học viên khi confirm (chỉ nhận hoàn phí 21%) và loại bỏ quà Voucher thăng cấp Level 2 tự động.
- ✅ Đã tích hợp ghi nhận biến động điểm (MBP) và doanh số dồn (MBDT) từ các F1/F2... confirm chính thức dưới dạng giao dịch ghi nhận (amount = 0) vào ví MBDT.
- ✅ Đã cập nhật và đồng bộ 100% code logic core của dự án, các APIs cron chạy thực tế và Simulation Replay.
- ✅ Script backfill chạy thành công 100% không có lỗi. Comparative Stats lệch bằng 0 tuyệt đối cho CASH, MBDT, Level và Points của toàn bộ 84 học viên.
- ✅ `npx tsc --noEmit` → Exit code: 0 (không lỗi TypeScript).

## ✅ SESSION-20260716_01 — Tích hợp nhật ký hành trình tăng trưởng & JSON Snapshot Timeline, đồng bộ thăng cấp Cấp 1

- **Ngày**: 2026-07-16
- **Thời gian**: ~09:48 - 10:00
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Xây dựng giao diện nhật ký hành trình tăng trưởng (Timeline) premium, hiển thị trực quan các mốc biến động điểm, doanh số dồn, thu nhập đối ứng của học viên.
- Đồng bộ cơ chế thăng lên Cấp 1: học viên thăng lên Cấp 1 ngay khi hết grace period (confirm) thay vì chờ Daily Eval.
- Tích hợp lưu trữ System Snapshot (Cấp bậc, điểm MBP, thành viên nhóm, số dư 3 ví) trực tiếp vào description giao dịch của database dưới dạng JSON để Client render Timeline chính xác theo dòng thời gian thực.
- Ghi nhận đầy đủ thông tin Nhánh bảo trợ, leader 2 tầng và thông tin đăng ký (Đang cân nhắc) của F1, F2 cho ancestors.

### Các file đã thay đổi
#### `lib/brk/wallet-service.ts`
- Thêm helper `makeSystemSnapshotDescription` với tham số `overrides` để tạo description JSON lưu Snapshot hệ thống.

#### `scripts/replay/runner.ts`
- Bổ sung helper `getTeamCount` and `makeDescription`.
- Tích hợp sinh JSON Snapshot cho tất cả giao dịch: `JOIN`, `RETURN_FEE`, `F1_ACTIVE`, `F2_ACTIVE`, `F1_CONFIRM`, `COMMISSION`, `LEVEL_UP`, `VOUCHER`, `REVENUE_SHARE`.
- Đồng bộ thăng cấp Level 1 ngay lúc confirm.

#### `lib/brk/activation-service.ts`
- Thêm logs `JOIN`, `F1_ACTIVE`, `F2_ACTIVE` lúc đăng ký tham gia (Đang cân nhắc).
- Gộp thăng cấp Cấp 1 và hoàn phí 21% ghi nhận JSON Snapshot khi hết grace period.

#### `lib/brk/commission-calculator.ts`
- Tích hợp leader chain và extra properties (`memberMBDT`, `memberMBP`) vào description JSON của transactions `POINTS` và `COMMISSION`.

#### `lib/brk/level-manager.ts`
- Cập nhật hàm `checkAndPromoteLevel` và `create2F1Voucher` để lưu JSON description cho giao dịch thăng cấp (LEVEL_UP) và Voucher.

#### `lib/brk/revenue-share-service.ts`
- Tích hợp JSON description cho các giao dịch đồng chia.

#### `app/tools/brk/level/page.tsx`
- Thiết kế lại hoàn toàn UI nhật ký hành trình tăng trưởng (Timeline) với phong cách premium, hiển thị đầy đủ các thông số biến động, 4 chỉ số snapshot chân thực (MBP, thành viên nhóm, Thu nhập MBDT, Đối ứng VNĐ), Nhánh bảo trợ, màu sắc hài hòa và micro-animations.

#### `app/actions/admin-actions.ts`
- Sửa đổi Server Action `getMemberPromotionHistoryAction` để parse JSON Snapshot description của giao dịch, gán chính xác các chỉ số lũy kế (MBP, số thành viên nhóm, Thu nhập MBDT, Đối ứng CASH) từ Snapshot và sửa mốc kích hoạt ban đầu thành Cấp 0, Điểm 0 MBP.

#### `app/tools/genealogy/page.tsx`
- Cập nhật giao diện modal Lịch sử thăng tiến của học viên trên trang gia phả: đổi MP thành MBP, hoán đổi nhãn Thu nhập (MBDT) và Đối ứng (VNĐ), ẩn đơn vị MDT, và điều chỉnh kích thước hiển thị MBDT biến động (ở trên, cỡ to) và CASH biến động (ở dưới, cỡ nhỏ).

### Kiểm tra
- ✅ Chạy simulation 14 ngày thành công xuất file state JSON mới.
- ✅ Backfill dữ liệu simulation thành công vào DB thật.
- ✅ Verify đối chiếu lệch 0 tuyệt đối về CASH, MBDT, Level và Points của toàn bộ 84 học viên.
- ✅ `npx tsc --noEmit` → Exit code: 0 (không có lỗi TypeScript).

## ✅ SESSION-20260716_02 — Di chuyển sang bảng Timeline chuyên biệt (BrkTimelineRecord)

- **Ngày**: 2026-07-16
- **Thời gian**: ~14:51 - 17:42
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Tối ưu hóa hiệu năng load Timeline (lịch sử thăng tiến) bằng cách tạo bảng dữ liệu chuyên biệt `BrkTimelineRecord` (Read Model/Materialized View).
- Loại bỏ hoàn toàn CPU-intensive processing, dynamic database queries (như COUNT closure, loop gộp giao dịch) khi user mở xem Lịch sử.
- Định dạng dữ liệu lũy kế thành cấu trúc Grid 2 cột Trái/Phải:
  - Cột trái: Doanh số dồn (MBDT) và DS đối ứng (VNĐ).
  - Cột phải: Thu nhập thực nhận (MBDT) và Đối ứng (VNĐ).

### Các file đã thay đổi
#### `prisma/schema.prisma`
- Thêm model `BrkTimelineRecord` quản lý các sự kiện Timeline đã tính toán và gộp sẵn.
- Thiết lập quan hệ `brkTimelineRecords` trong model `User`.

#### `lib/brk/wallet-service.ts`
- Bổ sung helper `createBrkTimelineRecord` để tạo mới bản ghi Timeline tự động, tính toán lũy kế và volume dồn từ các mốc thời điểm trước đó.

#### `scripts/replay/apply-simulation-to-db.ts`
- Cập nhật script khôi phục DB để tự động đọc Simulation state, gom nhóm transactions, xử lý activations & promotions và nạp 100% dữ liệu lịch sử Timeline của 84 học viên vào bảng `BrkTimelineRecord`.

#### `app/actions/admin-actions.ts`
- Đơn giản hóa Server Action `getMemberPromotionHistoryAction`: chuyển sang SELECT trực tiếp từ bảng `BrkTimelineRecord` sắp xếp theo thời gian tăng dần và trả về client.

#### `app/tools/genealogy/page.tsx`
- Sửa đổi cấu trúc HTML/CSS để hiển thị Grid 2 cột (Doanh số/DS đối ứng ở cột trái, Thu nhập/Đối ứng ở cột phải) với các màu sắc Slate và Emerald sang trọng, đúng cỡ chữ và nhãn theo hướng dẫn của user.

### Kiểm tra
- ✅ `npx prisma db push` & `generate` thành công đồng bộ Postgres.
- ✅ Chạy khôi phục DB mô phỏng và nạp timeline thành công.
- ✅ Đã fix triệt để lỗi trùng lặp sự kiện JOIN/ACTIVATION, gộp nhóm thông minh cho CASH/MBDT của hoàn phí, loại bỏ thăng cấp 0->1 thừa và sửa lỗi reset điểm/ví tích lũy về 0 ở các mốc học viên đăng ký.
- ✅ Đối chiếu lệch 0 tuyệt đối về số dư, cấp bậc và điểm của 84 thành viên.
- ✅ `npx tsc --noEmit` ➔ compile thành công không có lỗi.

## ✅ SESSION-20260716_03 — Tích hợp đồng bộ Timeline vào Core Services & Sửa lỗi dồn thu nhập

- **Ngày**: 2026-07-16
- **Thời gian**: ~18:00 - 23:14
- **Trạng thái**: ✅ Hoàn thành

### Mục tiêu
- Đồng bộ hóa logic Timeline: Tích hợp helper `createBrkTimelineRecord` trực tiếp vào 4 core services chạy thật của hệ thống (`activation-service.ts`, `commission-calculator.ts`, `level-manager.ts`, `revenue-share-service.ts`).
- Sửa lỗi dồn Doanh số MBDT của F1/F2 confirm lên ví Thu nhập BRKD của upline.
- Thiết lập độ trễ thời gian (latency) mô phỏng trong script `runner.ts` (ví dụ: Hoàn phí lúc T ➔ Commission T+1s ➔ Thăng cấp T+2s) để phản ánh đúng dòng chảy thời gian thực tế.
- Tối ưu hóa hàm sort để xếp các sự kiện `TRANSACTION` xảy ra cùng giây lên trước sự kiện thăng cấp `LEVEL_UP`.

### Các file đã thay đổi
#### `lib/brk/activation-service.ts`
- Thêm import `createBrkTimelineRecord`.
- Ghi nhận Timeline real-time khi học viên kích hoạt (`ACTIVATION`), học viên mới đăng ký (`TRANSACTION` F1_ACTIVE/F2_ACTIVE), và hoàn phí khi hết cân nhắc (`RETURN_FEE` gộp CASH + MBDT).

#### `lib/brk/commission-calculator.ts`
- Ghi nhận Timeline real-time khi chia hoa hồng chênh lệch cho ancestors, hoặc ghi nhận biến động số dư dồn điểm/doanh số nếu chênh lệch % = 0 (gộp chung points dồn và commission).

#### `lib/brk/level-manager.ts`
- Ghi nhận Timeline real-time khi thăng cấp thực tế (`LEVEL_UP` từ Cấp 2 trở lên) và khi nhận quà tặng voucher thăng cấp hoặc voucher 2F1 (`VOUCHER_CREDIT`).

#### `lib/brk/revenue-share-service.ts`
- Ghi nhận Timeline real-time khi chia thưởng đồng chia (`REVENUE_SHARE` gộp CASH + MBDT).

#### `scripts/replay/runner.ts`
- Cập nhật script mô phỏng, lag mốc thời gian của commission và thăng cấp lùi lại 1-2 giây so với confirm để phản ánh chính xác độ trễ thực tế.

#### `scripts/replay/apply-simulation-to-db.ts`
- Sửa lỗi gán sai `amountBrkd = memberMBDT` cho các points transaction, tránh cộng dồn doanh số vào ví thu nhập.
- Sắp xếp sự kiện cùng giây ưu tiên `TRANSACTION` trước `LEVEL_UP` để dữ liệu lũy kế tại dòng thăng cấp hiển thị chuẩn xác.
- Loại bỏ các points thăng cấp trùng lặp khỏi TRANSACTION.

### Kiểm tra
- ✅ Chạy lại simulation runner tạo state mới thành công.
- ✅ Khôi phục dữ liệu DB backfill thành công, đối soát khớp lệch 0 tuyệt đối.
- ✅ Verify ví thu nhập MBDT của upline giữ nguyên không bị cộng khống doanh số F1.
- ✅ Verify dòng thăng cấp hiển thị đúng điểm số đã cộng (ví dụ Cấp 2 hiển thị 82.05 MBP, thỏa mãn điều kiện > 50 MBP).
- ✅ Sửa đổi CSS/Labels UI Timeline và Thông tin thành viên theo phong cách đồng bộ của người dùng:
  - Doanh số MBDT & Thu nhập MBDT: Trị số kích cỡ cân đối `text-[14px]`, in đậm, màu đỏ rực rỡ `text-red-500` (ở cả 3 mốc Timeline, Thông tin thành viên, và Wallet Section).
  - Doanh số VNĐ & Thu nhập VNĐ: Nhãn và trị số nhỏ tinh gọn `text-[8px]`, màu đen xám mờ `text-slate-400/80`.
  - Đồng bộ phong cách thiết kế này trên toàn bộ giao diện Modal.
- ✅ Tối ưu hóa layout Timeline: Tách dòng hiển thị điểm hiện tại "Hiện tại ... MBP" ra khỏi timeline container để không bị che khuất bởi các phần tử bên dưới.
- ✅ Bổ sung tính năng Sắp xếp Timeline: Thêm bộ lọc sắp xếp dropdown cho phép chuyển đổi thời gian Tăng dần (Cũ nhất trước) hoặc Giảm dần (Mới nhất trước), mặc định là Giảm dần.
- ✅ Sắp xếp thứ tự thời gian chính xác cho các sự kiện cùng giây: Bản ghi timeline được bổ sung trường `id` tự tăng của DB, client so sánh theo `id` để đảm bảo thứ tự tích lũy tài chính (Tăng trưởng trước, Thu nhập sau) hiển thị logic tuyệt đối ở cả 2 chiều sort.
- ✅ Đổi tên nhãn tiêu đề Timeline theo nghiệp vụ chuẩn:
  - "Biến động số dư" ➔ "Tăng trưởng tích lũy" (do tích lũy Doanh số MBDT & MBP).
  - "Phát sinh mới" ➔ "Thu nhập gia tăng" (do cộng thêm thu nhập ví CASH & MBDT).
- ✅ Đồng nhất logic tính Doanh số nhóm: Thay đổi logic query `teamTotalBrkd` và `teamTotalVnd` của Server Action `getMemberDetailAction` để lấy trực tiếp từ Timeline Record lũy kế mới nhất của học viên, giúp số dư hiển thị ở phần Thông tin chi tiết và dòng cuối Timeline trùng khớp tuyệt đối.
- ✅ `npx tsc --noEmit` ➔ compile thành công không có lỗi.
- ✅ Cập nhật và nạp lại toàn bộ dữ liệu 87 học viên mới nhất: Tăng số ngày mô phỏng lên 15 ngày, quét đầy đủ các học viên mới đăng ký (`#214`, `#1114`, `#1115`) trong ngày 16/7/2026.
- ✅ Cắt mốc thời gian chuẩn xác trước 02:14 sáng ngày 17/7/2026: Loại bỏ phần chạy đồng chia 2% kỳ 5 của Day 15 khỏi simulation nạp DB để chừa mốc này cho Vercel Cron thật tự động thực thi live lúc 02:14 sáng hôm nay, tránh lỗi trùng lặp dữ liệu.
- ✅ Sửa lỗi race condition của Cron thăng cấp: Bọc `prisma.brkLevelUpRecord.create` trong try-catch để bắt và bỏ qua mã lỗi trùng lặp `P2002` (Unique constraint failed) một cách an toàn thay vì crash cả cron, đảm bảo hệ thống tự phục hồi ổn định khi script nạp DB và Vercel Cron đụng độ đồng thời.
- ✅ Chuyển tiếp kênh thông báo Telegram: Cập nhật hàm `sendTelegram` trong `lib/notifications.ts` để ưu tiên sử dụng biến môi trường `TELEGRAM_CHAT_ID_MBC_LOG` cho các thông báo thăng cấp và cron của Hệ thống #4.
