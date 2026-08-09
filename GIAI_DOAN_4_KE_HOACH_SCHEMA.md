# Giai đoạn 4 — Kế hoạch xử lý Schema/Database

> **Đây là tài liệu LÊN KẾ HOẠCH, chưa thực thi bất kỳ thay đổi nào.** Đọc cùng `CURRENT_STATE.md` mục 8.5. Mọi bước dưới đây cần backup trước, dry-run trước, và **hỏi lại user trước khi chạy migration thật** — đúng tinh thần Quy tắc #11 `AGENTS.md` vì đây là dữ liệu tài chính đang chạy thật (MBV wallet, hoa hồng affiliate, thanh toán khoá học).
>
> Cập nhật lần cuối: sau commit `e303996` (branch `master`). Toàn bộ số liệu dòng (line number) trong tài liệu này lấy từ `prisma/schema.prisma` tại thời điểm viết — **kiểm tra lại số dòng trước khi áp dụng** nếu schema đã đổi.

---

## 0. Nguyên tắc chung

1. **Không migration nào chạy thẳng lên production mà chưa qua staging/dry-run.** Dùy `prisma migrate dev` tạo file SQL trước, đọc kỹ, rồi mới `prisma migrate deploy`.
2. **Backup toàn bộ DB trước MỖI bước** (không chỉ 1 lần đầu Giai đoạn 4) — dùng tính năng backup đã có (`lib/backup-service.ts`, Giai đoạn 2), hoặc `pg_dump` trực tiếp nếu backup nội bộ không đủ tin cậy cho việc này (backup nội bộ dùng JSON qua Prisma, không phải snapshot SQL nhị phân — nên cân nhắc thêm 1 bản `pg_dump` thật trước các bước đụng vào bảng tài chính).
3. **Đi từng bước nhỏ, có thể rollback độc lập** — không gộp nhiều thay đổi schema không liên quan vào 1 migration.
4. **Ưu tiên theo rủi ro bảo mật đang mở > rủi ro mất dữ liệu khi xoá > nợ kỹ thuật (Float, thiếu index, thiếu enum).**
5. **Sau mỗi bước**: `npx prisma validate`, `npx tsc --noEmit`, `npx prisma generate`, kiểm tra các Server Action/Route liên quan còn biên dịch đúng, test thủ công luồng nghiệp vụ chạm tới bảng vừa đổi.

---

## 1. Xác nhận bổ sung (đã kiểm tra trong lúc lên kế hoạch)

Đã kiểm tra `lib/supabase.ts` và toàn bộ nơi gọi `supabase.storage.*` (`lib/backup-service.ts`, `lib/image-utils.ts`): **client Supabase JS (dùng `anon key`) trong toàn bộ app CHỈ dùng cho Storage (upload/backup file), không có bất kỳ chỗ nào gọi `supabase.from(table)` để đọc/ghi bảng dữ liệu.** Toàn bộ truy vấn DB thật đi qua Prisma (`DATABASE_URL`/`DIRECT_URL`, kết nối Postgres trực tiếp bằng role owner/service, **không** qua PostgREST).

→ Điều này rất quan trọng cho mục 2 (RLS): **siết chặt RLS policy cho role `authenticated`/`anon` sẽ KHÔNG làm hỏng bất kỳ chức năng nào của app hiện tại**, vì app không bao giờ đọc/ghi bảng qua đường đó. Rủi ro hiện tại (`USING (true) WITH CHECK (true)`) thuần tuý là lỗ hổng bên ngoài: ai có JWT `authenticated`/`anon` hợp lệ (rò rỉ `NEXT_PUBLIC_SUPABASE_ANON_KEY`, hoặc tự đăng ký qua Supabase Auth nếu tính năng đó đang bật trên project) có thể gọi thẳng PostgREST API đọc/sửa `Payment`, `AffiliateCommission`... **Cần xác nhận thêm: Supabase Auth (đăng ký user trực tiếp qua Supabase, khác với NextAuth app đang dùng) có đang bật trên project không** — nếu bật, "authenticated" là role bất kỳ ai tự đăng ký cũng có được, mức độ nghiêm trọng cao hơn nhiều so với nếu tính năng đó tắt.

---

## 2. Ưu tiên #1 (rủi ro bảo mật đang mở) — Siết RLS policy trên Supabase

