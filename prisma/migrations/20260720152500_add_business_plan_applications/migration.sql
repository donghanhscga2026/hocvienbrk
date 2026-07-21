CREATE TABLE public."business_plan" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "shortDescription" TEXT,
  "logicVersion" INTEGER NOT NULL DEFAULT 1,
  "importantRules" JSONB,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE public."system_plan_application" (
  "id" SERIAL PRIMARY KEY,
  "applicationCode" TEXT NOT NULL UNIQUE,
  "onSystem" INTEGER NOT NULL,
  "businessPlanId" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "configurationSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_plan_application_onSystem_fkey"
    FOREIGN KEY ("onSystem") REFERENCES public."system_tree"("onSystem") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "system_plan_application_businessPlanId_fkey"
    FOREIGN KEY ("businessPlanId") REFERENCES public."business_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "system_plan_application_valid_period" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE INDEX "system_plan_application_onSystem_startsAt_endsAt_idx"
  ON public."system_plan_application"("onSystem", "startsAt", "endsAt");
CREATE INDEX "system_plan_application_businessPlanId_idx"
  ON public."system_plan_application"("businessPlanId");

CREATE OR REPLACE FUNCTION public.prevent_system_plan_application_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public."system_plan_application" existing
    WHERE existing."onSystem" = NEW."onSystem"
      AND existing."id" <> COALESCE(NEW."id", 0)
      AND existing."status" IN ('ACTIVE', 'SCHEDULED')
      AND NEW."status" IN ('ACTIVE', 'SCHEDULED')
      AND existing."startsAt" < COALESCE(NEW."endsAt", 'infinity'::timestamp)
      AND NEW."startsAt" < COALESCE(existing."endsAt", 'infinity'::timestamp)
  ) THEN
    RAISE EXCEPTION 'Overlapping plan application for system %', NEW."onSystem";
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "system_plan_application_no_overlap"
BEFORE INSERT OR UPDATE ON public."system_plan_application"
FOR EACH ROW EXECUTE FUNCTION public.prevent_system_plan_application_overlap();

CREATE TABLE public."mbtca_workflow_run" (
  "id" SERIAL PRIMARY KEY,
  "applicationId" INTEGER NOT NULL,
  "cycleNumber" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "currentPhase" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mbtca_workflow_run_applicationId_fkey" FOREIGN KEY ("applicationId")
    REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mbtca_workflow_run_applicationId_cycleNumber_key" UNIQUE ("applicationId", "cycleNumber")
);
CREATE INDEX "mbtca_workflow_run_applicationId_scheduledAt_idx"
  ON public."mbtca_workflow_run"("applicationId", "scheduledAt");
CREATE UNIQUE INDEX "mbtca_workflow_one_running_per_application"
  ON public."mbtca_workflow_run"("applicationId") WHERE "status" = 'RUNNING';

CREATE TABLE public."mbtca_workflow_step" (
  "id" SERIAL PRIMARY KEY,
  "runId" INTEGER NOT NULL,
  "phaseCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "recordsExpected" INTEGER NOT NULL DEFAULT 0,
  "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
  "result" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mbtca_workflow_step_runId_fkey" FOREIGN KEY ("runId")
    REFERENCES public."mbtca_workflow_run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mbtca_workflow_step_runId_phaseCode_key" UNIQUE ("runId", "phaseCode")
);
CREATE INDEX "mbtca_workflow_step_runId_status_idx" ON public."mbtca_workflow_step"("runId", "status");

CREATE TABLE public."mbtca_commission_level_snapshot" (
  "id" SERIAL PRIMARY KEY,
  "applicationId" INTEGER NOT NULL,
  "cycleNumber" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "level" INTEGER NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mbtca_commission_level_snapshot_applicationId_fkey" FOREIGN KEY ("applicationId")
    REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mbtca_commission_snapshot_cycle_user_key"
    UNIQUE ("applicationId", "cycleNumber", "userId")
);
CREATE INDEX "mbtca_commission_snapshot_user_cycle_idx"
  ON public."mbtca_commission_level_snapshot"("applicationId", "userId", "cycleNumber");

