import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import MainHeader from '@/components/layout/MainHeader'
import PersonalSpace from '@/components/home/PersonalSpace'
import type { CatalogEnrollment } from '@/lib/course-catalog'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Không gian của tôi' }

// Chỉ lấy dữ liệu hiển thị; không đưa nội dung bài học hay thông tin học viên khác ra client.
const courseSelect = {
  id: true, id_khoa: true, name_lop: true, mo_ta_ngan: true, link_anh_bia: true,
  category: true, phi_coc: true, feeType: true, voucherConfig: true, allowMbvDeduction: true,
  createdAt: true, updatedAt: true,
  teacher: { select: { id: true, name: true } },
  courseCategory: { select: { name: true } },
  _count: { select: { lessons: true, enrollments: { where: { status: 'ACTIVE' as const } } } },
} as const

export default async function MySpacePage() {
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isInteger(id) || id < 0) redirect('/login?callbackUrl=%2Fmy-space')
  // Vai trò đọc từ database để việc thu hồi quyền có hiệu lực ngay.
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, phone: true, role: true } })
  if (!user) redirect('/login?callbackUrl=%2Fmy-space')
  const canTeach = ['ADMIN', 'TEACHER'].includes(user.role)
  const data = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: user.id, hiddenFromGifts: false, status: { in: ['ACTIVE', 'PENDING'] } },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 200,
        select: {
          id: true, courseId: true, status: true, startedAt: true, lastLessonId: true,
          course: { select: courseSelect },
          payment: { select: { id: true, status: true, proofImage: true } },
          _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } } } },
        },
      }),
      canTeach ? prisma.course.findMany({ where: { teacherId: user.id }, select: courseSelect, orderBy: { updatedAt: 'desc' }, take: 200 }) : [],
  ]).catch(error => {
    console.error('[MySpace] Cannot load personal courses', error instanceof Error ? error.name : 'Error')
    return null
  })
  if (!data) return <main className="min-h-screen bg-brk-background"><MainHeader title="Không gian của tôi" /><div className="mx-auto max-w-3xl p-6"><p role="alert">Chưa tải được dữ liệu cá nhân. Vui lòng tải lại trang.</p><Link href="/my-space" className="mt-4 inline-block underline">Thử lại</Link></div></main>
  const [enrollments, teaching] = data
  const enrollmentsMap: Record<number, CatalogEnrollment> = {}
  for (const row of enrollments) enrollmentsMap[row.courseId] = {
    enrollmentId: row.id, status: row.status === 'ACTIVE' && row.course._count.lessons > 0 && row._count.lessonProgress >= row.course._count.lessons ? 'COMPLETED' : row.status, startedAt: row.startedAt,
    completedCount: row._count.lessonProgress, totalLessons: row.course._count.lessons,
    payment: row.payment || undefined,
  }
  const current = enrollments.find(row => enrollmentsMap[row.courseId].status === 'ACTIVE')
  // lastLessonId chỉ là lối tiếp tục; trang học vẫn kiểm tra quyền và bài thuộc khóa.
  const continueHref = current ? '/courses/' + encodeURIComponent(current.course.id_khoa) + '/learn' + (current.lastLessonId ? '?lesson=' + encodeURIComponent(current.lastLessonId) : '') : null
  return <main className="min-h-screen bg-brk-background">
    <MainHeader title="Không gian của tôi" />
    <Suspense fallback={<p className="p-6">Đang tải không gian cá nhân…</p>}>
      <PersonalSpace user={user} learning={enrollments.map(row => ({ ...row.course, activeStudentCount: row.course._count.enrollments }))} teaching={teaching.map(course => ({ ...course, activeStudentCount: course._count.enrollments }))} enrollments={enrollmentsMap} continueHref={continueHref} limited={enrollments.length === 200 || teaching.length === 200} />
    </Suspense>
  </main>
}
