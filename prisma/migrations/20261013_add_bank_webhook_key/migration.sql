-- API key webhook SePay riêng cho từng tài khoản ngân hàng (lưu dạng hash)
ALTER TABLE "user_bank_account" ADD COLUMN "webhookApiKeyHash" TEXT;
ALTER TABLE "user_bank_account" ADD COLUMN "webhookApiKeyHint" TEXT;
