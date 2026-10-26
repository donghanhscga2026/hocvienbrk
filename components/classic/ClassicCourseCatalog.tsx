import { Suspense } from 'react'
import MainHeader from '@/components/layout/MainHeader'
import FooterSection from '@/components/home/FooterSection'
import CourseSection from '@/components/home/CourseSection'
import { getSession } from '@/lib/get-session'
import prisma from '@/lib/prisma'
import { getCoursesForProfile } from '@/app/actions/site-profile-actions'
import { getCurrentSiteProfile } from '@/lib/site-profile/runtime'
import { FALLBACK_PROFILE } from '@/lib/db-fallback'

/**
 * Bản classic (giautoandien) của trang danh mục khóa học /khoa-hoc.
 * Dùng chung nguồn dữ liệu với trang chủ classic: getCoursesForProfile
 * theo phạm vi SiteProfile hiện tại (không áp bộ lọc riêng của wi300),
 * nhóm theo danh mục và hiển thị bằng CourseSection/CourseCard gốc.
 */
export default async function ClassicCourseCatalog() {
  const session = await getSession()
  const profile = await getCurrentSiteProfile()
  const safeProfile = profile || FALLBACK_PROFILE
  const courses = await getCoursesForProfile(safeProfile as any)

  const userIdNum = session?.user?.id != null ? parseInt(session.user.id) : null
  let userPhone: string | null = null
  const enrollmentsMap: Record<number, any> = {}
  if (userIdNum != null) {
    try {
      const [userRecord, enrollments] = await Promise.all([
        prisma.user.findUnique({ where: { id: userIdNum }, select: { phone: true } }),
        prisma.enrollment.findMany({
          where: { userId: userIdNum },
          select: {
            id: true, courseId: true, status: true, startedAt: true, hiddenFromGifts: true,
            payment: { select: { id: true, status: true, proofImage: true } },
            course: { select: { _count: { select: { lessons: true } } } },
            _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } },
          },
        }),
      ])
      userPhone = userRecord?.phone || null
      enrollments.forEach((e: any) => {
        enrollmentsMap[e.courseId] = {
          status: e.status,
          startedAt: e.startedAt,
          completedCount: e._count?.lessonProgress || 0,
          totalLessons: e.course?._count?.lessons || 0,
          enrollmentId: e.id,
          payment: e.payment,
          hiddenFromGifts: e.hiddenFromGifts || false,
        }
      })
    } catch (error) {
      console.error('[Classic catalog] Không tải được dữ liệu tài khoản:', error)
    }
  }

  const safeCourses = Array.isArray(courses) ? courses : []
  // Nhóm theo danh mục giống hệt cách trang chủ classic gom khóa học.
  const groupedOtherCourses = safeCourses.reduce((acc: any[], course: any) => {
    const category = course.courseCategory?.name || course.category || 'Khác'
    const existingGroup = acc.find(g => g.category === category)
    if (existingGroup) existingGroup.courses.push(course)
    else acc.push({ category, courses: [course] })
    return acc
  }, []).sort((a: any, b: any) => {
    const orderA = a.courses[0]?.courseCategory?.order ?? 0
    const orderB = b.courses[0]?.courseCategory?.order ?? 0
    return orderA - orderB
  })
  groupedOtherCourses.forEach((g: any) => {
    g.courses.sort((a: any, b: any) => {
      if (a.pin !== b.pin) return a.pin - b.pin
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  return (
    <main className="min-h-screen" style={{ backgroundColor: (safeProfile as any).backgroundColor || undefined }}>
      <MainHeader title="KHÁM PHÁ KHÓA HỌC" profile={profile} />
      <section className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-brk-on-surface">Khám phá khóa học</h1>
        <p className="mt-2 text-brk-muted">Tất cả khóa học đang mở trong cộng đồng.</p>
      </section>
      <Suspense fallback={<div className="flex justify-center p-8">⏳ Đang tải...</div>}>
        <section className="container mx-auto px-4 pb-24">
          {groupedOtherCourses.length > 0 ? (
            <CourseSection
              title="Tất cả khóa học"
              groupedCourses={groupedOtherCourses}
              session={session}
              enrollmentsMap={enrollmentsMap}
              userPhone={userPhone}
              userId={userIdNum}
              accentColor="bg-blue-600"
              profileSlug={(safeProfile as any).slug}
              showAllCourses
            />
          ) : (
            <p className="rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa có khóa học nào được công khai.</p>
          )}
        </section>
      </Suspense>
      <FooterSection profile={safeProfile as any} />
    </main>
  )
}
