-- GĐ2A (kế hoạch nâng cấp từ WIPA OS, 23/10/2026): ConnectedAccount + SocialSnapshot + ExternalContentItem cho liên kết tài khoản và đồng bộ số liệu tự động.
-- Sinh bằng prisma migrate diff; chỉ tạo mới, không đụng dữ liệu hiện có.

-- CreateEnum
CREATE TYPE "ConnectedAccountStatus" AS ENUM ('ACTIVE', 'ERROR', 'REVOKED');

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT,
    "handle" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "ConnectedAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialSnapshot" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "totalViews" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalContentItem" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "viewCount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedAccount_provider_externalId_idx" ON "ConnectedAccount"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_key" ON "ConnectedAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "SocialSnapshot_accountId_capturedAt_idx" ON "SocialSnapshot"("accountId", "capturedAt");

-- CreateIndex
CREATE INDEX "ExternalContentItem_accountId_publishedAt_idx" ON "ExternalContentItem"("accountId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalContentItem_accountId_externalId_key" ON "ExternalContentItem"("accountId", "externalId");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialSnapshot" ADD CONSTRAINT "SocialSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ConnectedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalContentItem" ADD CONSTRAINT "ExternalContentItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ConnectedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

