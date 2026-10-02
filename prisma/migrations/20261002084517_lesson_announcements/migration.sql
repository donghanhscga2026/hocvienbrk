-- Additive only: existing lessons, enrollments and notifications are preserved.
ALTER TABLE public."AppNotification" ADD COLUMN "lessonId" TEXT;
ALTER TABLE public."AppNotification" DROP CONSTRAINT "AppNotification_kind_check";
ALTER TABLE public."AppNotification" ADD CONSTRAINT "AppNotification_kind_check"
CHECK (kind IN ('REQUEST_INCOMING','REQUEST_RECEIVED','REQUEST_UPDATED','ENROLLMENT_TEACHER','ENROLLMENT_RECEIVED','ENROLLMENT_ACTIVE','COMMENT_REPLY','TASK_DUE','LESSON_ANNOUNCEMENT'));
CREATE TABLE public."LessonAnnouncement" (
 id TEXT PRIMARY KEY,
 "lessonId" TEXT NOT NULL,
 "courseId" INTEGER NOT NULL,
 "senderId" INTEGER NOT NULL,
 title TEXT NOT NULL,
 "recipientCount" INTEGER NOT NULL CHECK ("recipientCount" > 0),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LessonAnnouncement_lessonId_courseId_createdAt_idx" ON public."LessonAnnouncement" ("lessonId","courseId","createdAt");
ALTER TABLE public."LessonAnnouncement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."LessonAnnouncement" FROM PUBLIC, anon, authenticated;
GRANT ALL ON public."LessonAnnouncement" TO service_role;
