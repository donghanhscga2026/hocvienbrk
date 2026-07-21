# KẾ HOẠCH HIỆN THỊ MB TCA

> **Mục tiêu**: Xây dựng hệ thống thưởng đồng chia (2% doanh số chính thức) cho hệ thống #4  
> **Thời gian khởi động**: 13:00 VN 02/07/2026

---

## I. TỔNG QUAN HỆ THỐNG

### 1.1. Quy tắc thành viên chính thức
- Thành viên kích hoạt → sau **21 tiếng** nếu không hủy → "Chính thức"
- Khi chính thức:
  - Ghi nhận doanh số cá nhân (MBDT, VNĐ)
  - Cộng điểm MBP (MBP = MBDT / 12M × 16)
  - Level 1, hoa hồng 21%

### 1.2. Danh sách Đồng chia
- Thành viên "Chính thức" **và** có ≥1 F1 chính thức → thuộc danh sách Đồng chia
- Lưu trữ qua field `inDongChia: Boolean` trong bảng `System`
- Rời hệ thống → tự động xóa khỏi danh sách

### 1.3. Cron chính
| Tên cron | Mô tả | Tần suất | Thời điểm khởi động |
|----------|-------|----------|-------------------|
| `brk-dongchia` | Tính doanh số 7h, chia 2% cho Đồng chia | Mỗi 7 tiếng | 20:06:08 VN 02/07 |
| `brk-level-promotion` | Xét lên cấp, hoa hồng, voucher 2F1 | Mỗi 30 tiếng | 19:08:06 VN 03/07 |

---

## II. THAY ĐỔI DATABASE

### 2.1. Thêm field `inDongChia` vào bảng `System`
```prisma
model System {
  // ... existing fields ...
  inDongChia  Boolean  @default(false)
}
```

### 2.2. Thêm config thời gian khởi động
```prisma
model SystemConfig {
  key   String @id
  value String
  // key: "dongchia_start_time", value: "2026-07-02T06:00:00.000Z" (UTC)
}
```

### 2.3. Migration commands
```bash
npx prisma migrate dev --name add-dongchia-flag
npx prisma migrate dev --name add-dongchia-start-time
npx prisma generate
```

---

## III. CẤU TRÚC CODE

### 3.1. Service mới: `lib/brk/dongchia-service.ts`
- Tính các khung thời gian 7 tiếng dựa trên `dongchia_start_time`
- Lấy doanh số chính thức (MBDT + VNĐ) trong mỗi khung
- Chia 2% cho mỗi thành viên trong danh sách Đồng chia

### 3.2. Route mới: `app/api/cron/brk-dongchia/route.ts`
Endpoint xử lý cron, gọi `processDongChia()`

### 3.3. Route sửa: `app/api/cron/brk-level-promotion/route.ts`
Sử dụng lại logic `processSystemDailyEval` hoặc tách riêng thành hàm mới

---

## IV. CRON SCHEDULE (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/brk-dongchia/route",
      "schedule": "6 7,14,21,2 * * *"
    },
    {
      "path": "/api/cron/brk-level-promotion/route",
      "schedule": "6 8,14,20,2,8 * * *"
    }
  ]
}
```

---

## V. BACKUP & ROLLBACK STRATEGY

### 5.1. Script backup: `scripts/backup-before-mbtca.ts`
Backup trước mỗi cron:
- System records (level, totalPoints, inDongChia)
- BrkTransaction, BrkTimelineRecord, BrkLevelUpRecord, BrkReferralBonus

### 5.2. Script rollback: `scripts/rollback-mbtca.ts`
- Đọc backup file
- Restore System (level, totalPoints trở lại trạng thái cũ)
- Xóa records mới tạo

---

## VI. CÁCH THỰC THI

### Bước 1: Chuẩn bị DB
```bash
npx prisma migrate dev --name add-dongchia-fields
npx prisma generate
```

### Bước 2: Tạo config khởi động
```bash
# INSERT thời điểm khởi động vào SystemConfig
```

### Bước 3: Backup trước mỗi chạy cron
```bash
npx tsx scripts/backup-before-mbtca.ts
```

### Bước 4: Chạy dry-run
```bash
npx tsx scripts/test-mbtca.ts
```

### Bước 5: Chạy cron thật
```bash
curl "http://localhost:3000/api/cron/brk-dongchia?secret=$CRON_SECRET"
curl "http://localhost:3000/api/cron/brk-level-promotion?secret=$CRON_SECRET"
```

### Bước 6: Kiểm tra & rollback nếu cần
```bash
npx tsx scripts/rollback-mbtca.ts
```

---

## VII. XỬ LÝ SỰ CỐ

- **Lỗi cron sai thời gian**: Kiểm tra `dongchia_start_time`
- **Lỗi tính MBP**: Kiểm tra logic `mbdtToMbp`
- **Lỗi chia đồng chia**: Dùng `rollback-mbtca.ts`

---

## VIII. FILES QUAN TRỌNG

| File | Chức năng |
|------|-----------|
| `prisma/schema.prisma` | Thay đổi schema DB |
| `lib/brk/dongchia-service.ts` | Logic chia đồng chia |
| `app/api/cron/brk-dongchia/route.ts` | Endpoint cron đồng chia |
| `app/api/cron/brk-level-promotion/route.ts` | Endpoint cron xét cấp |
| `vercel.json` | Cấu hình cron schedule |
| `scripts/backup-before-mbtca.ts` | Backup dữ liệu |
| `scripts/rollback-mbtca.ts` | Rollback khi lỗi |
| `scripts/test-mbtca.ts` | Dry-run kiểm tra logic |

---

*Tài liệu này lưu tại: `.opencode/plans/mb-tca-implementation-plan.md`*  
*Cập nhật lần cuối: 2026-07-03*