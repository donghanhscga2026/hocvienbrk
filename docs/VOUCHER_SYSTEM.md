# 📘 TÀI LIỆU KỸ THUẬT: Hệ thống Voucher — Thay thế VIP Logic

**Phiên bản:** 1.0
**Ngày:** 2026-07-12
**Trạng thái:** Draft — chờ User review & xác nhận

---

## 1. MỤC TIÊU

### 1.1. Hiện trạng (As-Is)

VIP logic hiện tại:
- **VIP = user có ACTIVE enrollment ở courseId=1** (hardcoded)
- Course có field `vipExempt: Boolean` → admin tick "Không áp dụng VIP"
- Khi VIP user kích hoạt khóa có `vipExempt=false` → `effectivePhiCoc = 0` (free)

**Vấn đề hiện tại:**
- Không linh hoạt — chỉ 1 loại VIP, không phân loại
- Không có khái niệm "voucher" — user không "sở hữu" quyền lợi VIP, nó được tính toán động
- `enroll-after-register` route **thiếu check vipExempt** (BUG: VIP user enroll course vipExempt=true vẫn free sai)
- `CourseCard.tsx` và `PaymentModal.tsx` **không check vipExempt** (chỉ check `isCourseOneActive`)
- Không hỗ trợ giảm giá theo giá trị tiền (CASH voucher)
- Không có thời hạn, không có lịch sử sử dụng

### 1.2. Mục tiêu (To-Be)

Chuyển sang hệ thống **Voucher** linh hoạt:
- User **sở hữu voucher** cụ thể (có thời hạn, có lịch sử)
- Course **chọn loại voucher nào accept** (checkbox list)
- Course **thưởng voucher** khi kích hoạt (auto-award)
- **3 loại voucher**: VIP (kích hoạt khóa accept VIP), ALL (tất cả khóa), CASH (trừ tiền)
- MBW Wallet = **Aggregator** tổng hợp từ BrkWallet + AffiliateWallet (read-only computed)
- **Xóa hoàn toàn** logic `isCourseOneActive` courseId=1

---

## 2. QUYẾT ĐỊNH CỦA USER (Đã xác nhận)

| Hỏi | Trả lời |
|-----|---------|
| Ví MBW | **Aggregator** — đọc từ BrkWallet + AffiliateWallet, không model mới |
| Voucher issuance | **Cả hai** — auto khi kích hoạt khóa + admin tạo thủ công |
| Voucher expiry | **Tùy loại voucher** (admin cấu hình durationDays) |
| VIP voucher scope | **Chỉ khóa có cài 'VIP' voucher** trong accepted list |
| vipExempt migration | **Convert sang voucher list** (false → accept VIP, true → không accept) |
| VoucherType enum | **VIP + ALL + CASH** (3 loại) |
| Course settings UI | **Checkbox list** (☑ VIP ☑ ALL ☑ CASH) |
| Auto-award config | **Trên form tạo/sửa khóa học** |
| MBW wallet UI | **Chưa cần** — backend trước, UI sau |
| VIP logic replacement | **Thay thế hoàn toàn** (không song song) |

---

## 3. KIẾN TRÚC DỮ LIỆU

### 3.1. Enum mới

```prisma
enum VoucherType {
  VIP      // Kích hoạt khóa học có phí (nếu khóa accept VIP)
  ALL      // Kích hoạt TẤT CẢ khóa học có phí
  CASH     // Trừ tiền trực tiếp khỏi phí khóa học
}

enum UserVoucherStatus {
  ACTIVE    // Đang dùng được
  USED      // Đã sử dụng
  EXPIRED   // Hết hạn
}
```

### 3.2. Model `Voucher` — Định nghĩa loại voucher

```prisma
model Voucher {
  id            Int          @id @default(autoincrement())
  code          String       @unique    // Mã code: "VIP-2024", "ALL-F1", "CASH-500K"
  name          String                   // Tên hiển thị: "Voucher VIP", "Voucher All Access"
  type          VoucherType              // VIP, ALL, CASH
  value         Int          @default(0) // Giá trị tiền (CASH: VND, VIP/ALL: 0)
  durationDays  Int?                     // Số ngày hiệu lực (null = vĩnh viễn)
  description   String?
  isActive      Boolean      @default(true)
  createdAt     DateTime     @default(now())

  userVouchers        UserVoucher[]
  awardedCourses      CourseVoucherAward[]
  acceptedCourses     CourseAcceptedVoucher[]

  @@index([type])
  @@index([code])
}
```

