-- Tạo bảng CourseAnnouncement cho tính năng giảng viên gửi thông báo hàng loạt cho học viên.
-- Chạy file này trong Supabase của wi300 (project osqcudipywyfvvutbctb) > SQL Editor, TRƯỚC hoặc NGAY SAU khi deploy code.
-- Chỉ tạo bảng mới, không sửa/xóa dữ liệu hiện có. Muốn gỡ bỏ: DROP TABLE "CourseAnnouncement";

CREATE TABLE IF NOT EXISTS "CourseAnnouncement" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CourseAnnouncement_courseId_createdAt_idx" ON "CourseAnnouncement"("courseId", "createdAt");
CREATE INDEX IF NOT EXISTS "CourseAnnouncement_teacherId_idx" ON "CourseAnnouncement"("teacherId");

DO $$ BEGIN
    ALTER TABLE "CourseAnnouncement" ADD CONSTRAINT "CourseAnnouncement_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "CourseAnnouncement" ADD CONSTRAINT "CourseAnnouncement_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
