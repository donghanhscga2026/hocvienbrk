# PLAN.md — Tài liệu kỹ thuật & Lịch sử cập nhật HocVien-BRK
> Cập nhật lần cuối: **2026-07-01** (phiên 3: Hệ thống Sao lưu CSDL)  
> Dùng để tiếp tục công việc khi bị ngắt đột ngột  
> ⚡ Cập nhật **ngay sau mỗi thay đổi code**

---

## 🛠️ CẤU TRÚC TÍNH NĂNG ĐÃ HOÀN THÀNH (THEO MODULE)

---

### 1. HỆ THỐNG CÂY NHÂN MẠCH (GENEALOGY TREE)

#### Mục tiêu
Xây dựng và tối ưu hóa hệ thống cây phả hệ (Genealogy Tree) đa dạng (Học viên, TCA, KTC, YTB), hỗ trợ quản lý mối quan hệ upline/descendant qua bảng Closure Table, tối ưu hiệu năng hiển thị và nâng cao trải nghiệm giao diện người dùng (UI/UX).

#### Các chức năng và cải tiến đã thực hiện
*   **Tối ưu cấu trúc cây**:
    *   Sửa lỗi `totalSubCount` ở F2, F3+ nodes: Chuyển từ việc đếm trong closure của cha (luôn bằng 1) sang truy vấn trực tiếp closure của chính node con đó.
    *   Sửa lỗi vỡ cấu trúc cây (Flattening Bug) trong `buildFullTreeFromClosures` bằng cách thêm ràng buộc `depth === 1` để khôi phục đúng phân cấp cây đa tầng, tránh hậu duệ bị đẩy lên làm con trực tiếp của Root.
*   **Giao diện compact & Premium Design**:
    *   Giảm khoảng cách nodes để tạo bố cục cân đối: `NODE_WIDTH = 200`, `NODE_HEIGHT = 130`, `HORIZONTAL_SPACING = 20`, `VERTICAL_SPACING = 270`.
    *   Thiết kế Node Cây mới: Circular Avatar với viền trắng 3D, tag #UserID dạng backdrop-blur.
    *   Tiết kiệm diện tích: Sử dụng avatar bán nguyệt (Semicircle pt-4) giúp giảm ~28px chiều cao mỗi node và border-t-0 liền mạch.
    *   Level Badge hình tròn `w-6 h-6` nằm trên đỉnh bán nguyệt, sử dụng bảng màu bổ trợ tương phản với semicircle theo từng cấp bậc (1, 2, 3... hoặc `★` cho Root).
*   **Cơ chế hiển thị Gọn (Compact) vs Đầy đủ (Full)**:
    *   Thay dropdown FULL/GỌN bằng checkbox **"ĐẦY ĐỦ"** đồng bộ.
    *   Chế độ Gọn (Học viên & TCA): Ẩn các nhóm LÁ/CẠN ở F1, chỉ hiện nhánh sâu (chứa F3+).
    *   Ẩn dòng hiển thị điểm số trên card đối với người dùng thông thường, thay bằng text nhỏ gọn `👥 N thành viên`.
*   **Tương tác & Auto-Center**:
    *   Tự động căn giữa (auto-center) khi expand node với zoom 1.2 và duration 600ms.
    *   Focus Subtree Mode: Click nút "N nhánh" trên card hoặc click trực tiếp vào card để load toàn bộ cây con từ node đó làm Root. Nút "Cây chính" (Quay về root) giúp reset mọi trạng thái tìm kiếm/focus.
    *   Ngăn chặn flash/nhấp nháy cây cũ khi toggle hoặc chuyển hệ thống bằng cách sử dụng `displayModeRef` và `displayModeToggleRef` để loading che cây cũ và chặn effect render stale data.
*   **Tách Modal Group A/B (`GroupModal.tsx`)**:
    *   Tách biệt popup xem danh sách nhóm LÁ (A) và CẠN (B) ra component riêng.
    *   Hiển thị chi tiết: Avatar, `#ID`, tên, điểm số, badge cấp bậc, và nút **"👤 Hồ sơ"** liên kết trực tiếp tới trang chi tiết học viên `/tools/students/[id]`.
*   **Quản trị & Phân quyền**:
    *   Modal Chọn Node Root (`CreateRootModal`): Cho phép ADMIN tìm kiếm người dùng theo Tên/ID làm Root khi cây hệ thống còn trống, thay thế cho prompt thô sơ.
    *   Super Admin (ID 0) có quyền tối thượng trên tất cả action quản trị đa hệ thống bất kể thông tin role trong database.
    *   Hỗ trợ đa hệ thống (`buildStandardTree`): Chỉ truy vấn bảng `TCAMember` lấy cấp bậc/điểm số khi systemId = 1 (TCA), các hệ thống khác (KTC, YTB...) trả về null để tránh query sai bảng.
    *   Đổi điều kiện Active: Lọc và tính toán thành viên Active theo `personalScore > 0` thay vì filter theo `groupName === "THÁI SƠN"`.

---

### 2. LUỒNG XÁC THỰC, ĐĂNG KÝ & TRỢ LÝ TÀI KHOẢN (AUTH & REGISTER)

#### Mục tiêu
Quản lý đăng ký, đăng nhập an toàn, cung cấp các giải pháp tự động hỗ trợ khi đăng nhập lỗi, tích hợp quy trình nhập OTP thân thiện và xây dựng trợ lý ảo tương tác bằng video nhanh.