**Hiện trạng:** Migration `20260515070125_supabase_grant_permissions` cấp `GRANT ALL PRIVILEGES` cho role `authenticated` trên mọi bảng + tạo policy `FOR ALL ... USING (true) WITH CHECK (true)` cho từng bảng, bao gồm `Payment`, `AffiliateCommission`. Riêng `BrkWallet`/`BrkTransaction` (và toàn bộ bảng BRK mới hơn: `brk_level_up_record`, `brk_referral_bonus`, `brk_timeline_record`...) **không xuất hiện trong migration này** — nghĩa là các bảng ví MBV/MBD quan trọng nhất **chưa rõ đang có RLS hay không**, cần xác minh trực tiếp trên Supabase Dashboard trước khi làm gì tiếp (không suy luận từ migration file, vì nhiều bảng được tạo ngoài migration tracking — xem mục 4).

**Việc cần làm (theo thứ tự):**

1. **Xác minh sống trên Supabase Dashboard** (SQL Editor, chạy `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';` và `SELECT * FROM pg_policies WHERE schemaname='public';`) — liệt kê chính xác bảng nào đang bật RLS, bảng nào chưa, policy nào đang mở. Đây là bước đọc, không rủi ro, làm trước tiên.
2. Xác nhận Supabase Auth (đăng ký user trực tiếp) có đang bật không (Dashboard → Authentication → Providers). Nếu tắt hoàn toàn, mức độ khẩn cấp giảm (chỉ còn rủi ro nếu `anon key` bị rò rỉ, vì `anon` role không cần đăng nhập vẫn gọi được `SELECT`/tuỳ policy).
3. Với các bảng tài chính (`Payment`, `AffiliateCommission`, `AffiliateWallet`, `AffiliatePayout`, `BrkWallet`, `BrkTransaction`, `brk_timeline_record`, `brk_referral_bonus`, `brk_level_up_record`, `brk_revenue_award`, `UserVoucher`, `UserBankAccount`): viết migration SQL thay `FOR ALL ... USING (true) WITH CHECK (true)` bằng:
   - Cách đơn giản nhất, ít rủi ro nhất (khuyến nghị): **thu hồi hẳn quyền của `authenticated`/`anon` trên các bảng này** (`REVOKE ALL ON <table> FROM authenticated, anon;`), vì app không dùng đường đó — không cần policy tinh vi theo `auth.uid()`, vì hệ thống auth thật là NextAuth chứ không phải Supabase Auth, nên không có cách map "hàng này thuộc về user nào" qua `auth.uid()` một cách đáng tin cậy.
   - Giữ nguyên `service_role` (Prisma dùng owner/service, không đi qua RLS theo cách này nên không ảnh hưởng, nhưng cần xác nhận: connection string Prisma đang dùng role gì — nếu là `postgres` owner thì RLS không áp dụng bất kể policy gì, càng an toàn khi REVOKE khỏi `authenticated`/`anon`).
4. Với các bảng còn lại (không phải tiền, ví dụ `Post`, `CoursePage`...) có thể giữ nguyên `USING(true)` hoặc xử lý sau — không khẩn cấp.
5. Viết migration mới (KHÔNG sửa lại file migration `20260515070125` cũ — luôn thêm migration mới nối tiếp, không sửa lịch sử).

**Rủi ro khi làm:** thấp — thuần SQL trên Supabase, không đụng Prisma schema, không cần `prisma migrate dev` generate lại client, app không phụ thuộc đường PostgREST. Vẫn cần backup trước vì đang sửa quyền truy cập, và cần chạy thử 1 request thật qua PostgREST (bằng `curl` với anon key) trước/sau để xác nhận đúng ý đồ (trước: đọc được `Payment`; sau: bị từ chối).

**Việc cần hỏi user trước khi chạy thật:** Xác nhận đã kiểm tra Dashboard xong (bước 1-2) và danh sách bảng dự định REVOKE trước khi apply.

---

## 3. Ưu tiên #2 (rủi ro tính trùng tài chính) — Thêm ràng buộc duy nhất còn thiếu

**Hiện trạng cụ thể:**
- `AffiliateConversion` (dòng 1233-1259): không có `@@unique`, chỉ có index thường. Khoá trùng tự nhiên là `(customerId, campaignId)` — đúng là cặp mà `prisma/backfill-commissions.ts` dòng 99-110 tự kiểm tra "tìm rồi mới tạo" ở tầng ứng dụng (không có gì chặn ở tầng DB, và bất kỳ code path nào khác tạo conversion — ví dụ route tracking conversion sống — cũng không được bảo vệ).
- `RegistrationPoint` (dòng 1261-1282): tương tự, khoá trùng tự nhiên `(refereeId, campaignId)`, cũng chỉ được check thủ công ở `backfill-commissions.ts` dòng 211-221.
- `AffiliateLink.@@unique([userId, campaignId, name])` (dòng 1189) **vô hiệu hoá trên thực tế** vì `name` là `String?` (dòng 1180) — Postgres coi `NULL != NULL` nên vẫn tạo được nhiều link trùng `(userId, campaignId)` nếu `name` để trống. `backfill-commissions.ts` dòng 83-97 cũng phải tự check `(userId, campaignId)` thủ công để né lỗ hổng này.

