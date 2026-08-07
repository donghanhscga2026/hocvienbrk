'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import CourseSection from '@/components/home/CourseSection'
import CourseCard from '@/components/course/CourseCard'
import RealityMap from '@/components/home/RealityMap'
import Zero2HeroSurvey from '@/components/home/Zero2HeroSurvey'
import CommunityBoard from '@/components/home/CommunityBoard'
import PaymentModal from '@/components/course/PaymentModal'
import { useMbwDashboard } from '@/components/mbw/MbwDashboardContext'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { Check } from 'lucide-react'

interface HomePageClientProps {
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
  courses,
  myActiveCourses,
  myCompletedCourses,
  groupedOtherCourses,
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
    if (!session?.user) return

    if (typeof window === 'undefined') return

    const autoOpenKey = 'mbw-auto-opened'
    const hasAutoOpened = window.sessionStorage.getItem(autoOpenKey) === '1'
    if (hasAutoOpened) return

    window.sessionStorage.setItem(autoOpenKey, '1')
    const timer = window.setTimeout(() => openMbw(), 500)

    return () => window.clearTimeout(timer)
  }, [session?.user, openMbw])

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
      } catch {}
    }, 10_000)
    const timeout = setTimeout(() => clearInterval(interval), 20 * 60 * 1000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [courseToPay, enrollmentsMap])

  // Dynamic section titles từ profile
  const surveyTitle = profile.surveyTitle || 'Thiết kế lộ trình'
  const roadmapTitle = profile.roadmapTitle || 'Lộ trình Zero 2 Hero'
  const coursesTitle = 'Khóa học của tôi'
  const allCoursesTitle = profile.allCoursesTitle || 'Tất cả khóa học'
  const communityTitle = profile.communityTitle || 'Bảng tin'
  const topCoursesTitle = 'Khóa học mới cập nhật'

  // Auto-hide: Survey section khi không có survey
  const showSurvey = survey && (survey.flow || (survey.questions && survey.questions.length > 0))
  
  // Auto-hide: Community section khi không có posts HOẶC showCommunity = false
  const showCommunity = profile.showCommunity !== false && posts && posts.length > 0

  // Top courses: ưu tiên ghim (pin > 0), sau đó lấy 3 khóa mới cập nhật nhất (loại bỏ các khóa học đã kích hoạt)
  const pinnedCourses = courses
    .filter((course) => course.pin != null && course.pin > 0 && enrollmentsMap[course.id]?.status !== 'ACTIVE')
    .sort((a, b) => a.pin - b.pin)
  const latestUpdatedCourses = courses
    .filter((course) => (!course.pin || course.pin <= 0) && enrollmentsMap[course.id]?.status !== 'ACTIVE')
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return dateB - dateA
    })
  const topCourses = [
    ...pinnedCourses.slice(0, 3),
    ...latestUpdatedCourses
      .filter((course) => !pinnedCourses.some((p) => p.id === course.id))
      .slice(0, Math.max(0, 3 - pinnedCourses.length))
  ]

  const showGiftSection = giftCourses.length > 0
  const displayLatestCourses = latestCourses.length > 0 ? latestCourses : topCourses
  
  return (
    <>
      {/* Survey / Roadmap Section - Auto-hide khi không có survey */}
      {showSurvey && (
        <section className="container mx-auto px-4 py-8">
          {!customPath || customPath.length === 0 ? (
            <Zero2HeroSurvey 
              session={session} 
              survey={survey}
            />
          ) : (
            <RealityMap 
              customPath={customPath}
              enrollmentsMap={enrollmentsMap}
              allCourses={courses}
              userGoal={userGoal || 'Hoàn thiện kỹ năng'}
              targetPointId={targetPointId}
              roadmapPoints={roadmapPoints}
              onReset={resetSurveyAction}
            />
          )}
        </section>
      )}

      {/* Community Section - Auto-hide khi không có bài đăng */}
      {showCommunity && (
        <section className="container mx-auto px-4 py-8">
          <CommunityBoard 
            posts={posts}
            isAdmin={session?.user?.role === 'ADMIN'}
            title={communityTitle}
          />
        </section>
      )}

      {showGiftSection && (
        <section className="container mx-auto px-4 py-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-brk-on-surface">
              Quà tặng từ trái tim
            </h2>
            <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-brk-accent"></div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {giftCourses.map((course, index: number) => (
              <div key={course.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                <CourseCard
                  course={course}
                  isLoggedIn={!!session}
                  enrollment={enrollmentsMap[course.id] || null}
                  userPhone={userPhone}
                  userId={userId}
                  priority={index === 0}
                  darkMode={false}
                  profileSlug={profile.slug}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {displayLatestCourses.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-brk-on-surface">
              {topCoursesTitle}
            </h2>
            <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-brk-accent"></div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayLatestCourses.map((course, index: number) => (
              <div key={course.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                <CourseCard
                  course={course}
                  isLoggedIn={!!session}
                  enrollment={enrollmentsMap[course.id] || null}
                  userPhone={userPhone}
                  userId={userId}
                  priority={index === 0}
                  darkMode={false}
                  profileSlug={profile.slug}
                />
              </div>
            ))}
          </div>
        </section>
      )}
 
      {/* Courses Section */}
      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        {session?.user ? (
          <>
            {(myActiveCourses.length > 0 || myCompletedCourses.length > 0) && (
              <CourseSection 
                title={coursesTitle}
                courses={myActiveCourses}
                hiddenCourses={myCompletedCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                
                userPhone={userPhone}
                userId={userId}
                darkMode={false}
                accentColor="bg-brk-accent"
                profileSlug={profile.slug}
                showAllCourses={showAllCourses}
              />
            )}

            {profile.showAllCourses !== false && groupedOtherCourses.length > 0 && (
              <CourseSection 
                title={allCoursesTitle}
                groupedCourses={groupedOtherCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                
                userPhone={userPhone}
                userId={userId}
                accentColor="bg-blue-600"
                profileSlug={profile.slug}
                showAllCourses={showAllCourses}
              />
            )}
          </>
        ) : (
          profile.showAllCourses !== false && groupedOtherCourses.length > 0 && (
            <CourseSection 
              title={allCoursesTitle}
              groupedCourses={groupedOtherCourses}
              session={session}
              enrollmentsMap={enrollmentsMap}
              
              userPhone={userPhone}
              userId={userId}
              accentColor="bg-blue-600"
              profileSlug={profile.slug}
              showAllCourses={showAllCourses}
            />
          )
        )}
      </section>

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
