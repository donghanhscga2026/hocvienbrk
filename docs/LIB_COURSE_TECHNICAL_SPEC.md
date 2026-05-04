# TÀI LIỆU KỸ THUẬT
## Nâng cấp tính năng khóa học LIB (Learning Information Base)

**Ngày:** 12/04/2026  
**Phiên bản:** 1.0  
**Trạng thái:** Lên kế hoạch

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu
Bổ sung loại khóa học mới `LIB` (Learning Information Base) - đại diện cho khóa học mang tính chất tài liệu học tập tự do, không có phần Ghi nhận/đánh giá, được bảo vệ bởi cơ chế xác minh email.

### 1.2 Yêu cầu chức năng

| Chức năng | Mô tả |
|-----------|-------|
| **Loại khóa học mới** | Thêm `LIB` vào enum `CourseType` |
| **Không có Ghi nhận** | Ẩn tab "Ghi nhận", không hiển thị AssignmentForm |
| **Xem tự do** | Cho phép xem tất cả bài học không cần theo thứ tự, không tính điểm |
| **Bảo vệ video** | Không cho phép chuyển sang YouTube (vô hiệu hóa nút chia sẻ/link) |
| **Xác minh email** | Chỉ user có email trong whitelist mới được xem LIB courses |

### 1.3 So sánh các loại khóa học

| Tính năng | NORMAL | CHALLENGE | LIB |
|-----------|--------|-----------|-----|
| Xem theo thứ tự | ✅ Có | ✅ Có | ❌ Tự do |
| Tab Ghi nhận | ✅ Có | ✅ Có | ❌ Không có |
| Tính điểm/Progress | ✅ Có | ✅ Có | ❌ Không |
| Xác minh email | ❌ Không | ❌ Không | ✅ Có |
| Bảo vệ video | ❌ Không | ❌ Không | ✅ Có |

---

## 2. THAY ĐỔI DATABASE

### 2.1 Cập nhật enum CourseType

**File**: `prisma/schema.prisma:420-423`

```prisma
enum CourseType {
  NORMAL
  CHALLENGE
  LIB  // Thêm mới - Learning Information Base
}
```

**Lý do**: Để phân biệt các loại khóa học và xử lý logic riêng cho từng loại.

### 2.2 Tạo bảng CourseLibAccess

**File**: `prisma/schema.prisma` (thêm mới)

```prisma
model CourseLibAccess {
  id          Int       @id @default(autoincrement())
  courseId    Int
  email       String    // Email được cấp quyền xem
  createdAt   DateTime  @default(now())
  
  course      Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@unique([courseId, email])  // 1 email chỉ được 1 quyền/course
  @@index([courseId])
  @@index([email])
}
```

**Lý do**: Lưu trữ danh sách email được phép xem LIB courses. Dùng `@@unique([courseId, email])` để tránh trùng lặp.

### 2.3 Migration

```bash
# Chạy sau khi sửa schema
npx prisma generate
npx prisma db push
```

---

## 3. BACKEND API

### 3.1 API Kiểm tra quyền truy cập LIB course

**File tạo mới**: `app/api/courses/[id]/check-access/route.ts`

**Logic**:
```
1. Lấy course từ DB
2. Nếu course.type != 'LIB' → return { allowed: true } (giữ nguyên rule cũ)
3. Nếu course.type == 'LIB':
   a. Kiểm tra user đã đăng nhập chưa → nếu chưa return { allowed: false, reason: 'NOT_LOGGED_IN' }
   b. Lấy email từ session
   c. Query CourseLibAccess where { courseId, email }
   d. Nếu có kết quả → return { allowed: true }
   e. Nếu không có → return { allowed: false, reason: 'NOT_AUTHORIZED' }
```

**Lý do**: Kiểm tra quyền truy cập trước khi cho phép xem khóa học LIB.

### 3.2 API Quản lý email (Admin)

**File tạo mới**: `app/api/admin/courses/[id]/lib-access/route.ts`

| Method | Mô tả |
|--------|-------|
| GET | Lấy danh sách email được cấp quyền |
| POST | Thêm email mới (`{ email: string }`) |
| DELETE | Xóa email (`{ email: string }`) |

**Lý do**: Cho phép admin quản lý danh sách email được phép xem LIB courses.

### 3.3 Cập nhật Course Actions

**File sửa**: `app/actions/course-actions.ts`

Thêm function:
```typescript
export async function getLibAccessEmails(courseId: number): Promise<string[]> {
  const access = await prisma.courseLibAccess.findMany({
    where: { courseId },
    select: { email: true }
  })
  return access.map(a => a.email)
}
```

**Lý do**: Hỗ trợ frontend lấy danh sách email để hiển thị/admin.

---

## 4. FRONTEND - COURSE PLAYER

### 4.1 Cập nhật CoursePlayer

