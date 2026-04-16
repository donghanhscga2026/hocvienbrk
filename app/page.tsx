import { Metadata } from 'next'
import { auth } from '@/auth'

import MainHeader from '@/components/layout/MainHeader'
import MessageCard from '@/components/home/MessageCard'
import HomePageClient from '@/components/home/HomePageClient'
import FooterSection from '@/components/home/FooterSection'

import prisma from '@/lib/prisma'
import { getDefaultProfile, getCoursesForProfile, getSurveyForProfile, getPostsForProfile, incrementProfileView } from '@/app/actions/site-profile-actions'
import { getRandomMessage } from './actions/message-actions'
import { resetSurveyAction } from './actions/survey-actions'

export const metadata: Metadata = {
  title: 'BRK - Ngân hàng Phước Báu',
  description: 'Học viện đào tạo kỹ năng thực chiến hàng đầu Việt Nam',
}

export default async function Home() {
  const session = await auth()
  
  // Lấy BRK Profile mặc định
  const profile = await getDefaultProfile()
  
  // Nếu không có profile, dùng fallback
  const safeProfile = profile || {
    title: 'TRANG CHỦ',
    subtitle: 'Tri thức là sức mạnh',
    showCommunity: true,
    showAllCourses: true,
    communityTitle: 'Bảng tin cộng đồng',
    coursesTitle: 'Khóa học nổi bật',
    allCoursesTitle: 'Tất cả khóa học',
    footerText: '© 2026 Ngân hàng Phước Báu. Mọi quyền được bảo lưu.',
    backgroundColor: null,
    heroImage: null,
    heroOverlay: 0.3,
    messageContent: null,
    messageDetail: null,
    messageImage: null,
    surveyTitle: null,
    customRoadmap: null,
    roadmapTitle: null,
    courseIds: null,
    accentColor: null,
    textColor: null,
    footerLinks: null,
    metaTitle: 'BRK',
    metaDescription: null,
    metaImage: null,
    themeId: null,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Tăng view count (async)
  if (profile?.slug) {
    incrementProfileView(profile.slug).catch(console.error)
  }

  // Lấy user ID - Dùng != null để xử lý userId = 0
  const userIdNum = session?.user?.id != null ? parseInt(session.user.id) : null

  // Lấy các data cần thiết (parallel)
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
      ? prisma.user.findUnique({
          where: { id: userIdNum },
          select: {
            name: true, id: true, image: true, phone: true, roadmap: true
          }
        })
      : null,
    userIdNum != null
      ? prisma.enrollment.findMany({
          where: { userId: userIdNum },
          select: {
            id: true,
            courseId: true,
            status: true,
            startedAt: true,
            payment: { select: { id: true, status: true, proofImage: true } },
            course: { select: { _count: { select: { lessons: true } } } },
            _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
          }
        })
      : [],
    prisma.roadmapPoint.findMany({ orderBy: { pointId: 'asc' } })
  ])

  // Xử lý enrollments map
  const myCourseIds = new Set<number>()
  const enrollmentsMap: Record<number, {
    status: string
    startedAt: Date | null
    completedCount: number
    totalLessons: number
    enrollmentId?: number
    payment?: {
      id: number
      status: string
      proofImage?: string | null
    }
  }> = {}

  enrollments.forEach((e: any) => {
    if (e.status === 'ACTIVE' || e.status === 'COMPLETED') {
      myCourseIds.add(e.courseId)
    }
    enrollmentsMap[e.courseId] = {
      status: e.status,
      startedAt: e.startedAt,
      completedCount: e._count?.lessonProgress || 0,
      totalLessons: e.course?._count?.lessons || 0,
      enrollmentId: e.id,
      payment: e.payment
    }
  })

  // Phân loại courses
  const myCourses = courses.filter((c: any) => myCourseIds.has(c.id))
  const otherCourses = courses.filter((c: any) => !myCourseIds.has(c.id))

  // Group courses theo category
  const groupedOtherCourses = otherCourses.reduce((acc: any[], course: any) => {
    const category = course.category || "Khác"
    const existingGroup = acc.find(g => g.category === category)
    if (existingGroup) {
      existingGroup.courses.push(course)
    } else {
      acc.push({ category, courses: [course] })
    }
    return acc
  }, [])

  // User data
  const userName = userRecord?.name ?? null
  const userId = userRecord?.id ?? null
  const userPhone = userRecord?.phone ?? null
  const userRoadmap = userRecord?.roadmap
  const customPath = userRoadmap?.customPath ?? null
  const userGoal = userRoadmap?.goal ?? null
  const targetPointId = userRoadmap?.targetPointId ?? 1

  return (
    <main className="min-h-screen" style={{
      backgroundColor: safeProfile.backgroundColor || undefined
    }}>
      {/* Header */}
      <MainHeader
        title={safeProfile.title || 'TRANG CHỦ'}
        profile={profile}
      />
      
      {/* Hero Section - Full width, Server-side render */}
      <MessageCard
        profile={safeProfile}
        session={session}
        userName={userName || ''}
        userId={userId !== null ? String(userId) : ''}
        isDefault={profile?.isDefault || false}
        messageImageUrl={message?.imageUrl || null}
      />
      
      {/* Home Page Client - Survey + Community + Courses */}
      <HomePageClient
        profile={safeProfile}
        courses={courses}
        myCourses={myCourses}
        groupedOtherCourses={groupedOtherCourses}
        posts={posts}
        session={session}
        enrollmentsMap={enrollmentsMap}
        isCourseOneActive={enrollmentsMap[1]?.status === 'ACTIVE'}
        userPhone={userPhone}
        userId={userId}
        customPath={customPath as number[] | null}
        userGoal={userGoal}
        targetPointId={targetPointId}
        roadmapPoints={roadmapPoints || []}
        survey={survey}
        resetSurveyAction={resetSurveyAction}
      />
      
      {/* Footer */}
      <FooterSection profile={safeProfile} />
    </main>
  )
}
