# Hệ thống Referrer Tracking — 4 Layer Protection

**Ngày:** 2026-07-08  
**Trạng thái:** ✅ Đã triển khai production

---

## 1. Tổng quan

Hệ thống có **2 khái niệm referrer riêng biệt**:

| Khái niệm | Lưu tại | Ghi khi nào | Dùng cho |
|---|---|---|---|
| **Affiliate** (người giới thiệu) | `User.referrerId` | Đăng ký tài khoản | Phả hệ affiliate (UserClosure), điểm đăng ký, hoa hồng F1-F3 |
| **Nhân mạch** (enroll referrer) | `Enrollment.referrerId` | Enroll khóa học | BRK tree placement (`activateBrkMember`), commission enrollment |

**Nguyên tắc cốt lõi:** Last-click wins. Người click link affiliate cuối cùng trước khi enroll là người được ghi nhận.

---

## 2. Sơ đồ luồng dữ liệu

### 2.1 Registration — Ghi `User.referrerId`

```
Click ?ref=X
  ├── proxy.ts (middleware)     → set server cookie `aff_ref`
  └── AffiliateTracker (client) → set document.cookie `aff_ref`
                               → set localStorage `affiliate_ref`
                               → POST /api/affiliate/log-click → DB

Đăng ký thường (registerUser)
  └── Đọc server cookie `aff_ref`
  └── Fallback: form hidden `referrerId` (từ client cookie/localStorage)
  └── Ghi vào User.referrerId

Đăng ký OAuth (auth.ts createUser)
  └── Đọc server cookie `aff_ref`
  └── Cập nhật User.referrerId
  └── Thêm vào UserClosure (genealogy)
```

### 2.2 Enrollment — Ghi `Enrollment.referrerId`

```
enrollInCourseAction(courseId, clientRef?)
  ├── Layer 1: clientRef (từ getClientRef())
  │   ├── document.cookie `aff_ref`
  │   └── localStorage `affiliate_ref`
  ├── Layer 2: server cookies().get('aff_ref') (từ proxy.ts)
  ├── Layer 3: DB AffiliateClick theo IP (mới)
  │   └── Query click gần nhất từ IP → link.userId
  └── Layer 4: User.referrerId (CHỈ khi không có click affiliate nào)
      └── Ghi vào Enrollment.referrerId
```

### 2.3 Activation / BRK Placement

```
Kích hoạt (ACTIVE status)
  └── activateBrkMember(userId, onSystem, enrollment.referrerId)
      └── effectiveReferrer = enrollment.referrerId ?? user.referrerId
      └── resolvePlacement(onSystem, effectiveReferrer)
          └── FORCED_4WIDE rule: BFS dưới referrer's subtree
```

---

## 3. 4 Layer Protection — Chi tiết

### Layer 1: Client-side Cookie (`document.cookie`)

| File | Vai trò |
|---|---|
| `components/AffiliateTracker.tsx` | Set `document.cookie` khi phát hiện `?ref=` trên URL |
| `lib/affiliate/get-client-ref.ts` | Đọc `document.cookie`, fallback sang localStorage |

**Cookie format:**
```
aff_ref={"r":"478","t":1712345678901}; path=/; max-age=2592000; SameSite=Lax
```

**Ưu điểm:** Ổn định nhất, luôn có sẵn khi JS chạy, last-click tự động overwrite.  
**Rủi ro:** Bị xóa khi user clear browser cookies.

### Layer 2: LocalStorage

| File | Vai trò |
|---|---|
| `components/AffiliateTracker.tsx` | Set `localStorage.setItem('affiliate_ref', ...)` |
| `lib/affiliate/get-client-ref.ts` | Fallback đọc localStorage khi cookie null |

**Format:**
```json
{ "ref": "478", "timestamp": 1712345678901 }
```

**Hạn 30 ngày**, tự động xoá khi hết hạn.  
**Ưu điểm:** Tồn tại lâu hơn cookie, không bị ảnh hưởng bởi cookie policy.

### Layer 3: DB AffiliateClick theo IP (MỚI)

| File | Vai trò |
|---|---|
| `app/api/affiliate/log-click/route.ts` | **POST** — Ghi click xuống DB khi AffiliateTracker phát hiện `?ref=` |
| `app/api/affiliate/log-click/route.ts` | **GET** — Lấy danh sách click (phân trang, filter) |
| `lib/affiliate/resolve-ref-helper.ts` | Resolve ref code → userId |
| `app/actions/course-actions.ts` | Query click gần nhất theo IP khi Layer 1+2 đều fail |

**Dữ liệu ghi lại:**
| Field | Nguồn |
|---|---|
| `linkId` | Resolve ref → tìm/tạo `AffiliateLink` |
| `ipAddress` | `x-forwarded-for` header |
| `userAgent` | `user-agent` header |
| `createdAt` | Auto timestamp |

**Khi nào dùng:**
```typescript
// Trong enrollInCourseAction (course-actions.ts)
const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim()
const recentClick = await prisma.affiliateClick.findFirst({
  where: { ipAddress: ip },
  orderBy: { createdAt: 'desc' },
  include: { link: true }
})
enrollmentReferrerId = recentClick?.link?.userId
```

### Layer 4: `User.referrerId` (DB Fallback)

**Chỉ dùng khi:** User không click bất kỳ link affiliate nào (tự vào web) → không có cookie, localStorage, DB click.  
**Nguồn:** `User.referrerId` được ghi từ lúc đăng ký (mặc định 0 nếu không có ref).

---

## 4. Các điểm tạo Enrollment

