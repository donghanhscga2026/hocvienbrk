-- Additive only: extend the AppNotification kind allow-list so the badge
-- engine can record BADGE_AWARDED bell notifications when a member earns
-- new badges (lib/badges/engine.ts). All 9 existing kinds are preserved.
ALTER TABLE public."AppNotification" DROP CONSTRAINT "AppNotification_kind_check";
ALTER TABLE public."AppNotification" ADD CONSTRAINT "AppNotification_kind_check"
CHECK (kind IN ('REQUEST_INCOMING','REQUEST_RECEIVED','REQUEST_UPDATED','ENROLLMENT_TEACHER','ENROLLMENT_RECEIVED','ENROLLMENT_ACTIVE','COMMENT_REPLY','TASK_DUE','LESSON_ANNOUNCEMENT','BADGE_AWARDED'));
