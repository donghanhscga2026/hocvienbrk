'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import CourseSection from '@/components/home/CourseSection'
import RealityMap from '@/components/home/RealityMap'
import Zero2HeroSurvey from '@/components/home/Zero2HeroSurvey'
import CommunityBoard from '@/components/home/CommunityBoard'
import PaymentModal from '@/components/course/PaymentModal'

interface HomePageClientProps {
  profile: any
  courses: any[]
  myCourses: any[]
  groupedOtherCourses: { category: string; courses: any[] }[]
  posts?: any[]
  session: any
  enrollmentsMap: Record<number, any>
  isCourseOneActive: boolean
  userPhone: string | null
  userId: number | null
  customPath: number[] | null
  userGoal: any
  targetPointId: number
  roadmapPoints: any[]
  survey: any | null
  resetSurveyAction: () => Promise<any>
}

function HomePageContent({
  profile,
  courses,
  myCourses,
  groupedOtherCourses,
  posts = [],
  session,
  enrollmentsMap,
  isCourseOneActive,
  userPhone,
  userId,
  customPath,
  userGoal,
  targetPointId,
  roadmapPoints,
  survey,
  resetSurveyAction
}: HomePageClientProps) {
  const searchParams = useSearchParams()
  const paymentCourseId = searchParams.get('paymentCourseId')
  const [courseToPay, setCourseToPay] = useState<any>(null)

  useEffect(() => {
    if (paymentCourseId) {
      const course = courses.find(c => c.id === parseInt(paymentCourseId))
      if (course) setCourseToPay(course)
    }
  }, [paymentCourseId, courses])

  const handleClosePayment = () => {
    setCourseToPay(null)
    window.history.replaceState({}, '', `/${profile.slug || ''}`)
  }

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
            {myCourses.length > 0 && (
              <CourseSection 
                title={coursesTitle}
                courses={myCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                darkMode={false}
                accentColor="bg-brk-accent"
                profileSlug={profile.slug}
              />
            )}

            {profile.showAllCourses !== false && groupedOtherCourses.length > 0 && (
              <CourseSection 
                title={allCoursesTitle}
                groupedCourses={groupedOtherCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                accentColor="bg-blue-600"
                profileSlug={profile.slug}
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
              isCourseOneActive={isCourseOneActive}
              userPhone={userPhone}
              userId={userId}
              accentColor="bg-blue-600"
              profileSlug={profile.slug}
            />
          )
        )}
      </section>

      {/* Payment Modal */}
      {courseToPay && (
        <PaymentModal
          course={courseToPay}
          enrollment={enrollmentsMap[courseToPay.id] || null}
          isCourseOneActive={isCourseOneActive}
          userPhone={userPhone}
          userId={userId}
          onClose={handleClosePayment}
        />
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
