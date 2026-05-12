# PAYMENTS.md — Tài liệu tính năng /tools/payments

## Tổng quan

Trang quản lý & duyệt thanh toán học phí. Cho phép ADMIN/TEACHER xem, xác nhận và từ chối các yêu cầu thanh toán của học viên.

## File structure

```
app/tools/payments/
├── page.tsx              # Danh sách thanh toán (Client Component)

app/actions/
└── payment-actions.ts    # Server actions xử lý thanh toán

components/
├── course/PaymentModal.tsx        # Modal thanh toán (dành cho học viên)
└── payment/UploadProofModal.tsx   # Modal upload biên lai

app/api/upload/payment/route.ts    # API upload ảnh biên lai
lib/auto-verify.ts                 # Engine auto-verify từ email
app/api/cron/gmail-watch/route.ts  # Cron trigger auto-verify
```

## Schema

### Payment Model

```prisma
model Payment {
  id              Int           @id @default(autoincrement())
  enrollmentId    Int           @unique
  amount          Int
  bankName        String?
  accountNumber   String?
  transferTime    DateTime?
  content         String?
  phone           String?
  courseCode      String?
  proofImage      String?
  status          PaymentStatus @default(PENDING)
  verifiedAt      DateTime?
  verifyMethod    String?
  note            String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  qrCodeUrl       String?
  transferContent String?

  enrollment      Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
}
```

### Relation chain

```
Payment (1:1) → Enrollment (M:1) → User (student)
                                  → Course (M:1) → teacherId → User (TEACHER)
```

Payment không có `userId` hay `courseId` trực tiếp — phải JOIN qua Enrollment.

### PaymentStatus enum

| Value | Ý nghĩa |
|-------|---------|
| `PENDING` | Chờ xác nhận |
| `VERIFIED` | Đã xác nhận |
| `REJECTED` | Bị từ chối |
| `CANCELLED` | Đã hủy |

## State management (page.tsx)

### State

| Variable | Type | Initial | Mô tả |
|----------|------|---------|-------|
| `payments` | `PaymentData[]` | `[]` | Danh sách thanh toán |
| `loading` | `boolean` | `true` | Trạng thái loading |
| `filter` | `'PENDING' \| 'ALL'` | `'PENDING'` | Bộ lọc tab |
| `actionLoading` | `number \| null` | `null` | Payment ID đang xử lý (spinner button) |

### Derived

```typescript
const stats = {
  pending: payments.filter(p => p.status === 'PENDING').length,
  verified: payments.filter(p => p.status === 'VERIFIED').length,
  rejected: payments.filter(p => p.status === 'REJECTED').length,
}
```

## Data flow

### Page load

```
Mount → useEffect [filter] → loadPayments()
  → filter === 'PENDING' → getPendingPayments()
  → filter === 'ALL'     → getAllPayments()
  → Server: prisma.payment.findMany({ include: { enrollment: { include: { user, course } } } })
  → Client: setPayments(result.payments), setLoading(false)
  → Render danh sách
```

### Xác nhận thanh toán

```
handleVerify(paymentId)
  → setActionLoading(paymentId)
  → verifyPaymentAction(enrollmentId, 'MANUAL_ADMIN', note)
    → Prisma transaction:
        1. payment.update({ status: 'VERIFIED' })
        2. enrollment.update({ status: 'ACTIVE' })
    → processEnrollmentCommission() (affiliate)
    → revalidatePath('/'), revalidatePath('/courses')
  → loadPayments() (refresh)
  → setActionLoading(null)
```

### Từ chối thanh toán

```
handleReject(paymentId)
  → prompt("Nhập lý do từ chối:")
  → setActionLoading(paymentId)
  → rejectPaymentAction(enrollmentId, reason)
    → payment.update({ status: 'REJECTED', note: reason })
    → revalidatePath('/'), revalidatePath('/courses')
  → loadPayments() (refresh)
  → setActionLoading(null)
```

## File structure & phân tích chi tiết

### `app/tools/payments/page.tsx` (286 dòng)

**Kiến trúc:** Client Component, `'use client'`

**Vấn đề hiện tại:**
- ❌ **Không có authorization** — bất kỳ user nào cũng truy cập được
- ❌ **Không có phân quyền TEACHER** — TEACHER thấy tất cả payment, không chỉ khóa của mình
- ❌ **Không handle error** — nếu server action fail, chỉ im lặng không thông báo
- ❌ **Không phân trang** — tất cả payment load 1 lần
- ❌ **Filter stats tính từ payments đã load** — không chính xác nếu có nhiều payment

### `app/actions/payment-actions.ts` (275 dòng)

| Action | Mô tả | Auth hiện tại |
|--------|-------|---------------|
| `getPendingPayments()` | Lấy payment PENDING | ❌ Không check |
| `getAllPayments()` | Lấy tất cả payment | ❌ Không check |
| `verifyPaymentAction()` | Xác nhận + active enrollment | ❌ Chỉ check login |
| `rejectPaymentAction()` | Từ chối payment | ❌ Chỉ check login |
| `createPaymentForEnrollment()` | Tạo payment mới | ❌ Không check |
| `updatePaymentProof()` | Update ảnh biên lai | ❌ Không check |
| `autoVerifyPayment()` | Auto-verify từ cron | ✅ System (không cần) |

## Kế hoạch nâng cấp

### Mục tiêu

1. **Phân quyền**: ADMIN xem tất cả, TEACHER chỉ xem payment của học viên trong khóa của mình
2. **Fix bảo mật**: Thêm `auth()` check role vào tất cả server actions
3. **Fix lỗi**: Error handling, type safety

