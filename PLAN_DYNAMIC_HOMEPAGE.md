# KẾ HOẠCH: HỆ THỐNG TRANG CHỦ ĐỘNG (DYNAMIC HOMEPAGE SYSTEM)

> **Ngày tạo**: 2026-04-14  
> **Phiên bản**: 1.0  
> **Trạng thái**: Đã xác nhận

---

## MỤC LỤC

1. Tổng quan
2. Yêu cầu đã xác nhận
3. Kiến trúc hệ thống
4. Database Schema
5. API Actions
6. Routing & Middleware
7. Components
8. Admin Dashboard
9. Teacher Dashboard
10. Affiliate System
11. Migration Data
12. Thứ tự thực hiện
13. Backup Plan
14. Checklist

---

## 1. TỔNG QUAN

### Mục tiêu
Mỗi Teacher (role `TEACHER`) sẽ có **trang chủ riêng** với URL `domain.com/[slug]`:
- Giao diện giống BRK nhưng **100% tùy biến từ database**
- Nội dung động: hero, message, survey, roadmap, courses, footer
- **Full theme customization** cho mỗi Teacher
- **Affiliate system riêng** cho mỗi Teacher
- Không cần đăng nhập để xem trang

### Ví dụ
```
giautoandien.io.vn/nhung-dinh-duong
  → Trang chủ của Teacher "Nhung" chuyên về dinh dưỡng
  → Hero riêng: ảnh nền, thông điệp riêng
  → Survey riêng: bài khảo sát dinh dưỡng
  → Courses riêng: khóa học của Nhung
  → Theme riêng: màu sắc theo brand Nhung
  → Affiliate riêng: hoa hồng Nhung nhận được
```

---

## 2. YÊU CẦU ĐÃ XÁC NHẬN

| # | Yêu cầu | Xác nhận |
|---|---------|----------|
| 1 | Thêm `teacherId` vào bảng Course | ✅ |
| 2 | URL: `domain.com/[slug]` | ✅ |
| 3 | Admin + Teacher đều có quyền quản lý | ✅ |
| 4 | Cấu hình lưu trong bảng `SiteProfile` | ✅ |
| 5 | Slug tùy chỉnh (không tự động) | ✅ |
| 6 | Chỉ hiện khóa của Teacher đó | ✅ |
| 7 | Bài khảo sát riêng cho mỗi Profile | ✅ |
| 8 | **Full theme customization** | ✅ |
| 9 | Không cần đăng nhập để xem | ✅ |
| 10 | **Affiliate riêng cho mỗi Teacher** | ✅ |
| 11 | Backup trước khi thay đổi | ✅ |

---

## 3. KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────┐
│                      ROUTING LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  /                   → BRK Profile (slug="brk")             │
│  /[slug]             → SiteProfile theo slug                │
│  /admin/profiles     → Admin quản lý profiles              │
│  /tools/my-site      → Teacher chỉnh sửa profile của mình  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  SiteProfile                                                  │
│    ├── BRK gốc (slug="brk", userId=null, isDefault=true)   │
│    └── Teacher (slug=tùy chỉnh, userId=User.id)            │
│                                                              │
│  Fallback: Nếu Teacher chưa set config → dùng BRK default  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   COMPONENT LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  HomePageClient                                              │
│    ├── HeroSection (từ MessageCard refactor)                │
│    ├── Zero2HeroSurvey (hỗ trợ survey riêng)              │
│    ├── RealityMap (hỗ trợ roadmap riêng)                  │
│    ├── CourseSection (lọc theo teacherId)                   │
│    ├── CommunityBoard                                       │
│    └── Footer (tùy biến)                                   │
│                                                              │
│  ThemeContext ← Theme từ SiteProfile                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   AFFILIATE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Mỗi SiteProfile có affiliate riêng:                       │
│  ├── AffiliateCampaign riêng                                 │
│  ├── Commission rates riêng                                  │
│  └── Commission calculator dựa trên profile                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. DATABASE SCHEMA

