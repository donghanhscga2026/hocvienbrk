# Báo cáo đánh giá hiệu năng toàn diện — BRK Academy / Cộng đồng MBC

> **Ngày:** 2026-08-09 · **Phạm vi:** toàn bộ codebase Next.js 16 + Prisma + PostgreSQL (Supabase) tại thời điểm sau commit `e303996`.
> **Phương pháp:** audit thủ công có kiểm chứng (đọc trực tiếp file:dòng, không suy đoán), chia 3 hướng độc lập: (1) Backend/Database, (2) Frontend/Bundle/Render, (3) Caching/Middleware/Data-fetching. Các phát hiện trọng yếu đã được kiểm tra chéo lại bằng grep/read trực tiếp trước khi đưa vào báo cáo.
> **Không trùng lặp với việc đã làm:** không liệt kê lại các mục đã tối ưu ở Giai đoạn 1 (cache site-theme/profile/roadmap-points, dynamic-import AccountAssistantModal/MbwDashboardPopup/PaymentModal/DiagramSection/RoadmapEditor, next/font, VideoPlayer lazy YouTube, `Promise.all` batch commission, `createMany` import bài học, `groupBy` đếm email ảo) và Giai đoạn 2 (Supabase Storage, connection pooler, ghim region `sin1`).

---

## 1. Tóm tắt điều hành

Hai giai đoạn tối ưu trước đã xử lý đúng các điểm nghẽn "dễ thấy" (bundle lớn do thư viện nặng tải ngay từ đầu, hạ tầng kết nối DB, vị trí server). Đợt audit này đào sâu hơn và phát hiện **3 nhóm vấn đề còn tồn đọng, mức độ nghiêm trọng tương đương hoặc cao hơn những gì đã sửa**:

1. **Trang công khai (homepage, trang bán khoá học, landing quảng cáo) đang render động hoàn toàn trên mọi request**, kèm theo ít nhất 2 điểm dữ liệu (danh sách khoá học của homepage, roadmap points trên trang CMS) **quên áp dụng cache** dù cơ chế cache đã có sẵn từ Giai đoạn 1. Đây là trang có traffic cao nhất và trực tiếp ảnh hưởng tới quảng cáo trả phí (Core Web Vitals ảnh hưởng Quality Score).
2. **Middleware (`proxy.ts`) giải mã JWT session trên MỌI request** (kể cả khách vãng lai xem trang công khai) dù chỉ 3 nhóm route admin thực sự cần biết ai đang đăng nhập — tốn thời gian xử lý không cần thiết trên đường dẫn nóng nhất.
3. **Nhiều trang quản trị (admin) tải toàn bộ bảng dữ liệu không giới hạn (`findMany` không `take`)** — hiện chưa gây vấn đề rõ rệt vì dữ liệu còn ít, nhưng sẽ **suy giảm hiệu năng tuyến tính theo thời gian** khi số lượng thanh toán/user tăng lên (trang Payments, trang quản lý user gửi email là 2 ví dụ rõ nhất).

Không có mục nào trong báo cáo này **cần sửa gấp trong hôm nay** — khác với lỗ hổng bảo mật RLS đã nêu ở Giai đoạn 4, đây thuần là vấn đề hiệu năng, mức độ ảnh hưởng tăng dần theo thời gian/lượng dữ liệu, có thể lên kế hoạch làm dần.

---

## 2. Backend / Database

### 2.1 Trang admin tải toàn bảng không giới hạn (`findMany` thiếu `take`)

