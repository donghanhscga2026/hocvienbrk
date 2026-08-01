-- Add MBV (Merit Bank Voucher) balance type to BrkWallet
ALTER TABLE public."brk_wallet"
ADD COLUMN "mbvBalance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Add MBV value to BalanceType enum
ALTER TYPE "BalanceType" ADD VALUE IF NOT EXISTS 'MBV';

-- Add MBV_CREDIT to BrkTransactionType enum
ALTER TYPE "BrkTransactionType" ADD VALUE IF NOT EXISTS 'MBV_CREDIT';

-- Grant permissions for new column access (Supabase compliance)
GRANT ALL PRIVILEGES ON TABLE public."brk_wallet" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."brk_wallet" TO service_role;
GRANT SELECT ON TABLE public."brk_wallet" TO anon;
