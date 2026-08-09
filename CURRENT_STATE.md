# CURRENT_STATE.md — Trạng thái công việc (snapshot)

> **Đọc file này CÙNG với `AGENTS.md` trước khi làm bất cứ việc gì.** File này là bản chụp nhanh (snapshot) của một chuỗi công việc bảo mật + hiệu năng đang thực hiện trên dự án **BRK Academy / Cộng đồng MBC**. Mục tiêu: một phiên Codex/AI mới đọc xong file này là biết chính xác: đã sửa gì, sửa ở đâu, vì sao sửa như vậy, cái gì còn dang dở, và phải kiểm tra gì trước khi đụng tiếp vào code.
>
> **Cập nhật lần cuối:** sau commit `fa6a5d6` (branch `master`, đã push lên GitHub). Trạng thái git lúc ghi file này: sạch (không có thay đổi chưa commit).

---

## 1. Bối cảnh & mục tiêu

Chuỗi công việc này bắt đầu từ việc mở PR đầu tiên cho repo, sau đó mở rộng thành:

1. **Audit + vá lỗ hổng bảo mật toàn diện** (xác thực/phân quyền, secrets, rate limit).
2. **Xử lý sự cố dữ liệu thực tế** phát sinh trong lúc làm (double-credit MBV cho 1 user).
3. **Debug 2 sự cố production** (webhook Gmail 401, rate limit chặn nhầm request thật).
4. **Audit + tối ưu hiệu năng toàn diện** (frontend loading + backend/database + hạ tầng), chia làm 4 giai đoạn theo mức độ rủi ro — **đã xong Giai đoạn 1 và 2**, còn Giai đoạn 3 và 4 (schema/database) **chưa làm**.

Toàn bộ các thay đổi đều tuân theo nguyên tắc trong `AGENTS.md`: đọc trước khi sửa, `npx tsc --noEmit` phải sạch trước khi báo hoàn thành, dry-run trước khi ghi dữ liệu thật, không sửa file bằng shell command (dùng tool `edit`/`write`), không tự ý xoá backup.

---

## 2. Kiến trúc hệ thống hiện tại (sau các thay đổi)

- **Framework:** Next.js 16 (App Router, Turbopack), TypeScript strict mode.
- **Database:** PostgreSQL qua Prisma ORM, host trên Supabase (project ref `osqcudipywyfvvutbctb`, vùng `ap-northeast-2` Seoul).
  - `DATABASE_URL` (dùng bởi Prisma Client lúc runtime): **đã đổi sang Supabase connection pooler, transaction mode, cổng `6543`, có `pgbouncer=true&connection_limit=1`**. Trước đây nối thẳng (`db.osqcudipywyfvvutbctb.supabase.co:5432`).
  - `DIRECT_URL` (dùng bởi `prisma migrate`/`db push`, khai báo `directUrl` trong `prisma/schema.prisma`): **giữ nguyên**, vẫn là kết nối trực tiếp cổng `5432`.
  - Đã cập nhật ở **cả `.env` local và Vercel Production** (qua `vercel env update DATABASE_URL production`).
- **File storage:** Supabase Storage, bucket `uploads`, cấu trúc thư mục con:
  - `avatars/` — ảnh đại diện user
  - `courses/` — ảnh bìa khoá học
  - `payments/` — ảnh minh chứng chuyển khoản (mới thêm)
  - `backups/db_{timestamp}/` — backup JSON (mới thêm, xem mục 4.5)
  - Local disk (`public/uploads/...`) chỉ còn là **fallback khi chạy local/VPS**, không hoạt động trên Vercel (filesystem chỉ đọc lúc runtime) — xem `lib/image-utils.ts`.
- **Deploy:** Vercel, project `hocvienbrk`, domain production `https://giautoandien.io.vn`. **Đã ghim vùng `sin1` (Singapore)** qua `vercel.json` (trước đây không ghim, dùng vùng mặc định).
- **Middleware:** Next.js 16 dùng `proxy.ts` (không phải `middleware.ts` — 2 file không được tồn tại cùng lúc, sẽ lỗi build). `proxy.ts` chặn mặc định các prefix `/api/admin`, `/api/sync-tca`, `/api/system-tree` nếu không phải role `ADMIN` (lớp phòng thủ thứ 2, ngoài check trong từng route).
- **Auth:** NextAuth v5, JWT session. Có rate-limit in-memory (per-instance, xem cảnh báo ở mục 6).
- **Thương hiệu:** Đang trong quá trình đổi tên hiển thị từ "Học Viện BRK" sang **"Cộng đồng MBC"** (xem mục 7 — thay đổi này KHÔNG do phiên làm việc này thực hiện).