| File:dòng | Hàm | Vấn đề |
|---|---|---|
| `app/actions/payment-actions.ts:319-360` | `getAllPayments()` | Tải **toàn bộ** bảng `Payment`, kèm `include` 3 tầng quan hệ, không giới hạn. Trang `/tools/payments` render mỗi dòng thành 1 card DOM đầy đủ (ảnh, badge, nút) — không phân trang, không lazy-load. |
| `app/api/admin/email-verifier/users/route.ts:15-20` | route GET | Tải toàn bộ bảng `User`, không `take`, lọc/tìm kiếm bằng JS `.filter()` phía client trên mỗi lần gõ phím (`EmailVerifierTab.tsx:104`). |
| `app/actions/system-actions.ts:387-398` | `getLeaderboardAction()` | Tải toàn bộ member của 1 cây MLM (`System`), không `take` — chạy trên dashboard genealogy, người dùng thường xem, không chỉ admin. |
| `app/actions/admin-actions.ts:853-869` | `getSystemMemberListAction()` | Tương tự, phục vụ modal "danh sách thành viên" trong `DashboardTab.tsx`. |

**Nguyên nhân:** các hàm này được viết khi dữ liệu còn ít, chưa tính trước kịch bản hàng nghìn bản ghi.
**Giải pháp:**
- Thêm phân trang cursor-based (`cursor`/`take`) cho `getAllPayments`, mặc định 30-50 dòng/trang, kèm UI phân trang hoặc "tải thêm".
- Với danh sách user để gửi email (`email-verifier`): chuyển tìm kiếm/lọc sang query DB (`where: { OR: [...] }` + `take`) thay vì tải hết rồi lọc JS.
- Với leaderboard/member-list MLM: đây là dữ liệu cây, không hợp phân trang kiểu offset — nên giới hạn hiển thị top N (ví dụ 100) mặc định + nút "xem thêm", hoặc ảo hoá danh sách (xem mục 3.4).

### 2.2 N+1 query trên đường dẫn nóng (signup/activate khoá học)

- **`lib/brk/commission-calculator.ts:81-86`**, được gọi từ **`lib/brk/activation-service.ts:203` và `:469`** (luồng activate MLM khi mua khoá học) — vòng lặp `for (const closure of ancestors)` gọi `getLevelConfig()` (kèm `include` `branchReqs`) **từng dòng một**, vì `levelConfigs` không được truyền sẵn từ 2 nơi gọi này (chỉ có `daily-eval-service.ts` cache sẵn). Đây là đường dẫn chạy **mỗi khi có người kích hoạt gói MLM** — càng nhiều tầng upline, càng nhiều query tuần tự.
- **`lib/brk/wallet-service.ts:391-408` và `:410-424`** — `getSystemSnapshotAt()` và `makeSystemSnapshotDescription()` cùng fetch lại **y hệt** `system` + `wallet`, tổng cộng 4 query cho 2 dữ liệu — đây là helper bị gọi ở **mọi** sự kiện cộng hoa hồng/lên cấp/kích hoạt/chia doanh thu trong toàn hệ MLM, tức là hàm được gọi nhiều nhất trong toàn bộ engine.
- **`lib/brk/activation-service.ts:35-43`** — `activateBrkMember()`: 3 query độc lập (`systemTree`, `planApplication`, `user`) chạy tuần tự thay vì `Promise.all`, trên đường dẫn mua khoá học.
- **`app/api/cron/brk-level-check/route.ts:16-28`** — quét toàn bộ `System` đang `ACTIVE` (không `take`), rồi lặp gọi `checkAndPromoteLevel` không có `levelConfigs` cache → lặp lại vấn đề N+1 ở trên cho từng thành viên.

**Nguyên nhân:** logic MLM được viết tăng dần qua nhiều tính năng (level-up, revenue-share, dongchia...), mỗi tính năng thêm code riêng, chưa có 1 lớp cache dùng chung xuyên suốt.
**Giải pháp:**
- Truyền `levelConfigs` đã cache (theo `onSystem`) vào MỌI lời gọi `getLevelConfig`/`checkAndPromoteLevel`, không chỉ ở `daily-eval-service.ts` — tách thành 1 hàm `preloadLevelConfigs(onSystem)` gọi 1 lần ở đầu mỗi route/cron, truyền xuống toàn bộ chuỗi gọi.
- Gộp `getSystemSnapshotAt` vào bên trong `makeSystemSnapshotDescription` (hoặc ngược lại) để chỉ fetch 1 lần, truyền kết quả xuống thay vì fetch lại.
- Đổi các cụm await tuần tự không phụ thuộc nhau sang `Promise.all` (rủi ro thấp, thay đổi cơ học, không đổi logic nghiệp vụ).

