CREATE TABLE public."SiteDomain" (
 "hostname" TEXT PRIMARY KEY,
 "profileId" INTEGER NOT NULL REFERENCES public."SiteProfile"("id") ON DELETE CASCADE,
 "token" TEXT NOT NULL UNIQUE,
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "courses" BOOLEAN NOT NULL DEFAULT false,
 "crm" BOOLEAN NOT NULL DEFAULT false,
 "affiliate" BOOLEAN NOT NULL DEFAULT false,
 "verifiedAt" TIMESTAMP(3), "checkedAt" TIMESTAMP(3),
 "message" TEXT NOT NULL DEFAULT 'Chờ cấu hình DNS và Vercel',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SiteDomain_profileId_idx" ON public."SiteDomain"("profileId");
ALTER TABLE public."SiteDomain" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."SiteDomain" FROM PUBLIC, anon, authenticated;
GRANT ALL ON public."SiteDomain" TO service_role;
