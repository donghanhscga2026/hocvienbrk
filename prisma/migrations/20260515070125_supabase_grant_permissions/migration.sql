-- Supabase GRANT Permissions Migration
-- Created: 2026-05-15
-- Purpose: Grant explicit permissions for all public schema tables
-- to comply with Supabase's new default behavior (effective Oct 30, 2026)
-- Ref: https://supabase.com/blog/changing-default-permissions-for-public-schema

BEGIN;

-- 1. Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Grant on all existing sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Set default privileges for future tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 5. Enable Row Level Security on all tables
ALTER TABLE public."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateClick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateCommission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateConversion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateLevel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliatePayout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateRef" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AffiliateWallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CourseLibAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CourseTestimonial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailBlacklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailCampaignLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailCampaignSender" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailSender" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LandingPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Lesson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LessonComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LessonProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PasswordReset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PostCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PostComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RegistrationPoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReservedId" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RoadmapPoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiteProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiteProfileMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SiteSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Survey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SyncLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SystemConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Theme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tool" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ToolHelp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserRoadmap" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."YouTubeToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_closure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_closure_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_tree ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tca_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tca_member_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tca_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_closure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_closure_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test ENABLE ROW LEVEL SECURITY;

-- 6. Create basic RLS policies
-- NOTE: These are permissive defaults. Tighten policies as needed per business requirements.