**Ví dụ seed data:**

| code | name | type | value | durationDays |
|------|------|------|-------|-------------|
| VIP-DEFAULT | Voucher VIP | VIP | 0 | null |
| ALL-DEFAULT | Voucher All Access | ALL | 0 | null |
| CASH-386K | Voucher 386K | CASH | 386000 | 90 |

### 3.3. Model `UserVoucher` — Voucher mà user sở hữu

```prisma
model UserVoucher {
  id                    Int               @id @default(autoincrement())
  userId                Int
  voucherId             Int
  status                UserVoucherStatus @default(ACTIVE)
  awardedFromCourseId   Int?              // Khóa nào đã thưởng voucher này
  expiresAt             DateTime?         // null = vĩnh viễn
  usedAt                DateTime?         // Thời điểm sử dụng
  usedForCourseId       Int?              // Dùng cho khóa nào
  createdAt             DateTime          @default(now())

  user                  User              @relation(fields: [userId], references: [id])
  voucher               Voucher           @relation(fields: [voucherId], references: [id])

  @@unique([userId, voucherId, awardedFromCourseId])
  @@index([userId, status])
  @@index([voucherId])
  @@map("user_voucher")
}
```

### 3.4. Model `CourseVoucherAward` — Khóa học thưởng voucher khi kích hoạt

```prisma
model CourseVoucherAward {
  id          Int       @id @default(autoincrement())
  courseId     Int
  voucherId   Int       // Voucher nào được thưởng khi kích hoạt khóa này
  course      Course    @relation(fields: [courseId], references: [id])
  voucher     Voucher   @relation(fields: [voucherId], references: [id])

  @@unique([courseId, voucherId])
  @@map("course_voucher_award")
}
```

### 3.5. Model `CourseAcceptedVoucher` — Khóa học accept loại voucher nào

```prisma
model CourseAcceptedVoucher {
  id          Int       @id @default(autoincrement())
  courseId     Int
  voucherId   Int       // Loại voucher nào được accept để free/giảm giá
  course      Course    @relation(fields: [courseId], references: [id])
  voucher     Voucher   @relation(fields: [voucherId], references: [id])

  @@unique([courseId, voucherId])
  @@map("course_accepted_voucher")
}
```

### 3.6. Changes trên existing models

**Course** — thêm relations, giữ `vipExempt` tạm:

```prisma
model Course {
  // ... existing fields giữ nguyên ...
  vipExempt     Boolean   @default(false)  // DEPRECATED — giữ để migrate

  acceptedVouchers  CourseAcceptedVoucher[]  // MỚI
  voucherAwards     CourseVoucherAward[]     // MỚI
}
```

**User** — thêm relation:

```prisma
model User {
  // ... existing fields giữ nguyên ...
  userVouchers  UserVoucher[]  // MỚI
}
```

### 3.7. Entity Relationship Diagram

```
┌──────────┐     ┌────────────────────────┐     ┌──────────────┐
│ Voucher  │────<│ CourseAcceptedVoucher  │>────│   Course     │
│          │     └────────────────────────┘     │              │
│          │     ┌────────────────────────┐     │  acceptedV   │
│          │────<│ CourseVoucherAward     │>────│  voucherAwar │
│          │     └────────────────────────┘     │              │
└────┬─────┘                                    └──────────────┘
     │
     │
┌────┴──────┐     ┌──────────┐
│UserVoucher│>────│   User   │
│           │     └──────────┘
│ status    │
│ expiresAt │
│ usedAt    │
└───────────┘
```

---

## 4. BACKEND LOGIC

### 4.1. Voucher Service (`lib/voucher/voucher-service.ts`)

#### Core Function: `checkVoucherForCourse`

```typescript
async function checkVoucherForCourse(userId: number, courseId: number): Promise<{
  applicable: boolean
  voucherType?: 'VIP' | 'ALL' | 'CASH'
  discount?: number       // Số tiền giảm (chỉ CASH)
  userVoucherId?: number  // ID UserVoucher được dùng
}>
```

**Logic pseudocode:**

