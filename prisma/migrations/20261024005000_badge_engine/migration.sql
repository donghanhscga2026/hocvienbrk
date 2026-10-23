-- GĐ3 (kế hoạch nâng cấp từ WIPA OS, 24/10/2026): Badge thêm category + rule cho engine trao huy hiệu tự động (học tập/nội dung/kinh doanh/cuộc đua).
-- Sinh bằng prisma migrate diff; chỉ thêm cột có giá trị mặc định, không đụng dữ liệu hiện có.

-- AlterTable
ALTER TABLE "Badge" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'AFFILIATE',
ADD COLUMN     "rule" JSONB;

