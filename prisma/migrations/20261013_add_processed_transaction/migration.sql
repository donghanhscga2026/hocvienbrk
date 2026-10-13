-- CreateTable
CREATE TABLE "processed_transaction" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "enrollmentId" INTEGER,
    "amount" INTEGER,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "content" TEXT,
    "transferTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processed_transaction_externalId_key" ON "processed_transaction"("externalId");

-- CreateIndex
CREATE INDEX "processed_transaction_status_idx" ON "processed_transaction"("status");

