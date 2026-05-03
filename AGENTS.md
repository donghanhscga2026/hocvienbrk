# AGENTS.md — Quy tắc làm việc cho AI Agent
> **Đọc file này TRƯỚC TIÊN mỗi phiên làm việc. Tuân thủ bắt buộc, không ngoại lệ.**

---

## 🔴 NGUYÊN TẮC CỐT LÕI (MANDATORY)

### 1. ĐỌC TRƯỚC — SỬA SAU
> Không bao giờ sửa file khi chưa đọc nội dung hiện tại của nó.

- **Bắt buộc `read` file gốc** trước mọi thao tác chỉnh sửa
- Không bao giờ đoán nội dung file — phải đọc thực tế
- Hiểu rõ code đang làm gì trước khi thay đổi

### 2. BACKUP TRƯỚC — SỬA SAU
> Mọi thay đổi đều phải có điểm quay lại an toàn.

- Copy file gốc vào `plan_temp/{tên_file}_backup_YYYYMMDD_HHMM.txt` **trước khi sửa**
- Ghi đúng **3 dòng note** theo format chuẩn (xem Ví dụ A)
- Chỉ giữ **1 bản backup mới nhất** cho mỗi file (xóa bản cũ hơn)

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

**Khi `write`: bắt buộc bảo tồn tính năng cũ:**
1. Liệt kê checklist tất cả tính năng hiện có trước khi write
2. Sau khi write: đối chiếu checklist, tính năng nào mất → khôi phục từ backup ngay

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

### 6. CẬP NHẬT TÀI LIỆU — BẮT BUỘC SAU MỖI THAY ĐỔI ĐƯỢC XÁC NHẬN
> Tài liệu là bộ nhớ dài hạn của dự án. Không cập nhật = thông tin thất lạc.

**Ngay sau khi user xác nhận thay đổi hoạt động tốt, PHẢI cập nhật:**

| Tài liệu | Cập nhật khi nào | Nội dung |
|---|---|---|
| `PLAN.md` | **Mọi thay đổi** (fix bug, tính năng mới, tối ưu) | Ngày, file đã sửa, vấn đề & cách fix, trạng thái |
| `docs/{feature}.md` | Tính năng lớn có file riêng | Đặc tả kỹ thuật chi tiết, API, data flow |

**Quy tắc cụ thể:**
- `PLAN.md` là lịch sử **tổng hợp toàn dự án** — luôn có, không phụ thuộc vào docs/
- `docs/{feature}.md` là đặc tả **chi tiết một tính năng** — bổ sung thêm, không thay thế PLAN.md
- Cập nhật **ngay sau khi xác nhận**, không chờ cuối phiên
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

### 8. HỎi XÁC NHẬN TRƯỚC KHI SỬa — KHÔNG CÓ NGOẠI LỆ
> Không bao giờ tự ý sửa file code mà không được user xác nhận rõ ràng.

**BẮT BUỘC trước mọi thay đổi file:**
1. Trình bày **kế hoạch rõ ràng**: sửa file nào, đoạn nào, thay thế bằng gì
2. **Chờ user xác nhận** ("đồng ý", "ok", "tiếp tục", …) rồi mới thực hiện
3. **Không có ngoại lệ** — dù thay đổi nhỏ, dù "chỉ sửa 1 dòng", dù rõ ràng

**Tính chất — ranh giới rõ ràng:**
- ✅ Đọc file, phân tích, đưa đề xuất → được phép, không cần hỏi trước
- ❌ Sửa file, tạo file, xóa code → **PHẢI HỎI TRƯỚC**, không có ngoại lệ

---

## 🟡 QUY TRÌNH LÀM VIỆC — PHÂN LOẠI THEO ĐỘ PHỨC TẠP

> **Quan trọng**: Không áp dụng đồng đều 6 bước cho mọi thay đổi. Phân loại trước.

### Thay đổi ĐƠN GIẢN (sửa 1 file, ≤ 10 dòng)
```
1. READ       → Đọc file liên quan, lấy oldString chính xác
2. BACKUP     → Lưu plan_temp/
3. PROPOSE    → Trình bày rõ kế hoạch sửa → CHờ USER XÁC NHẬN
4. EDIT       → Thực hiện surgical edit (sau khi được xác nhận)
5. VERIFY     → Read lại file để confirm thay đổi đúng
6. UPDATE DOC → Cập nhật PLAN.md sau khi user xác nhận OK
```

