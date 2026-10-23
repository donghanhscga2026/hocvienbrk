-- GĐ2B (kế hoạch nâng cấp từ WIPA OS, 23/10/2026): Race + RaceEnrollment + MetricEvent + RaceLeave cho Cuộc đua tăng tốc đo tự động.
-- Sinh bằng prisma migrate diff; chỉ tạo mới, không đụng dữ liệu hiện có.

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Race" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "courseId" INTEGER,
    "status" "RaceStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "metricConfig" JSONB,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricEvent" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "metricKey" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL DEFAULT 'TOTAL',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "detail" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceEnrollment" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "team" INTEGER NOT NULL DEFAULT 1,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceLeave" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceLeave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Race_status_startsAt_idx" ON "Race"("status", "startsAt");

-- CreateIndex
CREATE INDEX "MetricEvent_raceId_points_idx" ON "MetricEvent"("raceId", "points");

-- CreateIndex
CREATE INDEX "MetricEvent_userId_idx" ON "MetricEvent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricEvent_raceId_userId_metricKey_periodKey_key" ON "MetricEvent"("raceId", "userId", "metricKey", "periodKey");

-- CreateIndex
CREATE INDEX "RaceEnrollment_userId_idx" ON "RaceEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceEnrollment_raceId_userId_key" ON "RaceEnrollment"("raceId", "userId");

-- CreateIndex
CREATE INDEX "RaceLeave_raceId_status_idx" ON "RaceLeave"("raceId", "status");

-- CreateIndex
CREATE INDEX "RaceLeave_userId_idx" ON "RaceLeave"("userId");

-- AddForeignKey
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceEnrollment" ADD CONSTRAINT "RaceEnrollment_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceEnrollment" ADD CONSTRAINT "RaceEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceLeave" ADD CONSTRAINT "RaceLeave_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceLeave" ADD CONSTRAINT "RaceLeave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