**Đề xuất:**
1. **Trước khi thêm `@@unique`, phải quét dữ liệu hiện có xem đã có bản ghi trùng chưa** — nếu có, migration `ADD UNIQUE CONSTRAINT` sẽ FAIL giữa chừng (hoặc tệ hơn, chạy `db push` sẽ báo lỗi rõ ràng, không âm thầm). Viết script kiểm tra riêng, dry-run, liệt kê hàng trùng nếu có (không tự xoá) — báo cáo cho user quyết định trước khi merge trùng.
2. `AffiliateConversion`: thêm `@@unique([customerId, campaignId])`.
3. `RegistrationPoint`: thêm `@@unique([refereeId, campaignId])`.
4. `AffiliateLink`: đổi hướng tiếp cận vì `name` nullable làm vô hiệu unique — 2 lựa chọn, cần hỏi user chọn:
   - (a) Đổi `@@unique([userId, campaignId, name])` thành `@@unique([userId, campaignId])` nếu nghiệp vụ thực tế là "1 user chỉ có 1 link/campaign" (khớp với cách `backfill-commissions.ts` đang tự chặn) — nhưng cần xác nhận không có ca nào 1 user cố tình tạo nhiều link đặt tên khác nhau cho cùng 1 campaign (ví dụ để track nhiều kênh quảng bá riêng).
   - (b) Nếu nghiệp vụ CẦN cho phép nhiều link/tên khác nhau, đổi `name` thành bắt buộc (`String` không nullable, có giá trị mặc định `""` khi tạo) để `@@unique` hiện tại hoạt động đúng như dự định ban đầu.
5. Sau khi thêm `@@unique`, có thể **xoá bớt code check trùng thủ công ở tầng ứng dụng** (không bắt buộc, nhưng để lại làm lớp phòng thủ kép cũng không hại — chỉ cần biết rằng DB giờ đã tự chặn được, không còn phụ thuộc hoàn toàn vào áp dụng đúng logic ở mọi code path).

**Rủi ro khi làm:** trung bình — cần quét dữ liệu trùng trước (bước 1), migration thêm unique constraint có thể fail nếu có dữ liệu trùng sẵn, cần xử lý dữ liệu trùng thủ công (merge/xoá có chọn lọc, KHÔNG tự động xoá — hỏi user).

---

## 4. Ưu tiên #3 (rủi ro mất dữ liệu khi xoá) — `onDelete: Cascade` nguy hiểm

**Hiện trạng:**
- `Course → Enrollment` (dòng 436, `onDelete: Cascade`) → `Enrollment → Payment` (dòng 535, `onDelete: Cascade`): xoá 1 khoá học xoá theo toàn bộ ghi danh **và chứng từ thanh toán**.
- `AffiliateCampaign → AffiliateLink → AffiliateConversion → AffiliateCommission`: toàn bộ chuỗi đều `Cascade` (dòng 1186, 1252, 1250, 1299) — xoá 1 campaign xoá sạch sổ hoa hồng liên quan. Riêng `AffiliateCommission.affiliate` (dòng 1298, quan hệ tới `User`) lại không có `onDelete` (mặc định `Restrict`) — không nhất quán với phần còn lại của chuỗi.

**Đề xuất:**
1. Đổi các quan hệ có ý nghĩa "chứng từ tài chính" (`Payment`, `AffiliateCommission`) từ `Cascade` sang `Restrict` — tức là **không cho xoá `Course`/`Campaign` nếu còn Payment/Commission liên quan**, buộc phải xử lý dữ liệu con trước (soft-delete hoặc archive) thay vì xoá cứng cả chuỗi.
2. Việc đổi `Cascade → Restrict` **an toàn để migrate** (chỉ thắt chặt hơn, không mất dữ liệu, không cần dry-run phức tạp) — nhưng cần rà lại code ứng dụng xem có chỗ nào hiện đang cố tình xoá Course/Campaign kèm dữ liệu con (dựa vào Cascade hoạt động) hay không — nếu có, code đó sẽ bắt đầu báo lỗi FK violation sau khi đổi, cần sửa thành soft-delete (`status: 'DELETED'`/`isActive: false`) thay vì xoá cứng.
3. Trước khi đổi, **grep toàn bộ codebase tìm `prisma.course.delete` / `prisma.affiliateCampaign.delete`** để biết chắc có bao nhiêu chỗ phụ thuộc hành vi cascade hiện tại, xử lý từng chỗ.

