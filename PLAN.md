# PLAN.md — Tài liệu kỹ thuật & Lịch sử cập nhật HocVien-BRK
> Cập nhật lần cuối: **2026-07-08** (phiên 7: Tái cấu trúc Telegram groups)  
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

---

### 6. HỆ THỐNG BRK (BUILD CÂY NHÂN MẠCH SYSTEM #4)

#### Mục tiêu
Tạo cây hệ thống BRK (onSystem=4) cho 22 học viên đã kích hoạt khóa #22, áp dụng đúng quy tắc FORCED_4WIDE (max 4 F1/node, BFS ưu tiên chiều rộng).

#### Các file đã sửa/tạo

##### `lib/brk/placement-rules.ts`
- **Bug**: `findPlacement4Wide` khi referrer có tồn tại (truthy) nhưng chưa trong hệ thống → trả về 0 (tạo root mới)
- **Fix**: Kiểm tra referrer có trong system không trước. Nếu chưa → fallback BFS từ root của hệ thống

##### `scripts/rebuild-brk-system4.ts` (mới)
- Xoá sạch dữ liệu cũ: system_closure, system, brk_transaction cho onSystem=4
- Backfill 22 enrollment theo thứ tự `createdAt ASC`, gọi `resolvePlacement(4, referrerId)` đã fix
- Tự động: tạo System record + Closure table + Wallet + Commission + Level check

#### Các file đã sửa bổ sung

##### `lib/auto-verify.ts`
- Thêm extract trường `Ngày/Date` từ email Sacombank → `transferTime`
- Lưu `transferTime` vào Payment record khi auto-verify

##### `scripts/auto-verify-payment.ts`
- Cập nhật `parseSacombankEmail()` tương tự: extract Date + trả về `transferTime`
- Lưu `transferTime` vào Payment record

##### `scripts/backfill-transfer-time.ts` (mới)
- Scan Gmail tìm 31 email Sacombank, match với 22 enrollment khóa #22
- Cập nhật `Payment.transferTime` cho 18/22 records (4 records không tìm thấy email)

##### `scripts/rebuild-brk-system4.ts`
- Đổi thứ tự xếp cây: `transferTime` → `verifiedAt` → `createdAt`

#### Kết quả cây BRK System #4 (đã rebuild lần 2)
```
22 Systems, 1 Root (user#3773), 62 Closures
Cấu trúc 4 tầng, width-4, xếp theo thời gian giao dịch ngân hàng
```

#### Trạng thái
- ✅ Bug `findPlacement4Wide` đã fix (fallback về root BFS khi referrer không trong system)
- ✅ `parseSacombankEmail()` đã extract `Ngày/Date` → `transferTime`
- ✅ Backfill 18/22 Payment records với transferTime từ email lịch sử
- ✅ Cây BRK System #4 đã rebuild theo thứ tự `transferTime` → `verifiedAt` → `createdAt`

---

### 7. AUTO-VERIFY CONFIG & BRK ACTIVATION

#### Mục tiêu
Tạo hệ thống cấu hình tự động xác nhận thanh toán theo từng khóa học, hỗ trợ nhiều ngân hàng/email khác nhau và tự động kích hoạt BRK.

#### Các file đã sửa/tạo

##### `prisma/schema.prisma` (mới)
- Thêm model `AutoVerifyConfig`: cấu hình auto-verify cho từng khóa học
  - `courseId` → khóa học
  - `emailFrom` → địa chỉ gửi email TBGD (VD: info@sacombank.com.vn)
  - `bankName` → tên ngân hàng
  - `emailQuery` → câu query Gmail
  - `onSystem` → BRK system ID để auto-activate (null = không kích hoạt)
  - `enabled` → bật/tắt

##### `lib/auto-verify.ts`
- Gmail query được build động từ tất cả `AutoVerifyConfig.enabled = true`
- Thay thế hardcode `teacherId === 327` bằng lookup `AutoVerifyConfig.onSystem`
- BRK activation dùng `activateBrkMember()` từ `lib/brk/activation-service`

##### `scripts/auto-verify-payment.ts`
- Tương tự: bỏ hardcode YTB, dùng AutoVerifyConfig + gọi `activateBrkMember`

##### `scripts/auto-verify-payment.js`
- Thêm extract `transferTime` từ email
- Thêm BRK activation dùng `AutoVerifyConfig`
- Gmail query build từ config

##### `scripts/seed-auto-verify-config.ts` (mới)
- Seed config cho course #22: email=Sacombank, onSystem=4

