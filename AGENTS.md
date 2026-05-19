# AGENTS.md — Quy tắc làm việc cho AI Agent
> **Đọc file này TRƯỚC TIÊN mỗi phiên làm việc. Tuân thủ bắt buộc, không ngoại lệ.**

---

## 🔴 NGUYÊN TẮC CỐT LÕI (MANDATORY)

### 1. ĐỌC TRƯỚC — SỬA SAU
> Không bao giờ sửa file khi chưa đọc nội dung hiện tại của nó.

- **Bắt buộc `read` file gốc** trước mọi thao tác chỉnh sửa
- Không bao giờ đoán nội dung file — phải đọc thực tế
- Hiểu rõ code đang làm gì trước khi thay đổi

### 2. BACKUP TRƯỚC — SỬA SAU (CHỈ THỰC HIỆN KHI ĐÃ ĐƯỢC PHÊ DUYỆT PLAN)
> Mọi thay đổi đều phải có điểm quay lại an toàn, nhưng không tạo file rác.

- **Bắt buộc hỏi user** trước khi backup: "File hiện tại có đang hoạt động tốt không?"
- Nếu user **OK** → Tiến hành backup **NGAY TRƯỚC KHI** thực hiện lệnh `edit`/`write`.
- Nếu user **không OK** → Sửa code luôn, **KHÔNG** cần backup.
- **Mặc định dùng Git backup** (ưu tiên 1): `git diff path/to/file > plan_temp/file_backup_YYYYMMDD_HHMM.patch`
  - Nếu file chưa commit lần nào → fallback dùng file copy: `plan_temp/{tên_file_gốc}.backup_YYYYMMDD_HHMM.{ext}`
- **Tuyệt đối không ghi bất kỳ comment/note nào** vào trong file backup để đảm bảo khi restore không bị lỗi cú pháp.
- **KHÔNG tự động xóa** bất kỳ backup nào (file hoặc patch).
- Chỉ dùng file copy `plan_temp/` làm fallback cho trường hợp đặc biệt.

### 3. CHỌN ĐÚNG PHƯƠNG PHÁP SỬA
> Quy tắc **dứt khoát** — không mơ hồ, không thử sai nhiều lần.

**Phân loại thay đổi TRƯỚC khi làm:**

| Loại | Khi nào | Công cụ |
|------|---------|---------|
| **Surgical edit** | Thay đổi ≤ 10 dòng, đúng 1 chỗ | `edit` với oldString 1–3 dòng |
| **Full rewrite** | Thay đổi > 10 dòng, hoặc cấu trúc lớn | `write` toàn bộ file |
| **Chuyển sang rewrite** | `edit` thất bại **1 lần** → dừng ngay, không thử lại | `write` |

> ❌ **Cấm**: Cố `edit` 30–70 dòng, thất bại, thử lại nhiều lần → lãng phí thời gian.  
> ✅ **Đúng**: Xác định loại thay đổi từ đầu. Nếu > 10 dòng → `write` luôn.

**Khi `write`: Bắt buộc bảo tồn cấu trúc cũ:**
- Giữ nguyên toàn bộ khối `import`, các `hooks` không liên quan, và các hàm tiện ích trong file.
- Không tự ý xóa các state hoặc props đang tồn tại trừ khi user yêu cầu đích danh.
- Đảm bảo trả lại nguyên vẹn những phần code nằm ngoài scope của vấn đề đang xử lý.

### 4. GIẢI QUYẾT GỐC RỄ — KHÔNG VÁ LỖI BỀ MẶT
> Fix nguyên nhân thật, không patch triệu chứng.

- Khi gặp lỗi: xác định nguyên nhân từ **framework/architecture** trước
- ❌ Không dùng hack CSS (`pointer-events-none`), stacking events (`onKeyDown`, `onFocus`) để ép hành vi
- ❌ Nếu hướng giải quyết thất bại → **lùi lại xem xét toàn bộ kiến trúc**, không tiếp tục vá thêm

### 5. K.I.S.S — ĐƠN GIẢN LÀ VƯƠNG
> Phương án ít code nhất, ít can thiệp nhất mà vẫn đúng là phương án tốt nhất.

- Ưu tiên giải pháp đơn giản, ít phụ thuộc
- Không thêm abstraction/boilerplate khi không cần thiết
- Không thay đổi cấu trúc component nếu chỉ cần sửa logic

### 6. CẬP NHẬT TÀI LIỆU — BẮT BUỘC SAU MỖI THAY ĐỔI ĐƯỢC XÁC NHẬN CHẠY TỐT
> Tài liệu là bộ nhớ dài hạn của dự án. Không cập nhật = thông tin thất lạc.

**Chỉ được cập nhật tài liệu SAU KHI user đã test và xác nhận code hoạt động tốt:**

