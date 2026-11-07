-- Additive only: extend the AppNotification kind allow-list with the two
-- kinds the code already writes but the constraint never learned about:
--   BASELINE_REMINDER — lib/baseline/reminder-runner.ts (nhắc ghi Điểm A/B).
--     Thiếu kind này khiến cron baseline-reminders trả 500 mỗi ngày, và vì
--     job GitHub academy-daily-sync dừng ở bước lỗi, hai bước affiliate
--     phía sau (process-commissions + affiliate-leaderboard) bị bỏ qua —
--     gốc của việc snapshot vinh danh 2026-10 không được chốt tự động.
--   BOOKING_CREATED — lib/booking/notify.ts (chuông báo có lịch hẹn mới).
--     Thiếu kind này khiến thông báo đặt lịch thất bại thầm lặng (đã có
--     workaround mượn COURSE_ANNOUNCEMENT cho riêng phần nhắc hẹn).
-- All 11 existing kinds are preserved.
ALTER TABLE public."AppNotification" DROP CONSTRAINT "AppNotification_kind_check";
ALTER TABLE public."AppNotification" ADD CONSTRAINT "AppNotification_kind_check"
CHECK (kind IN ('REQUEST_INCOMING','REQUEST_RECEIVED','REQUEST_UPDATED','ENROLLMENT_TEACHER','ENROLLMENT_RECEIVED','ENROLLMENT_ACTIVE','COMMENT_REPLY','TASK_DUE','LESSON_ANNOUNCEMENT','BADGE_AWARDED','COURSE_ANNOUNCEMENT','BASELINE_REMINDER','BOOKING_CREATED'));
