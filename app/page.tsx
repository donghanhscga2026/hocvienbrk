import { Metadata } from 'next'
import { cache, Suspense } from 'react'
import { getSession } from '@/lib/get-session'

import MainHeader from '@/components/layout/MainHeader'
import MessageCard from '@/components/home/MessageCard'
import HomePageClient from '@/components/home/HomePageClient'
import FooterSection from '@/components/home/FooterSection'

import prisma from '@/lib/prisma'
import { getCoursesForProfile, getSurveyForProfile, getPostsForProfile, incrementProfileView } from '@/app/actions/site-profile-actions'
import { getCurrentSiteProfile, getSiteRuntimeConfig } from '@/lib/site-profile/runtime'
import { LandingPageClient } from '@/components/landing/LandingPageClient'
import { getRandomMessage } from './actions/message-actions'
import { resetSurveyAction } from './actions/survey-actions'
import { getRoadmapPoints } from './actions/roadmap-actions'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import Wi300Home from '@/components/wi300/Wi300Home'

const getHomepageLanding = cache(async (landingId?: number, landingSlug?: string) => {
  if (!landingId && !landingSlug) return null
  return prisma.landingPage.findFirst({
    where: {
      isActive: true,
      ...(landingId ? { id: landingId } : { slug: landingSlug }),
    },
    include: { course: true },
  })
})

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getCurrentDeploymentBrand()
  if (brand) return { title: { absolute: brand.seoTitle }, description: brand.description, openGraph: { title: brand.seoTitle, description: brand.description, images: [brand.ogImageUrl] } }
  const profile = await getCurrentSiteProfile()
  if (!profile) return { title: 'MFC' }

  const config = getSiteRuntimeConfig(profile)

  if (config.homepage.type === 'landing') {
    const landing = await getHomepageLanding(config.homepage.landingId, config.homepage.landingSlug)
    if (landing) {
      return {
        title: landing.title,
        description: landing.subtitle || landing.description || profile.metaDescription || undefined,
        openGraph: {
          title: landing.title,
          description: landing.subtitle || landing.description || profile.metaDescription || undefined,
          images: landing.heroImage ? [landing.heroImage] : undefined,
        },
      }
    }
  }

  const title = profile.metaTitle || profile.title || 'MFC - Dòng chảy Phước Báu'
  const description = profile.metaDescription || profile.subtitle || undefined
  const image = profile.metaImage || profile.heroImage || undefined
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  }
}