| Tài liệu | Cập nhật khi nào | Nội dung |
|---|---|---|
| `PLAN.md` | **Mọi thay đổi** (fix bug, tính năng mới, tối ưu) | Ngày, file đã sửa, vấn đề & cách fix, trạng thái |
| `docs/{feature}.md` | Tính năng lớn có file riêng | Đặc tả kỹ thuật chi tiết, API, data flow |

**Quy tắc cụ thể:**
- `PLAN.md` là lịch sử **tổng hợp toàn dự án** — luôn có, không phụ thuộc vào docs/
- `docs/{feature}.md` là đặc tả **chi tiết một tính năng** — bổ sung thêm, không thay thế PLAN.md
- Nếu quên → đó là **lỗi của agent**, phải cập nhật bù trước khi làm việc khác

### 7. PHÂN TÍCH DỰA TRÊN DỮ LIỆU THẬT — KHÔNG SUY ĐOÁN
> Mọi giải pháp đều phải xuất phát từ code và dữ liệu thực tế đang có, không tự điền giả định.

**Trước khi đưa ra giải pháp, BẮT BUỘC phải:**
- **Đọc file liên quan** bằng `read` — không suy ra nội dung từ tên file hay context
- **Tra cứu bằng `grep/search`** khi cần biết đoạn code nào đang tồn tại
- **Dựa trên code thực tế** khi suy luận — không suy luận từ assumption

**Cấm:**
- ❌ Đưa giải pháp khi chưa đọc file liên quan
- ❌ Giả sử biến/hàm/state tồn tại mà không đọc file confirm
- ❌ Copy-paste pattern từ nơi khác mà không đối chiếu với code hiện tại

### 8. HỎI XÁC NHẬN TRƯỚC KHI SỬA — KHÔNG CÓ NGOẠI LỆ
> Không bao giờ tự ý sửa file code mà không được user xác nhận rõ ràng.

**BẮT BUỘC trước mọi thay đổi file:**
1. Trình bày **kế hoạch rõ ràng**: sửa file nào, đoạn nào, thay thế bằng gì
2. **Chờ user xác nhận** ("đồng ý", "ok", "tiếp tục", …) rồi mới thực hiện
3. **Không có ngoại lệ** — dù thay đổi nhỏ, dù "chỉ sửa 1 dòng", dù rõ ràng

**Tính chất — ranh giới rõ ràng:**
- ✅ Đọc file, phân tích, đưa đề xuất → được phép, không cần hỏi trước
- ✅ Sửa file, tạo file, xóa code → **PHẢI HỎI TRƯỚC**, không có ngoại lệ

### 9. TUYỆT ĐỐI KHÔNG CÓ LỖI BUILD (ZERO TOLERANCE)
> Mọi lỗi biên dịch đều là lỗi chặn (Blocker). Không có khái niệm "lỗi không liên quan".

- **Bắt buộc**: Chạy `npx tsc --noEmit` và đảm bảo kết quả trả về `Exit code: 0` trước khi báo cáo hoàn thành.
- **Không ngoại lệ**: Ngay cả khi lỗi nằm ở file cũ hoặc file không thuộc phạm vi sửa đổi, Agent vẫn phải xử lý (hoặc báo cáo để xử lý) vì Vercel sẽ từ chối Deploy nếu còn bất kỳ lỗi TypeScript nào.
- **Nguyên tắc**: "Code trên máy chạy được" chưa phải là xong. "Code build thành công" mới là xong.

### 10. BẢO TOÀN BẢNG MÃ UTF-8 (CẤM DÙNG SHELL COMMAND ĐỂ SỬA FILE)
> Tuyệt đối không dùng PowerShell/Shell (`Add-Content`, `Set-Content`, `echo`) để ghi, nối, hoặc sửa file có chứa ký tự tiếng Việt (đặc biệt là các file `.md` như `PLAN.md`).

- **Nguyên nhân**: Lệnh shell trên Windows (như `Add-Content`) mặc định thường dùng bảng mã ANSI/Windows-1252. Khi ghi chuỗi tiếng Việt vào file đang ở định dạng UTF-8, nó sẽ phá hỏng toàn bộ font chữ của file (lỗi Mojibake như `NNG CP`, `Mc tiu`).
- **Quy định bắt buộc**: **Chỉ được sử dụng công cụ nội bộ `replace` hoặc `write_file`** của Agent để chỉnh sửa file. Các công cụ này chạy bằng Node.js nên luôn bảo toàn chính xác mã hóa UTF-8.
- Nếu phải dùng shell, bắt buộc phải báo trước và giải thích tại sao không dùng được công cụ `replace`.

---

## 🟡 QUY TRÌNH LÀM VIỆC (MANDATORY)

