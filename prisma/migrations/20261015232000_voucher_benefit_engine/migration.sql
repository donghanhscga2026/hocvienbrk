-- Migration: voucher benefit engine (voucher = quyền lợi khóa học) + Payment tracking
-- Chạy: npx prisma migrate deploy

-- 1. Enum loại quyền lợi voucher
DO $$ BEGIN
  CREATE TYPE "VoucherBenefitType" AS ENUM ('FREE_100', 'PARTIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Bảng quyền lợi: voucher V cho hưởng khóa học nào, free 100% hay trả thêm bao nhiêu
CREATE TABLE IF NOT EXISTS "voucher_course_benefit" (
  "id" SERIAL PRIMARY KEY,
  "voucherId" INTEGER NOT NULL REFERENCES "Voucher"("id") ON DELETE CASCADE,
  "courseId" INTEGER NOT NULL REFERENCES "Course"("id") ON DELETE CASCADE,
  "benefitType" "VoucherBenefitType" NOT NULL DEFAULT 'FREE_100',
  "extraAmount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "voucher_course_benefit_voucherId_courseId_key" UNIQUE ("voucherId", "courseId")
);
CREATE INDEX IF NOT EXISTS "voucher_course_benefit_voucherId_idx" ON "voucher_course_benefit"("voucherId");
CREATE INDEX IF NOT EXISTS "voucher_course_benefit_courseId_idx" ON "voucher_course_benefit"("courseId");

-- 3. Payment: lưu vết voucher/MBV đã áp dụng (phục vụ báo cáo)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "voucherId" INTEGER REFERENCES "Voucher"("id") ON DELETE SET NULL;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "mbvDeducted" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Payment_voucherId_idx" ON "Payment"("voucherId");