```typescript
async function checkVoucherForCourse(userId, courseId) {
  // 1. Lấy acceptedVoucherIds từ CourseAcceptedVoucher
  const accepted = await prisma.courseAcceptedVoucher.findMany({
    where: { courseId },
    select: { voucherId: true }
  })
  if (accepted.length === 0) return { applicable: false }

  // 2. Lấy user's active vouchers (join với Voucher để lấy type)
  const userVouchers = await prisma.userVoucher.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },               // vĩnh viễn
        { expiresAt: { gt: new Date() } }  // chưa hết hạn
      ]
    },
    include: { voucher: true }
  })

  // 3. Kiểm tra priority: ALL > VIP > CASH

  // Priority 1: ALL voucher (match mọi khóa có phí)
  const allVoucher = userVouchers.find(
    uv => uv.voucher.type === 'ALL' &&
          accepted.some(a => a.voucherId === uv.voucherId)
  )
  if (allVoucher) return {
    applicable: true,
    voucherType: 'ALL',
    userVoucherId: allVoucher.id
  }

  // Priority 2: VIP voucher (match khóa accept VIP)
  const vipVoucher = userVouchers.find(
    uv => uv.voucher.type === 'VIP' &&
          accepted.some(a => a.voucherId === uv.voucherId)
  )
  if (vipVoucher) return {
    applicable: true,
    voucherType: 'VIP',
    userVoucherId: vipVoucher.id
  }

  // Priority 3: CASH voucher (match khóa accept CASH, trừ tiền)
  const cashVoucher = userVouchers.find(
    uv => uv.voucher.type === 'CASH' &&
          accepted.some(a => a.voucherId === uv.voucherId)
  )
  if (cashVoucher) return {
    applicable: true,
    voucherType: 'CASH',
    discount: cashVoucher.voucher.value,
    userVoucherId: cashVoucher.id
  }

  return { applicable: false }
}
```

#### Các function khác

```typescript
// Award voucher cho user
async function awardVoucher(
  userId: number,
  voucherId: number,
  fromCourseId?: number
): Promise<UserVoucher>
// Kiểm tra uniqueness: user đã có voucher này từ khóa này chưa?
// Nếu có → skip (không award trùng)

// Lấy danh sách voucher của user
async function getUserVouchers(
  userId: number,
  status?: UserVoucherStatus
): Promise<UserVoucher[]>

// Đánh dấu voucher đã dùng
async function markVoucherUsed(
  userVoucherId: number,
  usedForCourseId: number
): Promise<void>
// Update status → USED, usedAt → now(), usedForCourseId

// Hết hạn voucher (cron job)
async function expireOldVouchers(): Promise<number>
// Find UserVouchers WHERE status=ACTIVE AND expiresAt < now()
// → set status=EXPIRED

// Tạo voucher mới (admin)
async function createVoucher(data: {
  code: string, name: string, type: VoucherType,
  value?: number, durationDays?: number, description?: string
}): Promise<Voucher>

// Assign voucher cho user (admin)
async function assignVoucherToUser(
  userId: number, voucherId: number
): Promise<UserVoucher>
```

### 4.2. MBW Wallet Service (`lib/voucher/mbw-wallet-service.ts`)

**Aggregator — computed view, KHÔNG có model riêng:**

```typescript
async function getMbwBalance(userId: number) {
  const [brkWallet, affiliateWallet] = await Promise.all([
    prisma.brkWallet.findUnique({ where: { userId } }),
    prisma.affiliateWallet.findUnique({ where: { userId } })
  ])

  return {
    // Từ BrkWallet
    cash: brkWallet?.balance ?? 0,
    brkd: brkWallet?.brkd ?? 0,
    voucherBalance: brkWallet?.voucherBalance ?? 0,

    // Từ AffiliateWallet
    affiliatePending: affiliateWallet?.pendingBalance ?? 0,
    affiliateAvailable: affiliateWallet?.balance ?? 0,

    // Computed totals
    totalMbp: brkWallet?.totalEarned ?? 0,
    totalMdt: brkWallet?.brkd ?? 0,
    totalCash: Number(brkWallet?.balance ?? 0) +
               Number(affiliateWallet?.balance ?? 0),
  }
}
```

### 4.3. Sửa `enrollInCourseAction` (`app/actions/course-actions.ts`)

**A. Select query — thêm acceptedVouchers, bỏ vipExempt:**

```typescript
// TRƯỚC (lines 27-41):
const course = await prisma.course.findUnique({
  where: { id: courseId },
  select: {
    phi_coc: true, vipExempt: true, id_khoa: true,
    name_lop: true, noidung_email: true, type: true,
    teacherId: true,
    teacherBankAccount: { select: { ... } }
  }
})

// SAU:
const course = await prisma.course.findUnique({
  where: { id: courseId },
  select: {
    phi_coc: true, id_khoa: true,
    name_lop: true, noidung_email: true, type: true,
    teacherId: true,
    teacherBankAccount: { select: { ... } }
    // BỎ vipExempt
  }
})
```

