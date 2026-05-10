# STUDENT.md — Tài liệu tính năng /tools/students

## Tổng quan

Trang danh sách & tìm kiếm thành viên trong hệ thống. Hỗ trợ 2 role:
- **ADMIN**: Xem tất cả user (ADMIN, STUDENT, INSTRUCTOR, AFFILIATE, TEACHER, người học khóa 86 Days)
- **TEACHER**: Chỉ xem học viên (STUDENT) đã đăng ký khóa học của mình

## File structure

```
app/tools/students/
├── page.tsx              # Danh sách (Client Component)
├── STUDENT.md            # Tài liệu kỹ thuật
└── [id]/page.tsx         # Chi tiết học viên (Server Component)
```

## State management (page.tsx)

### State

| Variable | Type | Initial | Mô tả |
|----------|------|---------|-------|
| `students` | `StudentData[]` | `[]` | Danh sách học viên |
| `loading` | `boolean` | `true` | Trạng thái loading |
| `error` | `string \| null` | `null` | Thông báo lỗi (nếu có) |
| `searchQuery` | `string` | `''` | Nội dung tìm kiếm |
| `selectedRole` | `string` | `'ALL'` | Role filter |
| `sortBy` | `'createdAt' \| 'id'` | `'createdAt'` | Trường sắp xếp |
| `sortOrder` | `'asc' \| 'desc'` | `'desc'` | Chiều sắp xếp |
| `page` | `number` | `0` | Trang hiện tại (0-based) |
| `totalPages` | `number` | `0` | Tổng số trang |
| `total` | `number` | `0` | Tổng số bản ghi |
| `roleCounts` | `Record<string, number>` | `{}` | Số lượng mỗi role |
| `courses` (TEACHER) | `{id, name_lop}[]` | `[]` | Danh sách khóa học của teacher |
| `selectedCourseId` (TEACHER) | `number \| undefined` | `undefined` | Khóa học đang chọn lọc |

## Data flow

### Page load

```
Mount → useEffect [deps rỗng] → fetchStudents(0)
  → getStudentsAction(query, role, page, sortBy, sortOrder, courseId)
  → Server: auth → ADMIN: all / TEACHER: filter enrollments.course.teacherId
  → Prisma: findMany + count + groupBy (song song)
  → Client: setStudents, setTotal, setTotalPages, setRoleCounts
  → setLoading(false)
  → Render danh sách
```

### Filter thay đổi (role, sort, search, course)

```
User thay đổi filter → setState
  → useEffect [searchQuery, selectedRole, sortBy, sortOrder] chạy
  → fetchStudents(0) (reset về trang đầu)
  → Server action với filter mới
  → Re-render
```

### Pagination

```
goToPrevPage() / goToNextPage()
  → fetchStudents(page - 1) / fetchStudents(page + 1)
  → Không reset về trang 0
```

### Search

- **Cơ chế:** Submit-based (Enter hoặc click search icon)
- **Không realtime:** Gõ xong nhấn Enter mới gọi API — tránh spam request, phù hợp với LIKE `%keyword%` không index
- **Optimizations:**
  - `isSearching` state riêng để không nhấp nháy toàn trang với loading chung
  - Nút X clear search → reset về danh sách gốc
  - Click icon kính lúp cũng trigger search

### 3 mode search

| Input | Logic | Ví dụ |
|-------|-------|-------|
| `#123` | `where.id = 123` | Tìm chính xác theo ID |
| `0912345678` (toàn số) | `OR[{id}, {name contains}, {email contains}]` | Tìm ID hoặc tên/email |
| `Nguyễn` (có chữ) | `OR[{name contains}, {email contains}, {phone contains}]` | Tìm theo text |

## Server action: getStudentsAction

### Signature

```typescript
getStudentsAction(
    query?: string,
    role?: Role | 'ALL' | 'COURSE_86_DAYS',
    page: number = 0,
    limit: number = 20,
    sortBy: 'createdAt' | 'id' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    courseId?: number     // TEACHER filter theo khóa
)
```

### Authorization flow

```
session = auth()
if role === ADMIN → full access
if role === TEACHER → scoped access
else → throw Unauthorized
```

### Scope WHERE for TEACHER

```typescript
where.enrollments = {
    some: {
        course: { teacherId: userId },
        ...(courseId ? { courseId } : {})
    }
}
where.role = Role.STUDENT    // TEACHER chỉ thấy STUDENT
```

### roleCounts for TEACHER

```
scopeWhere = { enrollments: { some: { course: { teacherId: userId } } } }
ALL = prisma.user.count({ where: scopeWhere })
STUDENT = ALL
Các role khác = 0
```

### roleCounts for ADMIN

Giữ nguyên logic cũ (groupBy + count riêng cho ALL và COURSE_86_DAYS).

### Response

```typescript
{
    success: true,
    students: StudentData[],
    total: number,
    page: number,
    totalPages: number,
    roleCounts: Record<string, number>
} | {
    success: false,
    error: string
}
```

## UI components

### ADMIN view

