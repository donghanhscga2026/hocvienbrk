-- No existing contacts, requests or submissions are rewritten.
-- Deduplicate identities within their teacher's private CRM, not platform-wide.
CREATE UNIQUE INDEX "CrmContact_ownerId_email_key" ON public."CrmContact"("ownerId", "email");
CREATE UNIQUE INDEX "CrmContact_ownerId_phone_key" ON public."CrmContact"("ownerId", "phone");
CREATE UNIQUE INDEX "CrmContact_unowned_email_key" ON public."CrmContact"("email") WHERE "ownerId" IS NULL;
CREATE UNIQUE INDEX "CrmContact_unowned_phone_key" ON public."CrmContact"("phone") WHERE "ownerId" IS NULL;
DROP INDEX public."CrmContact_email_key";
DROP INDEX public."CrmContact_phone_key";

CREATE TABLE public."CrmForm" (
  id TEXT PRIMARY KEY,
  "ownerId" INTEGER NOT NULL REFERENCES public."User"(id) ON DELETE RESTRICT,
  "profileId" INTEGER NOT NULL REFERENCES public."SiteProfile"(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  config JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "CrmForm_ownerId_profileId_updatedAt_idx" ON public."CrmForm"("ownerId","profileId","updatedAt");
CREATE TABLE public."CrmFormSubmission" (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  "formId" TEXT NOT NULL REFERENCES public."CrmForm"(id) ON DELETE RESTRICT,
  "ownerId" INTEGER NOT NULL,
  "profileId" INTEGER NOT NULL,
  "contactId" INTEGER REFERENCES public."CrmContact"(id) ON DELETE SET NULL,
  "requestId" TEXT NOT NULL UNIQUE REFERENCES public."CrmRequest"(id) ON DELETE RESTRICT,
  "formVersion" INTEGER NOT NULL,
  "definitionSnapshot" JSONB NOT NULL,
  answers JSONB NOT NULL,
  "identityStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
  "ipHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CrmFormSubmission_ownerId_createdAt_idx" ON public."CrmFormSubmission"("ownerId","createdAt");
CREATE INDEX "CrmFormSubmission_formId_createdAt_idx" ON public."CrmFormSubmission"("formId","createdAt");
CREATE INDEX "CrmFormSubmission_contactId_createdAt_idx" ON public."CrmFormSubmission"("contactId","createdAt");
CREATE INDEX "CrmFormSubmission_ipHash_createdAt_idx" ON public."CrmFormSubmission"("ipHash","createdAt");
ALTER TABLE public."CrmForm" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CrmFormSubmission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."CrmForm",public."CrmFormSubmission" FROM anon,authenticated;
GRANT ALL ON public."CrmForm",public."CrmFormSubmission" TO service_role;
