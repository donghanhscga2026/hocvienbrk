-- CreateEnum
CREATE TYPE "GieoHatSettlementStatus" AS ENUM ('PROPOSED', 'APPROVED', 'PAID', 'REJECTED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "gieoHatCountLate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gieoHatCountMissing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gieoHatDailyOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gieoHatEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gieoHatRate" INTEGER NOT NULL DEFAULT 50000;

-- CreateTable
CREATE TABLE "GieoHatSettlement" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "lessonOrders" JSONB NOT NULL,
    "lateCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "computedAmount" INTEGER NOT NULL DEFAULT 0,
    "proposedAmount" INTEGER,
    "studentNote" TEXT,
    "finalAmount" INTEGER,
    "status" "GieoHatSettlementStatus" NOT NULL DEFAULT 'PROPOSED',
    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "transferContent" TEXT,
    "studentMarkedPaidAt" TIMESTAMP(3),
    "paidConfirmedBy" INTEGER,
    "paidConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GieoHatSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GieoHatSettlement_enrollmentId_status_idx" ON "GieoHatSettlement"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "GieoHatSettlement_courseId_status_idx" ON "GieoHatSettlement"("courseId", "status");

-- CreateIndex
CREATE INDEX "GieoHatSettlement_userId_idx" ON "GieoHatSettlement"("userId");

-- AddForeignKey
ALTER TABLE "GieoHatSettlement" ADD CONSTRAINT "GieoHatSettlement_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GieoHatSettlement" ADD CONSTRAINT "GieoHatSettlement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GieoHatSettlement" ADD CONSTRAINT "GieoHatSettlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