---

## 3. Đã hoàn thành — Bảo mật

Toàn bộ nằm trong các commit: `4190fc8`, `c81465d`, `6609321`, `5e485df`, `506b6b9`, `d9f052d`, `3dd932c`, `a3aef52`, `b1a7a9f` (branch `master`).

### 3.1 Helper dùng chung mới
- **`lib/api-auth.ts`** (mới): `requireAdmin()` (dùng trong Route Handler, trả `NextResponse` 403 nếu không phải ADMIN), `requireAuth()` (401 nếu chưa đăng nhập), `requireAdminAction()` (biến thể cho Server Action, trả `{success:false, error}` thay vì `NextResponse`).
- **`lib/rate-limit.ts`** (mới): `checkRateLimit(key, {max, windowMs})`, `getClientIp(req)`. **In-memory, per-instance** — xem cảnh báo mục 6.

### 3.2 Route/Action đã thêm auth còn thiếu (broken access control)
Danh sách đầy đủ các file hiện đang `import` từ `lib/api-auth.ts`:
```
app/actions/affiliate-actions.ts       — approvePayout/rejectPayout: admin-only
app/actions/course-page-actions.ts     — create/update/save/delete CoursePage: admin-only
app/actions/landing-actions.ts         — create/update/delete/toggle LandingPage: admin-only
app/actions/roadmap-actions.ts         — create/save/activate/delete Survey: admin-only
app/actions/site-profile-actions.ts    — createSiteProfile: admin-only;
                                          updateSiteProfile/addProfileMember/removeProfileMember:
                                          chủ sở hữu HOẶC admin (không phải admin-only tuyệt đối,
                                          vì trang /tools/my-site/edit cho phép chủ profile tự sửa)
app/api/admin/theme/route.ts           — POST (đổi theme): admin-only (trước chỉ check đã login)
app/api/admin/users/list/route.ts      — trước đây KHÔNG có auth nào, lộ PII toàn bộ user
app/api/admin/youtube/fetch-videos/route.ts — admin-only
app/api/sync-tca/*.ts (9 file: route, clear-test, demo-preview, precheck,
                        preview, promote, rollback, show-data, staging-sync)
                                        — trước đây hầu hết KHÔNG có auth, có thể
                                          xoá/ghi đè dữ liệu thật (rollback, promote,
                                          clear-test), CORS mở '*'.
                                          (delete-by-user/route.ts đã đúng từ trước, không đổi)
app/api/system-tree/*.ts (3 file: route, add-child, delete-node)
                                        — trước đây KHÔNG có auth, ai cũng sửa được cây MLM
app/api/upload/course/route.ts         — thêm requireAuth (trước không check ai cả)
app/api/upload/payment/route.ts        — thêm requireAuth
app/api/upload/url/route.ts            — thêm requireAuth + chặn SSRF (xem 3.4)
```
- **`app/api/courses/[id]/route.ts` PUT**: đã có check quyền chủ sở hữu từ trước; thêm chặn phòng thủ `delete body.id/createdAt/updatedAt` trước khi spread vào Prisma update (mass-assignment nhẹ).
- **`middleware.ts`/`proxy.ts`**: xem mục 2. Next.js 16 không cho 2 file `middleware.ts` và `proxy.ts` tồn tại song song → phải gộp logic vào `proxy.ts` có sẵn (đã có logic set cookie affiliate ref).