> Áp dụng chung cho mọi thay đổi (đơn giản hay phức tạp).

1. **READ & ANALYZE:** Đọc các file code thực tế liên quan. Tuyệt đối không suy đoán.
2. **PLAN:** Trình bày rõ kế hoạch sửa (sửa file nào, ở đâu, thay bằng gì).
3. **CONFIRM:** Dừng lại. Chờ User xác nhận đồng ý (OK, tiếp tục).
4. **BACKUP:** Lưu bản sao của file sẽ sửa vào `plan_temp/`:
   - **Mặc định (Git)**: `git diff path/to/file > plan_temp/file_backup_YYYYMMDD_HHMM.patch`
   - **Fallback (File copy)**: Nếu file chưa commit lần nào → `cp path/to/file plan_temp/{tên_file_gốc}.backup_YYYYMMDD_HHMM.{ext}`
   - **KHÔNG tự động xóa** bất kỳ backup nào.
5. **EDIT/WRITE:** Thực hiện thay đổi code.
6. **VERIFY:** Đọc lại file (bằng lệnh read) để chắc chắn code đã lưu đúng chuẩn. 
7. **TEST & WAIT:** Báo cáo đã sửa xong và chờ User chạy test thực tế trên môi trường dev.
8. **UPDATE DOC:** Chỉ ghi vào `PLAN.md` (và `docs/` nếu có) **SAU KHI** User phản hồi tính năng đã hoạt động tốt không có lỗi.

### 9. KHÔI PHỤC — THỨ TỰ ƯU TIÊN & BẮT BUỘC HỎI TRƯỚC
> Tuyệt đối **KHÔNG ĐƯỢC TỰ ĐỘNG** thực hiện bất cứ bước khôi phục nào nếu chưa báo cáo và được user xác nhận đồng ý.

Khi cần khôi phục code, phải tuân thủ nghiêm ngặt thứ tự ưu tiên sau:
1. **Ưu tiên 1 (Git repository)**: Sử dụng lệnh `git apply plan_temp/file_backup_YYYYMMDD_HHMM.patch` hoặc `git checkout -- <file>` để lấy lại bản gần nhất.
2. **Ưu tiên 2 (File backup lẻ)**: Đọc file backup trong `plan_temp/` → Báo cáo cho user → Chờ user xác nhận → Copy nội dung → Paste đè file gốc.
3. **Ưu tiên 3 (Zip backup toàn bộ)**: Chạy script `.\restore-from-backup.ps1` → Chọn ZIP → `npm install` (Chỉ dùng khi hỏng nặng toàn dự án).

**QUY TẮC BẮT BUỘC KHI KHÔI PHỤC:**
- **PHẢI báo cáo** chi tiết: Backup nào, file nào, thay đổi những gì
- **PHẢI hỏi user**: "Xác nhận khôi phục từ backup XYZ không?"
- **CẤM tự động**: Không tự động xóa backup, không tự động khôi phục khi chưa có xác nhận "OK"

---

## 🟡 AN TOÀN CODE

| ❌ Nguy hiểm | ✅ Đúng |
|---|---|
| `if (userId)` — falsy khi `userId = 0` | `if (userId != null)` |
| Đổi tên biến tùy tiện | Giữ nguyên tên, **hỏi user** nếu muốn đổi |
| Xóa biến khi chưa tìm usages | Dùng grep/search tìm tất cả nơi dùng trước |
| Gọi Server Action với Prisma trong Client Component | Dùng `fetch('/api/...')` thay thế |

---

## 🟡 TECH STACK NHANH

| Công nghệ | Chi tiết |
|-----------|----------|
| Framework | Next.js 16 (App Router) |
| Database | Prisma ORM + PostgreSQL |
| Auth | NextAuth v5 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict mode) |

**Cấu trúc thư mục:**
```
app/           → Pages & API routes
components/    → UI components (theo feature)
hooks/         → Custom React hooks
lib/           → Business logic & utilities
prisma/        → Schema & seed
scripts/       → Migration & data tools
plan_temp/     → Backup files (không commit)
docs/          → Tài liệu kỹ thuật từng tính năng
```

---

## 🟡 COMMANDS HAY DÙNG

```bash
# Dev
npm run dev           # Dev server → localhost:3000
npm run build         # Build production (chỉ khi thay đổi lớn)
npm run lint          # ESLint check

# Database (sau khi sửa schema)
npx prisma generate   # Generate Prisma client
npx prisma db push    # Sync schema lên DB

# Git
git show HEAD:<file>  # Xem file trên git HEAD
```

---

## 📋 VÍ DỤ THAM KHẢO (Chi tiết kỹ thuật)

> Phần này là **tham khảo** — không cần đọc hết mỗi lần, chỉ tra khi cần.

