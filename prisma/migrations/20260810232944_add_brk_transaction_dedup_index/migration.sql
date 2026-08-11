-- Chống trừ kép ở tầng database (lớp phòng thủ cuối cùng, bổ sung cho các
-- check ở tầng ứng dụng) — mỗi (walletId, refId, balanceType, type) chỉ
-- được phép xuất hiện tối đa 1 lần kể từ nay trở đi.
--
-- Dùng PARTIAL INDEX (chỉ áp dụng cho createdAt >= 2026-08-06), KHÔNG hồi tố
-- lên dữ liệu lịch sử, vì đã phát hiện 3 cặp trùng hợp lệ trong lịch sử cần
-- giữ nguyên làm dấu vết kiểm toán (không sửa/xoá giao dịch gốc):
--   - 2 cặp là giao dịch cộng gốc + giao dịch đảo ngược để sửa sự cố cũ
--     (cùng refId, khác `type`: COMMISSION/BRKD_CREDIT vs ADJUSTMENT — không
--     bị chặn bởi index này vì `type` khác nhau, không thực sự trùng).
--   - 1 cặp là bug trừ kép thật (user #611, refId 'course_38', 2 giao dịch
--     cùng type ADJUSTMENT) — đã hoàn tiền bằng giao dịch điều chỉnh riêng
--     (refId khác), giữ nguyên 2 giao dịch gốc để kiểm toán.
--
-- Không khai báo constraint này trong schema.prisma (Prisma không hỗ trợ
-- partial index qua @@unique) — chỉ tồn tại ở tầng SQL migration này.
CREATE UNIQUE INDEX "brk_transaction_dedup_key"
ON "brk_transaction" ("walletId", "refId", "balanceType", "type")
WHERE "refId" IS NOT NULL AND "createdAt" >= '2026-08-06T00:00:00Z';