### 3.3 Bí mật / secret
- **`lib/request-auth.ts`**: xoá đoạn code coi header `x-goog-*`/User-Agent chứa "google" là bằng chứng xác thực hợp lệ cho webhook (dễ giả mạo — ai cũng gửi được request POST thường với header đó). Giờ **bắt buộc phải có secret khớp** (`CRON_SECRET`) qua Bearer header, header riêng, hoặc query string `?secret=`. Có thêm field `debug` trả về độ dài chuỗi (không trả nội dung secret) để chẩn đoán khi 401 ngoài ý muốn.
- **`app/api/cron/process-commissions/route.ts`**: xoá fallback hardcode `'your-cron-secret-here'` khi thiếu `CRON_SECRET`.
- **`app/api/auth/change-password/route.ts`**: xoá việc ghi `newPassword` dạng plaintext vào `ActivityLog.metadata` (đã lộ mật khẩu thật trong DB qua log này).
- **Lịch sử git**: `User.csv`, `Course.csv`, `Enrollment.csv` (chứa mật khẩu plaintext thật) đã bị **xoá vĩnh viễn khỏi TOÀN BỘ lịch sử git** bằng `git-filter-repo`, force-push lại cho **6 branch** trên GitHub (`master`, `backup-before-import`, `chore/gitignore-debug-logs`, `feat/top-courses-upgrade`, `staging`, `wip/before-sync_20260729_142029`). `.gitignore` đã có `*.csv`.
  - ⚠️ **Mật khẩu trong 3 file CSV đó cần được coi là đã lộ vĩnh viễn** — nếu chưa đổi các mật khẩu liên quan (đặc biệt tài khoản admin), vẫn nên đổi.

### 3.4 Rate limiting (chống brute-force / spam / SSRF)
| File | Giới hạn |
|---|---|
| `auth.ts` (đăng nhập, hàm `authorize`) | 5 lần/15 phút theo identifier, 20 lần/15 phút theo IP |
| `app/api/auth/verify-otp/route.ts` | 8/15 phút theo email, 30/15 phút theo IP |
| `app/api/auth/verify-forgot-otp/route.ts` | như trên |
| `app/api/auth/forgot-password/route.ts` | 3/15 phút theo email, 10/giờ theo IP |
| `app/api/auth/check-user/route.ts` | 15/10 phút theo IP |
| `app/api/auth/change-password/route.ts` | 5/15 phút theo user |
| `app/api/user/[id]/route.ts` | **120/phút theo IP** (đã từng đặt 30/10 phút, gây 429 chặn nhầm request thật trên production — xem mục 3.5, đã nới lên) |
| `app/api/upload/url/route.ts` | không rate-limit, nhưng đã chặn SSRF: từ chối fetch tới `localhost`/`127.0.0.1`/dải IP nội bộ (`10.x`, `172.16-31.x`, `192.168.x`)/`169.254.169.254` (cloud metadata) |
| `app/api/upload/course`, `upload/payment` | chọn phần mở rộng file theo MIME đã xác thực (không tin tên file client gửi) — chặn upload `.svg`/`.html` giả ảnh |

### 3.5 Sự cố production đã xử lý trong lúc làm bảo mật
- **429 chặn nhầm `/api/user/[id]`**: giới hạn ban đầu (30/10 phút/IP) quá chặt cho endpoint được gọi thường xuyên bởi `UserMenu`/`AccountAssistantModal` (mặc định `referrerId: '3773'` cho mọi khách chưa có mã giới thiệu). Đã nới lên 120/phút — đã xác nhận hết lỗi.
- **Gmail webhook 401 liên tục**: nguyên nhân do người dùng dán URL push subscription trên GCP Pub/Sub với **dấu `< >` literal bao quanh secret** (hiểu nhầm ký hiệu placeholder trong hướng dẫn). Đã thêm field `debug` (chỉ độ dài, không lộ secret thật) để tự chẩn đoán lần sau. **Việc sửa URL trên GCP Console là do user tự làm, không phải thay đổi trong repo.**

### 3.6 Dọn dẹp repo
- Xoá: `app/api/sync-tca/route.ts.new`, `route.ts.v6.old` (file nháp mồ côi), `lib/closure-helpers-test.ts`, `lib/system-closure-helpers-test.ts`, submodule "ma" `test-github-run/`, các file rác gốc (`fix_syntax.py`, `debug_auth.js`, `check_user0.*`, `scratch.py`, `test_*.js/ts`, `temp_*.sql`, `reset_course_seq.sql`, `matrix_output_new.csv`, `vercel_logs.json`, `nul`, `AGENTS 04.05.26.zip`...), 2 script sửa dữ liệu tài chính một-lần đã chạy xong (`scripts/fix-duplicate-return-fee*.js`), hàm `getAllSurveys()` trùng lặp trong `site-profile-actions.ts`.
- Sửa 8 lệnh trong `package.json` trỏ tới file không còn tồn tại trong `scripts/`.
- `.gitignore` bổ sung: `*.log`, `tsc_output.txt`, `next-dev-*.txt`, `*.csv`, `/public/uploads/`.

