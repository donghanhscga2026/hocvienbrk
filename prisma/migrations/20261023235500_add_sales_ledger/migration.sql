-- GĐ2A (kế hoạch nâng cấp từ WIPA OS, 23/10/2026): bảng MemberSalesLedger — sổ cái doanh số thành viên bất biến (TEACHER/AFFILIATE × ACCRUAL/REVERSAL).
-- Sinh bằng prisma migrate diff; chỉ tạo mới, không đụng dữ liệu hiện có.

-- CreateEnum
CREATE TYPE "SalesLedgerRole" AS ENUM ('TEACHER', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "SalesLedgerEntryType" AS ENUM ('ACCRUAL', 'REVERSAL');

-- CreateTable
CREATE TABLE "MemberSalesLedger" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "SalesLedgerRole" NOT NULL,
    "type" "SalesLedgerEntryType" NOT NULL,
    "orderId" INTEGER NOT NULL,
    "courseId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberSalesLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberSalesLedger_dedupeKey_key" ON "MemberSalesLedger"("dedupeKey");

-- CreateIndex
CREATE INDEX "MemberSalesLedger_userId_occurredAt_idx" ON "MemberSalesLedger"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "MemberSalesLedger_orderId_idx" ON "MemberSalesLedger"("orderId");

-- AddForeignKey
ALTER TABLE "MemberSalesLedger" ADD CONSTRAINT "MemberSalesLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