```
┌─────────────────────────────────────────────────┐
│  MainHeader: "THÀNH VIÊN"                        │
├─────────────────────────────────────────────────┤
│  1-20 / 156                                      │
├─────────────────────────────────────────────────┤
│  [Tất cả:156] [HV:100] [QT:2] [GV:30] [ĐT:24]  │
│  [🔍 Tìm Tên, SĐT, Email...]        [↕ Mới]     │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐ │
│  │  [Avatar]  #ID                              │ │
│  │  Tên học viên                                │ │
│  │  ✉ email@example.com                        │ │
│  │  📞 0123456789                              │ │
│  └─────────────────────────────────────────────┘ │
│  ...                                             │
├─────────────────────────────────────────────────┤
│     [Trước]  Trang 1 / 8  [Sau]                 │
└─────────────────────────────────────────────────┘
```

### TEACHER view

```
┌─────────────────────────────────────────────────┐
│  MainHeader: "THÀNH VIÊN"                        │
├─────────────────────────────────────────────────┤
│  1-20 / 45                                       │
├─────────────────────────────────────────────────┤
│  [Học viên:45]   [▼ Chọn khóa học...    ▼]      │
│  [🔍 Tìm Tên, SĐT, Email...]        [↕ Mới]     │
├─────────────────────────────────────────────────┤
│  ... (giống ADMIN)                               │
└─────────────────────────────────────────────────┘
```

### Student detail page

```
┌─────────────────────────────────────────────┐
│  MainHeader: "CHI TIẾT HỌC VIÊN"   [← Back] │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │  [Avatar lớn]                         │  │
│  │  Nguyễn Văn A                         │  │
│  │  #42                                  │  │
│  │                                       │  │
│  │  📧 email@example.com                 │  │
│  │  📞 0123456789                        │  │
│  │  🎓 Học viên                          │  │
│  │  📅 Tham gia: 01/01/2024             │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ─── Khóa học đã đăng ký ───               │
│  ┌─────────────────────────────────────┐   │
│  │  📘 86 Days Coach           5/10 ✅ │   │
│  │  📘 IELTS Foundation        3/8  🔄 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Events & handlers

| Event | Handler | Logic |
|-------|---------|-------|
| Click role button | `handleRoleChange(role)` | `setSelectedRole(role)` → useEffect tự fetch |
| Submit search | `handleSearch(e)` | `e.preventDefault()` → `fetchStudents(0)` |
| Click search icon | `handleSearch` | Gọi lại form submit |
| Click clear search | `clearSearch()` | `setSearchQuery('')` → `fetchStudents(0)` |
| Click sort | `toggleSort()` | Cycle: Mới → ID → Cũ |
| Click Prev/Next | `goToPrev/NextPage()` | `fetchStudents(page ± 1)` |
| Select course (TEACHER) | `onChange` | `setSelectedCourseId(id)` → useEffect tự fetch |
| Click student card | `<Link>` | Navigate to `/tools/students/{id}` |

## Edge cases & xử lý

| Case | Xử lý |
|------|-------|
| Loading | Spinner + "Đang tải..." |
| Empty (0 results) | Icon + "Không có thành viên" + "Danh sách trống" |
| Server error | Alert/toast hiển thị `error.message` |
| TEACHER không có khóa học nào | Dropdown rỗng, hiển thị "Chưa có khóa học" |
| TEACHER xem student không thuộc khóa của mình (detail page) | 403 Forbidden |
| Pagination ở trang đầu/cuối | Disable nút Trước/Sau |
| Search toàn số (#123) | Tìm chính xác theo ID |
| Search toàn số (0123) | Tìm OR[ID, name, email] |
| Search có chữ | Tìm OR[name, email, phone] contains |

## Security

| Layer | Biện pháp |
|-------|-----------|
| Server action | `auth()` check role ADMIN hoặc TEACHER |
| Server action (TEACHER) | Scope WHERE chỉ lấy enrollment thuộc `course.teacherId = userId` |
| Detail page (TEACHER) | Kiểm tra student có enrollment trong khóa của teacher → nếu không → 403 |
| Detail page (ADMIN) | Full access |

## Teacher-specific logic

### 1. Course dropdown

- Fetch từ `getAdminCoursesAction()` (đã hỗ trợ TEACHER scope)
- Default: "Tất cả các khóa"
- Chọn 1 khóa → thêm `courseId` param vào `getStudentsAction`

### 2. Role filter

- Chỉ hiện "Học viên" (STUDENT)
- `selectedRole` luôn là `'STUDENT'`
- Không có ADMIN/INSTRUCTOR/AFFILIATE/COURSE_86_DAYS

### 3. roleCounts

- `ALL` = tổng student trong scope của teacher
- `STUDENT` = `ALL`
- Các role khác: không hiển thị

### 4. Search

- Scope tự động thêm `enrollments.course.teacherId = userId`
- Tìm kiếm chỉ trong phạm vi học viên của teacher

## File cần tạo/sửa

| File | Action | Nội dung |
|------|--------|----------|
| `app/tools/students/STUDENT.md` | ✅ Đã tạo | Tài liệu kỹ thuật |
| `app/actions/admin-actions.ts:527-558` | Sửa | `getStudentsAction`: phân quyền ADMIN/TEACHER, thêm param `courseId`, scope WHERE, roleCounts theo scope |
| `app/tools/students/page.tsx` | Sửa | Fix bugs (double-fetch, error, type) + TEACHER UI (course dropdown, ẩn role filter) + search optimizations |
| `app/tools/students/[id]/page.tsx` | Tạo mới | Student detail page (Server Component) |
