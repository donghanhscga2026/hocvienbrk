-- Trợ lý hướng dẫn: thêm phân vai trò + bảng bước hướng dẫn (steps)
-- Idempotent: an toàn khi chạy lại

-- 1. Cột roles cho AssistantGuide (mảng text; rỗng = mọi vai trò)
ALTER TABLE "AssistantGuide" ADD COLUMN IF NOT EXISTS "roles" TEXT[] NOT NULL DEFAULT '{}';

-- 2. Bảng AssistantGuideStep
CREATE TABLE IF NOT EXISTS "AssistantGuideStep" (
    "id" SERIAL NOT NULL,
    "guideId" INTEGER NOT NULL,
    "stepOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "targetSelector" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantGuideStep_pkey" PRIMARY KEY ("id")
);

-- 3. FK cascade về AssistantGuide (bỏ qua nếu đã tồn tại)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AssistantGuideStep_guideId_fkey'
    ) THEN
        ALTER TABLE "AssistantGuideStep"
        ADD CONSTRAINT "AssistantGuideStep_guideId_fkey"
        FOREIGN KEY ("guideId") REFERENCES "AssistantGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Index
CREATE INDEX IF NOT EXISTS "AssistantGuideStep_guideId_stepOrder_idx" ON "AssistantGuideStep"("guideId", "stepOrder");

-- 5. Supabase GRANT compliance (theo AGENTS.md)
GRANT ALL PRIVILEGES ON TABLE public."AssistantGuideStep" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."AssistantGuideStep" TO service_role;
GRANT SELECT ON TABLE public."AssistantGuideStep" TO anon;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AssistantGuideStep' AND policyname = 'AssistantGuideStep_authenticated_all'
    ) THEN
        CREATE POLICY "AssistantGuideStep_authenticated_all" ON public."AssistantGuideStep"
          FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'AssistantGuideStep' AND policyname = 'AssistantGuideStep_anon_select'
    ) THEN
        CREATE POLICY "AssistantGuideStep_anon_select" ON public."AssistantGuideStep"
          FOR SELECT TO anon USING (true);
    END IF;
END $$;