**B. VIP check — thay hoàn toàn bằng voucher (lines 52-75):**

```typescript
// TRƯỚC:
let effectivePhiCoc = course.phi_coc
let isLibAllowed = false

if (course.type === 'LIB') {
  // ... LIB check giữ nguyên ...
} else if (course.type !== 'SYS') {
  const vipEnrollment = await prisma.enrollment.findFirst({
    where: { userId, courseId: 1, status: 'ACTIVE' }
  })
  if (vipEnrollment && !course.vipExempt) effectivePhiCoc = 0
}

// SAU:
let effectivePhiCoc = course.phi_coc
let isLibAllowed = false
let appliedUserVoucherId: number | null = null  // MỚI
let appliedVoucherType: string | null = null     // MỚI

if (course.type === 'LIB') {
  // ... LIB check giữ nguyên ...
} else if (course.type !== 'SYS') {
  const { checkVoucherForCourse } = await import(
    '@/lib/voucher/voucher-service'
  )
  const voucherCheck = await checkVoucherForCourse(userId, courseId)
  if (voucherCheck.applicable) {
    if (voucherCheck.type === 'CASH') {
      effectivePhiCoc = Math.max(
        0, course.phi_coc - (voucherCheck.discount || 0)
      )
    } else {
      effectivePhiCoc = 0  // VIP hoặc ALL → free
    }
    appliedUserVoucherId = voucherCheck.userVoucherId || null
    appliedVoucherType = voucherCheck.voucherType || null
  }
}
```

**C. Sau enrollment thành công — award voucher + mark used:**

```typescript
// Thêm sau line 185 (prisma.enrollment.create):

// 1. Đánh dấu voucher đã dùng (nếu có)
if (appliedUserVoucherId) {
  const { markVoucherUsed } = await import(
    '@/lib/voucher/voucher-service'
  )
  await markVoucherUsed(appliedUserVoucherId, newEnrollment.id)
}

// 2. Award voucher từ course
const { awardVoucher } = await import(
  '@/lib/voucher/voucher-service'
)
const awards = await prisma.courseVoucherAward.findMany({
  where: { courseId },
  include: { voucher: true }
})
for (const award of awards) {
  await awardVoucher(userId, award.voucherId, courseId)
}
```

**D. Trả về client — thêm voucher info:**

```typescript
// Thêm vào return (line ~320):
return {
  success: true,
  status: newEnrollment.status,
  enrollment: enrolledData,
  warning: missingBankAccount ? "..." : undefined,
  voucherApplied: !!appliedUserVoucherId,  // MỚI
  voucherType: appliedVoucherType,          // MỚI
}
```

### 4.4. Sửa `enroll-after-register` (`app/api/enroll-after-register/route.ts`)

**A. Thay VIP check (lines 56-63) bằng voucher check:**

```typescript
// TRƯỚC:
let effectivePhiCoc = course.phi_coc

if (course.type !== 'LIB' && course.type !== 'SYS') {
  const vipEnrollment = await prisma.enrollment.findFirst({
    where: { userId: userIdNum, courseId: 1, status: 'ACTIVE' }
  })
  if (vipEnrollment) effectivePhiCoc = 0
}

// SAU:
let effectivePhiCoc = course.phi_coc
let appliedUserVoucherId: number | null = null

if (course.type !== 'LIB' && course.type !== 'SYS') {
  const { checkVoucherForCourse } = await import(
    '@/lib/voucher/voucher-service'
  )
  const voucherCheck = await checkVoucherForCourse(userIdNum, course.id)
  if (voucherCheck.applicable) {
    if (voucherCheck.type === 'CASH') {
      effectivePhiCoc = Math.max(
        0, course.phi_coc - (voucherCheck.discount || 0)
      )
    } else {
      effectivePhiCoc = 0
    }
    appliedUserVoucherId = voucherCheck.userVoucherId || null
  }
}
```

**B. Thêm award + mark used sau enrollment:**

