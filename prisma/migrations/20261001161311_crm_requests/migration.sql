-- Only adds an empty, private request table. No old data or interactions are rewritten.
CREATE TABLE "CrmRequest" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "contactId" INTEGER,
  "ownerId" INTEGER, "courseId" INTEGER, "userId" INTEGER,
  "lessonId" TEXT, "commentId" INTEGER, "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW', "content" TEXT NOT NULL,
  "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "source" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL, "resolution" TEXT NOT NULL DEFAULT '',
  "history" JSONB NOT NULL DEFAULT '[]', "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmRequest_category_check" CHECK ("category" IN ('LEARNING','SUPPORT','CONSULTATION')),
  CONSTRAINT "CrmRequest_status_check" CHECK ("status" IN ('NEW','IN_PROGRESS','RESOLVED')),
  CONSTRAINT "CrmRequest_resolution_check" CHECK ("status" <> 'RESOLVED' OR length(trim("resolution")) > 0),
  CONSTRAINT "CrmRequest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "CrmRequest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmRequest_key_key" ON "CrmRequest"("key");
CREATE INDEX "CrmRequest_ownerId_status_createdAt_idx" ON "CrmRequest"("ownerId", "status", "createdAt");
CREATE INDEX "CrmRequest_contactId_status_idx" ON "CrmRequest"("contactId", "status");
CREATE INDEX "CrmRequest_ipHash_createdAt_idx" ON "CrmRequest"("ipHash", "createdAt");
CREATE INDEX "CrmRequest_courseId_idx" ON "CrmRequest"("courseId");
CREATE INDEX "CrmRequest_createdAt_idx" ON "CrmRequest"("createdAt");
ALTER TABLE public."CrmRequest" ENABLE ROW LEVEL SECURITY;
-- NextAuth + scoped server-side Prisma handle access; no browser Data API grants.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public."CrmRequest" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public."CrmRequest" FROM authenticated;
  END IF;
END $$;