**File sửa**: `components/course/CoursePlayer.tsx`

**Thay đổi 1**: Thêm prop `courseType` để nhận biết loại course
```typescript
// Line ~23-27: Cập nhật interface
interface CoursePlayerProps {
  course: {
    ... // existing fields
    type: 'NORMAL' | 'CHALLENGE' | 'LIB'  // Thêm type
  }
  // ... rest
}
```

**Thay đổi 2**: Logic Ẩn tab "Ghi nhận" cho LIB
```typescript
// Trong component, thêm biến check
const isLibCourse = course.type === 'LIB'

// Mobile tabs (Line ~350-365): Ẩn tab "Ghi nhận" nếu là LIB
const mobileTabs = isLibCourse 
  ? [
      { id: 'list', icon: ListVideo, label: 'Danh sách' },
      { id: 'content', icon: FileText, label: 'Nội dung' },
    ]
  : [
      { id: 'list', icon: ListVideo, label: 'Danh sách' },
      { id: 'content', icon: FileText, label: 'Nội dung' },
      { id: 'record', icon: ClipboardCheck, label: 'Ghi nhận' },
    ]
```

**Thay đổi 3**: Ẩn AssignmentForm trong desktop layout
```typescript
// Line ~370-391: Desktop layout
{!isLibCourse && (
  <div className="w-[400px] shrink-0 border-l border-zinc-800 flex flex-col">
    <AssignmentForm ... />
  </div>
)}
```

**Lý do**: LIB courses không cần phần ghi nhận/chấm điểm, chỉ cần xem nội dung.

**Thay đổi 4**: Cho phép xem tất cả bài học không cần theo thứ tự
```typescript
// Trong LessonSidebar/Progress: Bỏ logic kiểm tra lesson trước đó đã hoàn thành chưa
// Với LIB: Không cần kiểm tra `isLessonUnlocked` hay `canAccessLesson`
```

**Lý do**: LIB courses cho phép xem tự do, không cần hoàn thành bài trước.

### 4.2 Cập nhật VideoPlayer

**File sửa**: `components/course/VideoPlayer.tsx`

**Thay đổi**: Disable nút chia sẻ/chuyển YouTube cho LIB
```typescript
// Thêm prop mới
interface VideoPlayerProps {
  // ... existing
  isLibCourse?: boolean  // Thêm prop mới
}

// Trong component, ẩn/c disabled các nút dẫn đến YouTube external
{!isLibCourse && (
  <button 
    onClick={() => window.open(videoUrl, '_blank')}
    className="..." // Nút mở YouTube
  >
    <ExternalLink className="w-4 h-4" />
  </button>
)}
```

**Lý do**: Ngăn user chuyển từ web sang xem trực tiếp trên YouTube (video được đặt ở chế độ private, chỉ xem được khi add email vào whitelist).

### 4.3 Tạo component Badge

**File tạo mới**: `components/course/LibBadge.tsx`

```typescript
export function LibBadge() {
  return (
    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
      📚 Tài liệu
    </span>
  )
}
```

**Lý do**: Hiển thị badge trên course card để phân biệt LIB courses với NORMAL/CHALLENGE.

---

## 5. FRONTEND - ADMIN

### 5.1 Trang quản lý LIB Access

**File tạo mới**: `app/admin/courses/[id]/lib-access/page.tsx`

**UI Components**:
1. **Danh sách email**: Table hiển thị email + ngày thêm + action xóa
2. **Form thêm email**: Input text + nút "Thêm"
3. **Import CSV**: Button import danh sách email từ file
4. **Copy email list**: Button copy to clipboard

**Logic**:
- Gọi GET/POST/DELETE đến `/api/admin/courses/[id]/lib-access`
- Hiển thị toast message khi thêm/xóa thành công
- Validate email format trước khi thêm

### 5.2 Cập nhật trang edit course

**File sửa**: `app/admin/courses/[id]/page.tsx`

**Thay đổi**: Thêm dropdown/chọn loại course
```typescript
// Thêm vào form edit (line ~240-260)
<div className="space-y-1.5">
  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Loại khóa học</label>
  <select 
    value={type} 
    onChange={(e) => setType(e.target.value)}
    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
  >
    <option value="NORMAL">Bình thường</option>
    <option value="CHALLENGE">Thử thách</option>
    <option value="LIB">Tài liệu (LIB)</option>
  </select>
  {type === 'LIB' && (
    <p className="text-xs text-blue-600">⚠️ Khóa học LIB yêu cầu xác minh email để truy cập</p>
  )}
</div>
```

**Lý do**: Cho phép admin chọn loại khóa học khi tạo/sửa.

---

## 6. CẬP NHẬT TRANG HỌC (LEARN PAGE)

### 6.1 Cập nhật CourseLearnPage

**File sửa**: `app/courses/[id]/learn/page.tsx`