### Các file cần sửa/tạo

| File | Action | Chi tiết |
|------|--------|----------|
| `app/actions/payment-actions.ts` | SỬA | Thêm auth + TEACHER scope vào `getPendingPayments`, `getAllPayments`, `verifyPaymentAction`, `rejectPaymentAction` |
| `app/tools/payments/page.tsx` | SỬA | Thêm error handling, cải thiện layout scroll (giống students pattern) |

### Chi tiết thay đổi

#### 1. Sửa `getPendingPayments()` và `getAllPayments()`

```typescript
export async function getPendingPayments() {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        const userId = parseInt(session.user.id)
        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER
        if (!isAdmin && !isTeacher) return { success: false, error: "Unauthorized" }

        const where: any = { status: 'PENDING' }
        if (isTeacher) {
            where.enrollment = { course: { teacherId: userId } }
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                enrollment: {
                    include: {
                        user: { select: { id: true, name: true, email: true, phone: true } },
                        course: { select: { id: true, id_khoa: true, name_lop: true, phi_coc: true, teacherId: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, payments }
    } catch (error: any) {
        console.error("Get Pending Payments Error:", error)
        return { success: false, error: error.message }
    }
}
```

> Tương tự cho `getAllPayments()` — thêm `where` tương ứng (bỏ `status: 'PENDING'`).

#### 2. Sửa `verifyPaymentAction()` và `rejectPaymentAction()`

```typescript
export async function verifyPaymentAction(enrollmentId, method, note) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        const userId = parseInt(session.user.id)
        const isAdmin = session.user.role === Role.ADMIN
        const isTeacher = session.user.role === Role.TEACHER
        if (!isAdmin && !isTeacher) return { success: false, error: "Unauthorized" }

        const enrollment = await prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: { course: true, payment: true }
        })
        if (!enrollment) return { success: false, error: "Enrollment not found" }

        // TEACHER: chỉ được duyệt payment của khóa mình
        if (isTeacher && enrollment.course.teacherId !== userId) {
            return { success: false, error: "Forbidden" }
        }
        // ... phần còn lại giữ nguyên
    }
}
```

> Tương tự cho `rejectPaymentAction()`.

#### 3. Error handling cho page.tsx

```typescript
// Thêm state error
const [error, setError] = useState<string | null>(null)

async function loadPayments() {
    setLoading(true)
    setError(null)
    const result = filter === 'PENDING'
        ? await getPendingPayments()
        : await getAllPayments()
    if (result.success) {
        setPayments(result.payments as PaymentData[])
    } else {
        setError(result.error || 'Có lỗi xảy ra')
    }
    setLoading(false)
}
```

### Rủi ro & lưu ý

| Rủi ro | Mức | Cách xử lý |
|---------|-----|-----------|
| TEACHER không có khóa học nào → payments rỗng | Thấp | Hiển thị empty state bình thường |
| `verifyPaymentAction` gọi `processEnrollmentCommission` — TEACHER có quyền trigger | Trung bình | Check `isAdmin` khi xử lý commission, TEACHER vẫn được |
| `autoVerifyPayment` (từ cron) không cần auth | Không | Không thay đổi — chạy system |

## UI components

### Layout hiện tại

```
┌──────────────────────────────┐
│        MainHeader            │
├──────────────────────────────┤
│  156 yêu cầu                 │
├──────────────────────────────┤
│  [3 Chờ] [150 OK] [3 Từ chối]│
│  [⏳ Chờ xác nhận] [📋 Tất cả]│
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │  Payment cards...      │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### Layout mới (áp dụng pattern từ /tools/students)

```
┌──────────────────────────────┐
│        MainHeader            │  fixed
├──────────────────────────────┤
│  [3 Chờ] [150 OK] [3 Từ chối]│  ┐
│  [⏳ Chờ xác nhận] [📋 Tất cả]│  │ panel (shrink-0)
│  ──────────────────────────  │  │ không scroll
│  156 yêu cầu                 │  ┘
├──────────────────────────────┤
│  (error banner)              │  ┐
│  ┌────────────────────────┐  │  │ scrollable
│  │  Payment cards...      │  │  │ (flex-1 overflow-y-auto)
│  └────────────────────────┘  │  ┘
└──────────────────────────────┘
```

### Events & handlers

| Event | Handler | Logic |
|-------|---------|-------|
| Click tab filter | `setFilter('PENDING'/'ALL')` | useEffect → loadPayments() |
| Click Xác nhận | `handleVerify(id)` | verifyPaymentAction → refresh |
| Click Từ chối | `handleReject(id)` | prompt → rejectPaymentAction → refresh |

### Edge cases & xử lý

| Case | Xử lý |
|------|-------|
| Loading | Spinner + "Đang tải..." |
| Empty (0 results) | Icon + "Không có thanh toán nào" + "Danh sách trống" |
| Server error (hiện tại) | ❌ Không có — silently empty |
| Server error (sau fix) | ✅ Banner lỗi đỏ |
| Action loading | Button spinner, disabled cả 2 nút |
| TEACHER không có khóa | Empty state — "Không có thanh toán nào" |

## Security

| Layer | Hiện tại | Sau fix |
|-------|----------|---------|
| Server action | ❌ Không check role | ✅ ADMIN + TEACHER check |
| TEACHER scope | ❌ Thấy tất cả payment | ✅ Chỉ payment của khóa mình |
| Verify/Reject action | ❌ Bất kỳ user nào | ✅ Check ownership nếu là TEACHER |
