CREATE TABLE "course_page_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source_url" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'website',
    "thumbnail_url" TEXT,
    "snapshot" JSONB NOT NULL,
    "analysis" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_page_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_page_templates_key_key" ON "course_page_templates"("key");
CREATE INDEX "course_page_templates_created_at_idx" ON "course_page_templates"("created_at");