### 4.1. Cập nhật bảng Course

Thêm vào `prisma/schema.prisma`:

```prisma
model Course {
  // ... existing fields ...
  
  // THÊM MỚI
  teacherId    Int?          // Giáo viên chịu trách nhiệm
  teacher      User?         @relation(fields: [teacherId], references: [id])
  
  @@index([teacherId])
}
```

### 4.2. Tạo bảng SiteProfile (MỚI)

```prisma
model SiteProfile {
  id              Int       @id @default(autoincrement())
  
  // ─────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────
  // 2 loại profile:
  // 1. BRK gốc: userId = null, slug = "brk", isDefault = true
  // 2. Teacher: userId = User.id, slug = tùy chỉnh
  userId          Int?      @unique  // null = BRK gốc
  user            User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  slug            String    @unique
  
  isActive        Boolean   @default(false)
  isDefault       Boolean   @default(false)  // true = BRK gốc
  
  // ─────────────────────────────────────────────────────────
  // HERO SECTION
  // ─────────────────────────────────────────────────────────
  heroImage       String?   // Ảnh nền hero
  heroOverlay     Float?    @default(0.3)  // Độ mờ overlay (0-1)
  
  title           String?   // "NGÂN HÀNG PHƯỚC BÁU" → tùy biến
  subtitle        String?   // "Tri thức là sức mạnh"
  
  messageContent  String?
  messageDetail   String?
  messageImage    String?   // Ảnh trong modal chi tiết
  
  // ─────────────────────────────────────────────────────────
  // SURVEY SECTION
  // ─────────────────────────────────────────────────────────
  surveyId        Int?      // Bài khảo sát riêng (null = dùng chung)
  survey          Survey?   @relation(fields: [surveyId], references: [id])
  surveyTitle     String?
  
  // ─────────────────────────────────────────────────────────
  // ROADMAP SECTION
  // ─────────────────────────────────────────────────────────
  customRoadmap   Json?     // { targetPointId, customPath, ... }
  roadmapTitle    String?
  
  // ─────────────────────────────────────────────────────────
  // COURSES SECTION
  // ─────────────────────────────────────────────────────────
  courseIds       Json?     // [1,2,3] - Danh sách cụ thể
  
  coursesTitle    String?
  allCoursesTitle String?
  showAllCourses  Boolean   @default(true)
  
  // ─────────────────────────────────────────────────────────
  // COMMUNITY SECTION
  // ─────────────────────────────────────────────────────────
  showCommunity   Boolean   @default(true)
  communityTitle  String?
  
  // ─────────────────────────────────────────────────────────
  // FOOTER SECTION
  // ─────────────────────────────────────────────────────────
  footerText      String?
  footerLinks     Json?     // [{label, url}, ...]
  
  // ─────────────────────────────────────────────────────────
  // SEO
  // ─────────────────────────────────────────────────────────
  metaTitle       String?
  metaDescription  String?
  metaImage       String?
  
  // ─────────────────────────────────────────────────────────
  // THEME (Full customization)
  // ───────���─���───────────────────────────────────────────────
  themeId         String?   // Theme riêng (null = dùng theme mặc định)
  theme           Theme?     @relation(fields: [themeId], references: [id])
  
  // Override colors trực tiếp (ưu tiên hơn themeId)
  accentColor     String?
  backgroundColor String?
  textColor       String?
  
  // ─────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────
  viewCount       Int       @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // ─────────────────────────────────────────────────────────
  // RELATIONS
  // ─────────────────────────────────────────────────────────
  affiliateCampaign AffiliateCampaign?
  
  @@index([slug])
  @@index([userId])
  @@index([isActive])
}
```

### 4.3. Cập nhật bảng AffiliateCampaign

```prisma
model AffiliateCampaign {
  // ... existing fields ...
  
  // THÊM MỚI
  profileId     Int?      @unique  // null = campaign global (BRK)
  profile       SiteProfile? @relation(fields: [profileId], references: [id], onDelete: Cascade)
}
```