#### Cơ chế hoạt động
```
Config (AutoVerifyConfig) → build Gmail query → scan email → parse
  → match enrollment PENDING → verify payment → activate enrollment
    → nếu config.onSystem != null → activateBrkMember(userId, onSystem)
```

#### Trạng thái
- ✅ Model `AutoVerifyConfig` + migration (db push)
- ✅ `lib/auto-verify.ts` dùng config thay vì hardcode
- ✅ `scripts/auto-verify-payment.ts` + `.js` được cập nhật
- ✅ Seed config cho course #22 (BRK onSystem=4)
- ✅ `npx tsc --noEmit` — 0 lỗi

---

## ✅ BRK System #4 — Rebuild & Placement Rules Fix (2026-07-03)

### Mục tiêu
Rebuild cây BRK (onSystem=4) với placement logic hybrid mới:
- **Phase 1**: Lấp ngang F1+F2 (BFS từ root, depth < 2), không quan tâm referrer
- **Phase 2**: Khi F1+F2 đã full (depth ≥ 2), ưu tiên referrer xếp dọc theo subtree

Thêm `referrerId` vào Enrollment model để capture course-level referrer (ai gửi link khóa học).

### Các file đã sửa

#### `prisma/schema.prisma`
- Thêm field `referrerId Int?` vào Enrollment model
- Thêm relation `EnrollmentReferrer` → User
- Thêm index `enrollment_referrer_idx` trên `referrerId`

#### `app/actions/course-actions.ts`
- Đọc cookie `aff_ref` tại thời điểm enroll → resolve → lưu `enrollment.referrerId`

#### `app/api/enroll-after-register/route.ts`
- Dùng `user.referrerId` làm enrollment referrer (cho flow pre-register enroll)

#### `lib/brk/activation-service.ts`
- Thêm tham số `enrollmentReferrerId?`
- Ưu tiên `enrollment.referrerId` hơn `user.referrerId`

#### `lib/brk/placement-rules.ts`
- Phase 1: BFS từ root, fill 4-wide ngang đến hết depth 1
- Phase 2: referrer cụ thể (≠ root, trong hệ thống) → BFS trong subtree referrer

#### `lib/auto-verify.ts`, `app/actions/payment-actions.ts`, `scripts/auto-verify-payment.ts`
- Thêm `enrollment.referrerId` vào `activateBrkMember()` call

#### `scripts/rebuild-brk-system4.ts`
- Dùng `enrollment.referrerId || enrollment.user.referrerId` làm effective referrer
- **Root guard**: enrollment đầu tiên luôn được set làm root (refSysId=0) để tránh race condition với auto-verify

### Kết quả rebuild (27 members)
```
Root: #3773 Coach Nguyễn Biên Cương
├── F1 #1010 (BÙI THỊ PHƯƠNG ANH)
│   ├── F2 #229 → #379, #1068, #617, #1023
│   ├── F2 #965
│   ├── F2 #976
│   └── F2 #1059
├── F1 #1035 (ĐẶNG THỊ HIỀN)
│   ├── F2 #914 → #1044
│   ├── F2 #26
│   ├── F2 #828
│   └── F2 #496 → #1066
├── F1 #1057 (Vũ Thị Thao)
│   ├── F2 #1063, #1060, #478, #962
└── F1 #1061 (Nguyễn Huyền)
    ├── F2 #1062, #1008, #330, #1029
```
- Phase 1: 21 members (1 root + 4 F1 + 16 F2) — BFS horizontal
- Phase 2: 6 members placed by referrer — 4 under #229 (ref=229/3773/861), 1 under #914 (ref=914), 1 under #496 (ref=496)
- Closures: 81 records (27 self + 54 ancestor links)
- ✅ `npx tsc --noEmit` — 0 lỗi

### Lưu ý
- LSP errors về `referrerId` là do TypeScript server cache chưa cập nhật Prisma schema — `tsc --noEmit` vẫn pass
- `enrollment.referrerId` hiện tại đều null (chưa có user nào enroll qua referral link sau khi deployment) — chỉ dùng `user.referrerId`

---

## ✅ Phiên 5: Fix auto-verify + Đối chiếu course #22 + Build BRK 29 members (2026-07-04)

### Mục tiêu
Fix toàn diện pipeline auto-verify payment, chặn user #2689, đối chiếu 100% email Sacombank vs enrollment, rebuild cây BRK.

### Các file đã sửa