```typescript
// Thêm sau prisma.enrollment.create (line ~74):
if (appliedUserVoucherId) {
  const { markVoucherUsed } = await import(
    '@/lib/voucher/voucher-service'
  )
  await markVoucherUsed(appliedUserVoucherId, newEnrollment.id)
}

// Award voucher
const { awardVoucher } = await import(
  '@/lib/voucher/voucher-service'
)
const awards = await prisma.courseVoucherAward.findMany({
  where: { courseId: course.id },
  include: { voucher: true }
})
for (const award of awards) {
  await awardVoucher(userIdNum, award.voucherId, course.id)
}
```

### 4.5. Sửa `updateCourseAction` (`app/actions/admin-actions.ts`)

**Thay vipExempt bằng acceptedVoucherIds + awardVoucherIds:**

```typescript
// Signature mới (line ~960):
export async function updateCourseAction(courseId: number, data: {
  // ... existing fields ...
  // BỎ: vipExempt?: boolean
  acceptedVoucherIds?: number[]   // MỚI
  awardVoucherIds?: number[]      // MỚI
})

// Logic update — thêm sau line 1020:
if (data.acceptedVoucherIds !== undefined) {
  await prisma.courseAcceptedVoucher.deleteMany({
    where: { courseId }
  })
  if (data.acceptedVoucherIds.length > 0) {
    await prisma.courseAcceptedVoucher.createMany({
      data: data.acceptedVoucherIds.map(voucherId => ({
        courseId, voucherId
      }))
    })
  }
}
if (data.awardVoucherIds !== undefined) {
  await prisma.courseVoucherAward.deleteMany({
    where: { courseId }
  })
  if (data.awardVoucherIds.length > 0) {
    await prisma.courseVoucherAward.createMany({
      data: data.awardVoucherIds.map(voucherId => ({
        courseId, voucherId
      }))
    })
  }
}
```

### 4.6. Sửa Course API Routes

**`app/api/courses/route.ts` (POST):**

```typescript
// Thêm vào create data:
acceptedVoucherIds: body.acceptedVoucherIds || [],
awardVoucherIds: body.awardVoucherIds || [],
```

**`app/api/courses/[id]/route.ts` (GET):**

```typescript
// Thêm vào include:
include: {
  courseCategory: true,
  teacherBankAccount: true,
  acceptedVouchers: {      // MỚI
    include: { voucher: true }
  },
  voucherAwards: {         // MỚI
    include: { voucher: true }
  },
}
```

### 4.7. Cron Job — `app/api/cron/expire-vouchers/route.ts`

```typescript
// GET handler — chạy hàng ngày (cron trigger)
export async function GET() {
  const { expireOldVouchers } = await import(
    '@/lib/voucher/voucher-service'
  )
  const expiredCount = await expireOldVouchers()
  return NextResponse.json({
    success: true,
    expired: expiredCount
  })
}
```

---

## 5. FRONTEND CHANGES

### 5.1. Admin Form — Tạo/Sửa khóa học

**Files:** `app/tools/courses/new/page.tsx` + `app/tools/courses/[id]/page.tsx`

**Thay thế section VIP hiện tại:**

```tsx
{/* TRƯỚC — checkbox "Không áp dụng VIP": */}
<div className="space-y-1.5">
  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
    VIP
  </label>
  <label className="flex items-center gap-2 bg-gray-50 border ...">
    <input type="checkbox" checked={vipExempt}
           onChange={(e) => setVipExempt(e.target.checked)} />
    <span>Không áp dụng VIP</span>
  </label>
</div>
```

```tsx
{/* SAU — Checkbox list voucher: */}
<div className="space-y-4">
  {/* Nhóm 1: Voucher áp dụng (accept) */}
  <div>
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
      Voucher áp dụng cho khóa này
    </label>
    <div className="flex flex-wrap gap-3 mt-2">
      {allVouchers.map(v => (
        <label key={v.id}
          className="flex items-center gap-2 bg-gray-50 border
                     border-gray-100 rounded-2xl px-4 py-3 cursor-pointer">
          <input type="checkbox"
            checked={acceptedVoucherIds.includes(v.id)}
            onChange={(e) => {
              if (e.target.checked)
                setAcceptedVoucherIds([...acceptedVoucherIds, v.id])
              else
                setAcceptedVoucherIds(
                  acceptedVoucherIds.filter(id => id !== v.id)
                )
            }}
            className="w-5 h-5 rounded" />
          <span className="text-sm font-bold text-gray-700">
            {v.name}
          </span>
          <span className="text-[10px] text-gray-400">
            ({v.type})
          </span>
        </label>
      ))}
    </div>
  </div>

  {/* Nhóm 2: Voucher thưởng (award) */}
  <div>
    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
      Voucher thưởng khi kích hoạt
    </label>
    <div className="flex flex-wrap gap-3 mt-2">
      {allVouchers.map(v => (
        <label key={v.id}
          className="flex items-center gap-2 bg-gray-50 border
                     border-gray-100 rounded-2xl px-4 py-3 cursor-pointer">
          <input type="checkbox"
            checked={awardVoucherIds.includes(v.id)}
            onChange={(e) => {
              if (e.target.checked)
                setAwardVoucherIds([...awardVoucherIds, v.id])
              else
                setAwardVoucherIds(
                  awardVoucherIds.filter(id => id !== v.id)
                )
            }}
            className="w-5 h-5 rounded" />
          <span className="text-sm font-bold text-gray-700">
            {v.name}
          </span>
        </label>
      ))}
    </div>
  </div>
</div>
```