#### Các chức năng và cải tiến đã thực hiện
*   **Bảo mật đăng nhập & Bỏ Google OAuth**:
    *   Vô hiệu hóa hoàn toàn Google Provider ở backend, ẩn nút Google login và Google One Tap ở client.
    *   Đăng nhập nghiêm ngặt: Chỉ cho phép đăng nhập bằng **Mã học viên (ID)** và Mật khẩu. Loại bỏ kiểm tra bằng email/phone để ngăn trùng lặp ID hoặc nhầm lẫn tài khoản.
*   **Tối ưu cấp ID & Quy trình Đăng ký**:
    *   Custom Adapter NextAuth: Ghi đè phương thức `createUser`, tích hợp helper `getNextAvailableId()` để tự động cấp ID tăng dần, bỏ qua danh sách "số đẹp" quy hoạch (Reserved IDs).
    *   Luồng đăng ký bắt buộc ghi nhận `referrerId` (mặc định là 0 - Admin nếu không có link giới thiệu).
    *   Tự động đăng nhập (Auto-login) bằng Mã học viên ngay sau khi nhập OTP thành công hoặc skip OTP.
*   **Bỏ chặn Email & Skip OTP**:
    *   Bỏ chặn đăng nhập đối với các tài khoản chưa xác minh email.
    *   Cơ chế Skip OTP: Màn hình nhập OTP đăng ký sau 15 giây countdown sẽ xuất hiện nút **"Bỏ qua, xác minh sau"** cho phép học viên truy cập hệ thống ngay. Tự động skip OTP sau 180 giây (3 phút) chờ.
    *   Báo lỗi & Cảnh báo: Unverified users khi login thành công sẽ thấy banner cảnh báo màu vàng "Email chưa xác minh" trong 3 giây trước khi redirect.
*   **Xử lý lỗi đăng nhập & Telegram Report**:
    *   Khi đăng nhập sai thông tin, client tự động gọi API `/api/auth/report-failed-login` gửi thông báo chi tiết lỗi đăng nhập lên Telegram của Admin.
    *   Đồng thời, tự động đăng nhập tài khoản đặc biệt **ID=2689** (mật khẩu `Brk#2689`) và hiển thị thông báo Zalo hỗ trợ để học viên không bị gián đoạn.
*   **Trợ lý tài khoản (Account Assistant)**:
    *   Modal trợ lý ảo (`AccountAssistantModal.tsx`): Bổ dung giao diện OTP đăng ký (`register_otp`), xử lý verify OTP quên mật khẩu thông qua API `/api/auth/verify-forgot-otp`.
    *   **Tối ưu hóa video Agent**:
        *   Chuyển server lưu trữ video agent từ catbox.moe sang **Cloudinary (Akamai CDN)** giúp giảm 3-5 lần độ trễ tải video tại Việt Nam.
        *   Tự động nén và resize video bằng Cloudinary eager transformation (`q_auto`, `w_300`).
        *   Preload tất cả video của các bước ngay khi modal mở để làm ấm cache trình duyệt.
        *   Thêm Loading Skeleton pulse đẹp mắt khi video chưa sẵn sàng, dùng key={step} để unmount video cũ tránh lỗi chồng âm thanh khi chuyển step.

---

### 3. HỆ THỐNG EMAIL (MARKETING & TRANSACTIONAL)

#### Mục tiêu
Xây dựng hạ tầng gửi Email quy mô lớn phục vụ cả hai luồng: Email Marketing (Campaigns) gửi chậm an toàn và Email Transactional (OTP, kích hoạt) gửi tức thì, tích hợp các bộ lọc và giám sát hiệu suất.

#### Các chức năng và cải tiến đã thực hiện
*   **Hạ tầng Brevo Provider (Sendinblue)**:
    *   Tích hợp Brevo làm nhà cung cấp email chính. Xây dựng pool Brevo Senders với cơ chế tự động routing chia đều tải (3 Brevo senders active = 900 email/ngày).
    *   Gmail và Resend được hạ cấp thành phương thức dự phòng (fallback).
    *   Webhook Brevo (`/api/webhooks/brevo`): Nhận diện 7 events (hard_bounce, soft_bounce, delivered, opened, click, unsubscribed, spam). Tự động đưa email bị hard bounce/spam vào blacklist và hủy xác minh email của user.
*   **Cấu hình chiến dịch an toàn (Email MKT)**:
    *   Đưa ra các thông số an toàn chống spam: Gửi batch nhỏ (15-25 email/lượt pause), thời gian pause dài (15-45 phút), delay giữa các email lâu (5-15 giây).
    *   Warmup quota giảm mạnh (P0: 5/ngày, P4: 100/ngày). Daily limit của `hocvienbrk@gmail.com` khóa ở mức 100.
*   **Theo dõi và quét Bounce**:
    *   Tạo bảng `EmailSenderLog` lưu trữ thống kê gửi (`sent`, `failed`, `bounce`, `cooldown`) của từng sender hàng ngày.
    *   Cron quét bounce (`/api/cron/scan-bounces`) chạy lúc 13:00 Hà Nội hàng ngày, quét email bounce trong 3 ngày gần nhất để blacklist và tính tỉ lệ.
    *   UI Tab Hiệu suất (Sender Performance) hiển thị tỉ lệ deliverability %, số lượng gửi/bounce thực tế từ API.
