ALTER TABLE "SiteProfile"
ADD COLUMN "siteConfig" JSONB;

CREATE TABLE "SiteProfileDomain" (
  "id" SERIAL PRIMARY KEY,
  "profileId" INTEGER NOT NULL REFERENCES "SiteProfile"("id") ON DELETE CASCADE,
  "hostname" TEXT NOT NULL UNIQUE,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SiteProfileDomain_profileId_idx" ON "SiteProfileDomain"("profileId");
CREATE INDEX "SiteProfileDomain_isActive_idx" ON "SiteProfileDomain"("isActive");

ALTER TABLE "SiteProfileDomain" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SiteProfileDomain" FROM PUBLIC;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "SiteProfileDomain" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "SiteProfileDomain" FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON "SiteProfileDomain" TO service_role;
    GRANT USAGE, SELECT ON SEQUENCE "SiteProfileDomain_id_seq" TO service_role;
  END IF;
END $$;
