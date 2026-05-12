# Kế hoạch & Nhật ký — Hệ thống YTB (onSystem=3)

## Mục tiêu

Xây dựng cây hệ thống (System + SystemClosure) cho onSystem=3 (YTB) với:
- **Root**: UserID=922
- **Cấu trúc**: 922 → (327, 330) + học viên được resolve referrer chain
- **Thành viên**: Học viên role STUDENT có enrollment ACTIVE/PENDING trong khóa của teacher 327
- **Cơ chế**: Seed 1 lần với dữ liệu hiện có, auto-sync khi kích hoạt khóa học mới

---

## Cấu trúc cây YTB cuối cùng

```
922 (root, refSysId=0)
├── 0 (admin — Coach Cương, refSysId=922) → 2 học viên
├── 327 (refSysId=922) → 1 học viên
├── 330 (refSysId=922) → 10 học viên
```

**Thống kê:** 17 System records (4 cố định + 13 học viên), 60 closures

---

## File liên quan

| File | Vai trò |
|------|---------|
| `scripts/seed-ytb-system.ts` | Seed 1 lần với dữ liệu hiện có |
| `scripts/rollback-ytb-system.ts` | Rollback dữ liệu YTB (giữ SystemTree) |
| `lib/system-closure-helpers.ts` | Helper `resolveSystemReferrer`, `addUserToSystemClosure` |
| `app/actions/course-actions.ts` | Hook auto-sync khi enroll khóa học |
| `app/actions/payment-actions.ts` | Hook auto-sync khi verify payment |

---

## Nhật ký thực hiện

### ✅ [Seed Script — V1] (2025-05-10, lần 1)

**File:** `scripts/seed-ytb-system.ts`

- Root = teacher 327
- Seed 16 user (gồm non-STUDENT) → sai, lệch với tools/students (13)
- **Sửa**: thêm filter role=STUDENT → còn 13 học viên
- **Sửa**: root từ 327 → 922, thêm 327 và 330 dưới 922
- **Sửa logic**: từ "add all ancestors" → resolveSystemReferrer (tìm nearest YTB member)

**Kết quả cuối:** 16 System records (3 cố định + 13 học viên), 42 closures

---

### ✅ [resolveSystemReferrer] (2025-05-10)

**File:** `lib/system-closure-helpers.ts`

Thêm function:
```
resolveSystemReferrer(userId, systemId, defaultRoot = 922)
  → walk referrerId chain từ userId lên
  → tìm user đầu tiên có System(onSystem=systemId)
  → nếu tìm thấy: trả về userId đó
  → nếu không (chạm 0/null): trả về defaultRoot (922)
```

---

### ✅ [Rollback Script] (2025-05-10)

**File:** `scripts/rollback-ytb-system.ts`

- Chỉ xóa `SystemClosure` + `System` cho onSystem=3
- **Giữ nguyên** `SystemTree` (không xóa danh sách hệ thống)

---

### ✅ [Hooks Auto-sync] (2025-05-10)

**Files:** `app/actions/course-actions.ts`, `app/actions/payment-actions.ts`

- Khi enrollment được tạo (course-actions) hoặc kích hoạt (payment-actions)
- Kiểm tra `course.teacherId === 327`
- Nếu đúng: gọi `resolveSystemReferrer(userId, 3, 922)` → `addUserToSystemClosure(userId, refId, 3)`

---

### ✅ [Build Check] (2025-05-10)

- `npx tsc --noEmit` → 0 lỗi
- Dữ liệu seed: 13 học viên, khớp tools/students

### ✅ [YTB Admin Permission — 327 & 330] (2025-05-10)

**File sửa:** `app/actions/admin-actions.ts`

- `getCurrentUserRoleAction`: khi systemId=3 và userId là 327 hoặc 330 → `isActualSystemRoot = true` → ẩn checkbox "Đội của tôi", xem full tree
- `getSystemTreeAction`: khi systemId=3 và userId là 327 hoặc 330 → `isYtbAdmin = true` → bypass permission check, xem toàn bộ cây YTB từ root 922

---

## Lệnh hữu ích

```bash
# Seed
npx tsx scripts/seed-ytb-system.ts

# Rollback (giữ SystemTree)
npx tsx scripts/rollback-ytb-system.ts
```