**State mới cần thêm:**

```typescript
const [acceptedVoucherIds, setAcceptedVoucherIds] = useState<number[]>([])
const [awardVoucherIds, setAwardVoucherIds] = useState<number[]>([])
const [allVouchers, setAllVouchers] = useState<any[]>([])

// Load vouchers khi mount
useEffect(() => {
  fetch('/api/vouchers')
    .then(r => r.json())
    .then(data => setAllVouchers(data.vouchers || []))
}, [])
```

### 5.2. CourseCard — Hiển thị giá

**File:** `components/course/CourseCard.tsx`

```typescript
// TRƯỚC (line 66):
const effectivePhiCoc = isCourseOneActive ? 0 : course.phi_coc

// SAU:
// effectivePhiCoc được truyền từ server qua course data
const effectivePhiCoc = course.effectivePhiCoc ?? course.phi_coc
```

**Hiển thị badge voucher đã áp dụng (thêm vào badge section):**

```tsx
{course.voucherApplied && (
  <span className="inline-flex items-center gap-1 rounded-full
    bg-green-50 px-2 py-0.5 text-[10px] font-black tracking-wider
    text-green-700 border border-green-200 shadow-sm">
    🎫 Giảm{' '}
    {course.voucherType === 'CASH'
      ? `${(course.voucherDiscount || 0).toLocaleString('vi-VN')}đ`
      : '100%'}
  </span>
)}
```

### 5.3. PaymentModal — Hiển thị giảm giá

**File:** `components/course/PaymentModal.tsx`

```typescript
// TRƯỚC (line 46):
const effectiveAmount = isCourseOneActive
  ? 0
  : (payment?.amount || course.phi_coc || 0)

// SAU:
const effectiveAmount = course.effectivePhiCoc ??
  (payment?.amount || course.phi_coc || 0)
```

**Thêm hiển thị chi tiết giảm giá:**

```tsx
{course.voucherApplied && (
  <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
    <p className="text-xs font-bold text-green-700">
      🎫 Đã áp dụng voucher {course.voucherType}
    </p>
    <p className="text-[10px] text-green-600">
      Phí gốc: {course.phi_coc.toLocaleString('vi-VN')}đ
      {' → '}Còn: {effectiveAmount.toLocaleString('vi-VN')}đ
    </p>
  </div>
)}
```

### 5.4. CourseLandingTemplate — Hiển thị giá

**File:** `components/landing/CourseLandingTemplate.tsx`

```typescript
// TRƯỚC (line 78):
const effectivePhiCoc =
  (isCourseOneActive && !course.vipExempt) ? 0 : course.phi_coc

// SAU:
const effectivePhiCoc = course.effectivePhiCoc ?? course.phi_coc
```

### 5.5. Xóa `isCourseOneActive` prop chain

| File | Thay đổi |
|------|----------|
| `app/page.tsx` | Bỏ prop `isCourseOneActive={enrollmentsMap[1]?.status === 'ACTIVE'}` |
| `app/page/[slug]/page.tsx` | Same |
| `components/home/HomePageClient.tsx` | Bỏ `isCourseOneActive` khỏi interface + usage |
| `components/home/CourseSection.tsx` | Bỏ `isCourseOneActive` prop |
| `components/course/CourseCard.tsx` | Bỏ `isCourseOneActive` prop, dùng `effectivePhiCoc` |
| `components/course/PaymentModal.tsx` | Bỏ `isCourseOneActive` prop, dùng `effectivePhiCoc` |
| `components/landing/CourseLandingTemplate.tsx` | Same |

