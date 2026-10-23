-- GĐ1 (kế hoạch nâng cấp từ WIPA OS, 23/10/2026): bảng AttendanceSession + AttendanceRecord cho điểm danh buổi học live bằng nhập báo cáo Zoom.
-- Sinh bằng prisma migrate diff từ schema cũ → schema mới; chỉ tạo mới, không đụng dữ liệu hiện có.

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 90,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "minutesAttended" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'ZOOM_IMPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceSession_courseId_sessionDate_idx" ON "AttendanceSession"("courseId", "sessionDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_idx" ON "AttendanceRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_userId_key" ON "AttendanceRecord"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

