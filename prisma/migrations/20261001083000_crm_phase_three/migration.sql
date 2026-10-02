-- AlterTable
ALTER TABLE "CrmContact" ADD COLUMN     "marketingEmailAllowed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CrmAutomationSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "leadSince" TIMESTAMP(3),
    "enrollmentSince" TIMESTAMP(3),
    "paymentSince" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmAutomationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmAutomationEvent" (
    "id" SERIAL NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contactId" INTEGER NOT NULL,
    "submissionId" INTEGER,
    "enrollmentId" INTEGER,
    "paymentId" INTEGER,
    "taskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmAutomationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCampaignReceipt" (
    "id" SERIAL NOT NULL,
    "previewKey" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmCampaignReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmAutomationEvent_sourceKey_key" ON "CrmAutomationEvent"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "CrmAutomationEvent_submissionId_key" ON "CrmAutomationEvent"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmAutomationEvent_enrollmentId_key" ON "CrmAutomationEvent"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmAutomationEvent_paymentId_key" ON "CrmAutomationEvent"("paymentId");

-- CreateIndex
CREATE INDEX "CrmAutomationEvent_contactId_createdAt_idx" ON "CrmAutomationEvent"("contactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CrmCampaignReceipt_previewKey_key" ON "CrmCampaignReceipt"("previewKey");

-- CreateIndex
CREATE UNIQUE INDEX "CrmCampaignReceipt_campaignId_key" ON "CrmCampaignReceipt"("campaignId");

-- AddForeignKey
ALTER TABLE "CrmAutomationEvent" ADD CONSTRAINT "CrmAutomationEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAutomationEvent" ADD CONSTRAINT "CrmAutomationEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CrmSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAutomationEvent" ADD CONSTRAINT "CrmAutomationEvent_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmAutomationEvent" ADD CONSTRAINT "CrmAutomationEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCampaignReceipt" ADD CONSTRAINT "CrmCampaignReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Không mở dữ liệu CRM cho các vai trò API công khai.
ALTER TABLE "CrmAutomationSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmAutomationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmCampaignReceipt" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE table_name TEXT; role_name TEXT; seq_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['CrmAutomationSettings', 'CrmAutomationEvent', 'CrmCampaignReceipt'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
  FOREACH seq_name IN ARRAY ARRAY['CrmAutomationEvent_id_seq', 'CrmCampaignReceipt_id_seq'] LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM PUBLIC', seq_name);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM %I', seq_name, role_name);
      END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO service_role', seq_name);
    END IF;
  END LOOP;
END $$;