### 2.3 Tính tổng bằng JavaScript thay vì DB aggregate

- **`lib/brk/activation-service.ts:653-676`** — tải hết `relatedTxs` rồi cộng dồn bằng vòng lặp JS, thay vì `prisma.brkTransaction.groupBy({by:['balanceType'], _sum:{amount:true}})`. Chỉ chạy khi admin revert 1 activation (không phải đường nóng) — mức độ thấp, nhưng nên sửa cùng đợt với các groupBy khác cho nhất quán.

### 2.4 Trùng lặp logic tính "số F1 chia sẻ" ở 3 nơi khác nhau, không cache

`app/actions/admin-actions.ts:111-134`, `app/actions/system-actions.ts:340-378`, `app/actions/admin-actions.ts:871-876` — cả 3 đều tự `findMany` không lọc trên `Enrollment` (courseId=22) rồi tự dựng cây đệ quy bằng JS, mỗi lần tab genealogy được mở/tìm kiếm. Dữ liệu enrollment khoá học 22 không đổi nhiều trong ngày.

**Giải pháp:** gộp thành 1 hàm dùng chung `buildSharingCountMap()` trong 1 file lib, bọc `unstable_cache` (tag riêng, ví dụ `sharing-counts`, revalidate 300-600s, `revalidateTag` khi có enrollment mới vào khoá 22) — vừa xoá trùng lặp code vừa giảm tải DB.

---

## 3. Frontend / Bundle / Render

### 3.1 `react-day-picker` tải ngay cho MỌI học viên vào trang học, dù ít người cần

`components/course/CoursePlayer.tsx:15` import tĩnh `StartDateModal.tsx`, file này import tĩnh `react-day-picker` + CSS riêng (`StartDateModal.tsx:13-14`). Modal này chỉ hiện với học viên **chưa chọn ngày bắt đầu học** (`isOpen={!enrollment.startedAt}`, dòng 511) — tức là phần lớn học viên đã học rồi sẽ không bao giờ thấy modal này, nhưng vẫn tải bundle của nó mỗi lần vào trang học.

**Giải pháp:** `const StartDateModal = dynamic(() => import('./StartDateModal'), { ssr: false })` — đúng pattern đã áp dụng cho `AccountAssistantModal`/`PaymentModal` ở Giai đoạn 1, chỉ là bỏ sót component này.

### 3.2 Không có `loading.tsx` ở BẤT KỲ route nào trong toàn dự án

Xác nhận: `find app -iname "loading.tsx"` → 0 kết quả. Nghĩa là mọi trang — kể cả trang bán khoá học (`app/khoa-hoc/[id]/page.tsx`, chạy `Promise.all` 8 query trước khi render) và trang học (`app/courses/[id]/learn/page.tsx`, 3 query tuần tự) — hiện **màn hình trắng hoàn toàn** trong lúc chờ server fetch xong, thay vì hiện khung xương (skeleton) ngay lập tức nhờ React Suspense streaming.

**Giải pháp:** đây là việc **rẻ nhất, tác động rộng nhất** trong toàn báo cáo — chỉ cần thêm 1 file `loading.tsx` (dùng lại 1-2 component skeleton dùng chung) cho mỗi nhóm route chính (`app/`, `app/khoa-hoc/[id]/`, `app/courses/[id]/learn/`, `app/tools/`) là cải thiện cảm nhận tốc độ (perceived performance) ngay lập tức trên toàn site, không đổi logic nghiệp vụ, rủi ro gần như bằng 0.

