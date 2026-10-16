-- Affiliate v2 — GĐ2-5: phân loại hoa hồng + vinh danh công khai + liên kết đơn-khóa học
-- Thêm: enum CommissionKind (DIRECT/GRATITUDE), cột AffiliateCommission.kind
-- (dữ liệu cũ mặc định DIRECT), cột User.showOnLeaderboard (mặc định hiện tên),
-- cột OrderItem.enrollmentId (liên kết đơn hàng với enrollment khóa học).
-- Không xóa/sửa gì hiện có.

-- CreateEnum
CREATE TYPE "CommissionKind" AS ENUM ('DIRECT', 'GRATITUDE');

-- AlterTable
ALTER TABLE "AffiliateCommission" ADD COLUMN "kind" "CommissionKind" NOT NULL DEFAULT 'DIRECT';
ALTER TABLE "User" ADD COLUMN "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrderItem" ADD COLUMN "enrollmentId" INTEGER;

-- CreateIndex
CREATE INDEX "OrderItem_enrollmentId_idx" ON "OrderItem"("enrollmentId");