---

## 6. MIGRATION

### 6.1. Script: `scripts/migrate-vip-to-voucher.ts`

```typescript
import prisma from '@/lib/prisma'

async function main() {
  console.log('=== START VIP → Voucher Migration ===')

  // 1. Tạo 3 voucher mặc định
  const vipVoucher = await prisma.voucher.upsert({
    where: { code: 'VIP-DEFAULT' },
    update: {},
    create: {
      code: 'VIP-DEFAULT',
      name: 'Voucher VIP',
      type: 'VIP',
      description: 'Kích hoạt khóa học có phí (khi khóa accept VIP)'
    }
  })

  const allVoucher = await prisma.voucher.upsert({
    where: { code: 'ALL-DEFAULT' },
    update: {},
    create: {
      code: 'ALL-DEFAULT',
      name: 'Voucher All Access',
      type: 'ALL',
      description: 'Kích hoạt tất cả khóa học có phí'
    }
  })

  const cashVoucher = await prisma.voucher.upsert({
    where: { code: 'CASH-386K' },
    update: {},
    create: {
      code: 'CASH-386K',
      name: 'Voucher 386.000đ',
      type: 'CASH',
      value: 386000,
      durationDays: 90,
      description: 'Giảm 386.000đ khi kích hoạt khóa học'
    }
  })

  console.log('Vouchers created:',
    vipVoucher.id, allVoucher.id, cashVoucher.id)

  // 2. Convert vipExempt → acceptedVouchers
  const courses = await prisma.course.findMany({
    select: { id: true, vipExempt: true, name_lop: true }
  })

  let acceptedCount = 0
  for (const course of courses) {
    if (!course.vipExempt) {
      // vipExempt=false → accept VIP voucher
      await prisma.courseAcceptedVoucher.upsert({
        where: {
          courseId_voucherId: {
            courseId: course.id,
            voucherId: vipVoucher.id
          }
        },
        update: {},
        create: {
          courseId: course.id,
          voucherId: vipVoucher.id
        }
      })
      acceptedCount++
    }
    // vipExempt=true → KHÔNG accept VIP (phải trả tiền)
  }
  console.log(`Converted ${acceptedCount} courses to accept VIP voucher`)

  // 3. Award VIP voucher cho user có courseId=1 ACTIVE
  const vipEnrollments = await prisma.enrollment.findMany({
    where: { courseId: 1, status: 'ACTIVE' },
    select: { userId: true }
  })

  let awardedCount = 0
  for (const e of vipEnrollments) {
    try {
      await prisma.userVoucher.upsert({
        where: {
          userId_voucherId_awardedFromCourseId: {
            userId: e.userId,
            voucherId: vipVoucher.id,
            awardedFromCourseId: 1
          }
        },
        update: {},
        create: {
          userId: e.userId,
          voucherId: vipVoucher.id,
          status: 'ACTIVE',
          awardedFromCourseId: 1
          // expiresAt: null (vĩnh viễn cho user chuyển đổi)
        }
      })
      awardedCount++
    } catch (err) {
      console.error(`Failed award to user ${e.userId}:`, err)
    }
  }
  console.log(`Awarded VIP voucher to ${awardedCount} users`)

  // 4. Verify
  const uvCount = await prisma.userVoucher.count()
  const cavCount = await prisma.courseAcceptedVoucher.count()
  console.log(`\n=== VERIFICATION ===`)
  console.log(`UserVouchers: ${uvCount}`)
  console.log(`CourseAcceptedVouchers: ${cavCount}`)
  console.log(`=== MIGRATION COMPLETE ===`)
}

main().catch(console.error)
```

---

## 7. DANH SÁCH FILES

### 7.1. Files MỚI tạo

| File | Purpose |
|------|---------|
| `lib/voucher/voucher-service.ts` | Core voucher logic |
| `lib/voucher/mbw-wallet-service.ts` | Aggregator wallet |
| `app/api/cron/expire-vouchers/route.ts` | Cron job |
| `app/api/vouchers/route.ts` | GET all vouchers (for admin UI) |
| `scripts/migrate-vip-to-voucher.ts` | Migration script |
| `prisma/migrations/YYYYMMDD_add_voucher_system/migration.sql` | DB migration |

### 7.2. Files SỬA

