ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS "requiresReferralActivation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public."Course" ADD COLUMN IF NOT EXISTS "referralActivationThreshold" INTEGER NOT NULL DEFAULT 0;