### 3.3 Ảnh hero/LCP thiếu `sizes`/`priority`

- `components/landing/CourseLandingTemplate.tsx:206-219` — ảnh hero của **trang landing quảng cáo** (nơi tiền quảng cáo đổ vào), dùng `fill` không kèm `sizes`, không `priority`.
- `components/course-page/sections/HeroSection.tsx:225-227` — ảnh hero trang bán khoá học, cùng vấn đề.

Đây chính là ảnh LCP (Largest Contentful Paint) của 2 trang quan trọng nhất về mặt chuyển đổi (conversion) — thiếu `priority` khiến Next.js lazy-load thay vì tải ngay, thiếu `sizes` khiến trình duyệt tải ảnh full-width kể cả trên di động.

**Giải pháp:** thêm `priority` cho đúng 1 ảnh hero trên mỗi trang (không lạm dụng priority cho nhiều ảnh), thêm `sizes="100vw"` hoặc chính xác hơn theo breakpoint thực tế.

### 3.4 Danh sách lớn không phân trang/ảo hoá (liên quan mục 2.1)

`app/tools/payments/page.tsx`, `EmailVerifierTab.tsx`, modal danh sách thành viên trong `DashboardTab.tsx` — render trực tiếp toàn bộ mảng ra DOM. Khi kết hợp với việc backend cũng không giới hạn (mục 2.1), đây là **rủi ro kép**: vừa chậm ở tầng query, vừa chậm ở tầng render/scroll khi số dòng lớn.

**Giải pháp:** ưu tiên sửa tầng backend trước (phân trang thật, giảm dữ liệu trả về) — khi đó tầng frontend tự động nhẹ theo, không cần thêm thư viện ảo hoá (react-window) trừ khi 1 màn hình thực sự cần hiển thị hàng nghìn dòng cùng lúc (ví dụ modal thành viên MLM của 1 nhánh cực lớn).

### 3.5 `'use client'` không cần thiết ở vài trang admin

`app/tools/settings/page.tsx` (toàn bộ là JSX tĩnh, không hook/state) và `app/tools/page.tsx` (dùng `useSession()` + fetch client thay vì đọc session server-side) đang là Client Component không cần thiết. Mức độ thấp (trang admin, ít traffic hơn trang công khai) nhưng dễ sửa — bỏ `'use client'` ở file đầu, và với `app/tools/page.tsx` nên đọc `auth()` + query trực tiếp trên server thay vì round-trip `useSession()` + `fetch('/api/tools')`.

---

## 4. Caching / Middleware / Chiến lược render

### 4.1 `proxy.ts` giải mã session trên MỌI request công khai

`proxy.ts:37` bọc toàn bộ handler trong `auth(async function proxy(request) {...})` — nghĩa là **mọi request khớp `matcher`** (gần như toàn bộ trang, trừ file tĩnh ảnh/font) đều chạy qua NextAuth để giải mã JWT, dù `request.auth` chỉ thực sự được đọc ở dòng 44-49 cho 3 tiền tố route admin (`/api/admin`, `/api/sync-tca`, `/api/system-tree`). Khách vãng lai xem trang chủ/trang bán khoá học vẫn phải trả chi phí giải mã session dù không cần.

**Giải pháp:** tách logic thành 2 lớp — chỉ bọc `auth()` cho các route thực sự cần kiểm tra quyền (dùng `matcher` riêng hoặc kiểm tra `pathname` trước rồi mới gọi `auth()` có điều kiện bên trong), phần xử lý affiliate-cookie/routing chung không cần session vẫn chạy bình thường không qua `auth()`.

### 4.2 Trang công khai traffic cao nhất render động 100%, thiếu cache ở 2 điểm cụ thể

