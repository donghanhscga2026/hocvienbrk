'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import CourseSection from '@/components/home/CourseSection'
import RealityMap from '@/components/home/RealityMap'
import Zero2HeroSurvey from '@/components/home/Zero2HeroSurvey'
import CommunityBoard from '@/components/home/CommunityBoard'
import PaymentModal from '@/components/course/PaymentModal'

interface Course {
  id: number
  id_khoa: string
  name_lop: string
  phi_coc: number
  mo_ta_ngan?: string
  link_anh_bia?: string
}

interface EnrollmentMap {
  [courseId: number]: {
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
  }
}

interface HomeClientProps {
  courses: Course[]
  myCourses: Course[]
  groupedOtherCourses: { category: string; courses: Course[] }[]
  session: any
  enrollmentsMap: EnrollmentMap
  isCourseOneActive: boolean
  userPhone: string | null
  userId: number | null
  customPath: number[] | null
  userGoal: any
  targetPointId: number
  roadmapPoints: any[]
  resetSurveyAction: () => Promise<any>
}

export default function HomeClient({
  courses,
  myCourses,
  groupedOtherCourses,
  session,
  enrollmentsMap,
  isCourseOneActive,
  userPhone,
  userId,
  customPath,
  userGoal,
  targetPointId,
  roadmapPoints,
  resetSurveyAction
}: HomeClientProps) {
  const searchParams = useSearchParams()
  const paymentCourseId = searchParams.get('paymentCourseId')
  const [courseToPay, setCourseToPay] = useState<Course | null>(null)

  useEffect(() => {
    if (paymentCourseId) {
      const course = courses.find(c => c.id === parseInt(paymentCourseId))
      if (course) {
        setCourseToPay(course)
      }
    }
  }, [paymentCourseId, courses])

  const handleClosePayment = () => {
    setCourseToPay(null)
    window.history.replaceState({}, '', '/')
  }

  return (
    <>
      <section className="container mx-auto px-4 py-8">
        {!customPath || customPath.length === 0 ? (
          <Zero2HeroSurvey session={session} />
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

      <section className="container mx-auto px-4 py-8">
        <CommunityBoard isAdmin={session?.user?.role === 'ADMIN'} />
      </section>

      <section id="khoa-hoc" className="container mx-auto px-4 pb-24">
        {session?.user ? (
          <>
            {myCourses.length > 0 && (
              <CourseSection 
                title="Khóa học của tôi"
                courses={myCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                darkMode={false}
                accentColor="bg-brk-accent"
              />
            )}

            {groupedOtherCourses.length > 0 && (
              <CourseSection 
                title="Tất cả khóa học"
                groupedCourses={groupedOtherCourses}
                session={session}
                enrollmentsMap={enrollmentsMap}
                isCourseOneActive={isCourseOneActive}
                userPhone={userPhone}
                userId={userId}
                accentColor="bg-blue-600"
              />
            )}
          </>
        ) : (
          <CourseSection 
            title="Tất cả khóa học"
            groupedCourses={groupedOtherCourses}
            session={session}
            enrollmentsMap={enrollmentsMap}
            isCourseOneActive={isCourseOneActive}
            userPhone={userPhone}
            userId={userId}
            accentColor="bg-blue-600"
          />
        )}
      </section>

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
