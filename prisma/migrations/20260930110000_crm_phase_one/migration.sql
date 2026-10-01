-- Additive CRM migration: no existing user, course, payment or affiliate data is rewritten.
CREATE TYPE "CrmStage" AS ENUM ('NEW', 'CONTACTING', 'QUALIFIED', 'PROPOSAL', 'PAYMENT_PENDING', 'WON', 'LOST');

CREATE TABLE "CrmContact" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "source" TEXT NOT NULL DEFAULT 'Nhập tay',
  "needs" TEXT NOT NULL DEFAULT '',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "ownerId" INTEGER,
  "createdBy" INTEGER NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "lastContactAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CrmOpportunity" (
  "id" SERIAL NOT NULL,
  "contactId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "stage" "CrmStage" NOT NULL DEFAULT 'NEW',
  "amount" INTEGER NOT NULL DEFAULT 0,
  "lostReason" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmOpportunity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CrmActivity" (
  "id" SERIAL NOT NULL,
  "contactId" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "authorId" INTEGER NOT NULL,
  "authorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CrmTask" (
  "id" SERIAL NOT NULL,
  "contactId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdBy" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmContact_email_key" ON "CrmContact"("email");
CREATE UNIQUE INDEX "CrmContact_phone_key" ON "CrmContact"("phone");
CREATE INDEX "CrmContact_ownerId_archived_updatedAt_idx" ON "CrmContact"("ownerId", "archived", "updatedAt");
CREATE INDEX "CrmOpportunity_contactId_stage_idx" ON "CrmOpportunity"("contactId", "stage");
CREATE INDEX "CrmActivity_contactId_createdAt_idx" ON "CrmActivity"("contactId", "createdAt");
CREATE INDEX "CrmTask_contactId_completedAt_dueAt_idx" ON "CrmTask"("contactId", "completedAt", "dueAt");
CREATE INDEX "CrmTask_completedAt_dueAt_idx" ON "CrmTask"("completedAt", "dueAt");
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOpportunity" ADD CONSTRAINT "CrmOpportunity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CRM contains private contact information. All browser reads/writes use the
-- scoped NextAuth API, not Supabase's public REST API. RLS defaults to deny.
-- Explicitly override the older migration's broad default grants for these tables.
ALTER TABLE "CrmContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmTask" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE table_name TEXT; role_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['CrmContact', 'CrmOpportunity', 'CrmActivity', 'CrmTask'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM PUBLIC', table_name || '_id_seq');
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
        EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM %I', table_name || '_id_seq', role_name);
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO service_role', table_name || '_id_seq');
    END IF;
  END LOOP;
END $$;
