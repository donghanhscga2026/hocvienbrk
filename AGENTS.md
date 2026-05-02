# Workspace Configuration

Quy tắc cho agent làm việc trong workspace này.

---

## QUY TRÌNH 3 BƯỚC CHUẨN (NHẤT!)

### Khi sắp sửa file (Bắt buộc):
1. **BACKUP** → `read` file gốc → Copy toàn bộ → Lưu `plan_temp/{file}_backup_YYYYMMDD_HHMM.txt` (3 dòng note)
2. **SO SÁNH** → Đọc code cũ (backup/git/file) → Nắm rõ trước khi đổi
3. **EDIT** → `read` lấy oldString (1-3 dòng) → `edit` → `read` lại verify ngay
4. **TEST** → Kiểm tra thủ công → Chờ user xác nhận

### Khi muốn quay lại:
- **File lỗi** → Đọc note backup → Copy nội dung → Paste đè file gốc
- **Code hỏng nặng** → Chạy `.\restore-from-backup.ps1` → Chọn ZIP → `npm install`

---

## 1. Cấu hình chung

| Công nghệ | Chi tiết |
|-----------|----------|
| Framework | Next.js 16 (App Router) |
| Database | Prisma ORM + PostgreSQL |
| Authentication | NextAuth v5 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict mode) |

### Cấu trúc thư mục
```
app/           - Next.js App Router pages & API
components/    - React components (theo feature: components/home/, components/course/)
hooks/         - Custom React hooks
lib/           - Utility functions & business logic (lib/affiliate/)
scripts/       - Migration scripts, seed, data import
prisma/        - Database schema & seed files
```

---

## 2. BACKUP & RESTORE

### A. Thủ công (plan_temp/) - Trước khi sửa
1. Đọc file gốc bằng `read` tool
2. Copy toàn bộ nội dung → Lưu `plan_temp/{original}_backup_YYYYMMDD_HHMM_note.txt`
3. Ghi 3 dòng note đầu:
```bash
# BACKUP NOTE: [2026-05-02 08:30] - [Tình trạng: OK]
# TÌNH TRẠNG: [Các tính năng đang OK]
# KẾ HOẠCH: [Chuẩn bị sửa gì]
```
4. Tự động dọn: Chỉ giữ **1 bản mới nhất** cho mỗi loại file

### B. Tự động (backups/) - Trước khi Push
- **Script**: `auto-commit-push.ps1` (Bước 2)
- **Vị trí**: `backups/backup_YYYY-MM-DD_HH-mm.zip`
- **Nội dung**: Toàn bộ dự án (trừ `node_modules/`, `.next/`, `.git/`, `backups/`)
- **Tự động dọn**: Chỉ giữ **5 file ZIP mới nhất**

### C. Khôi phục (Restore)
| Cách | Khi nào | Thao tác |
|------|--------|-----------|
| Từ `plan_temp/` | File lỗi, cần bản cũ | Đọc note → Copy → Paste đè file gốc |
| Từ `backups/*.zip` | Code hỏng nặng | `.\restore-from-backup.ps1` → Chọn ZIP → `npm install` |

### D. So sánh với Git HEAD
```bash
git show HEAD:<file>  # Xem file trên git
cat plan_temp/<backup>.txt  # So sánh với backup
```
**Nguyên tắc**: Ưu tiên bản khớp 100% với git HEAD.

---

## 3. SỬA CODE (NHANH & AN TOÀN)

### Quy trình 4 bước (Bắt buộc):
1. **BACKUP** → `read` file → Copy toàn bộ → Lưu `plan_temp/` (3 dòng note)
2. **SO SÁNH** → Đọc code cũ (ưu tiên: backup → git → file hiện tại)
3. **EDIT** → `read` lấy oldString (1-3 dòng) → `edit` → `read` lại verify ngay
4. **TEST** → Kiểm tra → Chờ user xác nhận

**🔴 QUY TẮC VÀNG: KHI NÀO DÙNG `edit` / KHI NÀO DÙNG `write`:**
- ✅ **Dùng `edit` (oldString 1-3 dòng)**: Chỉ sửa 1-5 dòng, đổi 1 thông số (vd: `pt-2` → `pt-4`)
- ✅ **Dùng `write` (viết lại toàn bộ)**: Tái cấu trúc file, thay đổi >10 dòng, hoặc `edit` thất bại 2 lần
- ❌ **SAI LẶM (nguyên nhân lỗi lặp)**: Cố `edit` thay thế 30-70 dòng cùng lúc → Lỗi "oldString not found" → Thử lại → Lặp 5-6 lần → Cuối cùng dùng `write`
- **Bài học**: Khi cần thay đổi >10 dòng → Dùng `write` từ đầu cho nhanh. Không lặp lại việc `edit` thất bại.