DROP POLICY IF EXISTS "Account_authenticated_all" ON public."Account";
CREATE POLICY "Account_authenticated_all" ON public."Account"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Account_anon_select" ON public."Account";
CREATE POLICY "Account_anon_select" ON public."Account"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateCampaign_authenticated_all" ON public."AffiliateCampaign";
CREATE POLICY "AffiliateCampaign_authenticated_all" ON public."AffiliateCampaign"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateCampaign_anon_select" ON public."AffiliateCampaign";
CREATE POLICY "AffiliateCampaign_anon_select" ON public."AffiliateCampaign"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateClick_authenticated_all" ON public."AffiliateClick";
CREATE POLICY "AffiliateClick_authenticated_all" ON public."AffiliateClick"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateClick_anon_select" ON public."AffiliateClick";
CREATE POLICY "AffiliateClick_anon_select" ON public."AffiliateClick"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateCommission_authenticated_all" ON public."AffiliateCommission";
CREATE POLICY "AffiliateCommission_authenticated_all" ON public."AffiliateCommission"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateCommission_anon_select" ON public."AffiliateCommission";
CREATE POLICY "AffiliateCommission_anon_select" ON public."AffiliateCommission"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateConversion_authenticated_all" ON public."AffiliateConversion";
CREATE POLICY "AffiliateConversion_authenticated_all" ON public."AffiliateConversion"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateConversion_anon_select" ON public."AffiliateConversion";
CREATE POLICY "AffiliateConversion_anon_select" ON public."AffiliateConversion"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateLevel_authenticated_all" ON public."AffiliateLevel";
CREATE POLICY "AffiliateLevel_authenticated_all" ON public."AffiliateLevel"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateLevel_anon_select" ON public."AffiliateLevel";
CREATE POLICY "AffiliateLevel_anon_select" ON public."AffiliateLevel"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateLink_authenticated_all" ON public."AffiliateLink";
CREATE POLICY "AffiliateLink_authenticated_all" ON public."AffiliateLink"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateLink_anon_select" ON public."AffiliateLink";
CREATE POLICY "AffiliateLink_anon_select" ON public."AffiliateLink"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliatePayout_authenticated_all" ON public."AffiliatePayout";
CREATE POLICY "AffiliatePayout_authenticated_all" ON public."AffiliatePayout"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliatePayout_anon_select" ON public."AffiliatePayout";
CREATE POLICY "AffiliatePayout_anon_select" ON public."AffiliatePayout"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateRef_authenticated_all" ON public."AffiliateRef";
CREATE POLICY "AffiliateRef_authenticated_all" ON public."AffiliateRef"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateRef_anon_select" ON public."AffiliateRef";
CREATE POLICY "AffiliateRef_anon_select" ON public."AffiliateRef"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateTransaction_authenticated_all" ON public."AffiliateTransaction";
CREATE POLICY "AffiliateTransaction_authenticated_all" ON public."AffiliateTransaction"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateTransaction_anon_select" ON public."AffiliateTransaction";
CREATE POLICY "AffiliateTransaction_anon_select" ON public."AffiliateTransaction"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "AffiliateWallet_authenticated_all" ON public."AffiliateWallet";
CREATE POLICY "AffiliateWallet_authenticated_all" ON public."AffiliateWallet"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "AffiliateWallet_anon_select" ON public."AffiliateWallet";
CREATE POLICY "AffiliateWallet_anon_select" ON public."AffiliateWallet"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Course_authenticated_all" ON public."Course";
CREATE POLICY "Course_authenticated_all" ON public."Course"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Course_anon_select" ON public."Course";
CREATE POLICY "Course_anon_select" ON public."Course"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "CourseLibAccess_authenticated_all" ON public."CourseLibAccess";
CREATE POLICY "CourseLibAccess_authenticated_all" ON public."CourseLibAccess"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "CourseLibAccess_anon_select" ON public."CourseLibAccess";
CREATE POLICY "CourseLibAccess_anon_select" ON public."CourseLibAccess"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "CourseTestimonial_authenticated_all" ON public."CourseTestimonial";
CREATE POLICY "CourseTestimonial_authenticated_all" ON public."CourseTestimonial"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "CourseTestimonial_anon_select" ON public."CourseTestimonial";
CREATE POLICY "CourseTestimonial_anon_select" ON public."CourseTestimonial"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "EmailBlacklist_authenticated_all" ON public."EmailBlacklist";
CREATE POLICY "EmailBlacklist_authenticated_all" ON public."EmailBlacklist"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "EmailBlacklist_anon_select" ON public."EmailBlacklist";
CREATE POLICY "EmailBlacklist_anon_select" ON public."EmailBlacklist"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "EmailCampaign_authenticated_all" ON public."EmailCampaign";
CREATE POLICY "EmailCampaign_authenticated_all" ON public."EmailCampaign"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "EmailCampaign_anon_select" ON public."EmailCampaign";
CREATE POLICY "EmailCampaign_anon_select" ON public."EmailCampaign"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "EmailCampaignLog_authenticated_all" ON public."EmailCampaignLog";
CREATE POLICY "EmailCampaignLog_authenticated_all" ON public."EmailCampaignLog"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "EmailCampaignLog_anon_select" ON public."EmailCampaignLog";
CREATE POLICY "EmailCampaignLog_anon_select" ON public."EmailCampaignLog"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "EmailCampaignSender_authenticated_all" ON public."EmailCampaignSender";
CREATE POLICY "EmailCampaignSender_authenticated_all" ON public."EmailCampaignSender"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "EmailCampaignSender_anon_select" ON public."EmailCampaignSender";
CREATE POLICY "EmailCampaignSender_anon_select" ON public."EmailCampaignSender"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "EmailSender_authenticated_all" ON public."EmailSender";
CREATE POLICY "EmailSender_authenticated_all" ON public."EmailSender"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "EmailSender_anon_select" ON public."EmailSender";
CREATE POLICY "EmailSender_anon_select" ON public."EmailSender"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Enrollment_authenticated_all" ON public."Enrollment";
CREATE POLICY "Enrollment_authenticated_all" ON public."Enrollment"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enrollment_anon_select" ON public."Enrollment";
CREATE POLICY "Enrollment_anon_select" ON public."Enrollment"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "LandingPage_authenticated_all" ON public."LandingPage";
CREATE POLICY "LandingPage_authenticated_all" ON public."LandingPage"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "LandingPage_anon_select" ON public."LandingPage";
CREATE POLICY "LandingPage_anon_select" ON public."LandingPage"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Lesson_authenticated_all" ON public."Lesson";
CREATE POLICY "Lesson_authenticated_all" ON public."Lesson"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Lesson_anon_select" ON public."Lesson";
CREATE POLICY "Lesson_anon_select" ON public."Lesson"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "LessonComment_authenticated_all" ON public."LessonComment";
CREATE POLICY "LessonComment_authenticated_all" ON public."LessonComment"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "LessonComment_anon_select" ON public."LessonComment";
CREATE POLICY "LessonComment_anon_select" ON public."LessonComment"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "LessonProgress_authenticated_all" ON public."LessonProgress";
CREATE POLICY "LessonProgress_authenticated_all" ON public."LessonProgress"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "LessonProgress_anon_select" ON public."LessonProgress";
CREATE POLICY "LessonProgress_anon_select" ON public."LessonProgress"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Message_authenticated_all" ON public."Message";
CREATE POLICY "Message_authenticated_all" ON public."Message"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Message_anon_select" ON public."Message";
CREATE POLICY "Message_anon_select" ON public."Message"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "PasswordReset_authenticated_all" ON public."PasswordReset";
CREATE POLICY "PasswordReset_authenticated_all" ON public."PasswordReset"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "PasswordReset_anon_select" ON public."PasswordReset";
CREATE POLICY "PasswordReset_anon_select" ON public."PasswordReset"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Payment_authenticated_all" ON public."Payment";
CREATE POLICY "Payment_authenticated_all" ON public."Payment"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Payment_anon_select" ON public."Payment";
CREATE POLICY "Payment_anon_select" ON public."Payment"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Post_authenticated_all" ON public."Post";
CREATE POLICY "Post_authenticated_all" ON public."Post"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Post_anon_select" ON public."Post";
CREATE POLICY "Post_anon_select" ON public."Post"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "PostCategory_authenticated_all" ON public."PostCategory";
CREATE POLICY "PostCategory_authenticated_all" ON public."PostCategory"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "PostCategory_anon_select" ON public."PostCategory";
CREATE POLICY "PostCategory_anon_select" ON public."PostCategory"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "PostComment_authenticated_all" ON public."PostComment";
CREATE POLICY "PostComment_authenticated_all" ON public."PostComment"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "PostComment_anon_select" ON public."PostComment";
CREATE POLICY "PostComment_anon_select" ON public."PostComment"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "RegistrationPoint_authenticated_all" ON public."RegistrationPoint";
CREATE POLICY "RegistrationPoint_authenticated_all" ON public."RegistrationPoint"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "RegistrationPoint_anon_select" ON public."RegistrationPoint";
CREATE POLICY "RegistrationPoint_anon_select" ON public."RegistrationPoint"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "ReservedId_authenticated_all" ON public."ReservedId";
CREATE POLICY "ReservedId_authenticated_all" ON public."ReservedId"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ReservedId_anon_select" ON public."ReservedId";
CREATE POLICY "ReservedId_anon_select" ON public."ReservedId"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "RoadmapPoint_authenticated_all" ON public."RoadmapPoint";
CREATE POLICY "RoadmapPoint_authenticated_all" ON public."RoadmapPoint"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "RoadmapPoint_anon_select" ON public."RoadmapPoint";
CREATE POLICY "RoadmapPoint_anon_select" ON public."RoadmapPoint"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Session_authenticated_all" ON public."Session";
CREATE POLICY "Session_authenticated_all" ON public."Session"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Session_anon_select" ON public."Session";
CREATE POLICY "Session_anon_select" ON public."Session"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "SiteProfile_authenticated_all" ON public."SiteProfile";
CREATE POLICY "SiteProfile_authenticated_all" ON public."SiteProfile"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "SiteProfile_anon_select" ON public."SiteProfile";
CREATE POLICY "SiteProfile_anon_select" ON public."SiteProfile"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "SiteProfileMember_authenticated_all" ON public."SiteProfileMember";
CREATE POLICY "SiteProfileMember_authenticated_all" ON public."SiteProfileMember"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "SiteProfileMember_anon_select" ON public."SiteProfileMember";
CREATE POLICY "SiteProfileMember_anon_select" ON public."SiteProfileMember"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "SiteSettings_authenticated_all" ON public."SiteSettings";
CREATE POLICY "SiteSettings_authenticated_all" ON public."SiteSettings"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "SiteSettings_anon_select" ON public."SiteSettings";
CREATE POLICY "SiteSettings_anon_select" ON public."SiteSettings"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Survey_authenticated_all" ON public."Survey";
CREATE POLICY "Survey_authenticated_all" ON public."Survey"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Survey_anon_select" ON public."Survey";
CREATE POLICY "Survey_anon_select" ON public."Survey"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "SyncLog_authenticated_all" ON public."SyncLog";
CREATE POLICY "SyncLog_authenticated_all" ON public."SyncLog"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "SyncLog_anon_select" ON public."SyncLog";
CREATE POLICY "SyncLog_anon_select" ON public."SyncLog"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "SystemConfig_authenticated_all" ON public."SystemConfig";
CREATE POLICY "SystemConfig_authenticated_all" ON public."SystemConfig"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "SystemConfig_anon_select" ON public."SystemConfig";
CREATE POLICY "SystemConfig_anon_select" ON public."SystemConfig"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Theme_authenticated_all" ON public."Theme";
CREATE POLICY "Theme_authenticated_all" ON public."Theme"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Theme_anon_select" ON public."Theme";
CREATE POLICY "Theme_anon_select" ON public."Theme"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "Tool_authenticated_all" ON public."Tool";
CREATE POLICY "Tool_authenticated_all" ON public."Tool"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tool_anon_select" ON public."Tool";
CREATE POLICY "Tool_anon_select" ON public."Tool"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "ToolHelp_authenticated_all" ON public."ToolHelp";
CREATE POLICY "ToolHelp_authenticated_all" ON public."ToolHelp"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ToolHelp_anon_select" ON public."ToolHelp";
CREATE POLICY "ToolHelp_anon_select" ON public."ToolHelp"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "User_authenticated_all" ON public."User";
CREATE POLICY "User_authenticated_all" ON public."User"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "User_anon_select" ON public."User";
CREATE POLICY "User_anon_select" ON public."User"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "UserRoadmap_authenticated_all" ON public."UserRoadmap";
CREATE POLICY "UserRoadmap_authenticated_all" ON public."UserRoadmap"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "UserRoadmap_anon_select" ON public."UserRoadmap";
CREATE POLICY "UserRoadmap_anon_select" ON public."UserRoadmap"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "VerificationToken_authenticated_all" ON public."VerificationToken";
CREATE POLICY "VerificationToken_authenticated_all" ON public."VerificationToken"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "VerificationToken_anon_select" ON public."VerificationToken";
CREATE POLICY "VerificationToken_anon_select" ON public."VerificationToken"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "YouTubeToken_authenticated_all" ON public."YouTubeToken";
CREATE POLICY "YouTubeToken_authenticated_all" ON public."YouTubeToken"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "YouTubeToken_anon_select" ON public."YouTubeToken";
CREATE POLICY "YouTubeToken_anon_select" ON public."YouTubeToken"
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "system_authenticated_all" ON public.system;
CREATE POLICY "system_authenticated_all" ON public.system
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "system_anon_select" ON public.system;
CREATE POLICY "system_anon_select" ON public.system
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "system_closure_authenticated_all" ON public.system_closure;
CREATE POLICY "system_closure_authenticated_all" ON public.system_closure
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "system_closure_anon_select" ON public.system_closure;
CREATE POLICY "system_closure_anon_select" ON public.system_closure
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "system_closure_test_authenticated_all" ON public.system_closure_test;
CREATE POLICY "system_closure_test_authenticated_all" ON public.system_closure_test
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "system_closure_test_anon_select" ON public.system_closure_test;
CREATE POLICY "system_closure_test_anon_select" ON public.system_closure_test
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "system_test_authenticated_all" ON public.system_test;
CREATE POLICY "system_test_authenticated_all" ON public.system_test
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "system_test_anon_select" ON public.system_test;
CREATE POLICY "system_test_anon_select" ON public.system_test
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "system_tree_authenticated_all" ON public.system_tree;
CREATE POLICY "system_tree_authenticated_all" ON public.system_tree
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "system_tree_anon_select" ON public.system_tree;
CREATE POLICY "system_tree_anon_select" ON public.system_tree
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "tca_member_authenticated_all" ON public.tca_member;
CREATE POLICY "tca_member_authenticated_all" ON public.tca_member
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tca_member_anon_select" ON public.tca_member;
CREATE POLICY "tca_member_anon_select" ON public.tca_member
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "tca_member_test_authenticated_all" ON public.tca_member_test;
CREATE POLICY "tca_member_test_authenticated_all" ON public.tca_member_test
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tca_member_test_anon_select" ON public.tca_member_test;
CREATE POLICY "tca_member_test_anon_select" ON public.tca_member_test
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "tca_sync_history_authenticated_all" ON public.tca_sync_history;
CREATE POLICY "tca_sync_history_authenticated_all" ON public.tca_sync_history
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tca_sync_history_anon_select" ON public.tca_sync_history;
CREATE POLICY "tca_sync_history_anon_select" ON public.tca_sync_history
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "user_closure_authenticated_all" ON public.user_closure;
CREATE POLICY "user_closure_authenticated_all" ON public.user_closure
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_closure_anon_select" ON public.user_closure;
CREATE POLICY "user_closure_anon_select" ON public.user_closure
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "user_closure_test_authenticated_all" ON public.user_closure_test;
CREATE POLICY "user_closure_test_authenticated_all" ON public.user_closure_test
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_closure_test_anon_select" ON public.user_closure_test;
CREATE POLICY "user_closure_test_anon_select" ON public.user_closure_test
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "user_test_authenticated_all" ON public.user_test;
CREATE POLICY "user_test_authenticated_all" ON public.user_test
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_test_anon_select" ON public.user_test;
CREATE POLICY "user_test_anon_select" ON public.user_test
  FOR SELECT TO anon
  USING (true);

COMMIT;
