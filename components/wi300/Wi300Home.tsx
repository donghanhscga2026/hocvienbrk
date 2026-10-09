import { unstable_cache } from 'next/cache'
import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'
import prisma from '@/lib/prisma'
import { getCurrentSiteProfile, getCourseWhereForProfile } from '@/lib/site-profile/runtime'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import Wi300HomeClient from './Wi300HomeClient'
import { canTeach } from '@/lib/wi300/personal-space'

// Chỉ gửi dữ liệu dùng bởi card, bộ lọc và đăng ký; bỏ nội dung dài/email quản trị.
const courseSelect = {
  id: true, id_khoa: true, name_lop: true, name_khoa: true, status: true,
  mo_ta_ngan: true, link_anh_bia: true, link_zalo: true, phi_coc: true,
  createdAt: true, updatedAt: true, type: true, pin: true, category: true,
  teacherId: true, categoryId: true, teacherBankAccountId: true, vipExempt: true,
  feeType: true, voucherConfig: true, allowMbvDeduction: true,
  requiresReferralActivation: true, referralActivationThreshold: true,
  courseCategory: { select: { name: true } }, teacherBankAccount: true,
  teacher: { select: { name: true, image: true } },
  _count: { select: { enrollments: { where: { status: 'ACTIVE' as const } }, lessons: true } },
} satisfies Prisma.CourseSelect

export type Wi300Course = Prisma.CourseGetPayload<{ select: typeof courseSelect }>
const teachingSelect = {
  id: true, id_khoa: true, name_lop: true, status: true,
  _count: { select: { lessons: true, enrollments: { where: { status: 'ACTIVE' as const } } } },
} satisfies Prisma.CourseSelect
export type Wi300TeachingCourse = Prisma.CourseGetPayload<{ select: typeof teachingSelect }>
export type Wi300Enrollment = {
  id: number; courseId: number; status: string; startedAt: Date | null; completedCount: number;
  totalLessons: number; enrollmentId: number; hiddenFromGifts: boolean; lastStudiedAt?: Date | null; lastLessonId?: string | null;
  payment?: { id: number; status: string; proofImage: string | null; qrCodeUrl: string | null; transferContent: string | null; amount: number; bankName: string | null; accountNumber: string | null };
}

// Cùng phạm vi khóa học của SITE_PROFILE_KEY; cache không phụ thuộc nhận diện giao diện.
const getCatalog = unstable_cache(async (where: Prisma.CourseWhereInput) => prisma.course.findMany({
  where, select: courseSelect, orderBy: [{ pin: 'asc' }, { updatedAt: 'desc' }],
}), ['wi300-course-catalog-v3'], { tags: ['site-profile'], revalidate: 600 })

export default async function Wi300Home({ brand, session, view = 'home' }: { brand: DeploymentBrand; session: Session | null; view?: 'home' | 'catalog' | 'discover' | 'space' }) {
  const userId = session?.user?.id != null ? Number(session.user.id) : null
  let courses: Wi300Course[] = []
  let enrollments: Wi300Enrollment[] = []
  let userPhone: string | null = null
  let catalogError = false
  let accountError = false

  // Dữ liệu giảng dạy không cache chung, không đưa khóa riêng vào danh mục công khai.
  // ADMIN cũng mặc định chỉ thấy khóa của mình, giống bộ lọc SELF hiện có.
  const teachingReady = (async (): Promise<{ teachingCourses: Wi300TeachingCourse[]; teachingError: boolean }> => {
    if (view === 'space' && userId != null && Number.isInteger(userId) && canTeach(session?.user?.role)) {
      try {
        return { teachingCourses: await prisma.course.findMany({ where: { teacherId: userId }, select: teachingSelect, orderBy: { updatedAt: 'desc' } }), teachingError: false }
      } catch (error) {
        console.error('[WI300] Không tải được khóa giảng dạy', error)
        return { teachingCourses: [], teachingError: true }
      }
    }
    return { teachingCourses: [], teachingError: false }
  })()

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
          id: true, courseId: true, status: true, startedAt: true, hiddenFromGifts: true, updatedAt: true, lastLessonId: true,
          lessonProgress: { where: { status: { not: 'RESET' } }, orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } },
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
        lastStudiedAt: row.lastLessonId && row.updatedAt > (row.lessonProgress[0]?.updatedAt || row.updatedAt)
          ? row.updatedAt : row.lessonProgress[0]?.updatedAt || row.updatedAt,
        lastLessonId: row.lastLessonId,
      }))
    } catch (error) {
      console.error('[WI300] Không tải được khóa học của tài khoản', error)
      accountError = true
    }
  }
  const { teachingCourses, teachingError } = await teachingReady
  return <Wi300HomeClient brand={brand} courses={courses} enrollments={enrollments} teachingCourses={teachingCourses} teachingError={teachingError} userId={userId} userPhone={userPhone} loggedIn={!!session?.user} catalogError={catalogError} accountError={accountError} view={view} />
}