**🔴 QUY TẮC BẮT BƯỢC (TRÁNH MẤT CODE CŨ KHI WRITE):**
1. **TRƯỚC KHI WRITE**: Đọc TOÀN BỘ code gốc → Lập danh sách TẤT CẢ TÍNH NĂNG đang có (vd: [x] Upload ảnh OK, [x] Select category OK)
2. **LẬP MỤC TIÊU MỚI**: Danh sách những gì code mới cần đạt được (vd: [ ] Thêm trường MSSV, [ ] Fix lỗi date)
3. **SAU KHI WRITE**: Kiểm tra lại TOÀN BỘ → Check [x] Tất cả tính năng cũ còn đó + [x] Mục tiêu mới hoàn thành
4. **THIẾU CODE**: Nếu tính năng nào bị mất → KHÔI PHỤC NGAY từ `plan_temp/` backup (đọc note 3 dòng) → Paste đè file gốc
5. **BắT BUỘC**: KHÔNG được bỏ qua bước 1 (đọc toàn bộ) và bước 3 (kiểm tra lại). Nếu mất code → Lỗi của agent.

### Kỹ thuật EDIT (Tránh lỗi "oldString not found"):
- ✅ **ĐÚNG**: `read({ filePath, offset })` → Copy Y NGUYÊN `<content>` (tabs/spaces đúng 100%)
- ❌ **SAI**: Tự gõ oldString, copy từ terminal (sai whitespace)
- **oldString NGẮN GỌN**: Chỉ 1-3 dòng, chứa phần cần đổi + đủ để định vị duy nhất
- **LUÔN DÙNG `replaceAll: false`** → Tránh thay thế nhầm nhiều chỗ
- **Ví dụ**: Chỉ đổi `pt-2` → `pt-4` thì oldString = `"    pt-2"` (1 dòng)

### Verify sau edit (Bắt buộc):
- [ ] Đã `read` file trước edit (lấy oldString)
- [ ] Đã edit với oldString ngắn (1-3 dòng)
- [ ] Đã `read` lại (cùng offset) để verify
- [ ] Đã test thủ công + chờ user xác nhận

### Version & An toàn:
**Nâng cấp version:**
- **Patch (số cuối)**: Sửa bug nhỏ → `// @version 2.3.1 - Patch: fix bug`
- **Minor (số giữa)**: Thay đổi logic → `// @version 2.4.0`
- **Major (số đầu)**: Thêm tính năng → `// @version 3.0.0`

**An toàn (NHẤT!):**
- ❌ SAI: `if (userId)` → userId=0 là falsy → false
- ✅ ĐÚNG: `if (userId != null)` → userId=0 → true
- ❌ SAI: Đổi tên biến tùy tiện → ✅ Giữ nguyên, cần đổi **phải hỏi user**
- ❌ SAI: Xóa biến khi chưa search → ✅ Dùng grep tìm tất cả nơi dùng

---

## 4. TEST & VERIFY

**TEST VÀ XÁC NHẬN** - Mỗi bước xong phải chờ user xác nhận.
**THAY ĐỔI NHỎ, TEST LIÊN TỤC** - Sửa từng phần nhỏ, test ngay.
**NGUYÊN TẮC BUILD TEST:**
- Chỉ `npm run build` khi thay đổi lớn (thêm feature, thay đổi cấu trúc)
- Sửa nhỏ (fix bug, UI) → KHÔNG cần build, chỉ verify thủ công

**NGUYÊN TẮC DATABASE:**
1. Dừng server dev → `npx prisma generate` → Start lại server
2. `npx prisma db push` nếu cần sync schema

---

## 5. SHELL COMMANDS (QUAN TRỌNG)

**LUÔN DÙNG LỆNH BASH UNIX** (không dùng PowerShell):