### A. Edit đúng kỹ thuật (tránh "oldString not found")
```
❌ SAI: Tự gõ lại oldString, hoặc copy từ terminal output (sai whitespace)
✅ ĐÚNG: read() file → copy Y NGUYÊN text từ nội dung file → dùng làm oldString

Quy tắc oldString:
- Chỉ 1–3 dòng, đủ để xác định duy nhất vị trí trong file
- Phải bao gồm đúng whitespace/indentation gốc
- Luôn dùng replaceAll: false
```

### B. Next.js 16 — Các lỗi thường gặp
```typescript
// ✅ Route Handler params phải await
export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params  // KHÔNG được destructure trực tiếp
}

// ✅ useSearchParams() phải có Suspense
export default function Page() {
    return <Suspense fallback={<Loading />}><PageContent /></Suspense>
}

// ✅ Dùng revalidatePath (KHÔNG dùng revalidateTag)
import { revalidatePath } from "next/cache"
revalidatePath('/account-settings')
```

### C. Form Data Integrity (React Hook Form + disabled field)
```tsx
// ❌ SAI: disabled field không được RHF capture khi submit
<input disabled {...register("referrerId")} />

// ✅ ĐÚNG: hidden giữ data, disabled chỉ để hiển thị UI
{isLocked && <input type="hidden" {...register("referrerId")} value={lockedValue} />}
<input disabled={isLocked} value={isLocked ? lockedValue : undefined}
       {...(isLocked ? {} : register("referrerId"))} />
```

### D. Quy ước đặt tên
```
Components  → PascalCase    : CourseCard.tsx, ShareModal.tsx
Hooks       → camelCase     : useAffiliateCode.ts
Actions     → kebab-case    : affiliate-actions.ts
API routes  → kebab-case    : /api/auth/has-password/route.ts
```

### E. Cập nhật PLAN.md — Format chuẩn
````markdown
## ✅ [Tên thay đổi] ([YYYY-MM-DD])

### Mục tiêu
Mô tả ngắn gọn vấn đề và mục đích thay đổi.

### Các file đã sửa
#### `path/to/file.tsx`
- Vấn đề: ...
- Fix: ...
- Code snippet nếu cần (≤ 10 dòng)

### Trạng thái
- ✅ [Tính năng 1] hoạt động đúng
- ✅ [Tính năng 2] không bị ảnh hưởng
````
> **Lưu ý**: Thêm vào **cuối file PLAN.md**, không xóa lịch sử cũ.

### F. Pre-deploy Checklist
```
- [ ] npx prisma generate (sau khi sửa schema)
- [ ] Tất cả route handlers đã await params
- [ ] Tất cả useSearchParams() có Suspense wrapper
- [ ] npm run build không lỗi
- [ ] Không dùng revalidateTag
```

### G. Supabase GRANT Compliance (Bắt buộc từ 2026-10-30)
> Supabase thay đổi default permissions: new tables trong `public` schema cần explicit GRANTs.
> Ref: https://supabase.com/blog/changing-default-permissions-for-public-schema

**Architecture note:** App này dùng **Prisma ORM với direct PostgreSQL connection** (qua `DATABASE_URL`), KHÔNG qua Supabase REST/GraphQL API. Supabase chỉ dùng cho **Storage** (file uploads). Tuy nhiên vẫn cần GRANTs để đề phòng truy cập sau này.

**BẮT BUỘC khi làm việc với database:**
```sql
-- Sau khi tạo table mới (qua Prisma model), chạy các GRANT này:
GRANT ALL PRIVILEGES ON TABLE public."NewTableName" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."NewTableName" TO service_role;
GRANT SELECT ON TABLE public."NewTableName" TO anon;

-- Bật RLS + tạo policy cơ bản:
ALTER TABLE public."NewTableName" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NewTableName_authenticated_all" ON public."NewTableName"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "NewTableName_anon_select" ON public."NewTableName"
  FOR SELECT TO anon USING (true);
```

**Lưu ý quan trọng:**
- Prisma tạo tên table giữ nguyên case (vd: `Account`, `Course`) — khi viết SQL raw **PHẢI double-quote**: `public."Account"`
- Không quote → PostgreSQL tự động lowercase → lỗi "table not found"
- File tham khảo: `prisma/migrations/20260515070125_supabase_grant_permissions/migration.sql`

---

## 📁 TÀI LIỆU QUAN TRỌNG

- `PLAN.md` — Lịch sử thay đổi & kế hoạch kỹ thuật
- `GEMINI.md` — Hướng dẫn nền tảng cho AI agent
- `docs/AFFILIATE_SYSTEM.md` — Tài liệu hệ thống Affiliate
- `plan_temp/` — Backup files (tra cứu khi cần restore)
```