**Thay đổi**: Thêm kiểm tra quyền truy cập LIB
```typescript
// Sau khi lấy enrollment (line ~106)
// Thêm: Kiểm tra nếu là LIB course và không có quyền → redirect

// Lấy course type
const courseType = enrollment.course.type

if (courseType === 'LIB') {
  // Kiểm tra email có trong whitelist không
  const userEmail = session.user.email
  const hasAccess = await prisma.courseLibAccess.findUnique({
    where: {
      courseId_email: {
        courseId: course.id,
        email: userEmail
      }
    }
  })
  
  if (!hasAccess) {
    redirect(`/courses/${id}?error=lib_access_denied`)
  }
}
```

**Lý do**: Đảm bảo chỉ user có email trong whitelist mới truy cập được LIB courses.

---

## 7. FILES CẦN TẠO MỚI

| File | Mô tả |
|------|-------|
| `app/api/courses/[id]/check-access/route.ts` | API kiểm tra quyền truy cập LIB |
| `app/api/admin/courses/[id]/lib-access/route.ts` | API quản lý email (Admin) |
| `app/admin/courses/[id]/lib-access/page.tsx` | Trang quản lý LIB Access |
| `components/course/LibBadge.tsx` | Badge hiển thị "Tài liệu" |

---

## 8. FILES CẦN CHỈNH SỬA

| File | Thay đổi |
|------|---------|
| `prisma/schema.prisma` | Thêm LIB vào enum, tạo bảng CourseLibAccess |
| `app/actions/course-actions.ts` | Thêm function getLibAccessEmails |
| `components/course/CoursePlayer.tsx` | Logic Ẩn tab Ghi nhận, cho phép xem tự do |
| `components/course/VideoPlayer.tsx` | Disable nút mở YouTube cho LIB |
| `app/courses/[id]/learn/page.tsx` | Kiểm tra quyền truy cập LIB |
| `app/admin/courses/[id]/page.tsx` | Thêm dropdown chọn loại course |

---

## 9. QUY TRÌNH TRIỂN KHAI (BƯỚC THEO THỨ TỰ)

### Bước 1: Database (5 phút)
- [ ] Sửa `prisma/schema.prisma` - thêm LIB vào enum + tạo bảng CourseLibAccess
- [ ] Chạy `npx prisma generate`
- [ ] Chạy `npx prisma db push`

### Bước 2: Backend APIs (15 phút)
- [ ] Tạo `app/api/courses/[id]/check-access/route.ts`
- [ ] Tạo `app/api/admin/courses/[id]/lib-access/route.ts`
- [ ] Cập nhật `app/actions/course-actions.ts`

### Bước 3: Frontend - CoursePlayer (20 phút)
- [ ] Backup `components/course/CoursePlayer.tsx` → `plan_temp/`
- [ ] Sửa CoursePlayer - thêm logic LIB
- [ ] Sửa VideoPlayer - disable YouTube button

### Bước 4: Frontend - Learn Page (10 phút)
- [ ] Backup `app/courses/[id]/learn/page.tsx` → `plan_temp/`
- [ ] Sửa Learn page - thêm kiểm tra quyền LIB

### Bước 5: Frontend - Admin (15 phút)
- [ ] Backup `app/admin/courses/[id]/page.tsx` → `plan_temp/`
- [ ] Sửa trang edit course - thêm dropdown type
- [ ] Tạo trang quản lý LIB Access

### Bước 6: Testing (15 phút)
- [ ] Tạo test course với type LIB
- [ ] Thêm email test vào whitelist
- [ ] Test xem course LIB (user có email trong whitelist)
- [ ] Test không xem được (user không có trong whitelist)
- [ ] Chạy `npm run build` - đảm bảo không lỗi

---

## 10. BACKUP (Theo quy tắc kim cương)

Trước khi sửa các files, lưu backup vào `plan_temp/`:
- `CoursePlayer_backup_2026-04-12.tsx`
- `VideoPlayer_backup_2026-04-12.tsx`
- `learn_backup_2026-04-12.tsx`
- `admin_course_backup_2026-04-12.tsx`

---

## 11. LƯU Ý QUAN TRỌNG

1. **YouTube Private Playlist**: Video LIB courses cần được đặt ở chế độ private/unlisted trên YouTube. Admin cần thêm email vào whitelist của playlist để user có thể xem.

2. **Không tính điểm**: LIB courses không lưu progress vào DB (hoặc lưu nhưng không hiển thị).

3. **Validation**: Khi tạo LIB course, hệ thống nên yêu cầu admin thêm ít nhất 1 email vào whitelist.

---

## 12. HISTORY

| Ngày | Phiên | Mô tả |
|------|-------|-------|
| 12/04/2026 | 1.0 | Tạo tài liệu kỹ thuật ban đầu |

---

*Document generated for HocVien-BRK Project*