-- CreateEnum
CREATE TYPE "ZaloCareCommandStatus" AS ENUM ('QUEUED', 'IN_FLIGHT', 'SENT', 'FAILED', 'HELD', 'CANCELLED');

-- CreateTable
CREATE TABLE "ZaloCareCommand" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "courseId" INTEGER,
    "ruleId" TEXT,
    "body" TEXT NOT NULL,
    "status" "ZaloCareCommandStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "zaloUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZaloCareCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZaloCareInbound" (
    "id" SERIAL NOT NULL,
    "zaloMsgId" TEXT NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "studentId" INTEGER,
    "courseId" INTEGER,
    "text" TEXT NOT NULL,
    "crmRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZaloCareInbound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZaloCareCommand_idempotencyKey_key" ON "ZaloCareCommand"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ZaloCareCommand_status_createdAt_idx" ON "ZaloCareCommand"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ZaloCareCommand_studentId_createdAt_idx" ON "ZaloCareCommand"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "ZaloCareCommand_courseId_idx" ON "ZaloCareCommand"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ZaloCareInbound_zaloMsgId_key" ON "ZaloCareInbound"("zaloMsgId");

-- CreateIndex
CREATE INDEX "ZaloCareInbound_zaloUserId_createdAt_idx" ON "ZaloCareInbound"("zaloUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ZaloCareInbound_studentId_idx" ON "ZaloCareInbound"("studentId");

-- CreateIndex
CREATE INDEX "ZaloCareInbound_courseId_idx" ON "ZaloCareInbound"("courseId");

-- AddForeignKey
ALTER TABLE "ZaloCareCommand" ADD CONSTRAINT "ZaloCareCommand_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaloCareCommand" ADD CONSTRAINT "ZaloCareCommand_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaloCareCommand" ADD CONSTRAINT "ZaloCareCommand_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaloCareInbound" ADD CONSTRAINT "ZaloCareInbound_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZaloCareInbound" ADD CONSTRAINT "ZaloCareInbound_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase GRANT compliance (theo AGENTS.md mục G)
GRANT ALL PRIVILEGES ON TABLE public."ZaloCareCommand" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."ZaloCareCommand" TO service_role;
GRANT SELECT ON TABLE public."ZaloCareCommand" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."ZaloCareInbound" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."ZaloCareInbound" TO service_role;
GRANT SELECT ON TABLE public."ZaloCareInbound" TO anon;
GRANT USAGE, SELECT ON SEQUENCE public."ZaloCareCommand_id_seq" TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public."ZaloCareInbound_id_seq" TO authenticated, service_role;

ALTER TABLE public."ZaloCareCommand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ZaloCareInbound" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ZaloCareCommand_authenticated_all" ON public."ZaloCareCommand"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ZaloCareCommand_anon_select" ON public."ZaloCareCommand"
  FOR SELECT TO anon USING (true);
CREATE POLICY "ZaloCareInbound_authenticated_all" ON public."ZaloCareInbound"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ZaloCareInbound_anon_select" ON public."ZaloCareInbound"
  FOR SELECT TO anon USING (true);
