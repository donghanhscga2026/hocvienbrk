# TÀI LIỆU KỸ THUẬT HỆ THỐNG AFFILIATE MARKETING
## HocVien-BRK - Affiliate Marketing System

**Phiên bản:** 1.0  
**Ngày:** 2026-04-01  
**Trạng thái:** ✅ Hoàn thành & Đã kiểm thử

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổ-quan-hệ-thống)
2. [Thuật toán & Logic xử lý](#2-thuật-toán--logic-xử-lý)
3. [Cấu trúc Database](#3-cấu-trúc-database)
4. [Hướng dẫn sử dụng](#4-hướng-dẫn-sử-dụng)
5. [API Reference](#5-api-reference)
6. [Cron Jobs](#6-cron-jobs)
7. [Cấu hình Campaign](#7-cấu-hình-campaign)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mô hình Affiliate đa tầng

Hệ thống hỗ trợ **3 tầng giới thiệu** (F1, F2, F3):

```
┌─────────────────────────────────────────────────────────────────┐
│                        CẤU TRÚC UPLINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│     User A (Root)                                               │
│        ↓                                                         │
│     User B ←──── F1 của User C                                  │
│        ↓                                                         │
│     User C ←──── F1 của User D, F2 của User B                   │
│        ↓                                                         │
│     User D ←──── F1 của User E, F2 của User C, F3 của User B    │
│        ↓                                                         │
│     User E ←──── F2 của User D, F3 của User C                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Hai loại thu nhập cho CTV

| Loại | Mô tả | Điều kiện | Thời gian |
|------|--------|-----------|-----------|
| **Registration Points** | 1 điểm/lần đăng ký | User bên dưới xác thực email | Ngay lập tức |
| **Commission** | % giá trị khóa học | User bên dưới mua khóa học | Sau 30 ngày |

### 1.3 Cấu hình mặc định

```
Campaign: Chương trình Affiliate mặc định
Slug: default
Max Levels: 3

Hoa hồng:
├── F1: 10%
├── F2: 5%
└── F3: 2%

Điểm đăng ký:
├── Points/registration: 1 điểm
├── Points required: 10 điểm
└── Giá trị đổi: 386,868 VND

Thu nhập:
├── Tax rate: 0%
├── Fee: 3,300 VND/transaction
└── Pending days: 30 ngày
```

---

## 2. THUẬT TOÁN & LOGIC XỬ LÝ

### 2.1 Thuật toán Closure Table cho Gene Tree

Hệ thống sử dụng **Closure Table** để lưu trữ cây giới thiệu, cho phép truy vấn nhanh upline.

#### Cấu trúc bảng `user_closure`:

| descendant_id | ancestor_id | depth |
|--------------|-------------|-------|
| 5 | 5 | 0 (self) |
| 5 | 1 | 1 (F1) |
| 5 | 2 | 2 (F2) |
| 5 | 0 | 3 (F3) |

#### Thuật toán Trace Upline:

```typescript
async function traceUpline(userId: number, maxLevels: number = 3) {
    const chain: { userId: number; level: number }[] = [];
    
    const ancestors = await prisma.userClosure.findMany({
        where: {
            descendantId: userId,
            depth: { gt: 0, lte: maxLevels }
        },
        orderBy: { depth: 'asc' }
    });
    
    let level = 1;
    for (const ancestor of ancestors) {
        chain.push({
            userId: ancestor.ancestorId,
            level: level++
        });
    }
    
    return chain;
}
```

**Độ phức tạp:** O(1) cho việc truy vấn 3 tầng (index trên `descendant_id, depth`)

### 2.2 Thuật toán Points System (Điểm đăng ký)

#### Logic: Mỗi tầng nhận điểm từ tầng bên dưới

```
User D đăng ký (có F1=C, F2=B, F3=A):
     ↓
┌─────────────────────────────────────────────┐
│  A (F3 của D) → +1 điểm                   │
│  B (F2 của D) → +1 điểm                   │
│  C (F1 của D) → +1 điểm                   │
└─────────────────────────────────────────────┘
```

#### Code implementation:

```typescript
async function onEmailVerified(userId: number) {
    // 1. Lấy upline tree từ closure table
    const closures = await prisma.userClosure.findMany({
        where: {
            descendantId: userId,
            depth: { in: [1, 2, 3] }  // Chỉ F1, F2, F3
        },
        orderBy: { depth: 'asc' }
    });
    
    // 2. Build map depth -> ancestorId
    const upline = new Map<number, number>();
    for (const closure of closures) {
        upline.set(closure.depth, closure.ancestorId);
    }
    
    // 3. Cộng điểm cho từng tầng
    const levels = [
        { depth: 1, referrerId: upline.get(1), label: 'F1' },
        { depth: 2, referrerId: upline.get(2), label: 'F2' },
        { depth: 3, referrerId: upline.get(3), label: 'F3' }
    ];
    
    for (const level of levels) {
        if (!level.referrerId || level.referrerId === 0) continue;
        
        // Verify referrer cũng đã xác thực email
        const ancestor = await prisma.user.findUnique({
            where: { id: level.referrerId },
            select: { emailVerified: true }
        });
        if (!ancestor?.emailVerified) continue;
        
        // Create RegistrationPoint
        await prisma.registrationPoint.create({...});
        
        // Update Wallet
        await prisma.affiliateWallet.update({
            where: { userId: level.referrerId },
            data: { points: { increment: pointsToAdd } }
        });
        
        // Log Transaction
        await prisma.affiliateTransaction.create({...});
    }
}
```

#### Điều kiện để nhận điểm:
1. ✅ User mới đã xác thực email
2. ✅ Có referrer hợp lệ (referrerId > 0)
3. ✅ Referrer đã xác thực email (để tránh spam)
4. ✅ Referrer không phải root user (id = 0)

### 2.3 Thuật toán Commission Calculator (Hoa hồng)

#### Logic: Tính hoa hồng cho F1, F2, F3 khi có purchase

```
User D mua khóa học 386,868 VND (ref=C):

     ┌─────────────────────────────────────────────┐
     │  C (F1) → 386,868 × 10% = 38,686đ          │
     │       → Trừ phí 3,300 = 35,386đ (pending) │
     ├─────────────────────────────────────────────┤
     │  B (F2) → 386,868 × 5% = 19,343đ           │
     │       → Trừ phí 3,300 = 16,043đ (pending) │
     ├─────────────────────────────────────────────┤
     │  A (F3) → 386,868 × 2% = 7,737đ            │
     │       → Trừ phí 3,300 = 4,437đ (pending)   │
     └─────────────────────────────────────────────┘
```

#### Code implementation:

```typescript
async function processEnrollmentCommission(
    userId: number,
    enrollmentId: number,
    coursePrice: number
) {
    // 1. Trace upline (F1, F2, F3)
    const uplineChain = await traceUpline(userId, campaign.maxLevels);
    
    // 2. Create Conversion record
    const conversion = await prisma.affiliateConversion.create({
        data: {
            customerId: userId,
            orderAmount: coursePrice,
            status: ConversionStatus.PENDING,
            pendingUntil: addDays(new Date(), campaign.pendingDays)
        }
    });
    
    // 3. Calculate commission for each level
    for (const upline of uplineChain) {
        const levelConfig = campaign.levels.find(
            l => l.level === upline.level
        );
        if (!levelConfig) continue;
        
        // Gross = price × percentage
        const grossAmount = Math.floor(coursePrice * levelConfig.percentage / 100);
        
        // Deductions
        const taxAmount = Math.floor(grossAmount * campaign.taxRate / 100);
        const feeAmount = campaign.feeAmount || 0;
        
        // Net = gross - tax - fee
        const netAmount = grossAmount - taxAmount - feeAmount;
        
        if (netAmount <= 0) continue;
        
        // Create Commission record
        await prisma.affiliateCommission.create({
            data: {
                conversionId: conversion.id,
                affiliateId: upline.userId,
                level: upline.level,
                percentage: levelConfig.percentage,
                grossAmount,
                taxAmount,
                feeAmount,
                netAmount,
                status: CommissionStatus.PENDING,
                availableAt: conversion.pendingUntil
            }
        });
        
        // Add to pending balance
        await prisma.affiliateWallet.update({
            where: { userId: upline.userId },
            data: { pendingBalance: { increment: netAmount } }
        });
    }
}
```

#### Công thức tính hoa hồng:

```
Gross Amount = Course Price × Commission %
Tax Amount = Gross Amount × Tax Rate (0%)
Fee Amount = Fixed Fee (3,300 VND)
Net Amount = Gross Amount - Tax Amount - Fee Amount
```

### 2.4 Thuật toán Cron Job (Xử lý Pending → Available)

#### Logic: Chuyển commission từ PENDING sang AVAILABLE sau 30 ngày

```typescript
// Cron job: chạy hàng ngày lúc 00:00
async function processCommissions() {
    const now = new Date();
    
    // 1. Tìm tất cả commission đang PENDING và đã hết thời gian chờ
    const pendingCommissions = await prisma.affiliateCommission.findMany({
        where: {
            status: CommissionStatus.PENDING,
            availableAt: { lte: now }  // Đã qua pendingDays
        }
    });
    
    // 2. Xử lý từng commission
    for (const commission of pendingCommissions) {
        await prisma.$transaction(async (tx) => {
            // Update commission status
            await tx.affiliateCommission.update({
                where: { id: commission.id },
                data: { status: CommissionStatus.AVAILABLE }
            });
            
            // Move from pending to available balance
            const wallet = await tx.affiliateWallet.findUnique({
                where: { userId: commission.affiliateId }
            });
            
            await tx.affiliateWallet.update({
                where: { userId: commission.affiliateId },
                data: {
                    balance: { increment: commission.netAmount },
                    pendingBalance: { 
                        decrement: Math.min(commission.netAmount, wallet.pendingBalance) 
                    },
                    totalEarned: { increment: commission.netAmount }
                }
            });
            
            // Log transaction
            await tx.affiliateTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: commission.netAmount,
                    type: 'COMMISSION',
                    description: `Hoa hồng từ đơn hàng #${commission.conversionId}`
                }
            });
        });
    }
}
```

### 2.5 Thuật toán Payout (Rút tiền)

```typescript
async function requestPayout(userId: number, amount: number) {
    // 1. Verify user has enough available balance
    const wallet = await prisma.affiliateWallet.findUnique({
        where: { userId }
    });
    
    if (wallet.balance < amount) {
        throw new Error('Số dư không đủ');
    }
    
    // 2. Check minimum payout
    if (amount < campaign.minPayout) {
        throw new Error(`Số tiền tối thiểu: ${campaign.minPayout.toLocaleString()}đ`);
    }
    
    // 3. Create payout request
    await prisma.$transaction(async (tx) => {
        // Lock balance
        await tx.affiliateWallet.update({
            where: { userId },
            data: { 
                balance: { decrement: amount },
                pendingPayout: { increment: amount }
            }
        });
        
        // Create payout record
        await tx.affiliatePayout.create({
            data: {
                userId,
                amount,
                netAmount: amount - processingFee,
                bankAccount: user.bankAccount,
                bankName: user.bankName,
                status: 'PENDING'
            }
        });
    });
}
```

---

## 3. CẤU TRÚC DATABASE

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐
│       User       │
│──────────────────│
│ id               │
│ affiliateCode    │
│ bankAccount      │
│ bankName         │
│ bankHolder       │
└────────┬─────────┘
         │
         │ 1:N
         ↓
┌──────────────────┐     1:N      ┌──────────────────┐
│  AffiliateWallet │──────────────│AffiliateTransaction│
│──────────────────│              │──────────────────│
│ id               │              │ id               │
│ userId           │              │ walletId         │
│ balance          │              │ amount           │
│ pendingBalance   │              │ type             │
│ points           │              │ description       │
└────────┬─────────┘              └──────────────────┘
         │
         │ 1:N
         ↓
┌──────────────────┐     N:1      ┌──────────────────┐
│AffiliateCommission│─────────────│AffiliateConversion│
│──────────────────│              │──────────────────│
│ id               │              │ id               │
│ affiliateId      │              │ customerId       │
│ conversionId     │              │ orderAmount      │
│ level            │              │ status           │
│ percentage       │              │ pendingUntil     │
│ netAmount        │              └──────────────────┘
│ status           │                      │
└──────────────────┘                      │ N:1
                                          ↓
                                  ┌──────────────────┐
                                  │AffiliateCampaign │
                                  │──────────────────│
                                  │ id               │
                                  │ slug             │
                                  │ maxLevels        │
                                  │ pendingDays      │
                                  │ taxRate          │
                                  │ feeAmount        │
                                  │ pointsPerReg     │
                                  └──────────────────┘
```

### 3.2 Bảng Enums

```prisma
enum CommissionStatus {
    PENDING    // Đang chờ (30 ngày)
    AVAILABLE  // Có thể rút
    WITHDRAWN  // Đã rút
}

enum TransactionType {
    POINT_EARNED    // Nhận điểm
    POINT_REDEEMED  // Đổi điểm
    COMMISSION       // Nhận hoa hồng
    WITHDRAWAL       // Rút tiền
}

enum PayoutStatus {
    PENDING    // Chờ duyệt
    PROCESSING // Đang xử lý
    COMPLETED  // Hoàn thành
    REJECTED  // Từ chối
}

enum PointStatus {
    PENDING    // Chờ xác nhận
    CONFIRMED  // Đã xác nhận
    CANCELLED  // Đã hủy
}
```

### 3.3 Các bảng chính

| Bảng | Mô tả | Key Fields |
|------|-------|------------|
| `AffiliateCampaign` | Chiến dịch | slug, maxLevels, pendingDays |
| `AffiliateLevel` | % hoa hồng | level, percentage |
| `RegistrationPoint` | Điểm đăng ký | referrerId, refereeId, points |
| `AffiliateConversion` | Conversion | customerId, orderAmount |
| `AffiliateCommission` | Hoa hồng | affiliateId, level, netAmount, status |
| `AffiliateWallet` | Ví | userId, balance, pendingBalance, points |
| `AffiliateTransaction` | Lịch sử GD | walletId, amount, type |
| `AffiliatePayout` | Yêu cầu rút | userId, amount, status |

---

## 4. HƯỚNG DẪN SỬ DỤNG

### 4.1 Dành cho CTV (Affiliate Partner)

#### 4.1.1 Đăng nhập & Truy cập Dashboard

1. Đăng nhập vào hệ thống
2. Truy cập `/affiliate` để vào Dashboard

#### 4.1.2 Dashboard Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Affiliate Dashboard                                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐│
│  │ Điểm ĐKý   │ │Tree của bạn │ │ Số dư       │ │Tổng TN ││
│  │ 52         │ │F1: 28       │ │ 0đ          │ │35,386đ ││
│  │ 28 người   │ │F2: 7        │ │ Khả dụng    │ │        ││
│  └─────────────┘ │F3: 1        │ └─────────────┘ └─────────┘│
│                  └─────────────┘                              │
├─────────────────────────────────────────────────────────────┤
│  Link Affiliate của bạn:                                     │
│  ┌─────────────────────────────────────────┐ [Copy Link]    │
│  │ https://hocvien.com/register?ref=BRK123 │                │
│  └─────────────────────────────────────────┘                │
├─────────────────────────────────────────────────────────────┤
│  Hoa hồng gần đây                    Giao dịch gần đây  │
│  ┌─────────────────────┐               ┌──────────────┐  │
│  │ F1 - #543: +35,386đ │               │ +1 điểm      │  │
│  │ PENDING             │               │ 2 phút trước │  │
│  └─────────────────────┘               └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 4.1.3 Chia sẻ Link Affiliate

1. Copy link từ Dashboard
2. Chia sẻ lên Facebook, Zalo, Email, etc.
3. Khi người khác click link → đăng ký → xác thực email → bạn nhận điểm

#### 4.1.4 Rút tiền

1. Truy cập `/affiliate/withdraw`
2. Nhập số tiền muốn rút
3. Xem thông tin tài khoản ngân hàng
4. Nhấn "Yêu cầu rút tiền"
5. Chờ admin duyệt (1-3 ngày làm việc)

**Lưu ý:**
- Số dư khả dụng = Số dư - Số đang chờ rút
- Phí xử lý: 3,300 VND/giao dịch
- Số tiền tối thiểu: Theo cấu hình campaign

### 4.2 Dành cho Admin

#### 4.2.1 Truy cập Admin Dashboard

1. Đăng nhập với tài khoản Admin
2. Truy cập `/admin/affiliate`

#### 4.2.2 Quản lý Payouts

1. Truy cập `/admin/affiliate/payouts`
2. Xem danh sách yêu cầu rút tiền
3. Duyệt hoặc từ chối:
   - **Duyệt**: Chuyển khoản cho CTV, cập nhật status = COMPLETED
   - **Từ chối**: Hoàn tiền về ví, cập nhật status = REJECTED

#### 4.2.3 Cấu hình Campaign

Chỉnh sửa trong database hoặc tạo trang admin riêng:

```typescript
await prisma.affiliateCampaign.update({
    where: { slug: 'default' },
    data: {
        maxLevels: 3,
        pendingDays: 30,
        feeAmount: 3300,
        taxRate: 0
    }
});
```

### 4.3 Dành cho Developer

#### 4.3.1 Tích hợp vào Registration Flow

```typescript
// Trong verify email route
import { onEmailVerified } from '@/lib/affiliate/points-manager';

// Sau khi xác thực email thành công
await onEmailVerified(user.id);
```

#### 4.3.2 Tích hợp vào Payment Flow

```typescript
// Trong payment actions
import { processEnrollmentCommission } from '@/lib/affiliate/commission-calculator';

// Sau khi payment verified
await processEnrollmentCommission(
    userId,
    enrollmentId,
    coursePrice
);
```

---

## 5. API REFERENCE

### 5.1 Internal Actions

#### `onEmailVerified(userId: number)`
Cộng điểm khi user xác thực email.

```typescript
const result = await onEmailVerified(123);
console.log(result.success);      // true/false
console.log(result.pointsAdded);  // số điểm đã cộng
```

#### `processEnrollmentCommission(userId, enrollmentId, coursePrice)`
Tính hoa hồng khi có purchase.

```typescript
const result = await processEnrollmentCommission(123, 456, 386868);
console.log(result.success);           // true/false
console.log(result.conversionId);       // ID của conversion
console.log(result.commissions);        // Array các commission
console.log(result.totalCommission);    // Tổng hoa hồng
```

#### `getAffiliateWallet(userId)`
Lấy thông tin ví.

```typescript
const wallet = await getAffiliateWallet(123);
console.log(wallet.balance);         // Số dư khả dụng
console.log(wallet.pendingBalance);  // Đang chờ
console.log(wallet.points);          // Điểm đăng ký
```

#### `requestPayout(userId, amount)`
Yêu cầu rút tiền.

```typescript
const result = await requestPayout(123, 500000);
console.log(result.success);     // true/false
console.log(result.payoutId);    // ID của payout request
```

### 5.2 Cron Jobs

#### `POST /api/cron/process-commissions`
Xử lý commission PENDING → AVAILABLE.

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
    "processed": 15,
    "total": 15,
    "errors": null
}
```

### 5.3 Click Tracking

#### `POST /api/track/click`
Ghi nhận click từ affiliate link.

**Body:**
```json
{
    "code": "BRK123"
}
```

---

## 6. CRON JOBS

### 6.1 Commission Processor

**URL:** `POST /api/cron/process-commissions`  
**Schedule:** Daily at 00:00 (midnight)  
**Logic:**
1. Tìm commissions với `status=PENDING` và `availableAt <= now`
2. Update status → `AVAILABLE`
3. Move netAmount từ `pendingBalance` → `balance`
4. Ghi transaction log

**Có thể chạy thủ công:**
```bash
curl -X POST https://api.hocvien.com/api/cron/process-commissions \
  -H "Authorization: Bearer your-cron-secret"
```

---

## 7. CẤU HÌNH CAMPAIGN

### 7.1 Cấu hình mặc định

```typescript
const defaultCampaign = {
    name: 'Chương trình Affiliate mặc định',
    slug: 'default',
    isActive: true,
    maxLevels: 3,           // F1, F2, F3
    pendingDays: 30,         // 30 ngày chờ
    taxRate: 0,              // 0% thuế
    feeAmount: 3300,         // 3,300 VND/phí
    minPayout: 100000,      // Tối thiểu 100k
    pointsPerRegistration: 1,
    pointsRequired: 10,      // 10 điểm = 1 khóa học
    pointRedemptionValue: 386868,
    autoRedeem: false,
    levels: [
        { level: 1, percentage: 10 },  // F1: 10%
        { level: 2, percentage: 5 },    // F2: 5%
        { level: 3, percentage: 2 }      // F3: 2%
    ]
};
```

### 7.2 Seed Script

Chạy seed để tạo campaign mặc định:

```bash
npx tsx prisma/seed-affiliate.ts
```

### 7.3 Backfill Points

Chạy backfill để tính lại điểm đăng ký:

```bash
npx tsx prisma/backfill-points-v2.ts
```

---

## PHỤ LỤC

### A. Test Scripts

| Script | Mục đích |
|--------|----------|
| `prisma/test-real-commission.ts` | Test flow hoa hồng |
| `prisma/system-check.ts` | Kiểm tra tổng thể |
| `prisma/check-wallets.ts` | Verify số dư ví |
| `prisma/verify-commission.ts` | Verify dữ liệu commission |

### B. Troubleshooting

**Không nhận được điểm:**
1. Kiểm tra user đã xác thực email chưa
2. Kiểm tra referrer có tồn tại không
3. Kiểm tra campaign có active không

**Không nhận được hoa hồng:**
1. Kiểm tra đã mua khóa học chưa (enrollment tồn tại)
2. Kiểm tra upline chain có đúng không
3. Kiểm tra commission đã được tạo chưa

**Cron job không chạy:**
1. Kiểm tra CRON_SECRET có đúng không
2. Kiểm tra log của cron service
3. Chạy thủ công để debug

### C. Liên hệ hỗ trợ

Email: support@hocvien.com  
Hotline: 1900-xxxx

---

**Document Version:** 1.1  
**Last Updated:** 2026-04-03  
**Author:** Dev Team

---

## PHỤ LỤC D: LANDING PAGE MODULE (NEW)

### D.1 Tổng quan

Hệ thống Landing Page cho phép tạo các trang landing riêng biệt cho từng chiến dịch affiliate.

### D.2 URL Formats

```
Type 1: giautoandien.io.vn?ref=xxx         → Homepage + ref tracking
Type 2: giautoandien.io.vn/{slug}?ref=xxx  → Landing page + ref tracking
```

### D.3 Templates

| Template | Mô tả |
|---------|--------|
| `hero-cta` | Hero image + CTA button |
| `feature-grid` | Features grid with icons |
| `video-intro` | Video + registration form |
| `webinar-reg` | Webinar countdown + registration |
| `testimonial` | Social proof focused |

### D.4 Commission Override

Mỗi landing page có thể có commission riêng:

```json
{
  "customCommission": {
    "f1": 15,
    "f2": 7,
    "f3": 3
  }
}
```

### D.5 Cookie Structure

```typescript
{
  "r": "BRK123",      // Ref code
  "l": "hocxaykenh",  // Landing slug (null = homepage)
  "t": 1234567890     // Timestamp
}
```

### D.6 Admin Routes

- `/admin/landings` - Danh sách landing pages
- `/admin/landings/new` - Tạo landing page mới
- `/admin/landings/[id]/edit` - Chỉnh sửa landing page

### D.7 Seed Data

```bash
npx tsx prisma/seed-landings.ts
```

### D.8 Files mới

| File | Mô tả |
|------|--------|
| `lib/landing/templates/*.tsx` | Template components |
| `hooks/useAffiliateCookie.ts` | Cookie hook |
| `lib/affiliate/tracking.ts` | Tracking utilities |
| `app/landing/[slug]/page.tsx` | Landing page renderer |
| `app/admin/landings/*` | Admin pages |
| `app/api/landing/route.ts` | Landing API |