---

## 4. Đã hoàn thành — Sự cố dữ liệu (MBV double-credit)

**Vấn đề:** hàm `create2F1Voucher()` trong `lib/brk/level-manager.ts` đã bị gỡ khỏi luồng nghiệp vụ chính thức từ 2026-07-21 (commit `bb28147`), nhưng định nghĩa hàm vẫn còn trong file (dead code). Một script one-off nằm ngoài git (`plan_temp/move_1174_custom.ts`, không được track) vẫn `import` và gọi trực tiếp hàm này ở Phase 4b, khiến user **#1121** được cộng dư **386.000 MBV** (thưởng "giới thiệu 2F1") khi script này chạy `--execute` lúc di chuyển user #1174 sang nhánh khác.

**Đã xử lý:**
1. Xác nhận chính xác qua truy vấn DB trực tiếp (không phải tôi chạy script đó — bằng chứng: file không có trong git, thời điểm chạy không trùng với bất kỳ hành động nào của phiên làm việc).
2. Viết script dry-run → xác nhận số liệu → thực thi đảo ngược: trừ 386.000 MBV qua `debitMbvWallet()` (tạo transaction `ADJUSTMENT` đối ứng, **không xoá/sửa** transaction gốc `#62045` để giữ dấu vết kiểm toán), xoá timeline record sai, reset `BrkReferralBonus#278.claimed = false`.
3. **Xoá hẳn hàm `create2F1Voucher()` khỏi `lib/brk/level-manager.ts`** (commit `506b6b9`) và xoá lời gọi trong `plan_temp/move_1174_custom.ts` (file này nằm ngoài git, không có trong lịch sử commit) để không thể vô tình gọi lại.
4. **Chưa xử lý**: khoảng 10 file backup dạng `plan_temp/*.backup_2026*.ts` vẫn còn chứa bản sao cũ của hàm này trong nội dung file (theo quy ước "không tự xoá backup" của `AGENTS.md`). Nếu ai chạy trực tiếp 1 trong các file backup đó bằng `ts-node`/`tsx`, hàm vẫn hoạt động vì file tự chứa đủ code. **Cần hỏi user có muốn xoá các backup này không** (đã hỏi 1 lần, chưa có câu trả lời dứt khoát — xem mục 8).

---

## 5. Đã hoàn thành — Hiệu năng Giai đoạn 1 (Frontend/code-only)

Commit `d87cf57`. Không đụng hạ tầng, chỉ sửa code, rủi ro thấp.

