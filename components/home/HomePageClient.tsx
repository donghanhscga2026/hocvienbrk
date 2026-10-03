'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import PersonalCourses from '@/components/home/PersonalCourses'
import CourseDiscoveryPreview from '@/components/home/CourseDiscoveryPreview'
import { catalogCategory } from '@/lib/course-catalog'
import { splitHomeCourses } from '@/lib/course-catalog'
import HomeOverview from '@/components/home/HomeOverview'
import CourseCatalog from '@/components/home/CourseCatalog'
import RealityMap from '@/components/home/RealityMap'
import Zero2HeroSurvey from '@/components/home/Zero2HeroSurvey'
import CommunityBoard from '@/components/home/CommunityBoard'
import { useMbwDashboard } from '@/components/mbw/MbwDashboardContext'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { Check } from 'lucide-react'

// [OPTIMIZE] Chỉ hiện khi học viên bấm mua khoá học — tải khi cần thay vì
// gói sẵn vào bundle của trang chủ cho mọi lượt truy cập.
const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })

interface HomePageClientProps {
  message?: ReactNode
  profile: any
  courses: any[]
  myActiveCourses: any[]
  myCompletedCourses: any[]
  groupedOtherCourses: { category: string; courses: any[] }[]
  posts?: any[]
  session: any
  enrollmentsMap: Record<number, any>
  userPhone: string | null
  userId: number | null
  customPath: number[] | null
  userGoal: any
  targetPointId: number
  roadmapPoints: any[]
  survey: any | null
  resetSurveyAction: () => Promise<any>
  showAllCourses?: boolean
  giftCourses?: any[]
  latestCourses?: any[]
}

function HomePageContent({
  profile,
  message,
  courses,
  myActiveCourses,
  myCompletedCourses,
  posts = [],
  session,
  enrollmentsMap,
  userPhone,
  userId,
  customPath,
  userGoal,
  targetPointId,
  roadmapPoints,
  survey,
  resetSurveyAction,
  showAllCourses = false,
  giftCourses = [],
  latestCourses = []
}: HomePageClientProps) {
  const searchParams = useSearchParams()
  const paymentCourseId = searchParams.get('paymentCourseId')
  const [courseToPay, setCourseToPay] = useState<any>(null)
  const [showActivatedToast, setShowActivatedToast] = useState(false)
  const { open: openMbw } = useMbwDashboard()

  useEffect(() => {
    if (paymentCourseId) {
      const course = courses.find(c => c.id === parseInt(paymentCourseId))
      if (course) setCourseToPay(course)
    }
  }, [paymentCourseId, courses])

  const handleClosePayment = () => {
    setCourseToPay(null)
    setShowActivatedToast(false)
    window.history.replaceState({}, '', `/page/${profile.slug || ''}`)
  }

  useEffect(() => {
    if (!courseToPay) return
    const enrollment = enrollmentsMap[courseToPay.id]
    if (enrollment?.status === 'ACTIVE') return

    let activated = false
    const interval = setInterval(async () => {
      if (activated) return
      try {
        const res = await checkEnrollmentStatusAction(courseToPay.id)
        if (res.status === 'ACTIVE' && !activated) {
          activated = true
          setCourseToPay(null)
          setShowActivatedToast(true)
          setTimeout(() => window.location.reload(), 1500)
        }
      } catch { }
    }, 10_000)
    const timeout = setTimeout(() => clearInterval(interval), 20 * 60 * 1000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [courseToPay, enrollmentsMap])

  const showSurvey = survey && (survey.flow || (survey.questions && survey.questions.length > 0))
  const showCommunity = profile.showCommunity !== false
  const sessionUserId = session?.user?.id != null && Number.isInteger(Number(session.user.id)) ? Number(session.user.id) : null
  const personal = splitHomeCourses(courses, enrollmentsMap, session?.user ? (userId ?? sessionUserId) : null, session?.user?.role)
  const featuredIds = giftCourses.length ? giftCourses.map(course => course.id) : courses.filter(course => course.pin > 0).sort((a, b) => a.pin - b.pin).map(course => course.id)
  const latestIds = latestCourses.length ? latestCourses.map(course => course.id) : [...courses].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 6).map(course => course.id)

  return (
    <>
      <HomeOverview
        title={profile.title || 'Học tập và phát triển cùng nhau'}
        subtitle={profile.subtitle}
        heroImage={profile.heroImage}
        userName={session?.user?.name}
        courses={courses}
        activeCourses={myActiveCourses.filter(course => personal.learning.some(item => item.id === course.id))}
        enrollments={enrollmentsMap}
        isLoggedIn={!!session?.user}
        onOpenMembership={openMbw}
        message={message}
        roadmapTitle={customPath?.length ? (profile.roadmapTitle || 'Xem lộ trình của tôi') : (profile.surveyTitle || 'Thiết kế lộ trình')}
        myCourses={session?.user ? <PersonalCourses learning={personal.learning} teaching={personal.teaching} enrollments={enrollmentsMap} userPhone={userPhone} userId={userId ?? sessionUserId} profileSlug={profile.slug} canDiscover={profile.showAllCourses !== false} /> : undefined}
        discoveryPreview={profile.showAllCourses !== false ? <CourseDiscoveryPreview courses={session?.user ? personal.discover : courses} enrollments={enrollmentsMap} /> : undefined}
        catalog={profile.showAllCourses !== false ? <div id="khoa-hoc" className="scroll-mt-24"><CourseCatalog key={searchParams.get('category') || ''} initialCategory={courses.some(course => catalogCategory(course) === searchParams.get('category')) ? searchParams.get('category') || '' : ''} title={profile.allCoursesTitle || 'Khám phá khóa học'} courses={courses} discoveryCourses={session?.user ? personal.discover : undefined} enrollmentsMap={enrollmentsMap} isLoggedIn={!!session?.user} userPhone={userPhone} userId={userId} profileSlug={profile.slug} featuredIds={featuredIds} latestIds={latestIds} /></div> : undefined}
        roadmap={showSurvey ? (!customPath?.length ? <Zero2HeroSurvey session={session} survey={survey} /> : <RealityMap customPath={customPath} enrollmentsMap={enrollmentsMap} allCourses={courses} userGoal={userGoal || 'Hoàn thiện kỹ năng'} targetPointId={targetPointId} roadmapPoints={roadmapPoints} onReset={resetSurveyAction} />) : undefined}
        communityPreview={showCommunity && posts.length > 0 ? <CommunityBoard posts={posts.slice(0, 3)} isAdmin={session?.user?.role === 'ADMIN'} title={profile.communityTitle || 'Cộng đồng và chia sẻ'} /> : undefined}
        community={showCommunity ? <CommunityBoard posts={posts} isAdmin={session?.user?.role === 'ADMIN'} title={profile.communityTitle || 'Cộng đồng và chia sẻ'} /> : undefined}
      />

      {/* Payment Modal */}
      {courseToPay && (
        <PaymentModal
          course={courseToPay}
          enrollment={enrollmentsMap[courseToPay.id] || null}

          userPhone={userPhone}
          userId={userId}
          onClose={handleClosePayment}
        />
      )}

      {showActivatedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <Check className="w-5 h-5" />
          <span className="font-bold">Kích hoạt thành công! Đang tải lại trang...</span>
        </div>
      )}
    </>
  )
}

export default function HomePageClient(props: HomePageClientProps) {
  return (
    <Suspense fallback={<div className="p-20 text-center">Đang tải...</div>}>
      <HomePageContent {...props} />
    </Suspense>
  )
}