*   **Email Verification & Log**:
    *   Inline Resend: Nút "Gửi lại" OTP xác minh nhanh ngay trong danh sách học viên và bộ lọc role "Chưa xác minh".
    *   Xác minh hàng loạt: Admin có thể gửi email xác minh cho tất cả unverified users chỉ với 1 click qua `resendAllVerificationAction`.
    *   Ghi nhận nhật ký email: Tạo model `EmailLog` lưu trữ chi tiết mỗi email transactional gửi đi (provider, status, messageId, error). Hiển thị 50 logs gần nhất dưới dạng danh sách chuyên nghiệp ở trang chi tiết học viên.

---

### 4. ĐỒNG BỘ DỮ LIỆU TCA (TCA SYNC PIPELINE)

#### Mục tiêu
Đồng bộ dữ liệu thành viên từ TCA Portal về hệ thống một cách tối ưu, chính xác về điểm số, cấu trúc cây và thông tin cá nhân.

#### Các chức năng và cải tiến đã thực hiện
*   **Xử lý lỗi & Định dạng dữ liệu**:
    *   Sửa lỗi crash "Unique constraint failed" khi đồng bộ: Kiểm tra sự tồn tại của user trước khi `create`, chỉ update TCAMember nếu đã tồn tại.
    *   Parse điểm số chính xác: Xử lý dấu thập phân của TCA (ví dụ `17.463` -> 17.463) bằng cách chừa dấu chấm thập phân và lưu kiểu `Decimal(10,3)`.
*   **Tối ưu hiệu năng Sync (N+1 Optimization)**:
    *   Tạo module preview dùng chung `lib/tca-preview-logic.ts`. Load toàn bộ dữ liệu database (Users, TCAMembers, Systems) ra Map O(1) trước khi chạy vòng lặp so sánh.
    *   Giảm thời gian Preview cho 500 nodes từ ~30 giây xuống 1-2 giây.
    *   Sử dụng các câu lệnh Batch (`createMany`, `deleteMany` cho staging-sync và rollback) giúp giảm số lượng queries xuống tối thiểu.
*   **Đồng bộ các trường thông tin bị thiếu**:
    *   Nâng cấp Chrome Extension lên v9.0.1 hỗ trợ gửi thêm 4 trường cá nhân (`address`, `joinDate`, `contractDate`, `promotionDate`).
    *   Đồng bộ 2 trường tỷ lệ hoa hồng (`personalRate`, `teamRate`).
    *   Xây dựng helper `parseDate` convert định dạng "DD/MM/YYYY" từ extension sang Date object của PostgreSQL an toàn.
    *   Tự động so sánh thay đổi (`hasNewFieldsChange`) để kích hoạt cập nhật `TCA+` cho thành viên cũ.
*   **Dọn dẹp System Closure dư thừa**:
    *   Khi thay đổi người giới thiệu (upline) của user trong TCA, hệ thống tự động xóa các SystemClosure cũ (`depth > 0`) trước khi rebuild cây con mới.
    *   Tạo script `fix-system-closure.ts` quét và khắc phục triệt để các closures bị lệch.
*   **Extension Updates**:
    *   Tự động ping phát hiện API Server (localhost vs production) và lưu cache kết quả trong localStorage 5 phút để tránh timeout. Bỏ qua logic client-side override.

---

### 5. KHÓA HỌC, BÀI HỌC & TRÌNH PHÁT VIDEO (COURSES & LESSONS)

#### Mục tiêu
Nâng cấp trình phát bài học, hỗ trợ nhiều định dạng bài giảng đa dạng, tối ưu hóa giao diện trang chủ và cấu hình bài tập bắt buộc cho từng bài học.

#### Các chức năng và cải tiến đã thực hiện
*   **Redirection & URL Tái cấu trúc**:
    *   Thiết lập các URL prefix chuyên biệt để tránh xung đột route: Khóa học (`/khoa-hoc/{id}`), Landing page (`/land/{slug}`), Site profile (`/page/{slug}`).
    *   Cập nhật middleware `proxy.ts` hỗ trợ tách slug đa cấp và lưu cookie referral đúng định dạng `/page/slug`.
    *   HomePage hiển thị tất cả khóa học (`showAllCourses={true}`) không có nút thu gọn khi xem ở chế độ Site Profile.
*   **Cải tiến Video Player & Lesson Types**:
    *   YouTube Player Fix: Bọc thêm thẻ div bảo vệ cho React quản lý và cấp key động cho iframe để tránh lỗi mất hình (chỉ có tiếng) khi chuyển bài học Video.
    *   Bài học dạng **TEXT**: Nạp thẳng nội dung văn bản vào khung 16:9 của player, ẩn phần mô tả bên dưới và ẩn nút xem chi tiết trên Mobile để tránh trùng lặp.
    *   Bài học dạng **ALL**: Kết hợp hiển thị nội dung TEXT vào slide đầu tiên của Playlist Video trong cùng một khung player.
    *   Tự động quét và chuyển đổi mọi URL trong tiêu đề/nội dung bài giảng và mô tả khóa học thành link clickable (`target="_blank"`).