#### `lib/auto-verify.ts`
- **Fix `after:` filter**: ISO date string → Unix epoch seconds (Gmail API không chấp nhận ISO)
- **Fix so khớp course code**: Thêm `normalizeCode()` loại bỏ ký tự đặc biệt (`_`, `.`) trước khi so sánh — email `XDHETHONGUP1000` khớp với DB `XD_HETHONG_UP1000`
- **Block #2689**: Thêm `if (enrollment.userId === 2689) continue` — bỏ qua auto-activate cho tài khoản test
- **Try-catch isolation**: Mỗi enrollment + mỗi message đều có try-catch riêng

#### `app/api/enroll-after-register/route.ts`
- Thêm check `userIdNum === 2689` → trả về 403 — chặn enrollment cho tài khoản test

#### `lib/brk/level-manager.ts`
- Thêm check `userId === 2689` → throw error — chặn nhận quà tặng level

#### `app/actions/bulk-enroll-actions.ts`
- Thêm filter `row.userId === 2689` → báo lỗi + continue — chặn bulk enroll

### Kết quả đối chiếu course #22 (XD_HETHONG_UP1000)

| Mục | Số lượng |
|-----|:--------:|
| Email Sacombank tìm thấy | **29 email** |
| HV đúng (không bị gán sai) | 23 email |
| HV2689 bị gán sai | 6 email |
| → Đã map đúng user | 6/6 ✅ |
| ACTIVE enrollments | **29 members** |
| PENDING còn lại | 0 |
| BRK systems | **29** |
| BRK closures | 89 |

### 6 user bị gán sai #2689 đã map lại

| Email ghi | Người chuyển | Map vào | Trạng thái |
|:---------:|:------------:|:-------:|:----------:|
| HV2689 | KIM VAN MUOI | #976 Kim Văn Mười | ✅ active |
| HV2689 | NGUYEN THI YEN | #974 Nguyễn Thị Yến | ✅ active |
| HV2689 | TRA THI NGA | #1053 Trà Thị Nga | ✅ active |
| HV2689 | NGUYEN THI THANH HUYEN | #1029 Nguyễn Thị Thanh Huyền | ✅ active |
| HV2689 | NGUYEN THI THU LOAN | #607 HOÀNG LOAN 5* | ✅ active |
| HV2689 | NGUYEN THI MY LE | #1023 Nguyen My Le | ✅ active |

### Cấu trúc cây BRK System 4 (29 members)

```
👑 #3773 Coach Nguyễn Biên Cương (ROOT)
│
├─ F1 #1010 → #229, #965, #976, #974
│   ├─ #229 → #1068, #617, #1023, #1070
│   └─ #965 → #26
│
├─ F1 #1035 → #1059, #914, #828, #496
│   ├─ #914 → #1044, #1071
│   └─ #496 → #1066
│
├─ F1 #1057 → #1063, #1060, #962, #330
│
└─ F1 #1061 → #1029, #379, #1053, #607
```

- **Phase 1**: 29 members (1 root + 4 F1 + 24 sub) — BFS horizontal + referrer-based
- **Root forced**: #3773 (enrollment đầu tiên)

### Trạng thái
- ✅ Auto-verify hoạt động với epoch seconds
- ✅ #2689 bị chặn ở mọi đường dẫn
- ✅ 29 email = 29 members BRK
- ✅ `npx tsc --noEmit` — 0 lỗi

---

## ✅ BRK Wallet 3 Balances + Migration + Config Fix (2026-07-04)

### Mục tiêu
Thêm 2 balance mới (BRKD, Voucher) vào BrkWallet, tạo Prisma migration chính thức thay `db push`, fix DB level config values.

### Các file đã sửa/tạo

#### `prisma/schema.prisma`
- Thêm `brkd Decimal` và `voucherBalance Decimal` vào `BrkWallet`
- Thêm `balanceType BalanceType` (enum: CASH, BRKD, VOUCHER) vào `BrkTransaction`
- Thêm enum values `BRKD_CREDIT`, `VOUCHER_CREDIT`, `BRKD_RETURN` vào `BrkTransactionType`

#### `prisma/migrations/20260704_add_brk_wallet_balances/migration.sql` (Tạo mới)
- Migration file chính thức: ALTER TABLE thêm cột, CREATE TYPE BalanceType, ALTER TYPE BrkTransactionType

#### `lib/brk/wallet-service.ts`
- `creditBrkdWallet()`: Ghi BRKD vào ví + transaction với balanceType=BRKD
- `creditVoucherWallet()`: Ghi voucher vào ví + transaction với balanceType=VOUCHER
- `creditBalance()`: Generic credit, tham số `balanceType` để phân biệt CASH/BRKD/VOUCHER