**Rủi ro khi làm:** trung bình-cao nếu có code đang dựa vào cascade để "xoá gọn" — cần audit code trước, không chỉ đổi schema.

---

## 5. Ưu tiên #4 (rủi ro sai số tiền) — `Float` → `Decimal` cho các bảng Affiliate

**Hiện trạng:** Toàn bộ hệ Affiliate cũ (`AffiliateCampaign.minPayout/feeAmount/pointRedemptionValue`, `AffiliateConversion.orderAmount`, `AffiliateCommission.grossAmount/taxAmount/feeAmount/netAmount`, `AffiliateWallet.balance/pendingBalance/totalEarned/totalPaid`, `AffiliateTransaction.amount/balanceBefore/balanceAfter`, `AffiliatePayout.amount/taxAmount/feeAmount/netAmount`) dùng `Float`. Hệ BRK mới hơn (`BrkWallet`, `BrkTransaction`, `System`, `BrkTimelineRecord`) đã đúng dùng `Decimal @db.Decimal(14,2)` hoặc tương đương.

**Đề xuất:**
1. Đổi từng field `Float` → `Decimal @db.Decimal(14, 2)` (khớp độ chính xác đang dùng ở `BrkWallet`).
2. **Đây là thay đổi kiểu cột (`ALTER COLUMN ... TYPE numeric`) trên bảng đang có dữ liệu thật** — Postgres cho phép convert `double precision → numeric` trực tiếp (không mất dữ liệu, vì numeric có độ chính xác cao hơn), nhưng **bắt buộc backup trước** và kiểm tra kỹ mọi phép tính JS đang thao tác trực tiếp với các field này dưới dạng `number` (Prisma trả `Decimal` về dưới dạng object `Decimal.js`, không phải `number` JS thuần — code hiện tại nếu đang làm `a + b` số học trực tiếp trên các field affiliate sẽ **lỗi runtime hoặc lỗi type** sau khi đổi, cần sửa sang `.toNumber()`/`Decimal` arithmetic giống cách `lib/brk/wallet-service.ts` đang xử lý cho `BrkWallet`).
3. Vì phạm vi sửa code đi kèm khá rộng (mọi chỗ đọc/ghi các field này trong `app/actions/affiliate-actions.ts`, `lib/` liên quan tính hoa hồng), nên **tách thành 1 khối công việc riêng, làm sau khi 2 mục ưu tiên cao hơn (RLS, unique constraint) đã xong** — không làm chung 1 đợt để dễ khoanh vùng nếu có lỗi.

**Rủi ro khi làm:** trung bình-cao — không mất dữ liệu ở tầng DB, nhưng rủi ro nằm ở tầng ứng dụng (code JS thao tác `Decimal` khác `number`), cần rà soát kỹ + test toàn bộ luồng tính hoa hồng affiliate trước khi deploy.

---

## 6. Ưu tiên #5 (dọn nợ kỹ thuật, rủi ro thấp) — Index còn thiếu

Thêm `@@index` cho các cột FK sau (không đổi hành vi, chỉ tăng tốc, an toàn tuyệt đối để migrate bất cứ lúc nào, không cần dry-run phức tạp — `CREATE INDEX` không khoá bảng lâu nếu dùng `CREATE INDEX CONCURRENTLY` qua raw SQL migration thay vì để Prisma tự tạo index thường):

- `AffiliateCommission.conversionId`
- `AffiliateConversion.linkId`
- `LandingPage.profileId`
- `EmailCampaign.createdBy`, `EmailCampaignSender.campaignId`/`senderId`, `EmailCampaignLog.campaignId`/`senderId`, `EmailLog.userId`

**Đây là việc AN TOÀN NHẤT trong toàn bộ Giai đoạn 4, có thể làm sớm, độc lập với các mục khác, không cần hỏi lại nhiều** — nhưng vẫn nên dùng `CREATE INDEX CONCURRENTLY` (viết migration SQL tay thay vì để Prisma tự generate `CREATE INDEX` thường) để tránh khoá ghi lên bảng đang có traffic thật trong lúc tạo index.