ALTER TABLE public."system" ADD COLUMN "applicationId" INTEGER;
ALTER TABLE public."system_closure" ADD COLUMN "applicationId" INTEGER;
ALTER TABLE public."brk_transaction" ADD COLUMN "applicationId" INTEGER;
ALTER TABLE public."brk_revenue_pool" ADD COLUMN "applicationId" INTEGER;
ALTER TABLE public."brk_revenue_award" ADD COLUMN "applicationId" INTEGER;
ALTER TABLE public."brk_level_up_record" ADD COLUMN "applicationId" INTEGER;
ALTER TABLE public."brk_referral_bonus" ADD COLUMN "applicationId" INTEGER;
ALTER TABLE public."brk_timeline_record" ADD COLUMN "applicationId" INTEGER;

ALTER TABLE public."system" ADD CONSTRAINT "system_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."system_closure" ADD CONSTRAINT "system_closure_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."brk_transaction" ADD CONSTRAINT "brk_transaction_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."brk_revenue_pool" ADD CONSTRAINT "brk_revenue_pool_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."brk_revenue_award" ADD CONSTRAINT "brk_revenue_award_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."brk_level_up_record" ADD CONSTRAINT "brk_level_up_record_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."brk_referral_bonus" ADD CONSTRAINT "brk_referral_bonus_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE public."brk_timeline_record" ADD CONSTRAINT "brk_timeline_record_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES public."system_plan_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "system_applicationId_idx" ON public."system"("applicationId");
CREATE INDEX "system_closure_applicationId_idx" ON public."system_closure"("applicationId");
CREATE INDEX "brk_transaction_applicationId_createdAt_idx" ON public."brk_transaction"("applicationId", "createdAt");
CREATE INDEX "brk_revenue_pool_applicationId_roundNumber_idx" ON public."brk_revenue_pool"("applicationId", "roundNumber");
CREATE INDEX "brk_revenue_award_applicationId_idx" ON public."brk_revenue_award"("applicationId");
CREATE INDEX "brk_level_up_record_applicationId_userId_toLevel_idx" ON public."brk_level_up_record"("applicationId", "userId", "toLevel");
CREATE INDEX "brk_referral_bonus_applicationId_userId_idx" ON public."brk_referral_bonus"("applicationId", "userId");
CREATE INDEX "brk_timeline_record_applicationId_time_idx" ON public."brk_timeline_record"("applicationId", "time");

DROP INDEX IF EXISTS public."brk_timeline_one_official_per_member";
DROP INDEX IF EXISTS public."brk_level_up_record_userId_onSystem_toLevel_key";
DROP INDEX IF EXISTS public."brk_revenue_pool_systemId_roundNumber_key";

CREATE UNIQUE INDEX "brk_official_one_per_legacy_member"
  ON public."brk_timeline_record"("onSystem", "userId")
  WHERE "applicationId" IS NULL AND "eventStatus" = 'OFFICIAL';
CREATE UNIQUE INDEX "brk_official_one_per_application_member"
  ON public."brk_timeline_record"("applicationId", "userId")
  WHERE "applicationId" IS NOT NULL AND "eventStatus" = 'OFFICIAL';
CREATE UNIQUE INDEX "brk_level_one_per_application_member_level"
  ON public."brk_level_up_record"("applicationId", "userId", "toLevel")
  WHERE "applicationId" IS NOT NULL;
CREATE UNIQUE INDEX "brk_level_one_per_legacy_member_level"
  ON public."brk_level_up_record"("onSystem", "userId", "toLevel")
  WHERE "applicationId" IS NULL;
CREATE UNIQUE INDEX "brk_pool_one_round_per_application"
  ON public."brk_revenue_pool"("applicationId", "roundNumber")
  WHERE "applicationId" IS NOT NULL;