#### `lib/brk/commission-calculator.ts`
- **BRKP luôn 17 cho ALL ancestors** trước check `earnPct <= 0` — fix bug mất BRKP
- Cash + BRKD differential: chỉ phân phối khi `earnPct > 0`

#### `lib/brk/level-manager.ts`
- Multi-level promotion loop (while)
- `create2F1Voucher()`: tự động credit 386,000 VND vào voucherBalance
- Xóa `createReferralBonus`

#### `lib/brk/activation-service.ts`
- `activateBrkMember()`: BRKP self + ancestors; BRKD self; gọi `create2F1Voucher` cho referrer
- `cancelBrkMemberWithinGrace()`: refund 100% cash + full BRKD; chuyển F1 lên upline
- `processGracePeriodExpirations()`: refund 21% cash + proportional BRKD

#### `lib/brk/revenue-share-service.ts`
- Thêm BRKD distribution proportional to bonus pool

#### `app/actions/brk-actions.ts`
- Sửa import: bỏ `createReferralBonus`, thêm `brkd`, `voucherBalance` vào wallet data

#### DB Config (raw SQL)
- Level 1 `pointsRequired`: 15 → **17** (khớp BRKP_PER_ACTIVATION)
- Level 2 `giftValue`: 500,000 → **386,000** (khớp simulation)

### Kết quả simulation (3,122 members)
```
Root: Lv6 — BRKP=53,074 — Cash=10,664,186 — Voucher=15,772,000
Level distribution: Lv1=2,342 / Lv2=585 / Lv3=163 / Lv4=22 / Lv5=6 / Lv6=1
Total vouchers awarded: 1,783
```

### Trạng thái
- ✅ DB data fixed (Level 1: 15→17, Level 2 gift: 500k→386k)
- ✅ Prisma migration created & resolved
- ✅ All 3 migrations applied, DB schema up to date
- ✅ `npx tsc --noEmit` — 0 lỗi
- ✅ Simulation runs successfully

---

## ✅ Thêm checkpoint cuối ngày 5/7 trong BRK Simulation (2026-07-04)

### Mục tiêu
Hiển thị trạng thái chi tiết 34 members thật **cuối ngày 5/7** (sau growth, level-up, voucher 2F1, bonus pool) theo yêu cầu "kết quả ngày mai".

### Các file đã sửa
#### `scripts/_simulate_brk.ts`
- Thêm checkpoint `printDetailedMemberReport` với label `'NGAY MAI (5/7) - CUOI NGAY (SAU TANG TRUONG, LEVEL-UP, VOUCHER, BONUS POOL)'` tại dòng 600-602, sau khi day 5 processing hoàn tất trong vòng lặp.
- Checkpoint cũ (dòng 547, `'NGAY MAI (5/7) - TRUOC KHI TANG TRUONG'`) giữ nguyên.

### Trạng thái
- ✅ Checkpoint "cuối ngày 5/7" hiển thị đúng: Levels tăng, BRKP=2,533, Cash=259,532, Voucher=10,492,000
- ✅ `npx tsx scripts/_simulate_brk.ts` — 0 lỗi

---

## ✅ Kích hoạt 3 cron BRK + thêm CRON_SECRET auth (2026-07-04)

### Mục tiêu
- Thêm xác thực `CRON_SECRET` cho 4 BRK cron routes để tránh bị gọi trái phép
- Đăng ký 3 cron mới (grace processing, expiration, level check) vào `vercel.json` để chạy hàng ngày

### Các file đã sửa
#### `app/api/cron/brk-revenue-share/route.ts`
- Thêm `request: Request` param
- Thêm auth check `Authorization: Bearer ${process.env.CRON_SECRET}`

#### `app/api/cron/brk-grace-processing/route.ts`
- Thêm `request: Request` param + auth check CRON_SECRET

#### `app/api/cron/brk-expiration/route.ts`
- Thêm `request: Request` param + auth check CRON_SECRET

#### `app/api/cron/brk-level-check/route.ts`
- Thêm `request: Request` param + auth check CRON_SECRET

#### `vercel.json`
- Thêm 3 cron entries:
  - `brk-grace-processing`: Daily 2AM
  - `brk-expiration`: Daily 3AM
  - `brk-level-check`: Daily 4AM

### Trạng thái
- ✅ `npx tsc --noEmit` — 0 lỗi
- ✅ 4 routes có CRON_SECRET auth
- ✅ 3 cron mới đã đăng ký trong vercel.json
- ⚠️ Cần deploy lên Vercel để cron bắt đầu chạy