---

## 7. Ưu tiên #6 (rủi ro thấp, dọn dần) — Các mục còn lại

- **`onDelete` không nhất quán cho quan hệ User** (mục 5 trong khảo sát): cần rà từng bảng, quyết định rõ ràng "user bị xoá thì dữ liệu liên quan nên `Cascade`, `Restrict`, hay `SetNull`" theo từng loại quan hệ (ví dụ: `BrkWallet`/`AffiliateWallet`/`AffiliatePayout`/`UserVoucher` — dữ liệu tài chính — nên `Restrict`, không cho xoá user còn ví có số dư; `Post`/`PostComment` đã đúng `Cascade`). Việc này **cần quyết định nghiệp vụ trước** (không chỉ kỹ thuật) — nên hỏi user: "user bị xoá thì có được xoá theo lịch sử giao dịch không?" trước khi viết migration.
- **`User.referrer` — phát hiện lệch giữa migration gốc và schema hiện tại**: migration `20260217131807_add_autoincrement` dòng 85 tạo FK với `ON DELETE SET NULL`, nhưng `schema.prisma` dòng 49 hiện khai báo không có `onDelete` (mặc định Restrict/NoAction) — **nghĩa là schema Prisma hiện tại không khớp với FK thật đang có trong DB** (có thể do lúc nào đó chạy `db push` không đồng bộ). Cần xác minh hành vi FK thật trong Postgres (`\d "User"` hoặc query `information_schema`) trước khi quyết định sửa `schema.prisma` cho khớp DB hay sửa DB cho khớp `schema.prisma` — không suy đoán.
- **String thay vì enum** (`LessonProgress.status`, `SiteProfileMember.role`, và ~10 field khác đã liệt kê): rủi ro thấp, chỉ nên làm khi rảnh, không khẩn cấp — chuyển sang enum yêu cầu migrate dữ liệu hiện có về đúng giá trị enum trước (quét giá trị `DISTINCT` đang có trong cột trước khi đổi).
- **FK thiếu `relation()` thật** (`YouTubeToken.userId`, `BulkImportLog.courseId/userId`, `UserVoucher.awardedFromCourseId/usedForCourseId`, `BrkReferralBonus.courseId`): thêm `@relation` không tự động thêm ràng buộc DB nguy hiểm gì (Prisma sẽ tạo FK constraint mới) — nhưng **phải quét dữ liệu mồ côi (orphan) trước**, vì nếu có `userId`/`courseId` trỏ tới bản ghi đã bị xoá, thêm FK constraint sẽ fail ngay khi migrate.
- **Migration history không khớp schema thực tế**: không có hành động sửa trực tiếp nào — đây là rủi ro vận hành (không dựng lại DB từ migration được nếu cần), giải pháp thực tế nhất là **chạy `prisma migrate diff` giữa DB thật và schema hiện tại, tạo 1 migration "baseline" đánh dấu trạng thái hiện tại**, để từ nay về sau mọi thay đổi đều đi qua migration tracking đầy đủ — nên làm SAU khi các mục 2-6 ở trên đã ổn định (baseline nên chụp trạng thái "sạch", không chụp giữa chừng lúc đang sửa).

---

## 8. Thứ tự đề xuất tổng thể

1. Xác minh RLS thật trên Supabase Dashboard (mục 2, bước 1-2) — **chỉ đọc, làm ngay được, không cần hỏi**.
2. Thêm index còn thiếu (mục 6) — an toàn nhất, có thể làm sớm song song.
3. Siết RLS cho bảng tài chính (mục 2, bước 3-5) — sau khi xác nhận bước 1.
4. Quét dữ liệu trùng + thêm `@@unique` cho `AffiliateConversion`/`RegistrationPoint`/`AffiliateLink` (mục 3).
5. Audit code phụ thuộc Cascade + đổi `Payment`/`AffiliateCommission` sang `Restrict` (mục 4).
6. `Float → Decimal` cho hệ Affiliate (mục 5) — khối việc lớn nhất, làm riêng, sau cùng trong các mục "phải làm".
7. Các mục còn lại (mục 7) — làm dần, không khẩn cấp, cần quyết định nghiệp vụ trước khi động vào `onDelete` cho quan hệ User.

**Không có mục nào trong tài liệu này được tự động thực thi.** Mỗi mục khi bắt đầu làm thật cần: backup → dry-run/script kiểm tra dữ liệu → trình bày kết quả cho user → xác nhận → mới migrate.
