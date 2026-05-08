# TÀI LIỆU KỸ THUẬT & CHANGE LOG
## Quản lý Khóa học (Teacher Permission System)
**Ngày tạo:** 2026-04-30  
**Phiên bản hiện tại:** 2.2.1  
**Trạng thái:** Hoàn thành 100% (đã thêm combo category, tăng chiều cao textarea, upload ảnh bìa, nested playlist trong 1 bài học, content thành Phần 1 trong playlist)  
**Người phụ trách:** AI Agent + Admin

---
## 📋 MỤC LỤC
 1. [Tổng quan](#tổng-quan)
 2. [Danh sách file liên quan](#danh-sách-file)
 3. [Lịch sử thay đổi](#lịch-sử-thay-đổi)
 4. [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
 5. [Danh sách trường Course (21 trường)](#danh-sách-trường-course)
 6. [Kiểm tra hoàn thành](#kiểm-tra-hoàn-thành)
 7. [Phiên bản hiện tại](#phiên-bản-hiện-tại)

---
## 1. TỔNG QUAN
### 1.1 Mục tiêu
Phân quyền TEACHER chỉ được xem/sửa/xóa khóa học của mình (`teacherId = session.user.id`). 
ADMIN xem/sửa tất cả. Bổ sung đầy đủ 21 trường của bảng Course.

### 1.2 Yêu cầu chức năng
| Chức năng | Mô tả | Trạng thái |
|-----------|-------|-----------|
| Phân quyền TEACHER | Chỉ xem/sửa/xóa course có `teacherId = user.id` | ✅ Hoàn thành |
| Form tạo mới (21 trường) | Tạo khóa học với đủ 21 trường DB | ✅ Hoàn thành |
| Form sửa (21 trường) | Sửa tất cả trường, không chỉ 5 trường cũ | ✅ Hoàn thành |
| Nút + trên danh sách | Link to `/tools/courses/new` | ✅ Hoàn thành |

### 1.3 So sánh trước và sau
| Tính năng | Trước | Sau |
|-----------|-------|-----|
| Quyền xem | Chỉ ADMIN | ADMIN + TEACHER (theo teacherId) |
| Form sửa | 5/21 trường | 21/21 trường |
| Tạo mới | Không có | Có form 21 trường |
| Nút + | Không link | Link to `/tools/courses/new` |

---
## 2. DANH SÁCH FILE LIÊN QUAN
| STT | File | Loại | Mô tả | Trạng thái | Backup |
|-----|------|------|-------|-----------|--------|
| 1 | `app/actions/admin-actions.ts` | Sửa | getAdminCoursesAction → getCoursesAction (hỗ trợ TEACHER) | ✅ Xong (1.3.1) | `plan_temp/admin-actions_backup_20260430_v2.txt` |
| 2 | `app/actions/course-actions.ts` | Sửa + Thêm | Thêm create/delete/getTeachers | ✅ Xong (1.1.0) | `plan_temp/course-actions_backup_20260430.txt` |
| 3 | `app/tools/courses/page.tsx` | Sửa | Danh sách + phân quyền + nút + | ✅ Xong (1.0.2) | `plan_temp/courses-page_backup_20260430.txt` |
| 4 | `app/tools/courses/new/page.tsx` | Sửa | Form tạo khóa học (21 trường + combo category + upload ảnh + textarea cải tiến) | ✅ Xong (2.0.0) | `plan_temp/new-page_backup_20260501.txt` |
| 5 | `app/tools/courses/[id]/page.tsx` | Sửa | Form sửa (21 trường + combo category + upload ảnh + textarea cải tiến) | ✅ Xong (2.0.0) | `plan_temp/courses-id-page_backup_20260501_v2.txt` |
| 6 | `app/api/courses/route.ts` | Mới | POST tạo khóa học (21 trường) | ✅ Xong (1.3.0) | `plan_temp/courses-route_backup_20260430.txt` |
| 7 | `app/api/courses/[id]/route.ts` | Sửa | GET/PUT/DELETE + check teacherId | ✅ Xong (1.2.2) | `plan_temp/courses-id-route_backup_20260430.txt` |
| 8 | `components/course/VideoPlayer.tsx` | Sửa | Hiển thị TEXT trong Player, nested playlist, link clickable | ✅ Xong (2.2.0) | `plan_temp/VideoPlayer_backup_20260501_2000_before-plan.txt` |
| 9 | `app/courses/[id]/learn/page.tsx` | Sửa | Thêm nestedItems vào serverPlaylist, include type | ✅ Xong (2.2.0) | `plan_temp/learn-page_backup_20260501_2000_before-plan.txt` |
| 8 | `app/api/courses/teachers/route.ts` | Mới | GET danh sách TEACHER (ADMIN only) | ✅ Xong (1.3.0) | `plan_temp/courses-teachers-route_backup_20260430.txt` |
| 9 | `app/api/courses/categories/route.ts` | Mới | GET danh sách categories từ DB | ✅ Xong (2.0.0) | (File mới) |
| 10 | `app/api/upload/course/route.ts` | Mới | POST upload ảnh khóa học (lưu public/uploads/courses/) | ✅ Xong (2.0.0) | (File mới) |
| 9 | `prisma/schema.prisma` | Không đổi | Đã có teacherId (line 359-360) | ✅ OK | - |
| 10 | `plan_temp/*_backup_*.txt` | Backup | Tất cả backup files | ✅ Xong | - |

---
## 3. LỊCH SỬ THAY ĐỔI (CHANGE LOG)
> ⚠️ **QUY TẮC VÀNG**: Mỗi lần sửa code PHẢI cập nhật section này ngay lập tức!

### 🆕 PHIÊN 2026-05-01 20:00 - Nested Playlist & TEXT Display Fix

#### 3.16 Sửa files `components/course/VideoPlayer.tsx` và `app/courses/[id]/learn/page.tsx`
- **Thời gian**: 2026-05-01 20:00
- **Files**: 
  - `components/course/VideoPlayer.tsx` (line 25-30, 70-83, 112-122, 284-288, 357-376)
  - `app/courses/[id]/learn/page.tsx` (line 6-13, 105-133)
- **Hành động**: 
  - ✅ Thêm `nestedItems` support (nhiều phần nhỏ trong 1 bài học, tương thích ngược với videoUrl chứa `|`)
  - ✅ Sửa hiển thị TEXT type trong khung 16:9 (scroll nếu dài, chữ đen trên nền trắng, link màu xanh bấm được)
  - ✅ Thêm navigation cho nested items (Next/Prev chuyển giữa các phần nhỏ)
  - ✅ Cập nhật `learn/page.tsx` include `type` field và tạo `nestedItems` từ videoUrl chứa `|`
- **Lý do**: User muốn giữ nguyên tỷ lệ player, nested playlist hoạt động như player cũ, link trong TEXT bấm được
- **Phiên bản**: 2.2.0 (Minor - thay đổi logic player, thêm tính năng mới)

### 🆕 PHIÊN 2026-05-02 08:30 - Content thành Phần 1 trong Nested Playlist

#### 3.17 Sửa file `app/courses/[id]/learn/page.tsx`
- **Thời gian**: 2026-05-02 08:30
- **File**: `app/courses/[id]/learn/page.tsx` (line 117-145)
- **Hành động**: 
  - ✅ Sửa logic tạo `nestedItems`: Nếu có CẢ `content` VÀ `videoUrl` → Tạo nested playlist với Phần 1 = Content ("Phần 1"), các phần sau từ `videoUrl`
  - ✅ Nếu chỉ có `content` KHÔNG có `videoUrl` → Không tạo nested, giữ nguyên type='text' (hiển thị bình thường)
  - ✅ Fix cú pháp (sửa `)` thành `}` ở cuối return statements)
- **Lý do**: User muốn content luôn là Phần 1 trong playlist, ưu tiên xếp trước video/docs
- **Phiên bản**: 2.2.1 (Patch - sửa logic nested playlist)
- **Backup**: `plan_temp/learn-page_backup_20260502_0830_before-content-nested.txt`

**CODE MỚI (VideoPlayer.tsx):**
```typescript
// [NEW] Hỗ trợ nested items trong 1 bài học
type PlaylistItem = {
  type: 'video' | 'doc' | 'text'
  title: string
  url: string
  id?: string | null
  content?: string
  nestedItems?: PlaylistItem[] // [NEW] Nhiều phần nhỏ trong 1 bài
}

// [NEW] State cho nested items
const [currentNestedIndex, setCurrentNestedIndex] = useState(0)
const nestedItems = currentItem?.nestedItems || null
const activeItem = nestedItems ? nestedItems[currentNestedIndex] : currentItem

// [NEW] Navigation cho nested items
const handleNext = () => {
  if (nestedItems) {
    if (currentNestedIndex < nestedItems.length - 1) {
      setCurrentNestedIndex(prev => prev + 1)
    } else {
      setCurrentVideoIndex((prev) => (prev + 1) % playlist.length)
      setCurrentNestedIndex(0)
    }
  } else {
    setCurrentVideoIndex((prev) => (prev + 1) % playlist.length)
  }
}
```

**CODE MỚI (learn/page.tsx):**
```typescript
// [NEW] Thêm nestedItems vào serverPlaylist
const serverPlaylist = enrollment.course.lessons.map((lesson: any) => {
  const hasNested = lesson.videoUrl && lesson.videoUrl.includes('|')
  return {
    ...lesson,
    type: lesson.type === 'TEXT' ? 'text' : lesson.type === 'DOCS' ? 'doc' : 'video',
    url: lesson.videoUrl || lesson.content || '',
    content: lesson.content || null,
    nestedItems: hasNested ? lesson.videoUrl.split('|').map(...) : null
  }
})
```

**CÁC THAY ĐỔI:**
- ✅ Thêm type `nestedItems?: PlaylistItem[]` vào PlaylistItem
- ✅ State `currentNestedIndex` và logic navigation cho nested items
- ✅ Sửa hiển thị TEXT: `text-gray-900 [&_a]:text-blue-600 [&_a]:underline`
- ✅ Container TEXT dùng `absolute inset-0 overflow-y-auto` (giữ nguyên 16:9)
- ✅ `serverPlaylist` từ page.tsx đã include `type` và `nestedItems`
- ✅ Backup files: `plan_temp/VideoPlayer_backup_20260501_2000_before-plan.txt`, `plan_temp/learn-page_backup_20260501_2000_before-plan.txt`

---

### 📅 PHIÊN 2026-04-30 15:00 - Khởi tạo cấu trúc

#### 3.1 Tạo file `app/tools/courses/COURSE_MANAGEMENT_SPEC.md`
- **Thời gian**: 2026-04-30 15:00
- **File**: `app/tools/courses/COURSE_MANAGEMENT_SPEC.md`
- **Hành động**: Tạo mới
- **Lý do**: Tạo tài liệu kỹ thuật kiêm change log cho chức năng
- **Phiên bản**: 1.0.0

---

### 📅 PHIÊN 2026-04-30 15:15 - Sửa getAdminCoursesAction → getCoursesAction

#### 3.2 Sửa file `app/actions/admin-actions.ts`
- **Thời gian**: 2026-04-30 15:15
- **File**: `app/actions/admin-actions.ts` (line 668-674)
- **Hành động**: Đổi tên `getAdminCoursesAction` → `getCoursesAction`, thêm phân quyền TEACHER
- **Lý do**: Cho phép TEACHER chỉ xem khóa học của mình
- **Phiên bản**: 1.0.1 (Patch - sửa function có sẵn)

**CODE CŨ:**
```typescript
// File: app/actions/admin-actions.ts (line 668-674) - TRƯỚC KHI SỬA
export async function getAdminCoursesAction() {
    await checkAdmin()
    try {
        const courses = await prisma.course.findMany({ 
            include: { _count: { select: { lessons: true, enrollments: true } } }, 
            orderBy: { id: 'asc' } 
        })
        return { success: true, courses }
    } catch (error: any) { return { success: false, error: error.message } }
}
```

**CODE MỚI:**
```typescript
// File: app/actions/admin-actions.ts (line 668-685) - SAU KHI SỬA
export async function getCoursesAction() {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    
    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)
    
    try {
        const where = isAdmin ? {} : { teacherId: userId }  // ✅ TEACHER chỉ thấy course của mình
        const courses = await prisma.course.findMany({ 
            where,
            include: { _count: { select: { lessons: true, enrollments: true } }, teacher: true }, 
            orderBy: { id: 'asc' } 
        })
        return { success: true, courses, isAdmin }
    } catch (error: any) { return { success: false, error: error.message } }
}
```

**CÁC THAY ĐỔI:**
- ✅ Bỏ `checkAdmin()` → dùng `auth()`
- ✅ Thêm logic filter `teacherId` cho TEACHER
- ✅ Include thêm `teacher` relation để hiển thị tên giáo viên
- ✅ Trả về `isAdmin` để frontend biết quyền

---

### 📅 PHIÊN 2026-04-30 15:30 - Tạo course-actions.ts

#### 3.3 Tạo file `app/actions/course-actions.ts`
- **Thời gian**: 2026-04-30 15:30
- **File**: `app/actions/course-actions.ts`
- **Hành động**: Tạo mới
- **Lý do**: Tách riêng các actions cho Course (create, delete, getTeachers) thay vì dùng chung admin-actions.ts
- **Phiên bản**: 1.1.0 (Minor - thêm file mới, thêm tính năng tạo/xóa)

**CODE MỚI:**
```typescript
// File: app/actions/course-actions.ts - TẠO MỚI (477 dòng gốc + 130 dòng mới)
// ✅ Giữ nguyên 477 dòng gốc (enrollInCourseAction, etc.)
// ✅ Thêm 130 dòng mới (createCourseAction, deleteCourseAction, getTeachersAction)

// CREATE COURSE - Tạo khóa học mới (ADMIN + TEACHER)
export async function createCourseAction(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    
    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)
    
    // Validate required fields
    const id_khoa = formData.get('id_khoa') as string
    const name_lop = formData.get('name_lop') as string
    
    if (!id_khoa?.trim()) return { success: false, error: "Mã khóa học là bắt buộc" }
    if (!name_lop?.trim()) return { success: false, error: "Tên lớp học là bắt buộc" }
    
    // Xác định teacherId: ADMIN được chọn, TEACHER tự động lấy session.id
    let teacherId: number | null = null
    if (isAdmin) {
        const teacherIdStr = formData.get('teacherId') as string
        teacherId = teacherIdStr ? parseInt(teacherIdStr) : null
    } else if (session.user.role === Role.TEACHER) {
        teacherId = userId
    }
    
    try {
        // Check unique id_khoa
        const existing = await prisma.course.findUnique({ where: { id_khoa } })
        if (existing) return { success: false, error: `Mã khóa "${id_khoa}" đã tồn tại` }
        
        // Parse all 21 fields từ FormData
        const courseData: any = {
            id_khoa: id_khoa.toUpperCase(),
            name_lop,
            name_khoa: formData.get('name_khoa') as string || null,
            category: formData.get('category') as string || 'Khác',
            type: (formData.get('type') as CourseType) || CourseType.NORMAL,
            status: formData.get('status') === 'true',
            pin: parseInt(formData.get('pin') as string) || 0,
            date_join: formData.get('date_join') as string || null,
            mo_ta_ngan: formData.get('mo_ta_ngan') as string || null,
            mo_ta_dai: formData.get('mo_ta_dai') as string || null,
            link_anh_bia: formData.get('link_anh_bia') as string || null,
            phi_coc: parseInt(formData.get('phi_coc') as string) || 0,
            stk: formData.get('stk') as string || null,
            name_stk: formData.get('name_stk') as string || null,
            bank_stk: formData.get('bank_stk') as string || null,
            noidung_stk: formData.get('noidung_stk') as string || null,
            link_qrcode: formData.get('link_qrcode') as string || null,
            link_zalo: formData.get('link_zalo') as string || null,
            file_email: formData.get('file_email') as string || null,
            noidung_email: formData.get('noidung_email') as string || null,
        }
        
        // Gán teacherId nếu có
        if (teacherId) {
            courseData.teacherId = teacherId
        }
        
        const newCourse = await prisma.course.create({ data: courseData })
        
        revalidatePath('/tools/courses')
        return { success: true, course: newCourse, message: 'Đã tạo khóa học thành công!' }
    } catch (error: any) {
        return { success: false, error: error.message || 'Lỗi khi tạo khóa học' }
    }
}

// DELETE COURSE - Xóa khóa học (Check quyền)
export async function deleteCourseAction(courseId: number) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    
    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)
    
    try {
        // Check course tồn tại + quyền xóa
        const course = await prisma.course.findUnique({ 
            where: { id: courseId },
            select: { teacherId: true, name_lop: true }
        })
        
        if (!course) return { success: false, error: "Không tìm thấy khóa học" }
        
        // TEACHER chỉ được xóa course của mình
        if (!isAdmin && course.teacherId !== userId) {
            return { success: false, error: "Bạn không có quyền xóa khóa học này" }
        }
        
        // Xóa course (cascade xóa lessons, enrollments...)
        await prisma.course.delete({ where: { id: courseId } })
        
        revalidatePath('/tools/courses')
        return { success: true, message: `Đã xóa khóa học "${course.name_lop}"` }
    } catch (error: any) {
        return { success: false, error: error.message || 'Lỗi khi xóa khóa học' }
    }
}

// GET TEACHERS - Lấy danh sách TEACHER (cho ADMIN chọn)
export async function getTeachersAction() {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    
    const isAdmin = session.user.role === Role.ADMIN
    if (!isAdmin) return { success: false, error: "Unauthorized" }
    
    try {
        const teachers = await prisma.user.findMany({
            where: { role: Role.TEACHER },
            select: { id: true, name: true, email: true }
        })
        return { success: true, teachers }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
```

**CÁC THAY ĐỔI:**
- ✅ Tạo mới file `course-actions.ts` (tách khỏi admin-actions.ts)
- ✅ `createCourseAction`: Tạo khóa học với đủ 21 trường, auto-gán teacherId
- ✅ `deleteCourseAction`: Xóa khóa học, check quyền TEACHER chỉ được xóa course của mình
- ✅ `getTeachersAction`: Lấy danh sách TEACHER (cho ADMIN chọn khi tạo course)

---

### 📅 PHIÊN 2026-04-30 15:45 - Sửa courses/page.tsx

#### 3.4 Sửa file `app/tools/courses/page.tsx`
- **Thời gian**: 2026-04-30 15:45
- **File**: `app/tools/courses/page.tsx`
- **Hành động**: Sửa dùng `getCoursesAction`, thêm `isAdmin` state, nút + → Link
- **Lý do**: Cho phép TEACHER xem danh sách khóa học của mình
- **Phiên bản**: 1.0.2 (Patch - sửa UI + logic)

**CÁC THAY ĐỔI:**
- ✅ Import `getCoursesAction` thay vì `getAdminCoursesAction`
- ✅ Thêm `isAdmin` state để biết quyền
- ✅ Nút `+` → Link to `/tools/courses/new`
- ✅ Hiển thị danh sách theo quyền (TEACHER chỉ thấy course của mình)

---

### 📅 PHIÊN 2026-04-30 16:00 - Sửa updateCourseAction + API routes

#### 3.5 Sửa `app/actions/admin-actions.ts` (updateCourseAction)
- **Thời gian**: 2026-04-30 16:00
- **File**: `app/actions/admin-actions.ts` (line 686-710)
- **Hành động**: Bỏ `checkAdmin()`, thêm check quyền TEACHER
- **Lý do**: Cho phép TEACHER sửa course có `teacherId = userId`
- **Phiên bản**: 1.2.1 (Patch - sửa logic function)

**CODE CŨ:**
```typescript
// File: app/actions/admin-actions.ts (line 686-693) - TRƯỚC
export async function updateCourseAction(courseId: number, data: any) {
    await checkAdmin()
    try {
        const updatedCourse = await prisma.course.update({ where: { id: courseId }, data })
        revalidatePath('/tools/courses'); revalidatePath('/')
        return { success: true, course: updatedCourse }
    } catch (error: any) { return { success: false, error: error.message } }
}
```

**CODE MỚI:**
```typescript
// File: app/actions/admin-actions.ts (line 686-720) - SAU
export async function updateCourseAction(courseId: number, data: any) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    
    const isAdmin = session.user.role === Role.ADMIN
    const userId = parseInt(session.user.id)
    
    try {
        // ✅ Check course tồn tại + quyền sửa (TEACHER chỉ sửa course của mình)
        const course = await prisma.course.findUnique({ 
            where: { id: courseId },
            select: { teacherId: true }
        })
        
        if (!course) return { success: false, error: "Không tìm thấy khóa học" }
        
        // ✅ TEACHER chỉ được sửa course có teacherId = userId
        if (!isAdmin && course.teacherId !== userId) {
            return { success: false, error: "Bạn không có quyền sửa khóa học này" }
        }
        
        // ✅ Nếu là TEACHER, không cho phép thay đổi teacherId
        if (!isAdmin && data.teacherId != null) {
            delete data.teacherId
        }
        
        const updatedCourse = await prisma.course.update({ where: { id: courseId }, data })
        revalidatePath('/tools/courses'); revalidatePath('/')
        return { success: true, course: updatedCourse }
    } catch (error: any) { return { success: false, error: error.message } }
}
```

**CÁC THAY ĐỔI:**
- ✅ Bỏ `checkAdmin()` → dùng `auth()`
- ✅ Thêm check `teacherId === userId` cho TEACHER
- ✅ TEACHER không được thay đổi `teacherId`

---

#### 3.6 Sửa `app/api/courses/[id]/route.ts`
- **Thời gian**: 2026-04-30 16:15
- **File**: `app/api/courses/[id]/route.ts`
- **Hành động**: Sửa để TEACHER xem/sửa/xóa được course của mình
- **Lý do**: Phân quyền đầy đủ cho TEACHER
- **Phiên bản**: 1.2.2 (Patch - thêm PUT/DELETE handlers)

**CODE MỚI:**
```typescript
// ✅ GET: TEACHER chỉ xem được course có teacherId = userId
// ✅ PUT: TEACHER chỉ sửa được course có teacherId = userId
// ✅ DELETE: TEACHER chỉ xóa được course có teacherId = userId
export async function GET(req, { params }) { /* Check teacherId */ }
export async function PUT(req, { params }) { /* Check teacherId + no update teacherId */ }
export async function DELETE(req, { params }) { /* Check teacherId */ }
```

---

### 📅 PHIÊN 2026-04-30 16:30 - Bổ sung 21 trường cho [id]/page.tsx

#### 3.7 Sửa file `app/tools/courses/[id]/page.tsx`
- **Thời gian**: 2026-04-30 16:30
- **File**: `app/tools/courses/[id]/page.tsx`
- **Hành động**: Bổ sung đủ 21/21 trường theo 4 sections
- **Lý do**: Form cũ chỉ có 5/21 trường, cần hiển thị đủ để teacher quản lý khóa học
- **Phiên bản**: 1.2.0 (Minor - thêm nhiều UI components)

**CÁC THAY ĐỔI:**
- ✅ Thêm 16 state mới (đủ 21 trường)
- ✅ Form chia 4 sections: Cơ bản, Mô tả, Học phí, Email/Zalo
- ✅ Thêm `isAdmin` + `teachers` để ADMIN chọn giáo viên
- ✅ `handleSubmit` gửi đủ 21 fields qua `updateCourseAction`

---

### 📅 PHIÊN 2026-04-30 17:00 - Tạo các file mới

#### 3.8 Tạo `app/tools/courses/new/page.tsx`
- **Thời gian**: 2026-04-30 17:00
- **File**: `app/tools/courses/new/page.tsx` (407 dòng)
- **Hành động**: Tạo mới form 21 trường
- **Lý do**: Cho phép TEACHER tạo khóa học mới
- **Phiên bản**: 1.1.0 (Minor - thêm file mới)

**CẤU TRÚC:**
- Section 1: Thông tin cơ bản (8 trường)
- Section 2: Mô tả & Hình ảnh (3 trường)
- Section 3: Học phí & Thanh toán (6 trường)
- Section 4: Email & Zalo (3 trường)
- Xử lý role: ADMIN chọn teacherId, TEACHER tự động session.id

---

#### 3.9 Tạo `app/api/courses/route.ts`
- **Thời gian**: 2026-04-30 17:15
- **File**: `app/api/courses/route.ts` (132 dòng)
- **Hành động**: Tạo mới API POST
- **Lý do**: Cho phép tạo khóa học qua API
- **Phiên bản**: 1.1.0 (Minor - thêm file mới)

**CẤU TRÚC:**
- POST: Tạo khóa học với đủ 21 trường
- Auth: ADMIN + TEACHER
- Auto-gán teacherId theo role

---

#### 3.10 Tạo `app/api/courses/teachers/route.ts`
- **Thời gian**: 2026-04-30 17:30
- **File**: `app/api/courses/teachers/route.ts` (30 dòng)
- **Hành động**: Tạo mới API GET
- **Lý do**: Cho ADMIN chọn giáo viên khi tạo/sửa course
- **Phiên bản**: 1.2.3 (Patch - thêm API mới)

**CẤU TRÚC:**
- GET: Lấy danh sách users có role TEACHER
- Chỉ ADMIN mới được truy cập
- Trả về `{ id, name, email }`

---

### 📅 PHIÊN 2026-05-01 - Sửa UI Form chỉnh sửa khóa học

#### 3.11 Sửa file `app/tools/courses/[id]/page.tsx`
- **Thời gian**: 2026-05-01
- **File**: `app/tools/courses/[id]/page.tsx`
- **Hành động**: Sửa UI theo yêu cầu mới
- **Lý do**: Cải thiện UX, bảo vệ dữ liệu DB, hiển thị ảnh đúng tỷ lệ
- **Phiên bản**: 1.3.2 (Patch - sửa UI)

**CÁC THAY ĐỔI:**
1. ✅ **Mã khóa học (id_khoa)**: Làm mờ hơn (`opacity-40`, `bg-gray-200`, `text-gray-500`) + ghi chú "Không thể sửa - ảnh hưởng DB" để nhấn mạnh trường này không được thay đổi trong chế độ chỉnh sửa
2. ✅ **Danh mục (category)**: Đổi từ `<select>` cố định sang `<input type="text">` nhập tự do, vì `category` là String field trong bảng Course (schema.prisma:348), không phải bảng riêng
3. ✅ **Mô tả ngắn (mo_ta_ngan)**: Tăng chiều cao từ `rows={2}` → `rows={4}` + thêm `resize-y` để user có thể kéo rộng thủ công
4. ✅ **Mô tả dài (mo_ta_dai)**: Tăng chiều cao từ `rows={4}` → `rows={8}` + thêm `resize-y`
5. ✅ **Ảnh bìa (link_anh_bia)**: Đổi từ `object-cover h-40` sang `object-contain max-h-96` + thêm `bg-gray-50 p-2` để hiển thị full ảnh đúng tỷ lệ, không bị cắt xén

**CODE CŨ (trước khi sửa):**
```typescript
// Mã khóa học - cũ
className="w-full bg-gray-100 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none opacity-50 cursor-not-allowed"

// Danh mục - cũ (select cố định)
<select value={category} ...>
    <option value="Khác">Khác</option>
    <option value="Lập trình">Lập trình</option>
    ...
</select>

// Mô tả ngắn - cũ
<textarea ... rows={2} className="..." />

// Mô tả dài - cũ
<textarea ... rows={4} className="..." />

// Ảnh bìa - cũ
<img src={linkAnhBia} ... className="w-full h-40 object-cover rounded-2xl mt-2" />
```

**CODE MỚI (sau khi sửa):**
```typescript
// Mã khóa học - mới (mờ hơn, nhấn mạnh không sửa được)
className="w-full bg-gray-200 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none opacity-40 cursor-not-allowed text-gray-500"

// Danh mục - mới (input tự do theo category trong DB)
<input type="text" value={category} ... placeholder="Nhập danh mục..." />

// Mô tả ngắn - mới (cao hơn, có thể resize)
<textarea ... rows={4} className="... resize-y" />

// Mô tả dài - mới (cao hơn, có thể resize)
<textarea ... rows={8} className="... resize-y" />

// Ảnh bìa - mới (hiển thị full đúng tỷ lệ)
<img src={linkAnhBia} ... className="w-full max-h-96 object-contain rounded-2xl mt-2 bg-gray-50 p-2" />
```

---

### 📅 PHIÊN 2026-05-01 (tiếp theo) - Cải tiến Form khóa học

#### 3.12 Sửa file `app/tools/courses/new/page.tsx` và `app/tools/courses/[id]/page.tsx`
- **Thời gian**: 2026-05-01
- **File**: `app/tools/courses/new/page.tsx`, `app/tools/courses/[id]/page.tsx`
- **Hành động**: Cải tiến UI theo yêu cầu mới
- **Lý do**: Tăng trải nghiệm người dùng, hỗ trợ upload ảnh trực tiếp
- **Phiên bản**: 2.0.0 (Major - thêm tính năng mới: upload ảnh, combo category, auto <br>)

**CÁC THAY ĐỔI:**

1. ✅ **Danh mục (category)**: Đổi sang combo list (datalist) load từ DB qua API `/api/courses/categories` + nhập tay (không trùng các giá trị có sẵn)

2. ✅ **Mô tả ngắn (mo_ta_ngan)**: 
   - Tăng chiều cao từ `rows={2}` → `rows={6}` + `resize-y`
   - Thêm xử lý Enter: tự động chèn `<br>` khi nhấn Enter (không phải Shift+Enter)

3. ✅ **Mô tả dài (mo_ta_dai)**: 
   - Tăng chiều cao từ `rows={4}` → `rows={10}` + `resize-y`
   - Thêm xử lý Enter: tự động chèn `<br>` khi nhấn Enter

4. ✅ **Ảnh bìa (link_anh_bia)**: 
   - Thêm nút "Upload" bên cạnh input URL
   - Dùng API `/api/upload/course` (lưu vào `public/uploads/courses/`)
   - Validate: Chỉ ảnh, giới hạn 2MB
   - Hiển thị preview với `max-h-96 object-contain`

5. ✅ **API mới**: 
   - `app/api/courses/categories/route.ts`: GET danh sách categories từ DB
   - `app/api/upload/course/route.ts`: POST upload ảnh khóa học

**CODE MỚI (Tóm tắt):**
```typescript
// Combo list category với datalist
<input type="text" list="category-list" ... />
<datalist id="category-list">
    <option value="Khác" />
    {categories.map(cat => <option key={cat} value={cat} />)}
</datalist>

// Xử lý Enter trong textarea để chèn <br>
const handleTextareaKeyDown = (e, setter) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        // Chèn <br> tại vị trí cursor
        const newValue = value.substring(0, start) + '<br>' + value.substring(end)
        setter(newValue)
    }
}

// Upload ảnh
const handleImageUpload = async (e) => {
    const formData = new FormData()
    formData.append('file', e.target.files[0])
    const res = await fetch('/api/upload/course', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.url) setLinkAnhBia(data.url)
}
```

---

### 📅 PHIÊN 2026-05-01 (Fix đơn giản hóa combo category)

#### 3.13 Sửa file `app/tools/courses/[id]/page.tsx` và `app/tools/courses/new/page.tsx`
- **Thời gian**: 2026-05-01
- **File**: `app/tools/courses/[id]/page.tsx`, `app/tools/courses/new/page.tsx`
- **Hành động**: Đổi từ datalist phức tạp sang `<select>` đơn giản (giống hệt "Loại khóa học")
- **Lý do**: Đơn giản hóa code, dễ bảo trì, hiển thị đúng category khi edit
- **Phiên bản**: 2.0.1 (Patch - đơn giản hóa UI)
- **Backup**: `plan_temp/courses-id-page_backup_20260501_v3.txt`, `plan_temp/new-page_backup_20260501_v2.txt`

**CÁC THAY ĐỔI:**
1. ✅ Bỏ datalist phức tạp, dùng `<select>` đơn giản như phần "Loại khóa học"
2. ✅ Khi load course, thêm category cũ vào danh sách nếu chưa có (để select hiển thị đúng)
3. ✅ Áp dụng đồng bộ cho cả Edit và Create (edit mode)

**CODE MỚI:**
```typescript
// Đơn giản hóa giống "Loại khóa học" - dùng select
<div className="space-y-1.5">
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Danh mục</label>
    <select 
        value={category} 
        onChange={(e) => setCategory(e.target.value)}
        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
    >
        <option value="Khác">Khác</option>
        {categories.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
        ))}
    </select>
</div>

// Khi load course, đảm bảo category hiện tại có trong danh sách
const currentCategory = res.category || 'Khác'
setCategory(currentCategory)
if (currentCategory !== 'Khác' && !categories.includes(currentCategory)) {
    setCategories(prev => [...prev, currentCategory])
}
```

---

#### 3.14 Sửa `app/tools/courses/[id]/page.tsx` và `app/tools/courses/new/page.tsx`
- **Thời gian**: 2026-05-01
- **File**: `app/tools/courses/[id]/page.tsx`, `app/tools/courses/new/page.tsx`
- **Hành động**: Đổi `type="url"` → `type="text"` cho input `link_anh_bia`
- **Lý do**: Upload ảnh trả về URL dạng `/uploads/courses/...` (relative path), browser từ chối `type="url"` gây lỗi khi submit
- **Phiên bản**: 2.0.2 (Patch - fix URL validation)
- **Backup**: `plan_temp/courses-id-page_backup_20260501_v3.txt`, `plan_temp/new-page_backup_20260501_v2.txt`

**CÁC THAY ĐỔI:**
1. ✅ Đổi `type="url"` thành `type="text"` ở cả 2 form (Edit và Create)
2. ✅ Cập nhật placeholder: `"https://... hoặc /uploads/courses/..."`

**CODE MỚI:**
```typescript
// Fix: Chấp nhận cả URL đầy đủ và relative path (/uploads/courses/...)
<input 
    type="text" 
    value={linkAnhBia} 
    onChange={(e) => setLinkAnhBia(e.target.value)} 
    className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none" 
    placeholder="https://... hoặc /uploads/courses/..." 
/>
```

---

#### 3.16 Sửa `prisma/schema.prisma` - Add LessonType enum
- **Thời gian**: 2026-05-01 16:15
- **File**: `prisma/schema.prisma` (line 365-378)
- **Hành động**: Thêm `enum LessonType { VIDEO, DOCS, TEXT }` + `type LessonType @default(VIDEO)` vào Lesson model
- **Lý do**: Cần phân biệt rõ 3 loại bài học: Video, Docs, Text
- **Phiên bản**: 2.0.4 (Minor - thêm enum + field mới)
- **Backup**: `plan_temp/schema_backup_20260501_1615_add-lesson-type.txt`

**CODE MỚI:**
```prisma
enum LessonType {
  VIDEO
  DOCS
  TEXT
}

model Lesson {
  // ... existing fields
  type             LessonType       @default(VIDEO)
}
```

---

#### 3.17 Sửa `app/actions/course-actions.ts` - Auto-create first lesson
- **Thời gian**: 2026-05-01 16:20
- **File**: `app/actions/course-actions.ts` (after line 545)
- **Hành động**: Thêm `createDefaultFirstLesson(courseId)` + gọi sau khi tạo course
- **Lý do**: Tự động tạo bài học đầu tiên (TEXT) khi tạo khóa học mới
- **Phiên bản**: 2.0.5 (Minor - auto-create feature)
- **Backup**: `plan_temp/course-actions_backup_20260501_1615.txt`

**CODE MỚI:**
```typescript
// Auto-create first lesson (TEXT type with course info template)
const defaultContent = `📌 THÔNG TIN KHAI GIẢNG & LỊU Ý...` // (template content)
await prisma.lesson.create({
    data: {
        courseId: newCourse.id,
        title: 'Bài 1: Thông tin khai giảng',
        order: 1,
        type: 'TEXT',
        content: defaultContent
    }
})
```

---

#### 3.18 Sửa `app/tools/courses/[id]/page.tsx` - LessonEditModal + AddLessonModal
- **Thời gian**: 2026-05-01 16:25
- **File**: `app/tools/courses/[id]/page.tsx`
- **Hành động**: 
  1. Update `LessonEditModal`: Thêm type selector (VIDEO/DOCS/TEXT) + content field
  2. Thêm `AddLessonModal` component (tương tự nhưng để tạo mới)
  3. Thêm nút "Thêm bài học" cạnh "Import"
- **Lý do**: Support 3 lesson types, allow manual lesson creation
- **Phiên bản**: 2.0.6 (Minor - enhance lesson management)
- **Backup**: `plan_temp/courses-id-page_backup_20260501_1615_add-lesson-type.txt`

**CODE MỚI:**
```typescript
// 1. In LessonEditModal: Add type selector + conditional fields
const [lessonType, setLessonType] = useState(lesson.type || 'VIDEO')
// Render: <select> with VIDEO/DOCS/TEXT options
// If VIDEO/DOCS → show videoUrl input
// If TEXT → show content textarea

// 2. AddLessonModal component (similar to LessonEditModal but for creation)
// Calls POST /api/courses/${courseId}/lessons

// 3. Add button
<button onClick={() => setShowAddLesson(true)}>+ Thêm bài học</button>
```

---

#### 3.19 Tạo `app/api/courses/[id]/lessons/route.ts` - POST endpoint
- **Thời gian**: 2026-05-01 16:30
- **File**: `app/api/courses/[id]/lessons/route.ts` (tạo mới)
- **Hành động**: POST endpoint để tạo lesson mới với type + content
- **Lý do**: Support creating lessons via API (for AddLessonModal)
- **Phiên bản**: 2.0.7 (Minor - new API)
- **Backup**: File mới

**CODE MỚI:**
```typescript
export async function POST(request, { params }) {
    // Check auth + permission
    const body = await request.json()
    const { title, videoUrl, order, type, content } = body
    
    const lesson = await prisma.lesson.create({
        data: { courseId, title, videoUrl, order, type: type || 'VIDEO', content }
    })
    return NextResponse.json({ success: true, lesson })
}
```

---

#### 3.20 Sửa `components/course/VideoPlayer.tsx` - TEXT type rendering
- **Thời gian**: 2026-05-01 16:35
- **File**: `components/course/VideoPlayer.tsx`
- **Hành động**: 
  1. Update `PlaylistItem` type: Add `'text'` + `content?` field
  2. Update render logic: If `type === 'text'` → render content as HTML
  3. Update playlist parsing: Map Prisma `LessonType` to internal types
- **Lý do**: Display TEXT lessons properly
- **Phiên bản**: 2.0.8 (Minor - text rendering)
- **Backup**: `plan_temp/VideoPlayer_backup_20260501_1615.txt`

**CODE MỚI:**
```typescript
// 1. Update PlaylistItem type
type PlaylistItem = {
    type: 'video' | 'doc' | 'text'  // Add 'text'
    title: string
    url: string
    id?: string | null
    content?: string  // Add content field
}

// 2. Render TEXT type
{currentItem?.type === 'text' ? (
    <div className="w-full h-full bg-white p-6 overflow-y-auto">
        <div dangerouslySetInnerHTML={{ __html: currentItem.content?.replace(/\n/g, '<br>') || '' }} />
    </div>
) : ( /* existing video/doc logic */ )}

// 3. Map server data (in learn/page.tsx)
const serverPlaylist = lessons.map(lesson => ({
    type: lesson.type === 'TEXT' ? 'text' : lesson.type === 'DOCS' ? 'doc' : 'video',
    content: lesson.content || null,
    // ...
}))
```

---

#### 3.21 Sửa `app/courses/[id]/learn/page.tsx` - Server playlist
- **Thời gian**: 2026-05-01 16:40
- **File**: `app/courses/[id]/learn/page.tsx`
- **Hành động**: Update to pass `type` field in serverPlaylist, remove client-side parsing
- **Lý do**: Optimize - server already has type info, avoid client parsing
- **Phiên bản**: 2.0.9 (Minor - optimization)
- **Backup**: `plan_temp/learn-page_backup_20260501_1615.txt`

**CODE MỚI:**
```typescript
// Use server data directly - map type from Prisma LessonType
const serverPlaylist = enrollment.course.lessons.map(lesson => ({
    ...lesson,
    type: lesson.type === 'TEXT' ? 'text' : lesson.type === 'DOCS' ? 'doc' : 'video',
    url: lesson.videoUrl || lesson.content || '',
    content: lesson.content || null
}))
```

---

## 4. HƯỚNG DẪN SỬ DỤNG
### 4.1 Cho TEACHER
1. Đăng nhập với role TEACHER
2. Truy cập `/tools/courses`
3. Chỉ thấy danh sách khóa học mình dạy (có `teacherId = user.id`)
4. Nhấn nút `+` để tạo khóa học mới
5. Điền đầy đủ thông tin (21 trường)
6. Chỉ được sửa/xóa khóa học do mình làm teacher

### 4.2 Cho ADMIN
1. Xem tất cả khóa học
2. Tạo mới với quyền chọn teacherId
3. Sửa/xóa bất kỳ khóa học nào
4. Quản lý tất cả users

### 4.3 Quy trình tạo khóa học mới
1. Tại `/tools/courses`, nhấn nút `+`
2. Điền **bắt buộc**: `id_khoa`, `name_lop`
3. Điền **tùy chọn**: các trường còn lại (19 trường)
4. Nhấn "Tạo Khóa học"
5. Hệ thống tự động gán `teacherId = session.user.id` (TEACHER) hoặc chọn từ form (ADMIN)

---
## 5. DANH SÁCH TRƯỜNG COURSE (21 TRƯỜNG)

Dựa trên `schema.prisma:328-363`, loại bỏ các trường tự động (id, createdAt, updatedAt) và relations, còn lại **21 trường cho phép nhập liệu**:

### 5.1 Nhóm 1: Thông tin cơ bản
| STT | Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Ghi chú |
|-----|--------|--------------|----------|----------|---------|
| 1 | `id_khoa` | String (unique) | ✅ Bắt buộc | - | Mã khóa học (VD: "KH001") |
| 2 | `name_lop` | String | ✅ Bắt buộc | - | Tên lớp học |
| 3 | `name_khoa` | String? | ❌ Tùy chọn | null | Tên khóa học (khác tên lớp) |
| 4 | `category` | String | ❌ Tùy chọn | "Khác" | Danh mục khóa học |
| 5 | `type` | CourseType | ❌ Tùy chọn | NORMAL | NORMAL / CHALLENGE / LIB |
| 6 | `status` | Boolean | ❌ Tùy chọn | true | true=Hiển thị, false=Ẩn |
| 7 | `pin` | Int | ❌ Tùy chọn | 0 | Thứ tự ghim (0=không ghim) |
| 8 | `date_join` | String? | ❌ Tùy chọn | null | Ngày khai giảng (lưu String) |

### 5.2 Nhóm 2: Mô tả & Hình ảnh
| STT | Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Ghi chú |
|-----|--------|--------------|----------|----------|---------|
| 9 | `mo_ta_ngan` | String? | ❌ Tùy chọn | null | Mô tả ngắn (hiển thị trên card) |
| 10 | `mo_ta_dai` | String? | ❌ Tùy chọn | null | Mô tả dài (chi tiết khóa học) |
| 11 | `link_anh_bia` | String? | ❌ Tùy chọn | null | URL ảnh bìa khóa học |

### 5.3 Nhóm 3: Học phí & Thanh toán
| STT | Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Ghi chú |
|-----|--------|--------------|----------|----------|---------|
| 12 | `phi_coc` | Int | ❌ Tùy chọn | 0 | Học phí (VND) |
| 13 | `stk` | String? | ❌ Tùy chọn | null | Số tài khoản nhận tiền |
| 14 | `name_stk` | String? | ❌ Tùy chọn | null | Tên chủ tài khoản |
| 15 | `bank_stk` | String? | ❌ Tùy chọn | null | Tên ngân hàng |
| 16 | `noidung_stk` | String? | ❌ Tùy chọn | null | Nội dung chuyển khoản |
| 17 | `link_qrcode` | String? | ❌ Tùy chọn | null | Link QR code thanh toán |

### 5.4 Nhóm 4: Email & Zalo
| STT | Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Ghi chú |
|-----|--------|--------------|----------|----------|---------|
| 18 | `link_zalo` | String? | ❌ Tùy chọn | null | Link nhóm Zalo |
| 19 | `file_email` | String? | ❌ Tùy chọn | null | File email đính kèm |
| 20 | `noidung_email` | String? | ❌ Tùy chọn | null | Nội dung email kích hoạt |

### 5.5 Nhóm 5: Giáo viên (Tự động)
| STT | Trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Ghi chú |
|-----|--------|--------------|----------|----------|---------|
| 21 | `teacherId` | Int? | ❌ Tự động | session.user.id | Gán từ session (TEACHER), chọn được (ADMIN) |

---
## 6. KIỂM TRA HOÀN THÀNH
- [x] TEACHER chỉ thấy course có `teacherId = user.id`
- [x] Nút `+` link to `/tools/courses/new`
- [x] Form tạo mới có đủ 21 trường (4 sections)
- [x] Form sửa có đủ 21 trường (4 sections)
- [x] ADMIN xem/sửa/xóa được tất cả
- [x] TEACHER không truy cập được course của người khác
- [x] Code cũ được backup trong `plan_temp/` 
- [x] Change log đầy đủ trong `COURSE_MANAGEMENT_SPEC.md`
- [x] Nâng cấp version đúng quy tắc (1.0.1 → 2.0.0)
- [x] Category: Combo list (load từ DB) + nhập tay (không trùng)
- [x] Mô tả ngắn: Tăng chiều cao, auto `<br>` khi Enter
- [x] Mô tả dài: Tăng chiều cao, auto `<br>` khi Enter
- [x] Ảnh bìa: Có nút upload từ thiết bị (API `/api/upload/course`)
- [x] Combo category hiển thị đúng khi edit (fix 2.0.1: thêm category cũ vào list nếu thiếu)
- [x] Fix duplicate keys (fix 2.0.2: dùng Set cả ở fetch và render)
- [x] Fix URL validation: đổi type="url" → type="text" cho link ảnh bìa (fix 2.0.3)

---

## 7. LỊCH SỬ PHIÊN BẢN
| Phiên bản | Ngày | Mô tả |
|----------|------|-------|
| 1.0.0 | 2026-04-30 | Khởi tạo file, lập kế hoạch 21 trường, 7 files |
| 1.0.1 | 2026-04-30 | Sửa getAdminCoursesAction → getCoursesAction |
| 1.0.2 | 2026-04-30 | Sửa courses/page.tsx (nút +, isAdmin) |
| 1.1.0 | 2026-04-30 | Tạo course-actions.ts, new/page.tsx, api/courses/route.ts |
| 1.2.0 | 2026-04-30 | Sửa [id]/page.tsx đủ 21 trường |
| 1.2.1 | 2026-04-30 | Sửa updateCourseAction + check teacherId |
| 1.2.2 | 2026-04-30 | Sửa api/courses/[id]/route.ts (GET/PUT/DELETE) |
| 1.2.3 | 2026-04-30 | Tạo api/courses/teachers/route.ts |
| 1.3.2 | 2026-05-01 | Sửa UI form: mã khóa học mờ hơn, danh mục nhập tự do, mở rộng textarea, ảnh bìa full tỷ lệ |
| 2.0.0 | 2026-05-01 | Thêm combo category (datalist), tăng chiều cao textarea + auto `<br>`, upload ảnh bìa từ thiết bị |
| 2.0.1 | 2026-05-01 | Đổi từ datalist sang select đơn giản (giống Loại khóa học) |
| 2.0.2 | 2026-05-01 | Fix lỗi duplicate keys (trùng lặp category) - dùng Set để unique |
| 2.0.3 | 2026-05-01 | Fix lỗi URL validation: đổi type="url" → type="text" cho link ảnh bìa |
| 2.0.4 | 2026-05-01 | Add LessonType enum (VIDEO/DOCS/TEXT), auto-create first lesson TEXT |
| 2.0.5 | 2026-05-01 | Update LessonEditModal + AddLessonModal to support 3 types |
| 2.0.6 | 2026-05-01 | Update VideoPlayer to render TEXT type + API create lesson |

---

## 9. PHIÊN BẢN HIỆN TẠI (2.0.9)

### Các thay đổi chính trong phiên bản 2.0.9:
1. **Lesson Type**: Thêm `enum LessonType { VIDEO, DOCS, TEXT }` + `type` field trong Lesson model
2. **Auto-create first lesson**: Tự động tạo bài 1 (TEXT) khi tạo khóa học mới
3. **LessonEditModal**: Thêm type selector (VIDEO/DOCS/TEXT) + content field
4. **AddLessonModal**: Thêm component tạo bài học mới thủ công
5. **VideoPlayer**: Hỗ trợ render TEXT type (dangerousSetInnerHTML)
6. **API Lessons**: Tạo `/api/courses/[id]/lessons/route.ts` (POST tạo lesson)
7. **Learn Page**: Update serverPlaylist với type mapping

### File đã chỉnh sửa:
- `prisma/schema.prisma` (backup: `plan_temp/schema_backup_20260501_1615_add-lesson-type.txt`)
- `app/actions/course-actions.ts` (backup: `plan_temp/course-actions_backup_20260501_1615.txt`)
- `app/tools/courses/[id]/page.tsx` (backup: `plan_temp/courses-id-page_backup_20260501_1615_add-lesson-type.txt`)
- `components/course/VideoPlayer.tsx` (backup: `plan_temp/VideoPlayer_backup_20260501_1615.txt`)
- `app/api/courses/[id]/lessons/route.ts` (tạo mới)
- `app/courses/[id]/learn/page.tsx` (update serverPlaylist)

---
> 📝 **GHI CHÚ**: File này auto-update sau mỗi lần sửa code. Không xóa lịch sử.
> 💎 **QUY TẮC KIM CƯƠNG**: Luôn backup code cũ vào `plan_temp/` và cập nhật change log này ngay lập tức!

---

## 10. KIỂM TRA HOÀN THÀNH (CẬP NHẬT 2026-05-01 19:00)

### Kiểm tra các yêu cầu đã hoàn thành:
- [x] TEACHER chỉ thấy course có `teacherId = user.id`
- [x] Nút `+` link to `/tools/courses/new`
- [x] Form tạo mới có đủ 21 trường (4 sections)
- [x] Form sửa có đủ 21 trường (4 sections)
- [x] ADMIN xem/sửa/xóa được tất cả
- [x] TEACHER không truy cập được course của người khác
- [x] Code cũ được backup trong `plan_temp/` 
- [x] Change log đầy đủ trong `COURSE_MANAGEMENT_SPEC.md`
- [x] Nâng cấp version đúng quy tắc (2.0.9 → 2.1.0)
- [x] Category: Combo list (load từ DB) + nhập tay (không trùng)
- [x] Mô tả ngắn: Tăng chiều cao, auto `<br>` khi Enter
- [x] Mô tả dài: Tăng chiều cao, auto `<br>` khi Enter
- [x] Ảnh bìa: Có nút upload từ thiết bị (API `/api/upload/course`)
- [x] Combo category hiển thị đúng khi edit (fix 2.0.1: thêm category cũ vào list nếu thiếu)
- [x] Fix duplicate keys (fix 2.0.2: dùng Set để unique)
- [x] Fix URL validation: đổi type="url" → type="text" cho link ảnh bìa (fix 2.0.3)
- [x] **NEW**: Fix teacherId bị mất khi TEACHER sửa course (2.1.0)
- [x] **NEW**: Hiển thị Tên khóa học (name_khoa) trong danh sách (2.1.0)
- [x] **NEW**: Fix AddLessonModal không hoạt động - chuyển ra top-level (2.1.0)