- `app/page.tsx`, `app/khoa-hoc/[id]/page.tsx`, `app/page/[slug]/page.tsx` đều gọi `auth()` trực tiếp trong page — đây là Dynamic API của Next.js, tự động buộc toàn trang render động mỗi request (không phải lỗi sai, vì cần biết user đã đăng nhập để đổi UI, nhưng cần tách phần cần session ra khỏi phần không cần).
- **`app/actions/site-profile-actions.ts:181` (`getCoursesForProfile`), `:234` (`getSurveyForProfile`), `:263` (`getPostsForProfile`)** — 3 hàm này chạy trên **trang chủ, mỗi lượt truy cập**, nhưng **không được bọc `unstable_cache`** như hàm `getDefaultProfile` cùng file (dòng 127) đã làm ở Giai đoạn 1. Đây gần như chắc chắn là **bỏ sót**, không phải cố ý — 3 hàm anh em cùng phục vụ 1 trang, 1 hàm được cache còn 3 hàm kia thì không.
- **`app/page/[slug]/page.tsx:166-168`** — gọi thẳng `prisma.roadmapPoint.findMany(...)`, bỏ qua hàm `getRoadmapPoints()` đã cache sẵn đang dùng ở `app/page.tsx:47-51`. Cùng dữ liệu, 1 nơi cache 1 nơi không.

**Giải pháp:** bọc `getCoursesForProfile`/`getSurveyForProfile`/`getPostsForProfile` bằng `unstable_cache` giống `getDefaultProfile` (cùng tag `site-profile` hoặc tag riêng), sửa `app/page/[slug]/page.tsx` gọi lại `getRoadmapPoints()` thay vì query thẳng. Đây là 2 chỗ **sửa nhanh, rủi ro thấp nhất** trong toàn báo cáo vì cơ chế cache đã có sẵn, chỉ là áp dụng thiếu sót.

### 4.3 `auth()` bị gọi lặp trong cùng 1 request

`app/layout.tsx:79` gọi `auth()`, sau đó **mỗi page bên trong lại gọi `auth()` lần nữa** (`app/page.tsx:54`, `app/khoa-hoc/[id]/page.tsx:80`, `app/page/[slug]/page.tsx:52`, `app/courses/[id]/learn/page.tsx:41`) — do NextAuth v5 `auth()` cho RSC không tự động memoize theo request. Mỗi request tối thiểu giải mã JWT 2 lần (layout + page).

**Giải pháp:** bọc `auth()` bằng React `cache()` (từ `react`, không phải Next cache) trong 1 file dùng chung (ví dụ `lib/get-session.ts`), import thay cho `auth()` trực tiếp ở mọi nơi — `cache()` tự động dedupe trong phạm vi 1 request, không cần đổi logic gì khác.

### 4.4 Sót `revalidateTag` sau khi sửa thành viên site-profile

`app/actions/site-profile-actions.ts:417-447` (`addProfileMember`) và `:452-478` (`removeProfileMember`) chỉ gọi `revalidatePath` cho vài trang cụ thể, **không gọi `revalidateTag('site-profile')`** — trong khi `getDefaultProfile()` (cache theo tag này) chính là dữ liệu hiển thị ở trang chủ. Kết quả: admin thêm/xoá thành viên team, trang chủ vẫn hiện dữ liệu cũ tới khi cache tự hết hạn (600s).

**Giải pháp:** thêm `revalidateTag('site-profile')` vào cả 2 hàm, giống cách `updateSiteProfile` (dòng 385-388) đã làm đúng.

---

## 5. Lộ trình đề xuất (ưu tiên theo tỷ lệ tác động / công sức)

