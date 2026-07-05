-- Add BRK wallet balance fields and transaction types
-- Created: 2026-07-04

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('CASH', 'BRKD', 'VOUCHER');

-- AlterTable: brk_wallet
ALTER TABLE "brk_wallet" ADD COLUMN "brkd" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "brk_wallet" ADD COLUMN "voucherBalance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable: brk_transaction
ALTER TABLE "brk_transaction" ADD COLUMN "balanceType" "BalanceType" NOT NULL DEFAULT 'CASH';

-- AlterEnum: BrkTransactionType
ALTER TYPE "BrkTransactionType" ADD VALUE 'BRKD_CREDIT';
ALTER TYPE "BrkTransactionType" ADD VALUE 'VOUCHER_CREDIT';
ALTER TYPE "BrkTransactionType" ADD VALUE 'BRKD_RETURN';
