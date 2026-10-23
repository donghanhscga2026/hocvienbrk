-- Affiliate v2 — GĐ4 (hướng A, quyết định 19/10/2026): mở rộng bảng Badge
-- Thêm: cột icon (emoji/biểu tượng hiển thị), cột isActive (bật/tắt huy hiệu).
-- Ngưỡng GMV dùng cột thresholdGmv đã có. Không xóa/sửa gì hiện có.

-- AlterTable
ALTER TABLE "Badge" ADD COLUMN "icon" TEXT;
ALTER TABLE "Badge" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