| # | Việc | Tác động | Công sức | Rủi ro sửa |
|---|---|---|---|---|
| 1 | Thêm `loading.tsx` cho các route chính (mục 3.2) | Rất cao (cảm nhận tốc độ toàn site) | Thấp | Rất thấp |
| 2 | Cache `getCoursesForProfile`/`getSurveyForProfile`/`getPostsForProfile` + sửa `roadmapPoint` ở CMS page (mục 4.2) | Cao (trang traffic cao nhất) | Thấp | Thấp |
| 3 | Thêm `revalidateTag('site-profile')` còn thiếu (mục 4.4) | Trung bình (đúng tính đúng dữ liệu, không phải tốc độ) | Rất thấp | Rất thấp |
| 4 | Dynamic-import `StartDateModal` (mục 3.1) | Trung bình-cao (mọi học viên vào học) | Rất thấp | Rất thấp |
| 5 | Thêm `sizes`/`priority` cho ảnh hero landing + trang bán khoá (mục 3.3) | Cao (Core Web Vitals trang quảng cáo) | Rất thấp | Rất thấp |
| 6 | Bọc `auth()` bằng `cache()` dùng chung (mục 4.3) | Trung bình | Thấp | Thấp |
| 7 | Tách `proxy.ts` để không giải mã session khi không cần (mục 4.1) | Trung bình-cao (mọi request công khai) | Trung bình | Trung bình (đụng middleware, cần test kỹ luồng affiliate-cookie đang gắn chung file) |
| 8 | Phân trang `getAllPayments`/danh sách user gửi email (mục 2.1) | Thấp hiện tại, **tăng dần theo thời gian** | Trung bình | Thấp (chỉ admin dùng) |
| 9 | Gộp cache `levelConfigs` xuyên suốt luồng activate/level-check (mục 2.2) | Trung bình-cao (luồng mua khoá học, MLM) | Trung bình-cao | Trung bình (đụng logic tài chính MLM, cần test kỹ) |
| 10 | Gộp `getSystemSnapshotAt`/`makeSystemSnapshotDescription` (mục 2.2) | Trung bình (hàm gọi nhiều nhất hệ MLM) | Thấp-trung bình | Trung bình (hàm lõi, cần test hồi quy) |
| 11 | Gộp cache logic "F1 chia sẻ" (mục 2.4) | Trung bình | Trung bình | Thấp |
| 12 | `groupBy` thay vòng lặp JS ở revert activation (mục 2.3) | Thấp | Thấp | Thấp |

**Gợi ý thứ tự làm:** mục 1-6 có thể gộp thành 1 đợt "quick win" (tất cả rủi ro thấp, không đụng logic tài chính, tác động lớn tới trải nghiệm người dùng công khai) — làm trước, test qua `tsc`/`build`/xem trực tiếp trên browser rồi deploy. Mục 7-8 làm đợt 2 (cần test kỹ hơn nhưng vẫn không đụng dữ liệu tài chính). Mục 9-12 nên gộp cùng lúc với Giai đoạn 4 (schema/DB) vì cùng đụng vào lõi tính toán MLM — nên lên kế hoạch dry-run + test hồi quy kỹ trước khi làm, không vội.

---

## 6. Những gì KHÔNG có trong báo cáo này (đã kiểm tra, không phải lỗi)

Để tránh hiểu nhầm khi đọc lại sau này — các mục sau đã được kiểm tra và xác nhận **đang làm đúng**, không cần sửa:
- `app/land/[slug]/page.tsx` — đã dùng `cache()` dedupe đúng, `revalidatePath` đầy đủ khi sửa landing page.
- `getDefaultProfile()` — đã cache đúng bằng `unstable_cache` + tag.
- `updateSiteProfile()` — đã `revalidateTag` đầy đủ (khác với 2 hàm bị sót ở mục 4.4).
- `VideoPlayer.tsx` dùng `<img>` thường (không phải `next/image`) — có `eslint-disable` kèm chú thích, là quyết định có chủ đích từ trước, không phải sót.
- `daily-eval-service.ts` — đã cache `levelConfigs` đúng cách (khác với `activation-service.ts`/`brk-level-check` chưa áp dụng, nêu ở mục 2.2).