| # | Thay đổi | File chính |
|---|---|---|
| B1 | Cache truy vấn site theme (`unstable_cache`, tag `site-theme`, revalidate 3600s) | `app/layout.tsx`, `revalidateTag` trong `app/api/admin/theme/route.ts` |
| C1 | Cache `getDefaultProfile()` (tag `site-profile`, revalidate 600s) và `roadmapPoint.findMany` (tag `roadmap-points`, revalidate 3600s) | `app/actions/site-profile-actions.ts`, `app/page.tsx`; `revalidateTag` trong `updateSiteProfile` |
| B2/B5 | `next/dynamic` cho `AccountAssistantModal`, `MbwDashboardPopup`, `PaymentModal` | `components/auth/AccountAssistantContext.tsx`, `components/layout/MainHeader.tsx`, `components/home/HomePageClient.tsx` |
| B6 | Tách `ReactFlowProvider + DiagramTab` thành `DiagramSection` (mới), dynamic-import — trang genealogy (tab mặc định "Dashboard") không tải `@xyflow/react` ngay | `components/genealogy/diagram/DiagramSection.tsx` (mới), `app/tools/genealogy/page.tsx` |
| B4 | Video bài học hiện ảnh đại diện + nút Play, chỉ tải YouTube IFrame API/tự phát mp4 sau khi bấm lần đầu (vẫn giữ nguyên logic resume/theo dõi tiến độ) | `components/course/VideoPlayer.tsx` (thêm state `hasStarted`, component `PlayOverlay`) |
| B3 | Font Google trang bán khoá học: `@import` CSS (chặn render) → `next/font/google` | `components/course-page/CourseThemeProvider.tsx` |
| B7 | Bỏ font Inter toàn site (chỉ dùng 1 chỗ ở `CourseCard.tsx`, đổi sang Be Vietnam Pro); Be Vietnam Pro bớt từ 9 xuống 6 weight (bỏ 100/200/300 không dùng) | `app/layout.tsx`, `components/course/CourseCard.tsx` |
| A3/C4 | `export const maxDuration` cho route chạy lâu: `300` cho `send-batch`, `lessons/import`, `process-commissions`; `120` cho `youtube/fetch-videos`, `sync-tca/preview` | 5 file trong `app/api/**` |
| A4/A5 | `AbortSignal.timeout()`: VietQR 10s, Brevo 15s | `lib/vietqr.ts`, `lib/brevo.ts` |
| C2 | Cache `resolveRecipients()` theo `campaignId` trong process (Map `recipientsCache`), tránh resolve lại từ đầu mỗi lần gửi 1 batch | `app/api/admin/campaigns/[id]/send-batch/route.ts` |
| C3 | Import bài học CSV/Sheet: từ tuần tự từng dòng → `createMany` (dòng mới) + `$transaction` (dòng cần update) | `app/api/courses/[id]/lessons/import/route.ts` |
| C5 | `detectFakeEmails()`: đếm bằng `groupBy` trong DB thay vì tải hết `SENT` log rồi đếm bằng JS | `lib/email-campaign-runner.ts` |
| C6 | Bỏ query `AffiliateCampaign` trùng lặp (`getOrCreateLink` nhận `campaignId` thay vì tự query lại) | `app/api/affiliate/dashboard/route.ts` |

**Chưa làm (cố ý bỏ qua trong Giai đoạn 1):** `app/tools/roadmap/page.tsx` — cả trang là 1 component ~500 dòng dùng `useNodesState`/`useEdgesState` từ `@xyflow/react` ở top-level không điều kiện (kể cả khi đang ở view "LIST", chưa vào chế độ vẽ sơ đồ). Tách an toàn cần refactor thành 2 component (List nhẹ + Editor dynamic-import) và test kỹ vì đây là công cụ kéo-thả phức tạp (survey builder) — **để lại cho phiên riêng có kế hoạch kỹ hơn**, không sửa vội.

---

## 6. Đã hoàn thành — Hiệu năng Giai đoạn 2 (Hạ tầng)

Commit `fa6a5d6`. **Rủi ro cao hơn** vì đụng vào biến môi trường production và luồng upload/backup.

