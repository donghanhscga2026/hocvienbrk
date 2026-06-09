import { Metadata } from 'next'
import { Suspense } from 'react'
import { auth } from '@/auth'

import MainHeader from '@/components/layout/MainHeader'
import MessageCard from '@/components/home/MessageCard'
import HomePageClient from '@/components/home/HomePageClient'
import FooterSection from '@/components/home/FooterSection'

import prisma from '@/lib/prisma'
import { getDefaultProfile, getCoursesForProfile, getSurveyForProfile, getPostsForProfile, incrementProfileView } from '@/app/actions/site-profile-actions'
import { getRandomMessage } from './actions/message-actions'
import { resetSurveyAction } from './actions/survey-actions'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

export const metadata: Metadata = {
  title: 'BRK - Ngân hàng Phước Báu',
  description: 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả',
  openGraph: {
    title: 'BRK - Ngân hàng Phước Báu',
    description: 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả',
    type: 'website',
    locale: 'vi_VN',
    url: 'https://giautoandien.io.vn',
    siteName: 'BRK - Ngân hàng Phước Báu',
    images: [
      {
        url: 'https://giautoandien.io.vn/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BRK - Ngân hàng Phước Báu',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BRK - Ngân hàng Phước Báu',
    description: 'Môi trường chia sẻ cùng nhau học tập nâng cao nhận thức và năng lực tạo lập giá trị từ gốc, tích tạo phước báu thuận theo nhân quả',
    images: ['https://giautoandien.io.vn/og-image.png'],
  },
}

export default async function Home() {
  const session = await auth()
  
  // Lấy BRK Profile mặc định - Đã có try-catch fallback bên trong action
  const profile = await getDefaultProfile()
  const safeProfile = profile || FALLBACK_PROFILE

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
            payment: { select: { id: true, status: true, proofImage: true } },
            course: { select: { _count: { select: { lessons: true } } } },
            _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } }
          }
        }), [])
      : [],
    safeQuery(prisma.roadmapPoint.findMany({ orderBy: { pointId: 'asc' } }), [])
  ])

  // Xử lý enrollments map an toàn
  const myCourseIds = new Set<number>()
  const enrollmentsMap: Record<number, any> = {}

  if (Array.isArray(enrollments)) {
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
  }

  // Phân loại courses an toàn
  const safeCourses = Array.isArray(courses) ? courses : []
  const myCourses = safeCourses.filter((c: any) => myCourseIds.has(c.id))
  const otherCourses = safeCourses.filter((c: any) => !myCourseIds.has(c.id))

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

  return (
    <main className="min-h-screen" style={{
      backgroundColor: safeProfile.backgroundColor || undefined
    }}>
      <MainHeader title={safeProfile.title || 'TRANG CHỦ'} profile={profile} />
      
      <MessageCard
        profile={safeProfile as any}
        session={session}
        userName={userRecord?.name || ''}
        userId={userRecord?.id !== undefined ? String(userRecord.id) : ''}
        isDefault={profile?.isDefault || false}
        messageImageUrl={message?.imageUrl || null}
        messageContent={(message as any)?.content || null}
      />
      
      <Suspense fallback={<div className="flex justify-center p-8">⏳ Đang tải...</div>}>
        <HomePageClient
          profile={safeProfile as any}
          courses={safeCourses}
          myCourses={myCourses}
          groupedOtherCourses={groupedOtherCourses}
          posts={posts || []}
          session={session}
          enrollmentsMap={enrollmentsMap}
          isCourseOneActive={enrollmentsMap[1]?.status === 'ACTIVE'}
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
      
      <FooterSection profile={safeProfile as any} />
    </main>
  )
}
