CREATE TABLE "SiteWebsite" (
  "profileId" INTEGER PRIMARY KEY REFERENCES "SiteProfile"("id") ON DELETE CASCADE,
  "draft" JSONB NOT NULL,
  "published" JSONB,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "history" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "SiteWebsite" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SiteWebsite" FROM PUBLIC;
-- Drafts are accessed only through the authenticated application backend.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "SiteWebsite" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "SiteWebsite" FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON "SiteWebsite" TO service_role;
  END IF;
END $$;
