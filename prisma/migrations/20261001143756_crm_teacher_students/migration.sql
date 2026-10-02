-- Chỉ bổ sung cấu trúc CRM; không cập nhật tài khoản, đăng ký hoặc thanh toán cũ.
SET LOCAL lock_timeout = '5s';

ALTER TABLE public."CrmContact"
  ADD COLUMN "studentProfile" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "studentUserId" INTEGER;
ALTER TABLE public."CrmAutomationSettings"
  ADD COLUMN "studentSyncEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "CrmContact_studentUserId_idx" ON public."CrmContact"("studentUserId");
CREATE UNIQUE INDEX "CrmContact_ownerId_studentUserId_key" ON public."CrmContact"("ownerId", "studentUserId");
ALTER TABLE public."CrmContact" ADD CONSTRAINT "CrmContact_studentUserId_fkey"
  FOREIGN KEY ("studentUserId") REFERENCES public."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Định danh hồ sơ giáo viên luôn đọc từ tài khoản gốc, không dùng liên kết CRM chung.
ALTER TABLE public."CrmContact" ADD CONSTRAINT "CrmContact_student_identity_check"
  CHECK (NOT "studentProfile" OR (email IS NULL AND phone IS NULL AND "linkedUserId" IS NULL));
ALTER TABLE public."CrmContact" ADD CONSTRAINT "CrmContact_student_profile_check"
  CHECK ("studentUserId" IS NULL OR "studentProfile");
