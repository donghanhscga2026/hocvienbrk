-- GĐ1 (kế hoạch nâng cấp từ WIPA OS, 23/10/2026): bảng LearnerBaseline đo Điểm A → Điểm B của học viên theo từng khóa học.
-- Sinh bằng prisma migrate diff từ schema cũ → schema mới; chỉ tạo enum + bảng + khóa ngoại mới, không đụng dữ liệu hiện có.

-- CreateEnum
CREATE TYPE "BaselineKind" AS ENUM ('A', 'B');

-- CreateTable
CREATE TABLE "LearnerBaseline" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "kind" "BaselineKind" NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "customers" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearnerBaseline_courseId_kind_idx" ON "LearnerBaseline"("courseId", "kind");

-- CreateIndex
CREATE INDEX "LearnerBaseline_userId_idx" ON "LearnerBaseline"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerBaseline_userId_courseId_kind_key" ON "LearnerBaseline"("userId", "courseId", "kind");

-- AddForeignKey
ALTER TABLE "LearnerBaseline" ADD CONSTRAINT "LearnerBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBaseline" ADD CONSTRAINT "LearnerBaseline_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

