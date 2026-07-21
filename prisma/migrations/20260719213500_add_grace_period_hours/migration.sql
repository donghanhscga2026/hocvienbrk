ALTER TABLE public."system_tree"
ADD COLUMN IF NOT EXISTS "gracePeriodHours" INTEGER NOT NULL DEFAULT 24;

UPDATE public."system_tree"
SET "gracePeriodHours" = 21
WHERE "onSystem" = 4;

GRANT ALL PRIVILEGES ON TABLE public."system_tree" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."system_tree" TO service_role;
GRANT SELECT ON TABLE public."system_tree" TO anon;
