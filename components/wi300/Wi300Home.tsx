import { unstable_cache } from 'next/cache'
import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'
import prisma from '@/lib/prisma'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import Wi300HomeClient from './Wi300HomeClient'

const courseInclude = {
  courseCategory: true, teacherBankAccount: true,
  teacher: { select: { name: true } },
  _count: { select: { enrollments: { where: { status: 'ACTIVE' as const } }, lessons: true } },
} satisfies Prisma.CourseInclude

export type Wi300Course = Prisma.CourseGetPayload<{ include: typeof courseInclude }>
export type Wi300Enrollment = {
  id: number; courseId: number; status: string; startedAt: Date | null; completedCount: number;
  totalLessons: number; enrollmentId: number; hiddenFromGifts: boolean;
  payment?: { id: number; status: string; proofImage: string | null; qrCodeUrl: string | null; transferContent: string | null; amount: number; bankName: string | null; accountNumber: string | null };
}

// Cùng phạm vi khóa học của SITE_PROFILE_KEY; cache không phụ thuộc nhận diện giao diện.
const getCatalog = unstable_cache(async (where: Prisma.CourseWhereInput) => prisma.course.findMany({
  where, include: courseInclude, orderBy: [{ pin: 'asc' }, { updatedAt: 'desc' }],
}), ['wi300-course-catalog'], { tags: ['site-profile'], revalidate: 600 })

export default async function Wi300Home({ brand, session }: { brand: DeploymentBrand; session: Session | null }) {
  const userId = session?.user?.id != null ? Number(session.user.id) : null
  let courses: Wi300Course[] = []
  let enrollments: Wi300Enrollment[] = []
  let userPhone: string | null = null
  let catalogError = false
  let accountError = false

  try {
    const profile = await getCurrentSiteProfile()
    courses = await getCatalog(getCourseWhereForProfile(profile || { userId: 0 }))
  } catch (error) {
    // Không hiển thị khóa học giả hoặc khóa ngoài phạm vi khi database lỗi.
    console.error('[WI300] Không tải được danh mục khóa học', error)
    catalogError = true
  }
  if (userId != null && Number.isInteger(userId)) {
    try {
      const [user, rows] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
        prisma.enrollment.findMany({ where: { userId, courseId: { in: courses.map(course => course.id) } }, select: {
          id: true, courseId: true, status: true, startedAt: true, hiddenFromGifts: true,
          payment: { select: { id: true, status: true, proofImage: true, qrCodeUrl: true, transferContent: true, amount: true, bankName: true, accountNumber: true } },
          course: { select: { _count: { select: { lessons: true } } } },
          _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } },
        } }),
      ])
      userPhone = user?.phone || null
      enrollments = rows.map(row => ({
        id: row.id, courseId: row.courseId, status: row.status, startedAt: row.startedAt,
        completedCount: row._count.lessonProgress, totalLessons: row.course._count.lessons,
        enrollmentId: row.id, hiddenFromGifts: row.hiddenFromGifts, payment: row.payment || undefined,
      }))
    } catch (error) {
      console.error('[WI300] Không tải được khóa học của tài khoản', error)
      accountError = true
    }
  }
  return <Wi300HomeClient brand={brand} courses={courses} enrollments={enrollments} userId={userId} userPhone={userPhone} loggedIn={!!session?.user} catalogError={catalogError} accountError={accountError} />
}