| # | Thay đổi | Chi tiết |
|---|---|---|
| A1 | Upload ảnh khoá học/thanh toán: ghi ổ đĩa cục bộ (lỗi trên Vercel — filesystem chỉ đọc) → **Supabase Storage** qua hàm dùng chung mới `saveUploadedFile()` | `lib/image-utils.ts` (hàm mới), `app/api/upload/course/route.ts`, `app/api/upload/payment/route.ts` |
| A1b | Tính năng Backup (JSON): ghi ổ đĩa → Supabase Storage (`backups/db_{timestamp}/`). `listBackups`/`deleteBackup`/`restoreBackup`/`cleanupOldBackups` đều đổi thành `async`, ưu tiên Supabase, dự phòng ổ đĩa local. **Backup `pg_dump` KHÔNG đổi được** — phụ thuộc binary `pg_dump` không tồn tại trên Vercel, đây là giới hạn nền tảng không thể khắc phục bằng cách đổi nơi lưu | `lib/backup-service.ts` (viết lại đáng kể), `app/api/admin/backup/route.ts` (`await` các hàm mới là async) |
| A2 | `DATABASE_URL` production: direct connection → Supabase pooler (transaction mode, 6543, `pgbouncer=true`). Đã test kết nối thật (query `SELECT 1`, rồi test qua chính `lib/prisma.ts` của app, lấy được dữ liệu thật) trước khi áp dụng lên Vercel. Cập nhật qua `vercel env update DATABASE_URL production --yes < <file>` (không paste secret vào command visible) | `.env` (local), Vercel Production env var, `lib/prisma.ts` (bỏ đoạn `.replace()` nâng `connection_limit` — hết tác dụng với URL mới, không cần thiết nữa vì pooler tự quản lý) |
| A7 | Ghim vùng triển khai Vercel gần Việt Nam | `vercel.json` (mới): `{"regions": ["sin1"]}` |
| A8 | Gỡ `public/uploads/` khỏi git. **Trước khi gỡ đã kiểm tra DB và phát hiện 5/12 file đang được `User.image` tham chiếu thật** (user #0, #7, #327, #330, #875) → đã migrate 5 file này lên Supabase Storage + update `User.image` trong DB trước khi untrack, tránh mất avatar sau lần deploy tiếp theo | `.gitignore` (`+/public/uploads/`) |

**Đã xác minh trên production thật sau khi deploy:**
- `curl https://giautoandien.io.vn/` → HTTP 200, HTML ~281KB có nội dung khoá học/đăng nhập thật (không phải trang lỗi).
- Avatar vừa migrate truy cập được: `https://osqcudipywyfvvutbctb.supabase.co/storage/v1/object/public/uploads/avatars/migrated_user_0_1778028090198.jpg` → HTTP 200.

---

## 7. Thay đổi quan sát được nhưng KHÔNG phải do phiên này thực hiện

Trong lúc làm việc, phát hiện có **một quy trình/công cụ khác** (không xác định được chắc chắn — nghi vấn cao nhất là OpenCode hoặc OpenAI Codex CLI, cả 2 đều có cấu hình trên máy này với quyền tự chạy lệnh) **tự động commit và tự động push thẳng lên `origin/master`**, độc lập với các phiên làm việc AI tường minh. Bằng chứng: hàng loạt commit lịch sử dạng `"cap nhat: <tên file>..."` không phải do assistant hiện tại tạo ra, xen kẽ với các commit có message rõ ràng của phiên này.

Cụ thể, giữa commit `d87cf57` (Hiệu năng Giai đoạn 1, của phiên này) và `fa6a5d6` (Hiệu năng Giai đoạn 2, của phiên này), có 3 commit lạ đã lên `master`:
- `2dec748` — "fix: chuyen ALL-CAPS tieng Viet sang Sentence case (AssignmentForm)"
- `770e2e4` — "cap nhat: AGENTS.md" (thêm **Quy tắc #12**: cấm viết hoa toàn bộ tiếng Việt có dấu — lý do: gây false-positive mojibake trong pre-commit hook)
- `f1ab712` — "rebrand: Học Viện BRK -> Cộng đồng MBC (code, docs, database)" — đổi tên hiển thị ở **rất nhiều file** (đã xem qua `git show --stat`, phạm vi rộng: actions, components, docs...)

**Phiên làm việc này KHÔNG kiểm tra sâu nội dung 3 commit trên** (không phải việc được giao). Lưu ý cho phiên sau:
- `package.json` field `"name"` **vẫn là `"brk-academy"`**, chưa đổi theo rebrand.
- Nếu thấy code/UI có chỗ vẫn ghi "BRK"/"Học Viện BRK" xen lẫn "MBC"/"Cộng đồng MBC" — đó là rebrand chưa hoàn tất, không phải lỗi do các fix bảo mật/hiệu năng ở trên.
- `AGENTS.md` đã có thêm Quy tắc #12 (không dùng ALL-CAPS tiếng Việt có dấu) — các đoạn code Vietnamese uppercase message cũ (nếu gặp) nên sửa theo quy tắc mới khi động tới.

---

## 8. Rủi ro / việc còn tồn đọng — CẦN LÀM SỚM

1. **⚠️ Mật khẩu database Supabase chưa đổi.** Trong lúc debug pooler (mục 6, A2), một lệnh `sed` che secret của assistant bị sót 1 dòng (`DIRECT_URL=` thay vì chỉ `DATABASE_URL=`) khiến **mật khẩu database thật bị in ra trong output của 1 tool call** trong phiên trước. User đã được báo ngay, nhưng **chọn hoãn việc đổi mật khẩu** ("Cứ tiếp tục A2, tôi sẽ đổi mk sau"). **Việc đổi mật khẩu Supabase database vẫn CHƯA được thực hiện** — nên nhắc lại/thực hiện sớm. Nếu đổi, phải cập nhật lại cả `DATABASE_URL` (pooler) và `DIRECT_URL` (direct) ở `.env` local và Vercel.
2. **Danh tính công cụ auto-commit/auto-push chưa xác định được.** Xem mục 7. Cần user tự kiểm tra Task Manager (cột "Command line") vào lúc bắt gặp commit lạ tiếp theo để xác định chính xác.
3. **~10 file `plan_temp/*.backup_2026*.ts` vẫn còn chứa code cũ của `create2F1Voucher()`** (mục 4, bước 4). Đã hỏi user có muốn xoá không, chưa có quyết định dứt khoát.
4. **Giai đoạn 3 (hiệu năng) chưa làm:**
   - Bật lại Next.js Image Optimization (hiện `images.unoptimized: true` toàn site trong `next.config.ts`, dòng comment ghi lý do là lỗi private-IP với `i.postimg.cc`) — cần xác định lại chính xác nguyên nhân lỗi cũ để chỉ loại trừ đúng domain đó thay vì tắt tối ưu ảnh toàn site.
   - Chuyển gửi email hàng loạt (`send-batch`) sang mô hình hàng đợi (queue) chạy nền thay vì gọi API tuần tự theo batch từ admin UI.
5. **Giai đoạn 4 (schema/database) — ĐÃ LÊN KẾ HOẠCH CHI TIẾT, CHƯA THỰC THI.** Xem file [`GIAI_DOAN_4_KE_HOACH_SCHEMA.md`](./GIAI_DOAN_4_KE_HOACH_SCHEMA.md) (viết ngày 2026-08-09) — có số dòng chính xác trong `schema.prisma`, thứ tự ưu tiên theo rủi ro, và phát hiện thêm: `User.referrer` bị **lệch giữa migration gốc (`SET NULL`) và schema hiện tại (không có onDelete, tức Restrict)** — dòng 194 dưới đây (viết lúc trước) đã LỖI THỜI, cần đọc file kế hoạch mới để biết chính xác. Cần backup, dry-run, hỏi lại user trước khi chạy migration thật:
   - Thiếu `@@unique` trên `AffiliateConversion`/`RegistrationPoint` → rủi ro tính hoa hồng trùng (bằng chứng: `prisma/backfill-commissions.ts` phải tự check-rồi-tạo ở tầng ứng dụng, đúng kiểu vá tạm khi DB không tự chặn được).
   - `Course → Enrollment → Payment` và `AffiliateCampaign → AffiliateLink → AffiliateConversion → AffiliateCommission` đều `onDelete: Cascade` — xoá 1 khoá học/chiến dịch cũ sẽ xoá theo toàn bộ chứng từ thanh toán/sổ hoa hồng liên quan.
   - `Float` dùng cho tiền trong toàn bộ hệ affiliate cũ (rủi ro sai số làm tròn) — trong khi hệ MLM mới hơn (`BrkWallet`, `System`...) đã đúng dùng `Decimal`.
   - Lịch sử migration không khớp schema thực tế: phần lớn bảng nghiệp vụ (Course, Enrollment, Payment, Affiliate*) không xuất hiện trong bất kỳ file migration nào → không thể dựng lại DB từ migration nếu cần.
   - `onDelete` không nhất quán cho quan hệ User: nhiều bảng `Restrict` (mặc định) khiến gần như không xoá được user nào từng có hoạt động; một số bảng khác lại `Cascade` xoá luôn lịch sử thanh toán.
   - `User.referrer` xoá thì `SetNull` — làm `UserClosure` (bảng cây phả hệ) có dữ liệu mồ côi âm thầm, không có cơ chế tự đồng bộ lại.
   - Nhiều field trạng thái dùng `String` tự do thay vì Prisma `enum` (`LessonProgress.status`, `SiteProfileMember.role`...) — dễ lỗi gõ sai chính tả mà không báo lỗi biên dịch.
   - `AffiliateLink.@@unique([userId, campaignId, name])` bị vô hiệu hoá vì `name` nullable (Postgres coi `NULL != NULL`).
   - Thiếu index: `AffiliateCommission.conversionId`, `AffiliateConversion.linkId`, `LandingPage.profileId`, các cột khoá ngoại trong bảng `EmailCampaign*`/`EmailLog`.
   - Một số cột kiểu khoá ngoại không có `relation()` thật trong Prisma (`YouTubeToken.userId`, `BulkImportLog.courseId/userId`, `UserVoucher.awardedFromCourseId/usedForCourseId`, `BrkReferralBonus.courseId`).
   - **Chính sách RLS Supabase** (migration `20260515070125_supabase_grant_permissions`) đang cấp `FOR ALL ... USING (true) WITH CHECK (true)` cho role `authenticated` trên MỌI bảng, kể cả `Payment`/`AffiliateCommission`/`BrkWallet` — nghĩa là bất kỳ ai có token Supabase hợp lệ đều có thể sửa thẳng dữ liệu tài chính qua Supabase REST API, bỏ qua toàn bộ logic kiểm tra của app Next.js. **Cần rà soát riêng, độc lập với các fix ở trên.**

---

## 9. Lệnh kiểm thử (chạy trước khi báo hoàn thành bất kỳ thay đổi nào)

```bash
# Bắt buộc — theo AGENTS.md Quy tắc #9 (Zero tolerance lỗi build)
npx tsc --noEmit

# Build production đầy đủ (dùng flag này trên Windows để tránh lỗi TLS của Turbopack khi tải Google Fonts)
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build

# Lint (không bắt buộc sạch 100% — dự án có nợ kỹ thuật cũ trong thư mục scripts/,
# chỉ cần đảm bảo KHÔNG có lỗi mới phát sinh từ file mình vừa sửa)
npm run lint

# Kiểm tra production đang chạy đúng sau khi deploy
curl -s -o /dev/null -w "%{http_code}\n" https://giautoandien.io.vn/
```

**Lưu ý build trên Windows:** cảnh báo `Failed to copy traced files ... EINVAL: invalid argument, copyfile ...chunks\ssr\app_actions_data:19bf3a...` là **vô hại, đặc thù Windows** (dấu `:` trong tên chunk không hợp lệ khi copy sang thư mục `standalone` lúc build). Không phải lỗi thật, không chặn build thành công (`✓ Compiled successfully` vẫn xuất hiện trước đó).

**Không có bộ test tự động (`npm test`) trong dự án này** — kiểm thử chủ yếu qua `tsc`, `build`, và kiểm tra thủ công trên trình duyệt/production.

---

## 10. Việc cần làm tiếp theo (theo thứ tự đề xuất)

1. Nhắc/đợi user đổi mật khẩu database Supabase (mục 8, #1) — không chặn công việc khác nhưng nên làm sớm.
2. Hỏi lại user về việc xoá các file `plan_temp/*.backup_*.ts` chứa code `create2F1Voucher()` cũ (mục 8, #3).
3. Nếu user đồng ý tiếp tục: **Giai đoạn 3** (mục 8, #4) — ưu tiên xử lý `images.unoptimized` trước vì ảnh hưởng toàn site.
4. **Giai đoạn 4** (mục 8, #5) — **bắt buộc lên kế hoạch chi tiết + backup DB trước khi động vào**, KHÔNG tự ý chạy migration khi chưa được duyệt từng bước, vì đụng trực tiếp vào dữ liệu tài chính đang chạy thật (đúng tinh thần `AGENTS.md` Quy tắc #11 — dry-run trước, thực thi sau, luôn hỏi xác nhận).
5. Xem xét refactor `app/tools/roadmap/page.tsx` (tách List/Editor) như một việc riêng, có thời gian test kỹ luồng kéo-thả.

---

## 11. Ghi chú vận hành khác

- **Google Pub/Sub (webhook Gmail):** nếu cần đổi lại `CRON_SECRET`, phải cập nhật đồng thời URL push subscription trên GCP Console (`https://.../api/webhooks/gmail?secret=...`) — dán **giá trị thật, không có dấu `< >`**.
- **Supabase bucket `uploads` phải ở chế độ public** (đã xác nhận hoạt động qua `getPublicUrl()` — ảnh/backup truy cập trực tiếp không cần ký URL).
- **`SUPABASE_URL`/`SUPABASE_ANON_KEY`** (hoặc biến thể `NEXT_PUBLIC_*`) phải luôn được set — nếu thiếu, toàn bộ `lib/image-utils.ts` và `lib/backup-service.ts` tự động rơi về ghi ổ đĩa local (im lặng, chỉ log warning), sẽ **không hoạt động đúng trên Vercel** nếu quên set biến này ở môi trường mới.
- **Không dùng `vercel env add/update` với giá trị secret trực tiếp trong command** — luôn ghi ra file tạm rồi dùng `< file` để tránh secret hiện trong lịch sử lệnh/log.
