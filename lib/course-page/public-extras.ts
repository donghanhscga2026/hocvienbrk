import { unstable_cache } from 'next/cache'
import prisma from '@/lib/prisma'

export interface CoursePublicLesson {
  id: string
  title: string
  order: number
}

export interface CoursePublicTestimonial {
  id: string
  name: string
  content: string
  avatar: string | null
  role: string
  rating: number
}

export interface CoursePublicExtras {
  lessons: CoursePublicLesson[]
  totalHours: number
  activeStudentCount: number
  testimonials: CoursePublicTestimonial[]
}

/**
 * Dữ liệu công khai của trang bán khóa học: danh sách bài, thống kê
 * (tổng thời lượng + số học viên đang học) và testimonials.
 *
 * [OPTIMIZE] Trước đây trang chạy 5 truy vấn này ở MỌI lượt xem. Nay bọc
 * unstable_cache 300 giây theo bộ tham số (courseId + 3 cờ của
 * courseLoadingPlan): lượt xem trúng cache không chạm DB. Ba cờ vẫn được
 * tôn trọng tuyệt đối — mẫu ZIP (cả 3 cờ false) không chạy truy vấn nào,
 * khớp hợp đồng hiệu năng trong scripts/test-wi300-performance.cjs.
 *
 * KHÔNG đưa vào đây: enrollment/SĐT (riêng theo phiên), trang bán hàng đã
 * publish (công tắc admin phải hiệu lực tức thì) và dòng Course chứa
 * giá/tài khoản ngân hàng (phải luôn tươi).
 */
async function loadCoursePublicExtras(
  courseId: number,
  wantLessons: boolean,
  wantStatistics: boolean,
  wantTestimonials: boolean,
): Promise<CoursePublicExtras> {
  const [lessons, durationRows, activeStudentCount, reflectionsLP, lessonComments] = await Promise.all([
    wantLessons ? prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true }
    }) : Promise.resolve([] as CoursePublicLesson[]),
    // Tổng thời lượng video từ lessonProgress.maxTime
    wantStatistics ? prisma.lessonProgress.groupBy({
      by: ['lessonId'],
      where: { lesson: { courseId }, maxTime: { gt: 0 } },
      _max: { maxTime: true }
    }) : Promise.resolve([] as { _max: { maxTime: number | null } }[]),
    // Số thành viên đang học
    wantStatistics ? prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }) : Promise.resolve(0),
    // Testimonials từ dữ liệu thật (LessonProgress.assignment.reflection)
    wantTestimonials ? prisma.lessonProgress.findMany({
      where: { lesson: { courseId }, status: 'COMPLETED' },
      include: {
        enrollment: {
          include: { user: { select: { id: true, name: true, image: true } } }
        },
        lesson: { select: { title: true, order: true } }
      },
      orderBy: { submittedAt: 'desc' },
      take: 5
    }) : Promise.resolve([]),
    wantTestimonials ? prisma.lessonComment.findMany({
      where: { lesson: { courseId } },
      include: {
        user: { select: { id: true, name: true, image: true } },
        lesson: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    }) : Promise.resolve([]),
  ])

  const totalSeconds = durationRows.reduce((sum, r) => sum + (r._max.maxTime || 0), 0)
  const totalHours = Math.max(1, Math.ceil(totalSeconds / 3600))

  const testimonials: CoursePublicTestimonial[] = [
    ...reflectionsLP
      .filter(lp => {
        if (!lp.assignment) return false
        const a = lp.assignment as Record<string, unknown>
        return typeof a.reflection === 'string' && a.reflection.trim().length > 0
      })
      .map(lp => ({
        id: `ref-${lp.id}`,
        name: lp.enrollment.user.name || 'Thành viên',
        content: ((lp.assignment as Record<string, unknown>).reflection as string).trim(),
        avatar: lp.enrollment.user.image,
        role: `Bài ${lp.lesson.order}`,
        rating: Math.min(5, Math.max(1, Math.round(lp.totalScore / 2))) || 5,
      })),
    ...lessonComments
      .filter(c => c.content && c.content.trim().length > 0)
      .map(c => ({
        id: `cmt-${c.id}`,
        name: c.user.name || 'Thành viên',
        content: c.content.trim(),
        avatar: c.user.image,
        role: `Bình luận bài: ${c.lesson.title}`,
        rating: 5,
      }))
  ].slice(0, 5)

  return { lessons, totalHours, activeStudentCount, testimonials }
}

export const getCoursePublicExtras = unstable_cache(
  loadCoursePublicExtras,
  ['course-public-extras-v1'],
  { revalidate: 300, tags: ['course-public-extras'] },
)
