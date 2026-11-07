-- CreateTable
CREATE TABLE "LessonSegment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "videoIndex" INTEGER NOT NULL DEFAULT 0,
    "startSec" INTEGER NOT NULL,
    "endSec" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptCue" (
    "id" BIGSERIAL NOT NULL,
    "lessonId" TEXT NOT NULL,
    "videoIndex" INTEGER NOT NULL DEFAULT 0,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "textNorm" TEXT NOT NULL,
    "segmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptCue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SegmentProgress" (
    "id" SERIAL NOT NULL,
    "enrollmentId" INTEGER NOT NULL,
    "segmentId" TEXT NOT NULL,
    "watchedSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SegmentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonSegment_lessonId_order_idx" ON "LessonSegment"("lessonId", "order");

-- CreateIndex
CREATE INDEX "LessonSegment_lessonId_videoIndex_status_idx" ON "LessonSegment"("lessonId", "videoIndex", "status");

-- CreateIndex
CREATE INDEX "TranscriptCue_lessonId_videoIndex_startSec_idx" ON "TranscriptCue"("lessonId", "videoIndex", "startSec");

-- CreateIndex
CREATE INDEX "TranscriptCue_segmentId_idx" ON "TranscriptCue"("segmentId");

-- CreateIndex
CREATE INDEX "SegmentProgress_enrollmentId_idx" ON "SegmentProgress"("enrollmentId");

-- CreateIndex
CREATE INDEX "SegmentProgress_segmentId_idx" ON "SegmentProgress"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SegmentProgress_enrollmentId_segmentId_key" ON "SegmentProgress"("enrollmentId", "segmentId");

-- AddForeignKey
ALTER TABLE "LessonSegment" ADD CONSTRAINT "LessonSegment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptCue" ADD CONSTRAINT "TranscriptCue_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptCue" ADD CONSTRAINT "TranscriptCue_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "LessonSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentProgress" ADD CONSTRAINT "SegmentProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SegmentProgress" ADD CONSTRAINT "SegmentProgress_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "LessonSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Thư viện bài giảng thông minh: phục vụ tìm kiếm không dấu trên transcript (GĐ2 dùng)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "TranscriptCue_textNorm_trgm_idx" ON "TranscriptCue" USING gin ("textNorm" gin_trgm_ops);

-- Supabase GRANT compliance (theo AGENTS.md mục G)
GRANT ALL PRIVILEGES ON TABLE public."LessonSegment" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."LessonSegment" TO service_role;
GRANT SELECT ON TABLE public."LessonSegment" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."TranscriptCue" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."TranscriptCue" TO service_role;
GRANT SELECT ON TABLE public."TranscriptCue" TO anon;
GRANT ALL PRIVILEGES ON TABLE public."SegmentProgress" TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public."SegmentProgress" TO service_role;
GRANT SELECT ON TABLE public."SegmentProgress" TO anon;
GRANT USAGE, SELECT ON SEQUENCE public."TranscriptCue_id_seq" TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public."SegmentProgress_id_seq" TO authenticated, service_role;

ALTER TABLE public."LessonSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TranscriptCue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SegmentProgress" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LessonSegment_authenticated_all" ON public."LessonSegment" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "LessonSegment_anon_select" ON public."LessonSegment" FOR SELECT TO anon USING (true);
CREATE POLICY "TranscriptCue_authenticated_all" ON public."TranscriptCue" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "TranscriptCue_anon_select" ON public."TranscriptCue" FOR SELECT TO anon USING (true);
CREATE POLICY "SegmentProgress_authenticated_all" ON public."SegmentProgress" FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "SegmentProgress_anon_select" ON public."SegmentProgress" FOR SELECT TO anon USING (true);
