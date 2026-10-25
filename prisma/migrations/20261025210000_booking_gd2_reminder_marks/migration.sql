-- Đặt lịch hẹn coach 1:1 — Giai đoạn 2: mốc đã gửi nhắc hẹn trên Booking.
-- Hai cột nullable ghi thời điểm hệ thống đã gửi email nhắc trước 24 giờ
-- và trước 1 giờ; cron nhắc hẹn dùng chúng để chống gửi trùng (kể cả khi
-- khách đổi lịch thì đặt lại về NULL để nhắc theo giờ mới). Thêm một index
-- phục vụ truy vấn quét lịch sắp tới theo trạng thái của cron.

ALTER TABLE "Booking" ADD COLUMN "reminder24SentAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "reminder1SentAt" TIMESTAMP(3);

CREATE INDEX "Booking_status_startsAt_idx" ON "Booking"("status", "startsAt");