---

## ✅ Đồng bộ selfPoints về 17 (BRKP_PER_ACTIVATION) — Fix scripts rebuild/backfill (2026-07-05)

### Vấn đề
`rebuild-brk-system4.ts` và `backfill-brk-system4.ts` dùng công thức `Math.round((fee * pointsPerDollar) / 1000)` → selfPoints = **15**, không khớp với `BRKP_PER_ACTIVATION = 17` dùng trong `activation-service.ts` và `commission-calculator.ts`.

### Các file đã sửa
#### `scripts/rebuild-brk-system4.ts`
- Thêm `const BRKP_PER_ACTIVATION = 17`
- Thay `selfPoints = Math.round(...)` bằng `totalPoints: { increment: BRKP_PER_ACTIVATION }`

#### `scripts/backfill-brk-system4.ts`
- Thêm `const BRKP_PER_ACTIVATION = 17`
- Thay `selfPoints = Math.round(...)` bằng `totalPoints: { increment: BRKP_PER_ACTIVATION }`

### Trạng thái
- ✅ `npx tsc --noEmit` — 0 lỗi
- ⚠️ Dữ liệu 36 member cũ vẫn giữ totalPoints 15-75 (cần chạy script fix data nếu muốn)

---

## ✅ Cải tiến Modal chi tiết thành viên Genealogy & Bổ sung thông tin Nhân mạch (2026-07-05)

### Mục tiêu
Nâng cấp và làm đẹp Modal chi tiết thành viên khi click vào avatar: thêm tuyến trên 2 tầng (Nhân mạch), tổng số thành viên đội nhóm, sắp xếp mã số to rõ cạnh tên, dịch sang trái tránh che nút Close (X), bỏ nhãn thừa và chuẩn hóa hiển thị số.

### Các file đã sửa
#### `app/actions/admin-actions.ts`
- Cập nhật `getMemberDetailsAction` để lấy thêm Upline 1 (upline1), Upline 2 (upline2) qua `refSysId` và `teamSize` (tổng số downlines).

#### `app/tools/genealogy/page.tsx`
- Sửa layout Header: đưa mã số học viên `#...` sang bên phải tên, hiển thị nổi bật dạng chữ Trắng trên nền Vàng hổ phách (`bg-amber-500`), chừa khoảng trống an toàn bên phải tránh va chạm nút Close (X).
- Hiển thị thông tin Nhân mạch và Nhân mạch của Nhân mạch mượt mà, trực quan.
- Tinh chỉnh các nhãn thông tin viết chữ thường: "Điểm đội (BRKP)", "Doanh số (BRKD)", "Số thành viên" (chiếm toàn dòng).
- Bỏ phần nhãn phụ "Nhóm tự động" gây bối rối cho người dùng.
- Cập nhật các nhãn ví (Thu nhập (VNĐ), Thu nhập vinh dự (BRKD), Đã rút (VNĐ)) và loại bỏ các suffix để dữ liệu chỉ gồm số thuần túy.

### Trạng thái
- ✅ `npx tsc --noEmit` — 0 lỗi
- ✅ Giao diện Modal hiển thị chuẩn mực và gọn gàng, tránh tuyệt đối va chạm nút Close (X).

---

## ✅ Sửa lỗi duyệt tay không cập nhật phả đồ & Cải tiến ghi nhận link Affiliate khóa học (2026-07-07)

### Mục tiêu
- Khắc phục lỗi cache Next.js Router khiến phả đồ và hệ thống không cập nhật ngay sau khi admin duyệt tay thanh toán.
- Sửa lỗi giải mã cookie `aff_ref` khiến luồng đăng ký khóa học thủ công (gọi `enrollInCourseAction`) không nhận dạng được mã giới thiệu JSON, dẫn đến lưu `referrerId = null` trong bảng `Enrollment`.
- Khôi phục (Rollback) trạng thái của học viên Dương Văn Mẫn về lại `PENDING` theo đúng yêu cầu kiểm soát của Admin.

### Các file đã sửa
#### `app/actions/payment-actions.ts`
- Thêm `revalidatePath('/tools/genealogy')` và `revalidatePath('/tools/brk')` ở cuối hàm `verifyPaymentAction` để xóa cache client-side, ép trình duyệt tải dữ liệu phả đồ và đối tác mới nhất sau khi duyệt.
- Bọc khối gọi `activateBrkMember` vào block `try-catch` riêng biệt để bảo vệ luồng duyệt chính không bị crash dở dang nếu có lỗi phát sinh trong quá trình tính toán phả đồ.

