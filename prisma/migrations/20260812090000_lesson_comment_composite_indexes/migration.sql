-- Thay index đơn lessonId bằng 2 composite index khớp đúng pattern truy vấn
-- thực tế: getCommentsByLesson (lessonId + order by createdAt) và
-- hasUserCommentedOnLesson (lessonId + userId, gọi mỗi lần chuyển bài học).
DROP INDEX "LessonComment_lessonId_idx";

CREATE INDEX "LessonComment_lessonId_createdAt_idx" ON "LessonComment"("lessonId", "createdAt");

CREATE INDEX "LessonComment_lessonId_userId_idx" ON "LessonComment"("lessonId", "userId");
