ALTER TABLE public."system"
  ADD COLUMN "officialTeamSize" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalMbdtVolume" DECIMAL(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalCashVolume" DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public."brk_timeline_record"
  ADD COLUMN "eventStatus" TEXT,
  ADD COLUMN "eventMbp" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "eventMbdtVolume" DECIMAL(20,2) NOT NULL DEFAULT 0,
  ADD COLUMN "eventCashVolume" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE INDEX "brk_timeline_record_onSystem_eventStatus_time_idx"
  ON public."brk_timeline_record"("onSystem", "eventStatus", "time");

CREATE UNIQUE INDEX "brk_timeline_one_official_per_member"
  ON public."brk_timeline_record"("userId", "onSystem")
  WHERE "eventStatus" = 'OFFICIAL';
