-- Affiliate v2 — Phase 1: tầng dữ liệu
-- Thêm: enum OrderStatus, giá trị PRODUCT/SERVICE cho ProductType,
-- bảng Order/OrderItem (đơn hàng sàn), ProductAffiliateConfig (cấu hình theo sản phẩm),
-- SystemAffiliateConfig (cấu hình chung), LeaderboardSnapshot/Badge/UserBadge (vinh danh),
-- cột AffiliateConversion.orderRecordId (liên kết đơn hàng, giữ lịch sử khi xóa đơn).
-- Không xóa/sửa gì hiện có. Engine hoa hồng cũ (F1/F2/F3) chưa đụng tới ở phase này.

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- AlterEnum
ALTER TYPE "ProductType" ADD VALUE 'PRODUCT';
ALTER TYPE "ProductType" ADD VALUE 'SERVICE';

-- CreateTable
CREATE TABLE "Order" (
  "id" SERIAL NOT NULL,
  "buyerId" INTEGER NOT NULL,
  "affiliateId" INTEGER,
  "refCode" TEXT,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "commissionProcessed" BOOLEAN NOT NULL DEFAULT false,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "productType" "ProductType" NOT NULL,
  "productId" INTEGER NOT NULL,
  "productName" TEXT NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAffiliateConfig" (
  "id" SERIAL NOT NULL,
  "productType" "ProductType" NOT NULL,
  "productId" INTEGER NOT NULL,
  "directRate" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductAffiliateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAffiliateConfig" (
  "id" INTEGER NOT NULL,
  "gratitudeRate" DOUBLE PRECISION NOT NULL DEFAULT 2,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pendingDays" INTEGER NOT NULL DEFAULT 30,
  "minPayout" DOUBLE PRECISION NOT NULL DEFAULT 200000,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemAffiliateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardSnapshot" (
  "id" SERIAL NOT NULL,
  "period" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "rank" INTEGER NOT NULL,
  "gmv" DOUBLE PRECISION NOT NULL,
  "commissionEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "tier" INTEGER NOT NULL DEFAULT 1,
  "thresholdGmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "badgeId" INTEGER NOT NULL,
  "period" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AffiliateConversion" ADD COLUMN "orderRecordId" INTEGER;

-- CreateIndex
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");
CREATE INDEX "Order_affiliateId_status_idx" ON "Order"("affiliateId", "status");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productType_productId_idx" ON "OrderItem"("productType", "productId");
CREATE UNIQUE INDEX "ProductAffiliateConfig_productType_productId_key" ON "ProductAffiliateConfig"("productType", "productId");
CREATE INDEX "ProductAffiliateConfig_productType_productId_idx" ON "ProductAffiliateConfig"("productType", "productId");
CREATE UNIQUE INDEX "LeaderboardSnapshot_period_userId_key" ON "LeaderboardSnapshot"("period", "userId");
CREATE INDEX "LeaderboardSnapshot_period_rank_idx" ON "LeaderboardSnapshot"("period", "rank");
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");
CREATE INDEX "Badge_tier_idx" ON "Badge"("tier");
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_period_key" ON "UserBadge"("userId", "badgeId", "period");
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAffiliateConfig" ADD CONSTRAINT "ProductAffiliateConfig_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaderboardSnapshot" ADD CONSTRAINT "LeaderboardSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateConversion" ADD CONSTRAINT "AffiliateConversion_orderRecordId_fkey" FOREIGN KEY ("orderRecordId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
