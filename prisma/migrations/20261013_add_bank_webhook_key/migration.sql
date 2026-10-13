-- API key webhook SePay riêng cho từng tài khoản ngân hàng (lưu dạng hash)
ALTER TABLE "UserBankAccount" ADD COLUMN "webhookApiKeyHash" TEXT;
ALTER TABLE "UserBankAccount" ADD COLUMN "webhookApiKeyHint" TEXT;