*   **Tối ưu hóa re-render và hiển thị trang chủ**:
    *   Xóa bỏ hơn 250 dòng code nặng trong page.tsx của quản trị khóa học bằng cách tách các popup Modal (ImportLessonsModal, LessonEditModal, AddLessonModal) thành các lazy components import động.
    *   Tạo custom hook `useExpandWithCountdown` quản lý expand/collapse danh sách khóa học ở trang chủ kèm countdown 10s tự động đóng. Cố định hiển thị 3 khóa trên mobile.
    *   Hỗ trợ xuống dòng (`\n` -> `<br />`) trong mô tả ngắn (`mo_ta_ngan`).
    *   Course list trong admin hiển thị `name_lop` thay vì `name_khoa`.
*   **Cấu hình Bài tập bắt buộc (`isDailyChallenge`)**:
    *   Khóa học loại `NORMAL`: Cho phép học viên mở tất cả bài học tự do (không cần tuần tự). Tuy nhiên, khi chuyển bài học mà chưa bình luận sẽ hiển thị popup nhắc nhở (có thể bỏ qua).
    *   Bài học có `isDailyChallenge = true`: Bắt buộc học viên phải gửi bình luận (làm bài tập) mới được chuyển sang bài tiếp theo. Hiện badge `📝 Bài tập` trên sidebar.
    *   Tích hợp checkbox cấu hình `📝 Bài tập bắt buộc` trong Admin UI (Add/Edit Lesson modal).

---

### 6. VÍ AFFILIATE, QUẢN TRỊ & BẢO MẬT (WALLET & SECURITY)

#### Mục tiêu
Quản lý điểm số, hoa hồng đăng ký, phân quyền chặt chẽ giữa các vai trò ADMIN và TEACHER, và bảo mật cấu trúc cơ sở dữ liệu.

#### Các chức năng và cải tiến đã thực hiện
*   **Ví Affiliate & Quản lý điểm**:
    *   Tập trung hóa logic ví qua `WalletService` (`lib/affiliate/wallet-service.ts`): Cập nhật/tạo ví chỉ trong 1 truy vấn upsert, ghi log transaction chính xác bằng `walletId` nội bộ.
    *   Khóa trường referrerId trên form đăng ký bằng input hidden kết hợp cookie `aff_ref` do server quản lý để tránh người dùng sửa đổi DOM.
    *   Tối ưu hóa tốc độ tải cây ví bằng `ClosureService` trả về flat array thay vì loop nested query.
*   **Phân quyền Giáo viên (TEACHER)**:
    *   Trang Học viên (`/tools/students`): TEACHER chỉ được lọc và xem danh sách học viên đã đăng ký các khóa học do mình giảng dạy.
    *   Trang Thanh toán (`/tools/payments`): TEACHER chỉ xem và có quyền xác nhận/từ chối các thanh toán thuộc các khóa học của mình.
    *   Quản trị khóa học: TEACHER chỉ được phép sửa khóa học do mình sở hữu. Khắc phục lỗi gán `teacherId = null` khiến mất quyền sở hữu khóa học sau khi lưu.
*   **Site Profile Cộng đồng & Validation**:
    *   Nâng cấp Site Profile hỗ trợ thêm bảng `SiteProfileMember` để thêm cộng sự. Trang Profile public sẽ tự động gộp (aggregate) các bài viết và khóa học của chủ sở hữu và toàn bộ các cộng sự.
    *   Cross-table slug validation: Ràng buộc kiểm tra chéo slug giữa `LandingPage` và `SiteProfile` để không cho phép tạo slug trùng nhau, tránh lỗi định tuyến Next.js.
*   **Xóa Node & Đồng bộ YTB**:
    *   Sửa lỗi logic xóa node trong cây Genealogy: Chỉ cho phép xóa các node lá (không có F1). Check sự tồn tại của cha thực tế trong closure thay vì so sánh `refSysId === 0`.
    *   Tự động đồng bộ YTB: Tự động ghi nhận học viên vào sơ đồ cây hệ thống YTB (systemId=2) ngay sau khi kích hoạt khóa học (thông qua duyệt thanh toán, kích hoạt thủ công...).
*   **Supabase GRANT + RLS Compliance**:
    *   Thiết lập chính sách bảo mật Row Level Security (RLS) cho 58/58 bảng trong database.
    *   Cấp quyền chi tiết (GRANT ALL cho `authenticated` và `service_role`, GRANT SELECT cho `anon`).
    *   Sửa lỗi SQL migration PostgreSQL bằng cách quote chính xác các tên table mixed-case (viết hoa chữ cái đầu như `public."Account"`).

---

## 🗓️ TRẠNG THÁI HOÀN THÀNH CỦA CÁC FILE CHÍNH

| File | Chức năng chính | Trạng thái |
| :--- | :--- | :--- |
| `app/tools/genealogy/page.tsx` | UI hiển thị cây nhân mạch, focus, reset, GroupModal | ✅ Hoàn thành |
| `app/actions/admin-actions.ts` | Server Actions quản trị: Genealogy, Students, Resend verify | ✅ Hoàn thành |
| `components/genealogy/GroupModal.tsx` | Component hiển thị F1 Lá (A), Cạn (B) kèm thông tin cá nhân | ✅ Hoàn thành |
| `lib/tca-preview-logic.ts` | Shared preview engine, tối ưu hóa O(1) cho TCA Sync | ✅ Hoàn thành |
| `lib/brevo.ts` | API client gửi email, validate, webhook, quản lý contacts | ✅ Hoàn thành |
| `app/api/webhooks/brevo/route.ts` | Nhận event và xử lý email bounce/spam/unsub của Brevo | ✅ Hoàn thành |
| `app/actions/payment-actions.ts` | Duyệt thanh toán, phân quyền TEACHER, auto-sync YTB | ✅ Hoàn thành |
| `proxy.ts` | Middleware/Proxy xử lý slug, cookie ref và chặn static assets | ✅ Hoàn thành |
| `auth.ts` | Cấu hình auth NextAuth, chặn/mở unverified, custom adapter ID | ✅ Hoàn thành |
| `components/auth/AccountAssistantModal.tsx` | UI Trợ lý tài khoản, video agent, nhập OTP đăng ký | ✅ Hoàn thành |
| `components/course/CoursePlayer.tsx` | Trình phát bài học, xử lý video YouTube/Text/All, bài tập bắt buộc | ✅ Hoàn thành |
| `prisma/schema.prisma` | Schema Database: RLS, EmailLog, EmailSenderLog, SiteProfileMember | ✅ Hoàn thành |