CREATE UNIQUE INDEX "brk_pool_one_round_per_legacy_system"
  ON public."brk_revenue_pool"("systemId", "roundNumber")
  WHERE "applicationId" IS NULL;

INSERT INTO public."business_plan"
  ("code", "name", "shortDescription", "logicVersion", "importantRules", "updatedAt")
VALUES
  ('A', 'Phương án A', 'Phương án trả thưởng A hiện hữu', 1, '{}'::jsonb, CURRENT_TIMESTAMP),
  ('B', 'Phương án B', 'Phương án trả thưởng B hiện hữu', 1, '{}'::jsonb, CURRENT_TIMESTAMP),
  ('MB_TCA', 'MB TCA', 'Phương án MB TCA áp dụng độc lập theo lần áp dụng', 1,
   '{"gracePeriodHours":21,"orchestratorMinute":5,"firstCycleDelayHours":1,"promotionIntervalHours":30,"teamCommissionIntervalHours":30,"revenueShareIntervalHours":7,"returnPercent":21}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO public."system_plan_application"
  ("applicationCode", "onSystem", "businessPlanId", "startsAt", "status", "configurationSnapshot", "updatedAt")
SELECT
  'SYS4_MB_TCA_20260702_130000', 4, bp."id", TIMESTAMP '2026-07-02 06:00:00', 'ACTIVE',
  '{"timezone":"Asia/Ho_Chi_Minh","orchestratorFirstRun":"2026-07-02T07:05:00.000Z","gracePeriodHours":21,"orchestratorIntervalHours":1,"promotionIntervalHours":30,"teamCommissionIntervalHours":30,"revenueShareIntervalHours":7,"returnPercent":21,"firstCommissionCycleIsBaseline":true}'::jsonb, CURRENT_TIMESTAMP
FROM public."business_plan" bp
WHERE bp."code" = 'MB_TCA'
ON CONFLICT ("applicationCode") DO NOTHING;

GRANT ALL PRIVILEGES ON TABLE public."business_plan" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."business_plan" TO service_role;
GRANT SELECT ON TABLE public."business_plan" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."system_plan_application" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."system_plan_application" TO service_role;
GRANT SELECT ON TABLE public."system_plan_application" TO anon;

ALTER TABLE public."business_plan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_plan_authenticated_all" ON public."business_plan"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "business_plan_anon_select" ON public."business_plan"
  FOR SELECT TO anon USING (true);
ALTER TABLE public."system_plan_application" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_plan_application_authenticated_all" ON public."system_plan_application"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "system_plan_application_anon_select" ON public."system_plan_application"
  FOR SELECT TO anon USING (true);

GRANT ALL PRIVILEGES ON TABLE public."mbtca_workflow_run" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."mbtca_workflow_run" TO service_role;
GRANT SELECT ON TABLE public."mbtca_workflow_run" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."mbtca_workflow_step" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."mbtca_workflow_step" TO service_role;
GRANT SELECT ON TABLE public."mbtca_workflow_step" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."mbtca_commission_level_snapshot" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."mbtca_commission_level_snapshot" TO service_role;
GRANT SELECT ON TABLE public."mbtca_commission_level_snapshot" TO anon;

ALTER TABLE public."mbtca_workflow_run" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mbtca_workflow_run_authenticated_all" ON public."mbtca_workflow_run"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mbtca_workflow_run_anon_select" ON public."mbtca_workflow_run"
  FOR SELECT TO anon USING (true);
ALTER TABLE public."mbtca_workflow_step" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mbtca_workflow_step_authenticated_all" ON public."mbtca_workflow_step"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mbtca_workflow_step_anon_select" ON public."mbtca_workflow_step"
  FOR SELECT TO anon USING (true);
ALTER TABLE public."mbtca_commission_level_snapshot" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mbtca_commission_snapshot_authenticated_all" ON public."mbtca_commission_level_snapshot"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mbtca_commission_snapshot_anon_select" ON public."mbtca_commission_level_snapshot"
  FOR SELECT TO anon USING (true);
