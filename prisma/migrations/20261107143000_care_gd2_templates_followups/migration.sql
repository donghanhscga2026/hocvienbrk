-- CreateEnum
CREATE TYPE "CareTemplateScope" AS ENUM ('SYSTEM', 'COURSE', 'PERSONAL');

-- CreateEnum
CREATE TYPE "CareFollowUpStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED_AUTO', 'CANCELLED_MANUAL');

-- CreateTable
CREATE TABLE "CareTemplate" (
    "id" SERIAL NOT NULL,
    "shortcut" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scope" "CareTemplateScope" NOT NULL DEFAULT 'PERSONAL',
    "courseId" INTEGER,
    "ownerId" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareFollowUp" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "courseId" INTEGER,
    "ruleId" TEXT,
    "templateId" INTEGER,
    "note" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "CareFollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareTemplate_scope_courseId_idx" ON "CareTemplate"("scope", "courseId");

-- CreateIndex
CREATE INDEX "CareTemplate_ownerId_idx" ON "CareTemplate"("ownerId");

-- CreateIndex
CREATE INDEX "CareTemplate_shortcut_idx" ON "CareTemplate"("shortcut");

-- CreateIndex
CREATE INDEX "CareFollowUp_status_dueAt_idx" ON "CareFollowUp"("status", "dueAt");

-- CreateIndex
CREATE INDEX "CareFollowUp_studentId_status_idx" ON "CareFollowUp"("studentId", "status");

-- CreateIndex
CREATE INDEX "CareFollowUp_courseId_idx" ON "CareFollowUp"("courseId");

-- AddForeignKey
ALTER TABLE "CareTemplate" ADD CONSTRAINT "CareTemplate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTemplate" ADD CONSTRAINT "CareTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareFollowUp" ADD CONSTRAINT "CareFollowUp_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareFollowUp" ADD CONSTRAINT "CareFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareFollowUp" ADD CONSTRAINT "CareFollowUp_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareFollowUp" ADD CONSTRAINT "CareFollowUp_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CareTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase GRANT compliance (theo AGENTS.md mục G)
GRANT ALL PRIVILEGES ON TABLE public."CareTemplate" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."CareTemplate" TO service_role;
GRANT SELECT ON TABLE public."CareTemplate" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."CareFollowUp" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."CareFollowUp" TO service_role;
GRANT SELECT ON TABLE public."CareFollowUp" TO anon;
GRANT USAGE, SELECT ON SEQUENCE public."CareTemplate_id_seq" TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public."CareFollowUp_id_seq" TO authenticated, service_role;

ALTER TABLE public."CareTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CareFollowUp" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CareTemplate_authenticated_all" ON public."CareTemplate"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "CareTemplate_anon_select" ON public."CareTemplate"
  FOR SELECT TO anon USING (true);
CREATE POLICY "CareFollowUp_authenticated_all" ON public."CareFollowUp"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "CareFollowUp_anon_select" ON public."CareFollowUp"
  FOR SELECT TO anon USING (true);

