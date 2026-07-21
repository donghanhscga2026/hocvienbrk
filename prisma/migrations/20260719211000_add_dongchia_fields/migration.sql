ALTER TABLE public."system"
ADD COLUMN IF NOT EXISTS "inDongChia" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "system_onSystem_status_inDongChia_idx"
ON public."system"("onSystem", "status", "inDongChia");

INSERT INTO public."SystemConfig" ("key", "value")
VALUES ('dongchia_start_time', '"2026-07-02T13:06:08.000Z"'::jsonb)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO public."SystemConfig" ("key", "value")
VALUES ('level_promotion_start_time', '"2026-07-03T12:08:06.000Z"'::jsonb)
ON CONFLICT ("key") DO NOTHING;

GRANT ALL PRIVILEGES ON TABLE public."system" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."system" TO service_role;
GRANT SELECT ON TABLE public."system" TO anon;