### Thay đổi PHỨC TẠP (nhiều file, cấu trúc lớn, tính năng mới)
```
1. READ       → Đọc tất cả file liên quan (không bỏ sót)
2. ANALYZE    → Phân tích dựa trên code thực tế, không suy đoán
3. BACKUP     → Lưu plan_temp/ cho từng file sẽ sửa
4. PLAN       → Trình bày kế hoạch chi tiết
5. CONFIRM    → CHờ USER XÁC NHẬN — không sửa nếu chưa được đồng ý
6. EDIT       → Thực hiện từng file một
7. VERIFY     → Read lại, kiểm tra output
8. UPDATE DOC → Cập nhật PLAN.md + docs/{feature}.md nếu có
```

### 9. KHÔI PHỤC — THỨ TỰ ƯU TIÊN & BẮT BUỘC HỎI TRƯỚC
> Tuyệt đối **KHÔNG ĐƯỢC TỰ ĐỘNG** thực hiện bất cứ bước khôi phục nào nếu chưa báo cáo và được user xác nhận đồng ý.

Khi cần khôi phục code, phải tuân thủ nghiêm ngặt thứ tự ưu tiên sau:
1. **Ưu tiên 1 (File backup lẻ)**: Đọc file trong `plan_temp/` → Copy nội dung → Paste đè file gốc.
2. **Ưu tiên 2 (Git repository)**: Sử dụng lệnh `git checkout -- <file>` hoặc `git reset` để lấy lại bản commit gần nhất.
3. **Ưu tiên 3 (Zip backup toàn bộ)**: Chạy script `.\restore-from-backup.ps1` → Chọn ZIP → `npm install` (Chỉ dùng khi hỏng nặng toàn dự án).
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

### A. Backup đúng chuẩn — Format 3 dòng note
```
# BACKUP NOTE: [2026-05-03 12:00] - Tình trạng: Ổn định
# TÌNH TRẠNG: Upload ảnh OK | Form đăng ký OK | Affiliate OK
# KẾ HOẠCH: Thêm validation mật khẩu vào account-settings
```
> Tên file: `plan_temp/{tên_file_gốc}_backup_YYYYMMDD_HHMM.txt`

### B. Edit đúng kỹ thuật (tránh "oldString not found")
```
❌ SAI: Tự gõ lại oldString, hoặc copy từ terminal output (sai whitespace)
✅ ĐÚNG: read() file → copy Y NGUYÊN text từ nội dung file → dùng làm oldString

Quy tắc oldString:
- Chỉ 1–3 dòng, đủ để xác định duy nhất vị trí trong file
- Phải bao gồm đúng whitespace/indentation gốc
- Luôn dùng replaceAll: false
```

### C. Next.js 16 — Các lỗi thường gặp
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

### D. Form Data Integrity (React Hook Form + disabled field)
```tsx
// ❌ SAI: disabled field không được RHF capture khi submit
<input disabled {...register("referrerId")} />

// ✅ ĐÚNG: hidden giữ data, disabled chỉ để hiển thị UI
{isLocked && <input type="hidden" {...register("referrerId")} value={lockedValue} />}
<input disabled={isLocked} value={isLocked ? lockedValue : undefined}
       {...(isLocked ? {} : register("referrerId"))} />
```

### E. Quy ước đặt tên
```
Components  → PascalCase    : CourseCard.tsx, ShareModal.tsx
Hooks       → camelCase     : useAffiliateCode.ts
Actions     → kebab-case    : affiliate-actions.ts
API routes  → kebab-case    : /api/auth/has-password/route.ts
```

### G. Cập nhật PLAN.md — Format chuẩn
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

---

## 📁 TÀI LIỆU QUAN TRỌNG

- `PLAN.md` — Lịch sử thay đổi & kế hoạch kỹ thuật
- `GEMINI.md` — Hướng dẫn nền tảng cho AI agent
- `docs/AFFILIATE_SYSTEM.md` — Tài liệu hệ thống Affiliate
- `plan_temp/` — Backup files (tra cứu khi cần restore)