| File | Thay đổi chính |
|------|---------------|
| `prisma/schema.prisma` | +4 models, +2 enums, +Course/User relations |
| `app/actions/course-actions.ts` | Replace VIP → voucher check + award (lines 27-75, 185+) |
| `app/api/enroll-after-register/route.ts` | Same + fix bug (lines 22-33, 56-63) |
| `app/actions/admin-actions.ts` | Update course CRUD (lines 960-1025) |
| `app/api/courses/route.ts` | Include voucher data |
| `app/api/courses/[id]/route.ts` | Include voucher relations |
| `app/tools/courses/new/page.tsx` | Replace vipExempt → voucher checkboxes (line 56+, 416-420) |
| `app/tools/courses/[id]/page.tsx` | Same (line 55+, 441-446) |
| `components/course/CourseCard.tsx` | Remove isCourseOneActive (line 66) |
| `components/course/PaymentModal.tsx` | Remove isCourseOneActive (line 46) |
| `components/landing/CourseLandingTemplate.tsx` | Same (line 78) |
| `app/page.tsx` | Remove isCourseOneActive prop |
| `app/page/[slug]/page.tsx` | Same |
| `components/home/HomePageClient.tsx` | Remove isCourseOneActive prop |
| `components/home/CourseSection.tsx` | Remove isCourseOneActive prop |

---

## 8. THỨ TỰ THỰC HIỆN

```
Phase 1: Database (schema + migration)
  ├── Tạo enums, models, relations trong schema.prisma
  ├── npx prisma db push
  ├── npx prisma generate
  └── Verify: npx tsc --noEmit

Phase 2: Backend services (không phụ thuộc UI)
  ├── Tạo lib/voucher/voucher-service.ts
  └── Tạo lib/voucher/mbw-wallet-service.ts

Phase 3: Core logic replacement
  ├── Sửa app/actions/course-actions.ts
  ├── Sửa app/api/enroll-after-register/route.ts
  ├── Sửa app/actions/admin-actions.ts
  ├── Sửa app/api/courses/route.ts
  ├── Sửa app/api/courses/[id]/route.ts
  └── Verify: npx tsc --noEmit

Phase 4: Frontend
  ├── Admin course forms (checkboxes cho voucher)
  ├── CourseCard — use effectivePhiCoc
  ├── PaymentModal — use effectivePhiCoc + show discount
  ├── CourseLandingTemplate — use effectivePhiCoc
  ├── Xóa isCourseOneActive prop chain
  └── Verify: npx tsc --noEmit

Phase 5: Migration + Cron
  ├── Tạo migration script + seed data
  ├── Tạo cron route
  ├── Chạy migration script
  └── Verify: npx tsc --noEmit

Phase 6: Cleanup
  ├── Xóa import/type isCourseOneActive còn sót
  ├── Giữ vipExempt column (deprecated, không xóa)
  └── Verify: npx tsc --noEmit
```

---

## 9. RISK & EDGE CASE

| Risk | Mitigation |
|------|-----------|
| User có nhiều voucher cùng loại | `awardVoucher` check uniqueness — user chỉ nhận 1 voucher/loại/từ khóa |
| Voucher hết hạn giữa chừng | Cron job expire hàng ngày + realtime check `expiresAt` trong `checkVoucherForCourse` |
| Course không có acceptedVoucher nào | → Không free, phải trả tiền bình thường (default secure) |
| User không có voucher nào | → Không free, trả tiền bình thường |
| CASH voucher value > phi_coc | `Math.max(0, phi_coc — discount)` → không refund phần dư |
| Migration data loss | Script verify count trước/sau migration |
| enroll-after-register concurrent | Prisma unique constraint trên UserVoucher |
| Existing payments with old VIP | Không ảnh hưởng — payment đã tạo thì giữ nguyên, chỉ enroll mới dùng voucher |
| vipExempt column deprecated | Giữ column trong schema, bỏ khỏi code logic, có thể xóa sau vài tháng |

---

## 10. LƯU Ý CHO AGENT KHI THỰC HIỆN

1. **Đọc file trước khi sửa** — tuân thủ AGENTS.md rule #1
2. **Backup trước khi sửa** — git diff vào `plan_temp/`
3. **Hỏi user xác nhận** trước mỗi phase
4. **`npx tsc --noEmit`** must be clean after each phase
5. **Không xóa vipExempt column** — chỉ deprecated, giữ backward compat
6. **isCourseOneActive prop chain** phải xóa hết ở tất cả files
7. **Seed voucher data** trước khi chạy migration script