### 4.4. Cập nhật bảng LandingPage

```prisma
model LandingPage {
  // ... existing fields ...
  
  // THÊM MỚI
  profileId     Int?     // Landing riêng cho profile nào (null = global)
  profile       SiteProfile? @relation(fields: [profileId], references: [id], onDelete: Cascade)
}
```

### 4.5. Migration Commands

```bash
# 1. Thêm teacherId vào Course
npx prisma migrate dev --name add_teacher_id_to_course

# 2. Tạo bảng SiteProfile và các relation
npx prisma migrate dev --name create_site_profile_table

# 3. Generate Prisma Client
npx prisma generate
```

---

## 5. API ACTIONS

### 5.1. Tạo `app/actions/site-profile-actions.ts`

```typescript
'use server'

import prisma from '@/lib/prisma'

// ─────────────────────────────────────────────────────────
// GET ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Lấy profile theo slug
 */
export async function getSiteProfile(slug: string) {
  return prisma.siteProfile.findUnique({
    where: { slug, isActive: true },
    include: {
      user: { select: { name: true, image: true } },
      theme: true,
      survey: true,
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy profile của user hiện tại
 */
export async function getMySiteProfile(userId: number) {
  return prisma.siteProfile.findUnique({
    where: { userId },
    include: {
      theme: true,
      survey: true,
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy BRK default profile
 */
export async function getDefaultProfile() {
  return prisma.siteProfile.findFirst({
    where: { isDefault: true, isActive: true },
    include: {
      user: { select: { name: true, image: true } },
      theme: true,
      survey: true,
      affiliateCampaign: {
        include: { levels: true }
      }
    }
  })
}

/**
 * Lấy khóa học theo profile
 */
export async function getCoursesForProfile(profile: any) {
  // Nếu có courseIds cụ thể
  if (profile.courseIds && Array.isArray(profile.courseIds)) {
    return prisma.course.findMany({
      where: { id: { in: profile.courseIds }, status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    })
  }

  // Nếu là Teacher → chỉ khóa của teacher đó
  if (profile.userId) {
    return prisma.course.findMany({
      where: { teacherId: profile.userId, status: true },
      orderBy: [{ pin: 'asc' }, { id: 'asc' }]
    })
  }

  // BRK gốc → tất cả khóa học
  return prisma.course.findMany({
    where: { status: true },
    orderBy: [{ pin: 'asc' }, { id: 'asc' }]
  })
}

/**
 * Lấy survey theo profile
 */
export async function getSurveyForProfile(profile: any) {
  if (profile.surveyId) {
    return prisma.survey.findUnique({
      where: { id: profile.surveyId }
    })
  }
  // Default: survey isActive đầu tiên
  return prisma.survey.findFirst({ where: { isActive: true } })
}

// ─────────────────────────────────────────────────────────
// SAVE ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Tạo profile mới cho Teacher
 */
export async function createSiteProfile(userId: number, slug: string) {
  const existing = await prisma.siteProfile.findUnique({
    where: { slug }
  })

  if (existing) {
    return { error: 'Slug đã được sử dụng' }
  }

  const profile = await prisma.siteProfile.create({
    data: {
      userId,
      slug,
      isActive: false,
    }
  })

  return { success: true, profile }
}

/**
 * Cập nhật profile (Admin)
 */
export async function updateSiteProfile(id: number, data: any) {
  if (data.slug) {
    const existing = await prisma.siteProfile.findFirst({
      where: { slug: data.slug, NOT: { id } }
    })
    if (existing) {
      return { error: 'Slug đã được sử dụng' }
    }
  }

  const profile = await prisma.siteProfile.update({
    where: { id },
    data
  })

  return { success: true, profile }
}

/**
 * Cập nhật profile của Teacher
 */
export async function updateMyProfile(userId: number, data: any) {
  const profile = await prisma.siteProfile.findUnique({
    where: { userId }
  })

  if (!profile) {
    return { error: 'Profile không tồn tại' }
  }

  const updated = await prisma.siteProfile.update({
    where: { id: profile.id },
    data
  })

  return { success: true, profile: updated }
}

/**
 * Xóa profile
 */
export async function deleteSiteProfile(id: number) {
  await prisma.siteProfile.delete({
    where: { id }
  })
  return { success: true }
}

/**
 * Duyệt profile (Admin)
 */
export async function approveSiteProfile(id: number) {
  return prisma.siteProfile.update({
    where: { id },
    data: { isActive: true }
  })
}

/**
 * Tăng view count
 */
export async function incrementProfileView(slug: string) {
  return prisma.siteProfile.update({
    where: { slug },
    data: { viewCount: { increment: 1 } }
  })
}
```