| STT | File | Khi nào | `referrerId` set? | Đúng? |
|---|---|---|---|---|
| 1 | `app/actions/course-actions.ts:178` | User enroll thủ công | ✅ 4 layer: clientRef → cookie → DB IP → user.ref | ✅ |
| 2 | `app/api/enroll-after-register/route.ts:67` | Auto-enroll sau đăng ký | ✅ `user?.referrerId \|\| null` | ✅ |
| 3 | `lib/brk/level-manager.ts:102` | Tặng quà lên level | ❌ undefined (= null) | ✅ System gift, không cần ref |
| 4 | `lib/affiliate/points-manager.ts:118` | Đổi điểm thưởng | ❌ undefined (= null) | ✅ System redeem, không cần ref |

---

## 5. Click History — Admin UI

**Trang:** `/tools/affiliate/clicks` (chỉ admin)  
**API:** `GET /api/affiliate/log-click?page=1&limit=50&days=14&refUserId=...`

Hiển thị:
- Thời gian click (giờ VN)
- Người giới thiệu (#ID + Tên + Email)
- IP
- User-Agent

Mặc định: 14 ngày gần nhất, 200 click.

---

## 6. Các trường hợp cụ thể

| TH | User hành động | `User.ref` | `Enroll.ref` | BRK placement |
|---|---|---|---|---|
| 1 | Click `?ref=944` → đăng ký → enroll | 944 | 944 | Dưới 944 nếu active |
| 2 | Click `?ref=478` → đăng ký → click `?ref=944` → enroll | 478 | **944** (last-click) | Dưới 944 |
| 3 | Tự vào web (ko ref) → đăng ký → enroll | 0 | 0 → DB IP → user.ref (0) | BFS global |
| 4 | Click `?ref=478` → đăng ký → mất cookie → enroll | 478 | **478** (localStorage) | Dưới 478 |
| 5 | Click `?ref=944` → đăng ký → clear hết → enroll | 944 | **944** (DB IP) | Dưới 944 |
| 6 | Click `?ref=944` (ko qua proxy) → enroll | — | **944** (AffiliateTracker set cookie) | Dưới 944 |
| 7 | Click `?ref=944` → đăng ký → auto-enroll sau OTP | 944 | 944 (user.ref từ DB) | Dưới 944 |

---

## 7. VIP Check — Lưu ý đồng bộ

**Quy tắc:**
- `LIB` type: Luôn `phi_coc = 0`, không check VIP
- `SYS` type: Bỏ qua VIP check (có cơ chế riêng)
- Các type khác: Check VIP — nếu user có `courseId=1` ACTIVE và không `vipExempt` → `phi_coc = 0`

**Cả 2 file phải đồng bộ:**
| File | Logic |
|---|---|
| `app/actions/course-actions.ts` | `if (course.type !== 'SYS') { ... VIP check ... }` |
| `app/api/enroll-after-register/route.ts` | `if (course.type !== 'LIB' && course.type !== 'SYS') { ... VIP check ... }` |

---

## 8. Các file liên quan

### Đã tạo mới
| File | Mục đích |
|---|---|
| `app/api/affiliate/log-click/route.ts` | API ghi nhận + truy vấn click |
| `app/tools/affiliate/clicks/page.tsx` | Admin UI xem lịch sử click |
| `lib/affiliate/get-client-ref.ts` | Utility đọc ref từ cookie → localStorage |

### Đã sửa
| File | Thay đổi |
|---|---|
| `components/AffiliateTracker.tsx` | Thêm set `document.cookie` + log DB |
| `app/actions/course-actions.ts` | Thêm DB IP fallback + `headers()` import |
| `app/tools/affiliate/affiliate-nav.ts` | Thêm nav "Lịch sử Click" |
| `app/api/enroll-after-register/route.ts` | Fix VIP check SYS đồng bộ |
| `app/register/page.tsx` | Fix race condition auto-enroll (await fetch) |

### Có sẵn (không sửa)
| File | Vai trò |
|---|---|
| `proxy.ts` | Middleware set `aff_ref` cookie server-side |
| `app/api/enroll-after-register/route.ts` | Auto-enroll API |
| `auth.ts` (createUser event) | Set `User.referrerId` cho OAuth |
| `app/actions/auth-actions.ts` (registerUser) | Set `User.referrerId` cho đăng ký thường |
| `lib/brk/activation-service.ts` | BRK activation dùng `enrollment.referrerId` |
| `lib/auto-verify.ts` | Auto-activate + BRK activation |
| `lib/affiliate/resolve-ref-helper.ts` | Resolve ref code → userId |
| `app/actions/brk-actions.ts` (joinBrkSystem) | Gọi `enrollInCourseAction` server-side |
| `lib/brk/level-manager.ts` | Tạo enrollment gift (ko set ref) |
| `lib/affiliate/points-manager.ts` | Tạo enrollment đổi điểm (ko set ref) |
| `components/auth/AccountAssistantModal.tsx` | Alternative registration flow |

---

## 9. Kiến trúc Cookie

| Cookie | Set bởi | Đọc bởi | HttpOnly | MaxAge |
|---|---|---|---|---|
| `aff_ref` | `proxy.ts` (server) | `cookies()`, `document.cookie` | false | 30 ngày |
| `aff_ref` | `AffiliateTracker.tsx` (client) | `document.cookie` | false | 30 ngày |
| `affiliate_ref` (localStorage) | `AffiliateTracker.tsx` (client) | `getClientRef()`, `getAffiliateRef()` | — | 30 ngày |

---

## 10. Pre-deploy Checklist

- [ ] `npx tsc --noEmit` — không lỗi
- [ ] `npm run build` — không lỗi
- [ ] Route handlers: `await params` (Next.js 16)
- [ ] `useSearchParams()` có Suspense wrapper
- [ ] Kiểm tra đồng bộ VIP check giữa 2 file enroll
