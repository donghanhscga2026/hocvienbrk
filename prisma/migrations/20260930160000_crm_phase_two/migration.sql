-- Apply after phase one, on staging first. No existing identity is inferred here.
ALTER TABLE "CrmContact" ADD COLUMN "linkedUserId" INTEGER;
CREATE UNIQUE INDEX "CrmContact_linkedUserId_key" ON "CrmContact"("linkedUserId");
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD COLUMN "courseId" INTEGER;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "CrmSubmission" (
  "id" SERIAL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "landingId" INTEGER NOT NULL,
  "contactId" INTEGER,
  "data" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "ipHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "CrmSubmission_key_key" ON "CrmSubmission"("key");
CREATE INDEX "CrmSubmission_ipHash_createdAt_idx" ON "CrmSubmission"("ipHash", "createdAt");
CREATE INDEX "CrmSubmission_status_createdAt_idx" ON "CrmSubmission"("status", "createdAt");
ALTER TABLE "CrmSubmission" ADD CONSTRAINT "CrmSubmission_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "LandingPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmSubmission" ADD CONSTRAINT "CrmSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmSubmission" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE role_name TEXT;
BEGIN
  REVOKE ALL ON TABLE "CrmSubmission" FROM PUBLIC;
  REVOKE ALL ON SEQUENCE "CrmSubmission_id_seq" FROM PUBLIC;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public."CrmSubmission" FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON SEQUENCE public."CrmSubmission_id_seq" FROM %I', role_name);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE "CrmSubmission" TO service_role;
    GRANT USAGE, SELECT ON SEQUENCE "CrmSubmission_id_seq" TO service_role;
  END IF;
END $$;
