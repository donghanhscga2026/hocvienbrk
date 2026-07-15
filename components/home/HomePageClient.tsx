'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import CourseSection from '@/components/home/CourseSection'
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
  showAllCourses = false
}: HomePageClientProps) {
  const searchParams = useSearchParams()
  const paymentCourseId = searchParams.get('paymentCourseId')
  const [courseToPay, setCourseToPay] = useState<any>(null)
  const [showActivatedToast, setShowActivatedToast] = useState(false)
  const { open: openMbw } = useMbwDashboard()

  useEffect(() => {
    if (session?.user) {
      setTimeout(() => openMbw(), 500)
    }
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
  const coursesTitle = profile.coursesTitle || 'Khóa học của tôi'
  const allCoursesTitle = profile.allCoursesTitle || 'Tất cả khóa học'
  const communityTitle = profile.communityTitle || 'Bảng tin'

  // Auto-hide: Survey section khi không có survey
  const showSurvey = survey && (survey.flow || (survey.questions && survey.questions.length > 0))
  
  // Auto-hide: Community section khi không có posts HOẶC showCommunity = false
  const showCommunity = profile.showCommunity !== false && posts && posts.length > 0

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
