# KẾ HOẠCH TỐI ƯU HIỆU SUẤT & UX

## QUY TẮC KIM CƯƠNG (TUÂN THỦ NGHIÊM NGHI)

1. **KHÔNG VIẾT LẠI TOÀN BỘ FILE** - Chỉ edit đúng phần cần tối ưu
2. **LUÔN LƯU BACKUP TRƯỚC KHI SỬA** - File gốc vào plan_temp
3. **SO SÁNH CODE CŨ VỚI MỚI** - Trước khi xác nhận hoàn thành
4. **TEST VÀ XÁC NHẬN** - Mỗi bước xong phải chờ user xác nhận mới làm tiếp
5. **TUÂN THỦ NGUYÊN TẮC** - Không làm mất tính năng đang hoạt động

---

## Tổng quan
Dự án này tối ưu hiệu suất và trải nghiệm người dùng cho HocVien-BRK. Được thực hiện theo nguyên tắc Kim Cương: ưu tiên tác động lớn + dễ làm trước.

---

## THỨ TỰ THỰC HIỆN

```
Bước 1: Course Player (page.tsx + VideoPlayer)          [Dễ]
Bước 2: ImageViewer - Fix pan/zoom lag                    [Dễ]
Bước 3: Next.js Image Optimization                       [Dễ, impact lớn]
Bước 4: Home Page - Fix waterfall                        [Dễ]
Bước 5: Admin Students - Server-side pagination         [Trung bình] ⚠️ ĐANG SỬA
Bước 6: Roadmap Builder - Tách API                        [Trung bình]
Bước 7: Community Board - Add limit                      [Dễ]
Bước 8: Email Settings - Server fetch                    [Dễ]
Bước 9: Auto-verify - Fix DB query order                  [Dễ]
Bước 10: Campaign - Virtual Scrolling + Progress API      [Phức tạp]
```

---

## CHI TIẾT TỪNG BƯỚC

### Bước 1: Course Player (page.tsx + VideoPlayer)

**Vấn đề:**
- Dòng `export const dynamic = "force-dynamic"; //test thử xem lỗi gì - dùng xong xóa` gây chậm TTFB
- Parse playlist bằng regex trên client (VideoPlayer.tsx:41-50)

**Giải pháp:**
1. Xóa dòng comment test trong `app/courses/[id]/learn/page.tsx:6`
2. Parse playlist thành mảng JSON trong page.tsx (Server), truyền mảng vào VideoPlayer

**Files liên quan:**
- `app/courses/[id]/learn/page.tsx`
- `components/course/VideoPlayer.tsx`

---

### Bước 2: ImageViewer - Fix pan/zoom lag

**Vấn đề:**
- Dùng `setPosition` trong onMouseMove gây re-render liên tục, lag khi kéo/zoom

**Giải pháp:**
- Dùng `useRef` cho tọa độ, can thiệp DOM trực tiếp
- Chỉ `setPosition` khi `onMouseUp` kết thúc

**Files liên quan:**
- `components/ImageViewer.tsx`

---

### Bước 3: Next.js Image Optimization

**Vấn đề:**
- `unoptimized: true` vô hiệu hóa resize + WebP, tốn băng thông

**Giải pháp:**
- Xóa dòng `unoptimized: true` trong `next.config.ts:20`
- Giữ nguyên `remotePatterns` đã cấu hình

**Files liên quan:**
- `next.config.ts`

---

### Bước 4: Home Page - Fix waterfall

**Vấn đề:**
- `enrollments` fetch sau Promise.all tạo waterfall

**Giải pháp:**
- Đưa enrollment query vào Promise.all

**Files liên quan:**
- `app/page.tsx`

---

### Bước 5: Admin Students - Server-side pagination

**Vấn đề:**
- `getStudentsAction('', 'ALL')` lấy toàn bộ user về client rồi filter bằng JS

**Giải pháp:**
- Thêm `take`, `skip` vào Prisma query
- Chuyển filter/search xuống Server Action

**Files liên quan:**
- `app/actions/admin-actions.ts`
- `app/admin/students/page.tsx`

---

### Bước 6: Roadmap Builder - Tách API

**Vấn đề:**
- `getAllSurveys()` lấy cả field `flow` (nặng) khi chỉ cần list tên

**Giải pháp:**
- `getAllSurveys()`: chỉ lấy `{id, name, isActive}`
- Tạo `getSurveyFlow(id)` riêng để lấy flow khi cần

**Files liên quan:**
- `app/actions/roadmap-actions.ts`
- `app/admin/roadmap/page.tsx`

---

### Bước 7: Community Board - Add limit

**Vấn đề:**
- `getPostsAction()` không có limit, tải toàn bộ posts về

**Giải pháp:**
- Thêm `take: 10` vào Prisma query
- Thêm nút "Xem thêm" để load tiếp

**Files liên quan:**
- `app/actions/post-actions.ts`
- `components/home/CommunityBoard.tsx`

---

### Bước 8: Email Settings - Server fetch

**Vấn đề:**
- Dùng useEffect gọi API `/api/admin/email-config` khi mount, gây flash

**Giải pháp:**
- Fetch trực tiếp trong Server Component `page.tsx`
- Truyền prop xuống client component

**Files liên quan:**
- `app/admin/email-settings/page.tsx`
- `app/admin/email-settings/EmailSettingsClient.tsx`

---

### Bước 9: Auto-verify - Fix DB query order

**Vấn đề:**
- Query Prisma `pendingEnrollments` chạy trước khi kiểm tra có email mới không

**Giải pháp:**
- Di chuyển query Prisma vào trong `if (messages.length > 0)`

**Files liên quan:**
- `lib/auto-verify.ts`

---

### Bước 10: Campaign - Virtual Scrolling + Progress API

**Vấn đề:**
- Polling 10s tải toàn bộ logs (5000+ bản ghi) gây freeze

**Giải pháp:**
- Tách API: `/progress` (sent/failed/progress) - polling 5s
- Logs chi tiết: Virtual Scrolling hoặc Pagination

**Files liên quan:**
- `app/admin/campaigns/[id]/page.tsx`
- Tạo API route mới

---

## TRẠNG THÁI THỰC HIỆN

| Bước | Trạng thái | Ghi chú |
|------|------------|---------|
| 1 | ✅ Hoàn thành | Course Player - Xóa dynamic, parse playlist server-side |
| 2 | ✅ Hoàn thành | ImageViewer - Fix pan/zoom lag, dùng useRef + DOM direct |
| 3 | ✅ Hoàn thành | Next.js Image - Bật tối ưu, xóa unoptimized |
| 4 | ✅ Hoàn thành | Home Page - Fix waterfall, enrollments vào Promise.all |
| 5 | ⚠️ Cần test | Admin Students - Server pagination (cần user xác nhận) |
| 6 | ⏳ Chờ xác nhận | Roadmap Builder |
| 7 | ⏳ Chờ xác nhận | Community Board |
| 8 | ⏳ Chờ xác nhận | Email Settings |
| 9 | ⏳ Chờ xác nhận | Auto-verify |
| 10 | ⏳ Chờ xác nhận | Campaign |

---

## NGÀY CẬP NHẬT
- Created: 2026-03-24
- Bước 1-4 hoàn thành: 2026-03-24
- Bước 5 cần test: 2026-03-24
