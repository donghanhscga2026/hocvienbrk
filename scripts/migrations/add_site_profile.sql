-- ============================================
-- MIGRATION: Thêm bảng SiteProfile và relations
-- Ngày: 2026-04-14
-- Mục đích: Hệ thống trang chủ động cho Teacher
-- ============================================

-- 1. Thêm cột teacherId vào bảng Course
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "teacherId" INTEGER;
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL;

-- 2. Tạo bảng SiteProfile
CREATE TABLE IF NOT EXISTS "SiteProfile" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER UNIQUE,
    "slug" VARCHAR(255) UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT false,
    "isDefault" BOOLEAN DEFAULT false,
    "heroImage" TEXT,
    "heroOverlay" DOUBLE PRECISION DEFAULT 0.3,
    "title" VARCHAR(255),
    "subtitle" VARCHAR(255),
    "messageContent" TEXT,
    "messageDetail" TEXT,
    "messageImage" TEXT,
    "surveyTitle" VARCHAR(255),
    "customRoadmap" JSONB,
    "roadmapTitle" VARCHAR(255),
    "courseIds" JSONB,
    "coursesTitle" VARCHAR(255),
    "allCoursesTitle" VARCHAR(255),
    "showAllCourses" BOOLEAN DEFAULT true,
    "showCommunity" BOOLEAN DEFAULT true,
    "communityTitle" VARCHAR(255),
    "footerText" TEXT,
    "footerLinks" JSONB,
    "metaTitle" VARCHAR(255),
    "metaDescription" TEXT,
    "metaImage" TEXT,
    "themeId" VARCHAR(255),
    "accentColor" VARCHAR(20),
    "backgroundColor" VARCHAR(20),
    "textColor" VARCHAR(20),
    "viewCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thêm relations cho SiteProfile
ALTER TABLE "SiteProfile" ADD CONSTRAINT "SiteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "SiteProfile" ADD CONSTRAINT "SiteProfile_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL;

-- 4. Thêm cột profileId vào Survey
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "profileId" INTEGER;
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SiteProfile"("id") ON DELETE CASCADE;

-- 5. Thêm cột profileId vào AffiliateCampaign
ALTER TABLE "AffiliateCampaign" ADD COLUMN IF NOT EXISTS "profileId" INTEGER UNIQUE;
ALTER TABLE "AffiliateCampaign" ADD CONSTRAINT "AffiliateCampaign_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SiteProfile"("id") ON DELETE CASCADE;

-- 6. Thêm cột profileId vào LandingPage
ALTER TABLE "LandingPage" ADD COLUMN IF NOT EXISTS "profileId" INTEGER;
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "SiteProfile"("id") ON DELETE CASCADE;

-- 7. Tạo index cho performance
CREATE INDEX IF NOT EXISTS "SiteProfile_slug_idx" ON "SiteProfile"("slug");
CREATE INDEX IF NOT EXISTS "SiteProfile_userId_idx" ON "SiteProfile"("userId");
CREATE INDEX IF NOT EXISTS "SiteProfile_isActive_idx" ON "SiteProfile"("isActive");
CREATE INDEX IF NOT EXISTS "Course_teacherId_idx" ON "Course"("teacherId");
CREATE INDEX IF NOT EXISTS "Survey_profileId_idx" ON "Survey"("profileId");
CREATE INDEX IF NOT EXISTS "LandingPage_profileId_idx" ON "LandingPage"("profileId");

-- 8. Tạo BRK Profile mặc định (slug = "brk")
INSERT INTO "SiteProfile" (
    "slug",
    "isActive",
    "isDefault",
    "title",
    "subtitle",
    "heroOverlay",
    "showCommunity",
    "showAllCourses",
    "communityTitle",
    "coursesTitle",
    "allCoursesTitle",
    "metaTitle",
    "metaDescription",
    "footerText"
) VALUES (
    'brk',
    true,
    true,
    'NGÂN HÀNG PHƯỚC BÁU',
    'Tri thức là sức mạnh',
    0.3,
    true,
    true,
    'Bảng tin cộng đồng',
    'Khóa học nổi bật',
    'Tất cả khóa học',
    'Học viện BRK - Ngân hàng Phước Báu',
    'Học viện đào tạo kỹ năng thực chiến hàng đầu Việt Nam',
    '© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.'
) ON CONFLICT ("slug") DO NOTHING;

-- ============================================
-- SAU KHI CHẠY XONG SQL, CHẠY LỆNH SAU:
-- 1. npx prisma generate
-- ============================================