---

## 🔧 LỆNH TIỆN ÍCH DỰ ÁN

```bash
# Khởi chạy server phát triển local
npm run dev

# Kiểm tra lỗi biên dịch TypeScript (BẮT BUỘC TRƯỚC KHI DEPLOY)
npx tsc --noEmit

# Đồng bộ hóa cấu trúc Database Prisma (sau khi sửa schema)
npx prisma generate
npx prisma db push

# Chạy test kiểm tra
npm run test
```

---

## ✅ Hợp nhất Trợ lý ảo — Hệ thống trợ giúp tình huống (2026-06-25)

### Mục tiêu
Hợp nhất 2 hệ thống trợ giúp song song (Floating Assistant + Tool Help "Hỗ trợ") thành 1 Trợ lý tình huống duy nhất, gọn nhẹ, thông minh.

### Kiến trúc mới
```
AssistantGuide (duy nhất)
  ├── type="PAGE" → hướng dẫn trang (text, video, TTS)
  └── toolSlug set → hướng dẫn tool (sections: color_legend, features, tips)

AssistantPopup (1 popup duy nhất)
  ├── Tab "Hướng dẫn" — textContent + video + TTS (từ PAGE guide)
  └── Tab "Tính năng" — color_legend + features + tips (từ TOOL guide)

Cơ chế tự động (Toast)
  └── Lần đầu vào trang → sau 2s hiện toast nhỏ góc phải → 5s tự tắt
  └── Đã xem → chỉ hiện ❓, không toast
  └── Lưu vết bằng localStorage
```

### Các file đã sửa

#### `prisma/schema.prisma`
- Xóa model `ToolHelp` (1017-1028)
- Mở rộng `AssistantGuide`: thêm `toolSlug String?`, `sections Json?`, `pagePath` chuyển `String?` (nullable)

#### `app/api/assistant-guide/route.ts`
- GET: khi có `pagePath`, trả về cả `{ pageGuide, toolGuide }` (tự động tìm toolGuide theo toolSlug từ path)
- POST: hỗ trợ upsert theo pagePath hoặc toolSlug

#### `components/assistant/AssistantProvider.tsx`
- Thêm `toolGuideData` state, `activeTab`, `showToast`
- Fetch API → nhận cả pageGuide + toolGuide
- Auto-toast: sau 2s nếu có guide + chưa xem → toast 5s
- Lưu vết bằng localStorage `assist_toast_seen`
- Toast component (`AssistantToast`) dạng slide-up

#### `components/assistant/AssistantPopup.tsx`
- Thêm tab navigation khi có cả pageGuide + toolGuide
- Tab "Hướng dẫn": textContent, video, TTS
- Tab "Tính năng": sections (color_legend, features, tips) — 8 màu
- Nếu chỉ có 1 loại → hiển thị full không tab

#### `components/layout/MainHeader.tsx`
- Xóa nút "Hỗ trợ" + inline modal (~90 dòng)
- Xóa import `help-actions`, `HelpCircle`, `X`
- Chỉ giữ `AssistantHeaderIcon` (❓)

#### `components/tools/ToolHeader.tsx`
- Xóa nút "Hỗ trợ" + inline modal (~90 dòng)
- Xóa import `help-actions`, `useState`, `useEffect`, `HelpCircle`, `X`

#### `scripts/tool-help-seed.ts`
- Chuyển từ `prisma.toolHelp` → `prisma.assistantGuide`
- Seed genealogy tool guide với `toolSlug`, `sections`

#### `prisma/seed-assistant-guide.ts`
- Chuyển `findUnique` → `findFirst` (vì pagePath không còn @unique)

#### File đã xóa
- `app/actions/help-actions.ts` (không còn dùng)
- `components/help/HelpModal.tsx` (orphan)

### Kiến trúc tổng thể sau merge
```
providers.tsx
  └── AssistantProvider (global)
       ├── fetchGuide(pathname) → { pageGuide, toolGuide }
       ├── Auto toast (lần đầu vào trang)
       ├── AssistantHeaderIcon (❓) trong MainHeader
       └── AssistantPopup (tabs: Hướng dẫn / Tính năng)
```