export default async function Home() {
  const session = await getSession()
  const brand = await getCurrentDeploymentBrand()
  if (brand) return <Wi300Home brand={brand} session={session} />
  
  // Resolve Site Profile theo hostname; localhost/host chưa khai báo fallback profile mặc định.
  const profile = await getCurrentSiteProfile()
  const safeProfile = profile || FALLBACK_PROFILE
  const runtimeConfig = getSiteRuntimeConfig(safeProfile as any)
  const displayProfile = {
    ...safeProfile,
    showCommunity: runtimeConfig.modules.community,
    showAllCourses: runtimeConfig.modules.courses,
  }


  if (profile && runtimeConfig.homepage.type === 'landing') {
    const landing = await getHomepageLanding(runtimeConfig.homepage.landingId, runtimeConfig.homepage.landingSlug)
    if (landing) return <LandingPageClient landing={landing as any} />
  }

  // Tăng view count (async)
  if (profile?.slug) {
    incrementProfileView(profile.slug).catch(() => {})
  }

  // Lấy user ID
  const userIdNum = session?.user?.id != null ? parseInt(session.user.id) : null

  // Helper function để gọi database an toàn trong Promise.all
  const safeQuery = async (queryPromise: Promise<any>, fallbackValue: any) => {
    try {
      return await queryPromise
    } catch (e) {
      console.error("[PAGE DB ERROR]:", e)
      return fallbackValue
    }
  }

  // Lấy các data cần thiết (parallel) với bọc lỗi từng cái
  const [
    courses,
    survey,
    posts,
    message,
    userRecord,
    enrollments,
    roadmapPoints
  ] = await Promise.all([
    getCoursesForProfile(safeProfile),
    getSurveyForProfile(safeProfile),
    getPostsForProfile(safeProfile),
    getRandomMessage(),
    userIdNum != null
      ? safeQuery(prisma.user.findUnique({
          where: { id: userIdNum },
          select: { name: true, id: true, image: true, phone: true, roadmap: true }
        }), null)
      : null,
    userIdNum != null
      ? safeQuery(prisma.enrollment.findMany({
          where: { userId: userIdNum },
          select: {
            id: true,
            courseId: true,
            status: true,
            startedAt: true,
            hiddenFromGifts: true,
            payment: { select: { id: true, status: true, proofImage: true, qrCodeUrl: true, transferContent: true, amount: true, bankName: true, accountNumber: true } },
            course: { select: { _count: { select: { lessons: true } } } },
            _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
          }
        }), [])
      : [],
    runtimeConfig.modules.roadmap ? safeQuery(getRoadmapPoints(), []) : []
  ])

  // Xử lý enrollments map an toàn
  const myCourseIds = new Set<number>()
  const enrollmentsMap: Record<number, any> = {}

  if (Array.isArray(enrollments)) {
    enrollments.forEach((e: any) => {
      if (e.status === 'ACTIVE' || e.status === 'COMPLETED') {
        if (!e.hiddenFromGifts) {
          myCourseIds.add(e.courseId)
        }
      }
      enrollmentsMap[e.courseId] = {
        status: e.status,
        startedAt: e.startedAt,
        completedCount: e._count?.lessonProgress || 0,
        totalLessons: e.course?._count?.lessons || 0,
        enrollmentId: e.id,
        payment: e.payment,
        hiddenFromGifts: e.hiddenFromGifts || false
      }
    })
  }

  // Phân loại courses an toàn
  const safeCourses = Array.isArray(courses) ? courses : []
  const myCourses = safeCourses.filter((c: any) => myCourseIds.has(c.id))

  // Tách active vs completed — ACTIVE hiện trước, COMPLETED ẩn (xem thêm mới hiện)
  const myActiveCourses = myCourses
    .filter((c: any) => enrollmentsMap[c.id]?.status === 'ACTIVE')
    .sort((a: any, b: any) => {
      const dateA = enrollmentsMap[a.id]?.startedAt ? new Date(enrollmentsMap[a.id].startedAt).getTime() : 0
      const dateB = enrollmentsMap[b.id]?.startedAt ? new Date(enrollmentsMap[b.id].startedAt).getTime() : 0
      return dateB - dateA // Gnearest first
    })
  const myCompletedCourses = myCourses
    .filter((c: any) => enrollmentsMap[c.id]?.status === 'COMPLETED')

  const otherCourses = safeCourses.filter((c: any) => !myCourseIds.has(c.id))

  const giftCourses = otherCourses
    .filter((c: any) => c.pin != null && c.pin > 0)
    .sort((a: any, b: any) => a.pin - b.pin)
    .slice(0, 3)

  const giftCourseIds = new Set<number>(giftCourses.map((c: any) => c.id))

  const latestCourses = otherCourses
    .filter((c: any) => !giftCourseIds.has(c.id))
    .sort((a: any, b: any) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 3)

  const latestCourseIds = new Set<number>(latestCourses.map((c: any) => c.id))

  const availableCourses = otherCourses.filter((c: any) => !giftCourseIds.has(c.id) && !latestCourseIds.has(c.id))

  const groupedOtherCourses = availableCourses.reduce((acc: any[], course: any) => {
    const category = course.courseCategory?.name || course.category || "Khác"
    const existingGroup = acc.find(g => g.category === category)
    if (existingGroup) {
      existingGroup.courses.push(course)
    } else {
      acc.push({ category, courses: [course] })
    }
    return acc
  }, []).sort((a: any, b: any) => {
    const orderA = a.courses[0]?.courseCategory?.order ?? 0
    const orderB = b.courses[0]?.courseCategory?.order ?? 0
    return orderA - orderB
  })

  // Sort courses trong mỗi category: pin ASC → createdAt DESC
  groupedOtherCourses.forEach((g: any) => {
    g.courses.sort((a: any, b: any) => {
      if (a.pin !== b.pin) return a.pin - b.pin
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  return (
    <main className="min-h-screen" style={{
      backgroundColor: safeProfile.backgroundColor || undefined
    }}>
      <MainHeader title={safeProfile.title || 'TRANG CHỦ'} profile={profile} />
      
      <MessageCard
        profile={displayProfile as any}
        session={session}
        userName={userRecord?.name || ''}
        userId={userRecord?.id !== undefined ? String(userRecord.id) : ''}
        isDefault={profile?.isDefault || false}
        messageImageUrl={message?.imageUrl || null}
        messageContent={(message as any)?.content || null}
      />
      
      <Suspense fallback={<div className="flex justify-center p-8">⏳ Đang tải...</div>}>
        <HomePageClient
          profile={displayProfile as any}
          courses={safeCourses}
          myActiveCourses={myActiveCourses}
          myCompletedCourses={myCompletedCourses}
          groupedOtherCourses={groupedOtherCourses}
          giftCourses={giftCourses}
          latestCourses={latestCourses}
          posts={posts || []}
          session={session}
          enrollmentsMap={enrollmentsMap}
          userPhone={userRecord?.phone || null}
          userId={userRecord?.id || null}
          customPath={userRecord?.roadmap?.customPath as number[] | null}
          userGoal={userRecord?.roadmap?.goal}
          targetPointId={userRecord?.roadmap?.targetPointId || 1}
          roadmapPoints={roadmapPoints || []}
          survey={survey}
          resetSurveyAction={resetSurveyAction}
        />
      </Suspense>
      
      <FooterSection profile={displayProfile as any} />
    </main>
  )
}
