-- Thêm fingerprint chống trùng lặp liên kênh (email + SePay)
ALTER TABLE "processed_transaction" ADD COLUMN "fingerprint" TEXT;

CREATE UNIQUE INDEX "processed_transaction_fingerprint_key" ON "processed_transaction"("fingerprint");