#### `app/actions/course-actions.ts`
- Cập nhật hàm `enrollInCourseAction` để hỗ trợ tương thích ngược 100%: Tự động phát hiện và parse chuỗi JSON của cookie `aff_ref` (đối với học viên đi qua proxy.ts) hoặc đọc trực tiếp chuỗi thô (đối với học viên đi qua landing page ngoài).

### Công việc đã thực hiện
- Rà soát cơ sở dữ liệu và xử lý kích hoạt thành công cho học viên **Hồng Hạnh** (#1086 - Đăng ký: #1351) do bị kẹt rate-limit Gmail API sáng nay.
- Thực hiện Rollback toàn bộ dữ liệu của học viên **Dương Văn Mẫn** (#1008 - Đăng ký: #1256) về trạng thái **`PENDING`**, thu hồi ví (CASH & BRKD) và trừ điểm upline đã cộng nhầm trước đó.
- Sau khi xử lý, số lượng `Enrollment ACTIVE` và `System 4 ACTIVE` khớp nhau hoàn hảo ở con số **46** (Học viên Hồng Hạnh đã được active, Dương Văn Mẫn đã trở lại PENDING).

### Trạng thái
- ✅ `npx tsc --noEmit` — 0 lỗi biên dịch.
- ✅ Ghi nhận affiliate khóa học hoạt động chính xác cho cả cookie JSON lẫn text thô.

---

## ✅ [2026-07-07] Loại bỏ fallback tài khoản chung #2689 + Hệ thống cảnh báo Telegram FAILED_LOGIN

### Mục tiêu
Thay đổi cơ chế xử lý đăng nhập thất bại:
- **Không** tự động fallback vào tài khoản chung #2689
- Hiển thị lỗi cụ thể (sai mã HV / email / SĐT / mật khẩu)
- Gửi Telegram vào group `FAILED_LOGIN` riêng cho bộ phận hỗ trợ
- Có link hành động: Quên mật khẩu?, Tìm tài khoản, Đăng ký
- Code cũ giữ lại dạng comment để dễ kích hoạt lại

### Các file đã sửa

#### `lib/notifications.ts`
- Thêm type `FAILED_LOGIN` vào `sendTelegram()`

#### `.env` & `.env.local`
- Thêm `TELEGRAM_CHAT_ID_FAILED_LOGIN=-1004466932240`

#### `app/api/auth/report-failed-login/route.ts`
- Viết lại hoàn toàn: phân tích identifier type, lookup user, trả về error type
- Bỏ tạo/tìm user #2689
- Gửi Telegram vào `FAILED_LOGIN` group

#### `auth.ts`
- Server authorize: throw `CustomLoginError` với code cụ thể
- Gửi Telegram type `FAILED_LOGIN` — **đã xóa ở session 2026-07-08** (chỉ giữ lại throw error)
- Bỏ fallback #2689

#### `app/login/page.tsx`
- Client: bỏ signIn lần 2 với #2689
- Gọi API `/api/auth/report-failed-login`, hiển thị lỗi + link hành động
- Thêm contact card: Zalo 0876473257 + Telegram nhóm hỗ trợ khi login fail
- Code cũ comment lại (`/* OLD - Shared Account #2689 Fallback */`)

#### `components/auth/AccountAssistantModal.tsx`
- `handleLogin`: bỏ signIn #2689, thêm gợi ý đặt lại mật khẩu qua OTP
- `handleCheckStudentId`: thêm nút "Tìm tài khoản bằng email/SĐT" khi không tìm thấy mã HV
- Thêm contact card khi login fail
- Thêm step `register_success`: hiển thị contact Zalo + Tele sau đăng ký, có nút "Tiếp tục"
- Code cũ comment lại

#### `components/layout/MainHeader.tsx`
- Comment banner `isTempLogin` (code cũ giữ lại)

#### `app/register/page.tsx`
- Cập nhật số Zalo hỗ trợ từ `0388625868` → `0876473257`

### Tài liệu mới
- `docs/LOGIN_FAILED_ALERT_SYSTEM.md` — Đặc tả kỹ thuật chi tiết
- `docs/SESSION_LOG.md` — Nhật ký phiên làm việc (dùng cho mọi session sau này)

### Trạng thái
- ✅ `npx tsc --noEmit` — 0 lỗi biên dịch
- ✅ API test thành công cho cả 3 loại identifier
- ✅ Login fail: hiển thị Zalo 0876473257 + Telegram
- ✅ Register success: hiển thị contact + nút "Tiếp tục vào Học viện"
- ⏳ Chờ deploy Vercel + add bot vào group Telegram
- ⏳ Bot cần được add vào group `-1004466932240` trước khi Telegram hoạt động

---

## ✅ [2026-07-08] Tái cấu trúc Telegram groups + Xóa trùng lặp cảnh báo login fail

### Mục tiêu
- **Bỏ gửi Telegram từ `auth.ts`** (tin 1) — chỉ giữ lại cảnh báo từ API `report-failed-login` (tin 2) vì đã xác định được user cụ thể
- `sendLoginNotification` (login thành công) gửi về `FAILED_LOGIN` thay vì `LESSON`
- Tạo type `CHANGE` cho các thay đổi của học viên (reset password, đổi password, cập nhật profile)
- Chuyển OTP verify + bulk-enroll từ `ACTIVATE` → `REGISTER`

### Các file đã sửa

#### `lib/notifications.ts`
- **Sửa**: `sendLoginNotification` gửi `FAILED_LOGIN` thay `LESSON`
- **Thêm**: type `CHANGE` vào union type + mapping env `TELEGRAM_CHAT_ID_CHANGE`
- **Sửa**: `sendPasswordChangedNotification` gửi `CHANGE` thay `LESSON`

#### `auth.ts`
- **Xóa**: Block gửi Telegram cảnh báo đăng nhập thất bại (tin 1) — chỉ giữ `throw CustomLoginError`

#### `app/api/auth/report-failed-login/route.ts`
- Không đổi — vẫn là nguồn duy nhất gửi cảnh báo login fail (tin 2)

#### `app/api/auth/verify-otp/route.ts`
- `ACTIVATE` → `REGISTER`

#### `app/api/auth/reset-password/route.ts`
- `LESSON` → `CHANGE`

#### `app/actions/bulk-enroll-actions.ts`
- `ACTIVATE` → `REGISTER`

#### `app/actions/account-actions.ts`
- Thêm gửi Telegram `CHANGE` khi học viên cập nhật profile (tên, SĐT, ảnh)

#### `.env` & `.env.local`
- Thêm `TELEGRAM_CHAT_ID_CHANGE=-1004458102417`

### Trạng thái
- ✅ `npx tsc --noEmit` — 0 lỗi biên dịch
- ✅ Chỉ 1 tin Telegram cho mỗi lần login fail (từ API `report-failed-login`)
- ✅ Login thành công → gửi về `FAILED_LOGIN` (để support biết học viên đã vào được)
- ✅ 3 nhóm Telegram: `FAILED_LOGIN`, `REGISTER`, `CHANGE` — mỗi nhóm 1 chat ID riêng
- ⏳ Chờ deploy Vercel kèm env mới

---

## ✅ [2026-07-08] Debug Level Check Bug + Rebuild BRK System 4 hoàn chỉnh

### Mục tiêu
Debug lỗi `BrkLevelUpRecord` chỉ có 11 records (từ 2/7-4/7) sau rebuild, thiếu 7 records cho các ngày 5/7-8/7. Kết luận: **không có bug level check** — lần chạy trước bị gián đoạn/timeout.

### Phát hiện
- Level check trong `executeMethodB()` hoạt động chính xác: multi-pass `while(hasLevelUp)` loop xử lý promotions cascade (Lv1→Lv2→Lv3)
- Debug log `[LVL]` xác nhận level-up chạy trên tất cả các ngày: 2/7 (6 records), 3/7 (1), 4/7 (4), 7/7 (5), 8/7 (1)
- Script timeout 5 phút do Prisma connection pool không release — fix bằng `process.exit(0)` + timeout 10 phút
- Lần chạy thành công: ~5 phút 40 giây, 17 level-up records (đúng với 14 member có level>1)

### Kết quả rebuild (56 members)
```
System records: 56 | BrkLevelUpRecord: 17 | Revenue pools: 2 (26 awards)
Level: Lv1=42, Lv2=11, Lv3=3
Root: #3773 Coach Nguyễn Biên Cương (Lv3, 952pts)
  ├─ #1010 BÙI THỊ PHƯƠNG ANH (Lv3, 578pts)
  ├─ #1035 ĐẶNG THỊ HIỀN (Lv2, 187pts)
  ├─ #1057 Vũ Thị Thao (Lv2, 85pts)
  └─ #1061 Nguyễn Huyền (Lv2, 85pts)

Placement verified:
  ✅ #834, #837 dưới #478 (enrollment.referrerId)
  ✅ #703 dưới #1079 (cascade)
  ✅ #878, #1093 dưới #976 (BFS fallback do referrer null)
  ✅ Closure tree: 224 records, all 56 reachable
```

### Các file đã sửa
#### `lib/brk/rebuild-service.ts`
- **Vấn đề**: Script timeout sau 5 phút do Prisma không release connection
- **Fix**: Xóa debug console.log; không thay đổi logic (level check đã chạy đúng)
- **Tạm thời**: `scripts/_run_rebuild_debug.ts` đã xóa

#### `PLAN.md`
- Ghi nhận kết luận debug level check

### Trạng thái
- ✅ 17 level-up records chính xác (so với 11 records bug run trước)
- ✅ Commission: 72 transactions, 178,941 VND
- ✅ Revenue share: 2 kỳ (pool 1: 10 qualified × 1,881 VND; pool 2: 16 × 571 VND)
- ✅ Level gifts: 17 voucher transactions = 8,404,000 VND
- ✅ Tất cả 56 wallets có balance đúng
- ✅ `npx tsc --noEmit` — cần chạy xác nhận

---

## ✅ [2026-07-08] 24h Cooling-off + 06:08 AM Evaluation Time cho BRK Method B

### Mục tiêu
Triển khai cơ chế cooling-off 24h cho Method B: từ `payment.transferTime` (thời gian chuyển khoản thực tế từ email Sacombank), member có 24h để hủy. Sau 24h, phí được "confirmed" mới dùng để trả hoa hồng, cộng điểm, tính revenue share. Tất cả xử lý tại mốc 06:08 AM Vietnam (UTC+7) mỗi ngày.

### Kiến trúc mới

```
executeMethodB():
  1. Enrollment → tạo System record + Closure table (KHÔNG commissions/points)
  2. Vòng lặp ngày với pending queue carryover:
     - getEvalTime(year, month, day) = Date.UTC(year, month, day-1, 23, 8, 0) = 06:08 AM VN
     - processConfirmations(): kiểm tra members có gracePeriodEnd < evalTime
       → credit commissions (CASH + BRKD) + points (BRKP) + return fee (21%)
     - Level-up checks (dùng confirmed points)
     - Revenue share mỗi 3 ngày (chỉ confirmed members)
  3. Sau loop: xử lý pending còn lại
```

### Các file đã sửa

#### `lib/brk/rebuild-service.ts`
- **Vấn đề**: Commissions/points được trả ngay khi tạo system record, không tôn trọng cooling-off 24h. Timestamp transaction bị gộp vào thời điểm rebuild (now) thay vì rải theo ngày thực tế.
- **Fix**:
  - Thêm `getEvalTime()` helper: `Date.UTC(year, month, day-1, 23, 8, 0)` = 06:08 AM Vietnam
  - Thêm `PendingMember` interface và `processConfirmations()`: defer tất cả commissions/points/return fee
  - Thêm pending queue với day-to-day carryover
  - Restructure `executeMethodB()`: enrollment chỉ tạo system+closure, commissions deferred
  - Sửa tất cả 10 call sites: dùng eval time thay vì `createdAt` (now)
  - `cleanup()`: xóa closures bằng `ancestorId`/`descendantId` thay vì `systemId` (fix FK constraint)
- **`distributeRevenueSharePeriod()`**: thêm `gracePeriodEnd: { lt: distDate }`, đổi `lte` → `lt`, `distDate` khai báo trước `newActivations` query

### Kết quả rebuild
```
56 members, 17 level-ups, 317 transactions across 7 days
Timestamp đúng 06:08 AM Vietnam mỗi ngày (không bị gộp vào now)
```

### Temp scripts đã xóa
- `scripts/_debug_cleanup.ts`, `_debug_cleanup2.ts`, `_debug_cleanup3.ts`, `_debug_rebuild.ts`, `_debug_fk.ts`
- `scripts/_verify_rebuild.ts`, `_verify_rebuild2.ts`
- `scripts/_run_rebuild.ts`, `_run_rebuild2.ts`
- `scripts/_check_timestamps.ts`, `_check_rebuild.ts`

### Trạng thái
- ✅ 24h cooling-off: commissions/points/return fee deferred đến khi gracePeriodEnd qua
- ✅ 06:08 AM evaluation: tất cả transactions timestamped đúng
- ✅ Pending queue carryover: members chưa đủ 24h được kiểm tra lại ngày hôm sau
- ✅ Revenue share filter: chỉ đếm members có `gracePeriodEnd < distributedAt`
- ✅ `cleanup()` không còn lỗi FK constraint
- ✅ `npx tsc --noEmit` — 0 lỗi