### 5.2. Cập nhật `app/actions/message-actions.ts`

```typescript
/**
 * Lấy hero message cho profile cụ thể
 */
export async function getHeroMessageForProfile(slug: string) {
  const profile = await prisma.siteProfile.findUnique({
    where: { slug, isActive: true },
    select: {
      messageContent: true,
      messageDetail: true,
      messageImage: true,
      heroImage: true
    }
  })

  if (profile?.messageContent) {
    return {
      content: profile.messageContent,
      detail: profile.messageDetail || '',
      imageUrl: profile.messageImage || profile.heroImage || null
    }
  }

  // Fallback: Lấy message ngẫu nhiên
  return getRandomMessage()
}
```

---

## 6. ROUTING & MIDDLEWARE

### 6.1. Cập nhật Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

const RESERVED_PATHS = [
  'admin', 'api', 'tools', 'landing', 'courses',
  'account-settings', 'auth', 'login', 'register',
  'account', 'affiliate', 'blog', 'news',
  '_next', 'static', 'favicon', 'robots', 'sitemap',
  'brk',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.slice(1).split('/')[0]

  if (RESERVED_PATHS.includes(pathname) || !pathname) {
    return NextResponse.next()
  }

  try {
    const profile = await prisma.siteProfile.findUnique({
      where: { slug: pathname, isActive: true },
      select: { slug: true }
    })

    if (profile) {
      return NextResponse.next()
    }
  } catch (error) {
    console.error('Middleware error:', error)
  }

  // Check course slug → redirect to landing
  const course = await prisma.course.findUnique({
    where: { id_khoa: pathname }
  })

  if (course) {
    return NextResponse.redirect(
      new URL(`/landing/${pathname}`, request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### 6.2. Tạo route `/app/[slug]/page.tsx`

File: `app/[slug]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { auth } from '@/auth'

import MainHeader from '@/components/layout/MainHeader'
import HomePageClient from '@/components/home/HomePageClient'
import FooterSection from '@/components/home/FooterSection'

import prisma from '@/lib/prisma'
import { getSiteProfile, getCoursesForProfile, getSurveyForProfile, incrementProfileView } from '@/app/actions/site-profile-actions'
import { getHeroMessageForProfile } from '@/app/actions/message-actions'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const profile = await getSiteProfile(slug)

  if (!profile) return { title: 'Không tìm thấy' }

  return {
    title: profile.metaTitle || profile.title || slug,
    description: profile.metaDescription || profile.subtitle,
    openGraph: {
      title: profile.metaTitle || profile.title,
      description: profile.metaDescription,
      images: profile.metaImage || profile.heroImage ? [profile.metaImage || profile.heroImage] : undefined,
    },
  }
}

export default async function TeacherHomePage({ params }: PageProps) {
  const { slug } = await params
  const session = await auth()

  const profile = await getSiteProfile(slug)
  if (!profile) notFound()

  // Async view count
  incrementProfileView(slug).catch(console.error)

  // Parallel data fetch
  const [courses, survey, message, userRecord, enrollments] = await Promise.all([
    getCoursesForProfile(profile),
    getSurveyForProfile(profile),
    getHeroMessageForProfile(slug),
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: parseInt(session.user.id) },
          select: { name: true, id: true, image: true, phone: true, roadmap: true }
        })
      : null,
    session?.user?.id
      ? prisma.enrollment.findMany({
          where: { userId: parseInt(session.user.id) },
          select: {
            id: true, courseId: true, status: true, startedAt: true,
            payment: { select: { id: true, status: true, proofImage: true } },
            course: { select: { _count: { select: { lessons: true } } } },
            _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
          }
        })
      : []
  ])

  // Process enrollments
  let myCourseIds = new Set<number>()
  let enrollmentsMap: Record<number, any> = {}

  enrollments.forEach((e: any) => {
    if (e.status === 'ACTIVE' || e.status === 'COMPLETED') {
      myCourseIds.add(e.courseId)
    }
    enrollmentsMap[e.courseId] = {
      status: e.status, startedAt: e.startedAt,
      completedCount: e._count?.lessonProgress || 0,
      totalLessons: e.course?._count?.lessons || 0,
      enrollmentId: e.id, payment: e.payment
    }
  })

  const myCourses = courses.filter((c: any) => myCourseIds.has(c.id))
  const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id))

  const groupedOtherCourses = otherCourses.reduce((acc: any[], course: any) => {
    const category = course.category || "Khác"
    const existingGroup = acc.find(g => g.category === category)
    if (existingGroup) existingGroup.courses.push(course)
    else acc.push({ category, courses: [course] })
    return acc
  }, [])

  const roadmapPoints = await prisma.roadmapPoint.findMany({ orderBy: { pointId: 'asc' } })
  const { resetSurveyAction } = await import('@/app/actions/survey-actions')

  return (
    <main className="min-h-screen" style={{ backgroundColor: profile.backgroundColor || undefined }}>
      <MainHeader title={profile.title || 'TRANG CHỦ'} profile={profile} />

      <HomePageClient
        profile={profile}
        courses={courses}
        myCourses={myCourses}
        groupedOtherCourses={groupedOtherCourses}
        session={session}
        enrollmentsMap={enrollmentsMap}
        isCourseOneActive={enrollmentsMap[1]?.status === 'ACTIVE'}
        userPhone={userRecord?.phone || null}
        userId={userRecord?.id || null}
        customPath={userRecord?.roadmap?.customPath || null}
        userGoal={userRecord?.roadmap?.goal || null}
        targetPointId={userRecord?.roadmap?.targetPointId || 1}
        roadmapPoints={roadmapPoints || []}
        message={message}
        survey={survey}
        resetSurveyAction={resetSurveyAction}
      />

      <FooterSection profile={profile} />
    </main>
  )
}
```

### 6.3. Cập nhật `/app/page.tsx`

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/brk')
}
```

---

## 7. COMPONENTS

### 7.1. Refactor MessageCard → HeroSection

File: `components/home/HeroSection.tsx`

Props:
```typescript
interface HeroSectionProps {
  profile: {
    heroImage?: string | null
    heroOverlay?: number
    title?: string | null
    subtitle?: string | null
    messageContent?: string | null
    messageDetail?: string | null
    messageImage?: string | null
    accentColor?: string | null
  }
  session: any
  userName: string
  userId: string
  isDefault?: boolean
}
```

### 7.2. Tạo HomePageClient

File: `components/home/HomePageClient.tsx`

Props:
```typescript
interface HomePageClientProps {
  profile: any
  courses: any[]
  myCourses: any[]
  groupedOtherCourses: { category: string; courses: any[] }[]
  session: any
  enrollmentsMap: Record<number, any>
  isCourseOneActive: boolean
  userPhone: string | null
  userId: number | null
  customPath: number[] | null
  userGoal: any
  targetPointId: number
  roadmapPoints: any[]
  message: { content: string; detail: string; imageUrl: string | null }
  survey: any | null
  resetSurveyAction: () => Promise<any>
}
```

### 7.3. Tạo FooterSection

File: `components/home/FooterSection.tsx`

```typescript
interface FooterSectionProps {
  profile: {
    footerText?: string | null
    footerLinks?: any | null
    title?: string | null
  }
}
```

### 7.4. Cập nhật Zero2HeroSurvey

Thêm props `survey?: any | null` để hỗ trợ survey riêng cho profile.

---

## 8. ADMIN DASHBOARD

### 8.1. Danh sách Profiles

File: `app/admin/site-profiles/page.tsx`

Tính năng:
- Danh sách tất cả SiteProfiles
- Tạo/Sửa/Xóa profile
- Filter theo Teacher
- Stats view

### 8.2. Form Edit Profile

File: `app/admin/site-profiles/[id]/edit/page.tsx`

Tabs: Basic | Hero | Content | Theme | Affiliate | SEO

### 8.3. Form Create Profile

File: `app/admin/site-profiles/new/page.tsx`

---

## 9. TEACHER DASHBOARD

### 9.1. Trang quản lý site

File: `app/tools/my-site/page.tsx`

Tính năng:
- Preview trang chủ
- Stats (lượt xem, trạng thái)
- Link nhanh đến các section edit

### 9.2. Form Edit của Teacher

File: `app/tools/my-site/edit/page.tsx`

Chỉ được sửa một số field nhất định.

---

## 10. AFFILIATE SYSTEM

### 10.1. Cập nhật Affiliate cho multi-profile

```typescript
/**
 * Lấy affiliate link cho profile cụ thể
 */
export async function getAffiliateLinkForProfile(userId: number, profileSlug: string) {
  const profile = await prisma.siteProfile.findUnique({
    where: { slug: profileSlug }
  })

  if (!profile) return null

  const campaign = profile.affiliateCampaignId
    ? await prisma.affiliateCampaign.findUnique({ where: { id: profile.affiliateCampaignId } })
    : await prisma.affiliateCampaign.findFirst({ where: { isDefault: true, isActive: true } })

  if (!campaign) return null

  let link = await prisma.affiliateLink.findFirst({
    where: { userId, campaignId: campaign.id }
  })

  if (!link) {
    link = await prisma.affiliateLink.create({
      data: { userId, campaignId: campaign.id, code: generateAffiliateCode() }
    })
  }

  return {
    ...link,
    campaign,
    affiliateUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/${profileSlug}?ref=${link.code}`
  }
}
```

---

## 11. MIGRATION DATA

### 11.1. Script tạo BRK Profile

File: `scripts/create-brk-profile.ts`

```typescript
import prisma from '../lib/prisma'

async function main() {
  console.log('🚀 Tạo BRK Default Profile...')

  const defaultMessage = await prisma.message.findFirst({ where: { isActive: true } })
  const defaultTheme = await prisma.theme.findFirst({ where: { isActive: true } })
  const defaultCampaign = await prisma.affiliateCampaign.findFirst({ where: { isDefault: true } })

  const brkProfile = await prisma.siteProfile.upsert({
    where: { slug: 'brk' },
    update: {},
    create: {
      slug: 'brk',
      userId: null,
      isActive: true,
      isDefault: true,
      title: 'NGÂN HÀNG PHƯỚC BÁU',
      subtitle: 'Tri thức là sức mạnh',
      messageContent: defaultMessage?.content || 'Học hôm nay, thành công ngày mai',
      messageDetail: defaultMessage?.detail || 'BRK mang đến những tri thức thực chiến...',
      messageImage: defaultMessage?.imageUrl,
      showCommunity: true,
      showAllCourses: true,
      themeId: defaultTheme?.id,
      affiliateCampaignId: defaultCampaign?.id,
      metaTitle: 'Học viện BRK - Ngân hàng Phước Báu',
      metaDescription: 'Học viện đào tạo kỹ năng thực chiến hàng đầu Việt Nam',
    }
  })

  console.log(`✅ BRK Profile created: ${brkProfile.id}`)
  console.log(`   URL: /brk`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

---

## 12. THỨ TỰ THỰC HIỆN

### Phase 1: Database (Ngày 1)
- [ ] Backup schema.prisma hiện tại
- [ ] Thêm teacherId vào Course
- [ ] Tạo bảng SiteProfile
- [ ] Thêm relations (Survey, Theme, Campaign)
- [ ] Chạy migration

### Phase 2: API Actions (Ngày 1-2)
- [ ] Tạo site-profile-actions.ts
- [ ] Cập nhật message-actions.ts
- [ ] Cập nhật affiliate-actions.ts

### Phase 3: Routing (Ngày 2)
- [ ] Cập nhật middleware
- [ ] Tạo /[slug]/page.tsx
- [ ] Cập nhật /page.tsx

### Phase 4: Components (Ngày 2-3)
- [ ] Refactor MessageCard → HeroSection
- [ ] Tạo HomePageClient
- [ ] Tạo FooterSection
- [ ] Cập nhật Zero2HeroSurvey
- [ ] Cập nhật MainHeader

### Phase 5: Admin (Ngày 3-4)
- [ ] Tạo admin/site-profiles/page.tsx
- [ ] Tạo admin/site-profiles/new/page.tsx
- [ ] Tạo admin/site-profiles/[id]/edit/page.tsx

### Phase 6: Teacher Dashboard (Ngày 4)
- [x] Tạo tools/my-site/page.tsx
- [x] Tạo tools/my-site/edit/page.tsx

### Phase 7: Migration Data (Ngày 4)
- [x] Chạy script tạo BRK Profile
- [ ] Verify dữ liệu

### Phase 8: Affiliate (Ngày 5)
- [ ] Cập nhật affiliate actions
- [ ] Cập nhật CourseCard share

### Phase 9: Testing & Deploy (Ngày 5-6)
- [ ] Test /brk
- [ ] Test /[slug]
- [ ] Test admin
- [ ] Test teacher dashboard
- [ ] Build & Deploy

---

## 13. BACKUP PLAN

### Files cần backup:

```
plan_temp/
├── schema_backup_{date}.prisma
├── middleware_backup_{date}.ts
├── site-profile-actions_backup_{date}.ts
├── message-actions_backup_{date}.ts
├── affiliate-actions_backup_{date}.ts
├── page_backup_{date}.tsx
└── components/
    ├── HeroSection_backup_{date}.tsx
    ├── HomePageClient_backup_{date}.tsx
    └── MainHeader_backup_{date}.tsx
```

---

## 14. CHECKLIST

### Pre-deployment
- [ ] Backup tất cả files
- [ ] Schema migrated thành công
- [ ] Prisma client generated
- [ ] BRK Profile created
- [ ] npm run build không lỗi

### Testing
- [ ] /brk load đúng
- [ ] /[teacher-slug] load đúng
- [ ] Hero section hiển thị đúng
- [ ] Survey hoạt động
- [ ] Courses hiển thị đúng (chỉ courses của teacher)
- [ ] Theme được apply đúng
- [ ] Affiliate links hoạt động
- [ ] Admin CRUD profiles hoạt động
- [ ] Teacher dashboard hoạt động

---

## APPENDIX

### A. Ví dụ SiteProfile data

```json
{
  "id": 1,
  "slug": "nhung-dinh-duong",
  "userId": 5,
  "isActive": true,
  "isDefault": false,
  "title": "Nhung Đinh Dưỡng",
  "subtitle": "Chuyên gia dinh dưỡng",
  "heroImage": "https://example.com/nhung-hero.jpg",
  "heroOverlay": 0.4,
  "messageContent": "Dinh dưỡng là nền tảng của sức khỏe",
  "messageDetail": "Tôi tin rằng mỗi người đều xứng đáng được sống khỏe mạnh...",
  "accentColor": "#10b981",
  "showCommunity": false,
  "showAllCourses": true,
  "courseIds": [5, 6, 7],
  "themeId": "green-theme"
}
```

---

**Document by**: opencode AI Agent
**Last updated**: 2026-04-14