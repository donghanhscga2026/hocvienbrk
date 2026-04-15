-- ============================================
-- MIGRATION: Community & Survey Customization
-- Ngày: 2026-04-14
-- Mục đích: Cá nhân hóa toàn diện cho SiteProfile
-- ============================================

-- 1. Tạo bảng PostCategory
CREATE TABLE IF NOT EXISTS "PostCategory" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) UNIQUE,
    "description" TEXT,
    "order" INT DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thêm categoryId vào Post
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "categoryId" INT;
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PostCategory"("id") ON DELETE SET NULL;

-- 3. Thêm trường vào SiteProfile
ALTER TABLE "SiteProfile" ADD COLUMN IF NOT EXISTS "selectedSurveyId" INT;
ALTER TABLE "SiteProfile" ADD COLUMN IF NOT EXISTS "communityCategoryId" INT;
ALTER TABLE "SiteProfile" ADD COLUMN IF NOT EXISTS "communityLimit" INT DEFAULT 10;
ALTER TABLE "SiteProfile" ADD COLUMN IF NOT EXISTS "courseCategoryFilter" JSONB;

-- 4. Tạo indexes
CREATE INDEX IF NOT EXISTS "Post_categoryId_idx" ON "Post"("categoryId");
CREATE INDEX IF NOT EXISTS "SiteProfile_selectedSurveyId_idx" ON "SiteProfile"("selectedSurveyId");
CREATE INDEX IF NOT EXISTS "SiteProfile_communityCategoryId_idx" ON "SiteProfile"("communityCategoryId");

-- 5. Tạo PostCategory mặc định
INSERT INTO "PostCategory" ("name", "slug", "order") VALUES 
    ('Tin tức', 'tin-tuc', 1),
    ('Thông báo', 'thong-bao', 2),
    ('Cộng đồng', 'cong-dong', 3)
ON CONFLICT ("slug") DO NOTHING;

-- ============================================
-- SAU KHI CHẠY XONG SQL, CHẠY LỆNH SAU:
-- 1. npx prisma generate
-- 2. npm run seed-post-categories (nếu có)
-- ============================================