| Tác vụ | ✅ BASH UNIX | ❌ PowerShell |
|--------|---------------|---------------|
| Copy file | `cp a.txt b.txt` | `Copy-Item a.txt b.txt` |
| Tạo thư mục | `mkdir -p dir/` | `New-Item -ItemType Directory dir` |
| Xóa file | `rm file.txt` | `Remove-Item file.txt` |
| Xóa thư mục | `rm -rf dir/` | `Remove-Item -Recurse -Force dir/` |
| Đường dẫn | `C:/Users/ADMIN/Desktop/project` | `C:\Users\ADMIN\Desktop\project` |

---

## 6. QUY TẮC CODE

### Next.js 16 Migration
```typescript
// ✅ Route Handler: params phải là Promise
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
}

// ✅ useSearchParams() phải có Suspense boundary
function PageContent() {
    const searchParams = useSearchParams()
    return <div>{searchParams.get('q')}</div>
}
export default function Page() {
    return <Suspense fallback={<Loading />}><PageContent /></Suspense>
}

// ✅ Dùng revalidatePath thay vì revalidateTag
import { revalidatePath } from "next/cache"
revalidatePath('/some-page')
```

### TypeScript & React
- **Strict Mode**: Khai báo explicit types, tránh `any`
- **Lazy Loading**: Dùng `useRef` thay vì `useState` cho giá trị tạm thời (tránh re-render vô hạn)
- **Server Actions**: KHÔNG gọi trực tiếp trong client components → Dùng `fetch('/api/...')` thay thế

### Quy ước đặt tên
- **Components**: PascalCase (`CourseCard.tsx`, `ShareModal.tsx`)
- **Hooks**: camelCase với prefix `use` (`useAffiliateCode.ts`)
- **Actions**: kebab-case (`affiliate-actions.ts`)
- **Scripts**: camelCase (`import-csv.ts`, `seed-courses.ts`)

### Format & Comments
- **Import order**: External → Internal → Relative
- **Comments**: Tiếng Việt, ghi rõ "Sửa cái gì, tác dụng như nào"
- **ESLint**: Luôn chạy `npm run lint` trước khi commit/build

---

## 7. COMMANDS

### Development
```bash
npm run dev          # Development server (http://localhost:3000)
npm run build       # Production build (LUÔN chạy trước khi deploy)
npm run start       # Production server
npm run lint        # ESLint check
```

### Database
```bash
npx prisma generate     # Generate Prisma client (SAU KHI SỬA SCHEMA)
npx prisma db push      # Push schema lên database
npx prisma validate     # Validate schema
```

### Scripts có sẵn
```bash
npm run import-csv      # Import CSV data
npm run seed-courses    # Seed courses
npm run make-admin      # Make user admin
npm run import-v3      # Import v3 data
```

---

## 8. TESTING

### Pre-Deployment Checklist
- [ ] Chạy `npx prisma generate` sau mỗi lần sửa schema
- [ ] Test local: `npm run build` trước khi deploy
- [ ] Kiểm tra tất cả route handlers có `await params` (Next.js 16)
- [ ] Kiểm tra tất cả `useSearchParams()` được wrap trong Suspense
- [ ] KHÔNG dùng `revalidateTag` - dùng `revalidatePath` thay thế

### Lưu ý
- Dự án hiện không có unit test framework
- Test thủ công qua scripts trong `scripts/`
- Luôn test với `npm run build` trước khi báo cáo hoàn thành

---

## 9. CÁC HỆ THỐNG

### Affiliate System (Đã hoàn thành)
- Multi-level Points (F1: 10%, F2: 5%, F3: 2%)
- Wallet & Payout system
- CTV Dashboard (`/affiliate`), Admin Dashboard (`/admin/affiliate`)

### Landing Page System (Đã hoàn thành)
- 5 pre-built templates (hero-cta, feature-grid, video-intro, webinar-reg, testimonial)
- Click tracking, Commission override

### Share Module (Đã hoàn thành)
- Share button trên course cards, Modal chia sẻ (Facebook, Zalo, Telegram)
- Affiliate link auto-generation

---

## 10. FILE THAM KHẢO

- `PLAN.md` - Lịch sử thay đổi và tài liệu kỹ thuật chi tiết
- `docs/AFFILIATE_SYSTEM.md` - Tài liệu hệ thống Affiliate

---

**Ghi chú**: Mỗi phiên làm việc mới, agent sẽ đọc file này trước tiên để áp dụng các quy tắc.