### Trạng thái
- ✅ 1 popup duy nhất cho mọi trang
- ✅ Tabs: Hướng dẫn + Tính năng
- ✅ Auto-toast lần đầu vào trang (2s delay, 5s tự tắt)
- ✅ Lưu vết localStorage
- ✅ Build sạch TypeScript (0 lỗi)
- ✅ Xóa sạch code duplicate + orphan
```

## ✅ Trình Xác Thực Email & Sửa lỗi Git Hook Encoding (2026-06-25)

### Mục tiêu
Xây dựng đầy đủ tính năng Trình xác thực & Lọc Email Hoạt động trong `/tools/email-mkt` phục vụ các chiến dịch email sau này, tắt tài khoản Brevo lỗi key (Brevo 5) và khắc phục lỗi Git Hook chặn commit do encoding từ "ĐÃ CHỌN".

### Các file đã sửa

#### `prisma/schema.prisma`
- Vấn đề: Tài khoản Brevo 5 (ID 77) bị lỗi key dẫn tới gửi email thất bại trong pool gửi.
- Fix: Cập nhật `isActive = false` trong database cho tài khoản này để loại bỏ khỏi pool gửi xoay vòng.

#### `app/api/admin/campaigns/[id]/send-batch/route.ts`
- Vấn đề: Gửi batch test bị treo do timeout Google Sheets API của chiến dịch `VERIFY_TEST` và log email không được đồng bộ chuẩn (chứa khoảng trắng, chữ hoa).
- Fix:
  - Bỏ qua việc ghi log lên Google Sheets khi chiến dịch có tên bắt đầu bằng `VERIFY_TEST`.
  - Tự động lowercase và trim email log khi lưu DB.
  - Tăng biến đếm `sentToday` cho sender ngay cả khi lỗi để pool sender chuyển tiếp round-robin.

#### `app/api/admin/email-verifier/start/route.ts`
- Vấn đề: Cần chuẩn hóa dữ liệu đầu vào người nhận cho trình xác thực.
- Fix: Rút gọn dữ liệu người nhận và cấu hình campaign.

#### `app/tools/email-mkt/EmailVerifierTab.tsx`
- Vấn đề:
  - Tiến trình gửi mail mẫu ở Bước 2 bị treo ở 0% do không tính số lượng mail lỗi SMTP vào tổng số đã xử lý.
  - Cần thêm panel thông báo hoàn tất khi gửi xong 100% để hướng dẫn người dùng nhấn nút quét.
  - Trùng lặp từ viết hoa `ĐÃ CHỌN` kích hoạt nhầm cảnh báo Mojibake của Git Hook pre-commit.
- Fix:
  - Tính toán tiến trình gửi bằng `sent + failed`.
  - Thêm component Alert thông báo hoàn tất màu xanh ở Bước 2.
  - Đổi chữ viết hoa `ĐÃ CHỌN` thành viết thường `Đã chọn` để vượt qua Git Hook.

### Trạng thái
- ✅ Trình xác thực gửi email test mẫu thành công 100% đến hộp thư đích
- ✅ Tỉ lệ tiến trình và log hiển thị chính xác trên UI
- ✅ Vượt qua Git Hook và push code lên Production Vercel thành công

---

### 9. HỆ THỐNG SAO LƯU & KHÔI PHỤC DỮ LIỆU (BACKUP SYSTEM)

#### Mục tiêu
Xây dựng hệ thống backup/restore toàn diện với 2 phương án (JSON qua Prisma và pg_dump native), có UI quản lý và CLI scripts, giúp admin thao tác dễ dàng và an toàn.

#### Các file đã tạo/sửa

##### `lib/backup-service.ts`
- Service tập trung xử lý backup bằng JSON (Prisma) và pg_dump (PostgreSQL native)
- `createJsonBackup()`: Dùng Prisma DMMF để iterate tất cả models, dump từng model ra file JSON
- `restoreJsonBackup()`: Đọc file JSON, xoá dữ liệu cũ, insert dữ liệu mới theo đúng thứ tự model
- `createPgDumpBackup()`: Gọi `pg_dump` CLI với DATABASE_URL
- `restorePgDumpBackup()`: Gọi `psql` CLI để restore
- `listBackups()`, `deleteBackup()`: Quản lý file backup trong `backups/`
- `checkPgDump()`: Kiểm tra pg_dump đã cài chưa
- Tự động xoay vòng (rotation): Giữ 10 bản backup gần nhất

##### `scripts/backup-db.ts`
- CLI script gọi `backup-service.ts` để tạo backup JSON
- Dùng `dotenv` load DATABASE_URL

##### `scripts/restore-db.ts`
- CLI script interactive: liệt kê backup, chọn, xác nhận, dry-run
- Gọi `backup-service.ts` để restore

##### `app/api/admin/backup/route.ts`
- `GET /api/admin/backup` - Liệt kê backups + kiểm tra pg_dump status
- `POST /api/admin/backup` - Tạo backup mới (body: `{ method: 'json' | 'pg_dump' }`)
- `DELETE /api/admin/backup` - Xóa backup (body: `{ name }`)
- Yêu cầu ADMIN role

##### `app/api/admin/backup/restore/route.ts`
- `POST /api/admin/backup/restore` - Restore từ backup (body: `{ name, method }`)
- Gọi service.restore tương ứng
- Yêu cầu ADMIN role

##### `app/tools/backup/page.tsx`
- UI quản lý backup: 2 card phương án (JSON / pg_dump), danh sách backup, nút Create/Restore/Delete
- Hiển thị trạng thái pg_dump (có sẵn / chưa cài)
- Admin-only, hiển thị cảnh báo nếu không phải ADMIN
- Follow pattern: MainHeader, brk-bg, button styling

##### `scripts/backup.ps1`
- Thêm bước gọi `npx tsx scripts/backup-db.ts` sau khi backup file

##### `scripts/add-backup-tool.ts`
- Script đăng ký tool `/tools/backup` vào DB với roles `['ADMIN']`
- Icon: `HardDrive`, slug: `backup`

#### Trạng thái
- ✅ JSON backup: thành công (70 models, ~5823 records)
- ✅ JSON restore dry-run: thành công
- ✅ pg_dump: phát hiện chưa cài đặt, UI hiển thị đúng trạng thái
- ✅ UI backup tool: tạo, liệt kê, xóa, restore
- ✅ Admin-only access
- ✅ Script CLI backup & restore
- ✅ Tool registered in Database
- ✅ tsc --noEmit: pass

---

## ✅ UserBankAccount & TeacherBankAccount — Quản lý tài khoản nhận tiền (2026-07-01)

### Mục tiêu
Thêm model `UserBankAccount` cho phép user tự quản lý nhiều tài khoản nhận tiền (ngân hàng, Momo, ZaloPay), thêm `teacherBankAccountId` trên Course để gắn tài khoản giáo viên, CRUD UI trong account-settings và admin tool.  
Cập nhật Phase 2: Loại bỏ các trường nhập tay (`stk`, `name_stk`, `bank_stk`, `link_qrcode`) khỏi Course model, chuyển hoàn toàn sang cơ chế tham chiếu `teacherBankAccountId` + cho phép Admin CRUD tài khoản ngân hàng qua tool.

### Các file đã tạo/sửa

#### `prisma/schema.prisma`
- Đã có: `enum BankAccountType` (BANK, MOMO, ZALOPAY, OTHER), `model UserBankAccount` (userId, accountType, accountHolder, accountNumber, bankName, qrCodeUrl, isDefault)
- **Thêm mới**: `teacherBankAccountId Int?` + `teacherBankAccount UserBankAccount?` trên `Course`, relation name `CourseTeacherBank`
- **Thêm mới**: `courses Course[] @relation("CourseTeacherBank")` trên `UserBankAccount`
- **Xóa**: Các trường `stk`, `name_stk`, `bank_stk`, `link_qrcode` khỏi model `Course` (chỉ giữ `noidung_stk`)

#### `app/api/user/bank-accounts/route.ts` (Tạo mới)
- GET: Lấy danh sách TK của user hiện tại (hỗ trợ `?userId=` cho ADMIN xem của người khác)
- POST: Tạo TK mới (tự động bỏ mặc định cũ nếu `isDefault=true`)
- PUT: Sửa TK (kiểm tra quyền sở hữu)
- DELETE: Xóa TK (kiểm tra quyền sở hữu)

#### `app/api/admin/bank-accounts/route.ts` (Tạo mới, sau đó cập nhật)
- Vấn đề (Phase 1): Chỉ có GET list, thiếu CRUD cho Admin
- Fix (Phase 2): Thêm POST (tạo cho user bất kỳ), PUT (sửa), DELETE (xóa) — đều yêu cầu ADMIN role

#### `app/actions/account-actions.ts`
- Thêm: `getUserBankAccountsAction()`, `createUserBankAccountAction()`, `updateUserBankAccountAction()`, `deleteUserBankAccountAction()`

#### `app/actions/course-actions.ts`
- `createCourseAction`: Nhận thêm `teacherBankAccountId` từ FormData
- Xóa các trường `stk`, `name_stk`, `bank_stk`, `link_qrcode` khỏi create handler (chỉ giữ `noidung_stk`)

#### `app/actions/admin-actions.ts`
- `updateCourseAction`: Thêm `teacherBankAccountId?: number | null` vào type + tự động lưu
- Xóa các trường `stk`, `name_stk`, `bank_stk`, `link_qrcode` khỏi type

#### `app/account-settings/page.tsx`
- Thêm section "Tài khoản nhận tiền" sau profile info
- CRUD modal: Loại TK (Bank/Momo/ZaloPay/Khác), chủ TK, số TK, ngân hàng, QR code, mặc định

#### `app/tools/bank-accounts/page.tsx` (Tạo mới, sau đó cập nhật)
- Vấn đề (Phase 1): Chỉ danh sách read-only, không có thao tác
- Fix (Phase 2): 
  - Thêm cột "Thao tác" với nút Sửa (xanh) / Xóa (đỏ)
  - Modal Thêm/Sửa với: search user (gọi API `/api/admin/users/list?search=`), loại TK, chủ TK, số TK, ngân hàng, QR code, mặc định
  - Xóa có confirm dialog
  - Tất cả gọi API admin CRUD

#### `app/api/admin/users/list/route.ts` (Cập nhật)
- Vấn đề: Chỉ list tất cả users, không hỗ trợ search
- Fix: Thêm query params `?search=` (tìm theo name/email/phone/id) + `?limit=` (mặc định 50, tối đa 100)

#### `app/tools/courses/new/page.tsx`
- Thêm: Select "Chọn từ tài khoản đã lưu" trong phần thanh toán
- Xóa các input nhập tay stk/name_stk/bank_stk/link_qrcode (chỉ giữ `teacherBankAccountId` select + `noidung_stk`)
- Gửi `teacherBankAccountId` lên server thay vì các trường rời rạc

#### `app/tools/courses/[id]/page.tsx`
- Thêm: Select "Chọn từ tài khoản đã lưu" trong phần thanh toán
- Xóa các state `stk`, `nameStk`, `bankStk`, `linkQrcode` 
- Xóa các input nhập tay stk/name_stk/bank_stk/link_qrcode (chỉ giữ `teacherBankAccountId` select + `noidung_stk`)
- Cập nhật `fetchData` và `handleSubmit` tương ứng

#### `app/api/courses/route.ts`
- Xóa các trường stk/name_stk/bank_stk/link_qrcode khỏi POST handler (tạo course)

#### `app/api/enroll-after-register/route.ts`
- Xóa các trường stk/name_stk/bank_stk/link_qrcode khỏi select query

#### `app/actions/site-profile-actions.ts`
- Thêm `teacherBankAccount` vào include khi fetch course (sử dụng relation mới)

#### `components/course/PaymentModal.tsx`
- Cập nhật UI: hiển thị thông tin TK từ `teacherBankAccount` (accountHolder, accountNumber, bankName, qrCodeUrl) thay vì các trường direct trên Course

### Trạng thái
- ✅ `UserBankAccount` model + enum + relations (schema)
- ✅ User API CRUD + Admin API full CRUD (GET/POST/PUT/DELETE)
- ✅ Server actions CRUD (account-actions) + update course actions
- ✅ Account settings UI: thêm/sửa/xóa TK nhận tiền
- ✅ Admin tool page: xem + thêm + sửa + xóa TK, search user
- ✅ Course new/edit: chọn từ TK đã lưu, không còn nhập tay
- ✅ Loại bỏ các trường redundant `stk`, `name_stk`, `bank_stk`, `link_qrcode` khỏi Course model
- ✅ `npx prisma db push` — Đồng bộ DB
- ✅ `npx tsc --noEmit` — 0 lỗi

---

## ✅ Hợp nhất & Tái cấu trúc Tools (2026-07-02)

### Mục tiêu
Gộp các tool riêng lẻ thành các tool tabs để đơn giản hóa navigation và giảm số lượng entry trong `/tools`.

### Các thay đổi

#### 1. Email Settings → tab trong Email Marketing
- `email-settings` đã có tab "Cấu Hình" trong email-mkt (`ClientContent.tsx`)
- Trang standalone `app/tools/email-settings/` không còn cần thiết

#### 2. Quản trị hệ thống → tab trong Genealogy
- **`components/genealogy/AdminTab.tsx`** (Tạo mới): Component admin system management (stats, table, create/delete system)
- **`app/tools/genealogy/page.tsx`** (Sửa): Thêm tab bar "🌳 Nhân Mạch" / "⚙️ Quản trị" ở default export, conditionally render `GenealogyFlow` hoặc `GenealogyAdminTab`

#### 3. Gộp Trợ lý tài khoản + Trợ lý ảo → tool "Hỗ trợ" (`/tools/ho-tro`)
- **`app/tools/ho-tro/page.tsx`** (Tạo mới): Tab bar "🤖 Trợ lý tài khoản" / "🧭 Trợ lý ảo"
- **`app/tools/ho-tro/AccountAssistantTab.tsx`** (Tạo mới): Quản lý steps trợ lý tài khoản (copy từ account-assistant)
- **`app/tools/ho-tro/AssistantGuideTab.tsx`** (Tạo mới): Quản lý guide + cấu hình hiển thị (copy từ assistant-guide)
- Giữ nguyên các trang cũ (`account-assistant`, `assistant-guide`) để tương thích ngược

#### 4. Gộp Trang của tôi + Landing Page + Site Profile → tool "Page" (`/tools/pages`)
- **`app/tools/pages/page.tsx`** (Tạo mới): Tab bar "🏠 Trang của tôi" / "🚀 Landing Page" / "📄 Site Profile"
- **`app/tools/pages/MySiteTab.tsx`** (Tạo mới): Hiển thị profile user hiện tại
- **`app/tools/pages/LandingsTab.tsx`** (Tạo mới): CRUD landing pages
- **`app/tools/pages/SiteProfilesTab.tsx`** (Tạo mới): Admin quản lý site profiles
- Xóa các trang cũ khỏi file system (`account-assistant`, `assistant-guide`, `admin`, `email-settings`, `my-site/page.tsx`, `landings/page.tsx`, `site-profiles/page.tsx`)
- Xóa 7 tool records khỏi DB (`DELETE FROM "Tool"`) — site-profiles, my-site, landings, assistant-guide, email-settings, account-assistant, system-admin

#### 6. Cải thiện tìm kiếm user trong `/tools/bank-accounts`
- **`app/api/admin/users/list/route.ts`**: Cải thiện search — tách riêng điều kiện `id` khỏi `.filter(Boolean)`, dùng `parseInt` rõ ràng
- **`app/tools/bank-accounts/page.tsx`**: 
  - Placeholder: "Nhập mã HV, tên, email..."
  - Kết quả hiển thị badge `#ID` nổi bật + email dòng phụ
- Khi nhập số → tìm đúng user theo mã học viên, hiện tên + email

### Trạng thái
- ✅ Genealogy có tab "Nhân Mạch" + "Quản trị"
- ✅ Tool "Hỗ trợ" gộp account-assistant + assistant-guide
- ✅ Tool "Page" gộp my-site + landings + site-profiles
- ✅ Đã xóa 7 tool records cũ khỏi DB
- ✅ Tìm kiếm user trong bank-accounts hỗ trợ mã HV (ID)
- ✅ `npx tsc --noEmit` — 0 lỗi

