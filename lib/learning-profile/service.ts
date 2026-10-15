import type { Prisma, PrismaClient } from '@prisma/client'
import { isTeachingRole } from '@/lib/auth/roles'
import { computeLessonDeadlineUTC } from '@/lib/course/deadline'
import { LearningProfileError } from './shared'

export type LearningActor = { id: number; role: string }
const PAGE_SIZE = 12, LESSON_PAGE_SIZE = 15
const denied = () => new LearningProfileError('Không tìm thấy hồ sơ trong phạm vi được phép xem.', 404)
const validId = (id: number) => Number.isSafeInteger(id) && id >= 0

/** Apply this filter in SQL, not after a student's whole history has loaded. */
export function learningEnrollmentScope(actor: LearningActor, studentId: number): Prisma.EnrollmentWhereInput {
  if (!validId(actor.id) || !validId(studentId)) throw denied()
  if (actor.role === 'ADMIN' || actor.id === studentId) return { userId: studentId }
  if (!isTeachingRole(actor.role)) throw denied()
  return { userId: studentId, course: { teacherId: actor.id } }
}

export async function assertLearningStudent(db: PrismaClient, actor: LearningActor, studentId: number) {
  const scope = learningEnrollmentScope(actor, studentId)
  if (actor.role !== 'ADMIN' && actor.id !== studentId && !await db.enrollment.findFirst({ where: scope, select: { id: true } })) throw denied()
  return scope
}

const enrollmentSelect = {
  id: true, userId: true, courseId: true, status: true, startedAt: true, activatedAt: true, createdAt: true,
  course: { select: { id: true, id_khoa: true, name_lop: true, teacherId: true, type: true, _count: { select: { lessons: true } } } },
} as const

/** Only explicit learning fields leave this service. No CRM notes or email logs. */
export async function readLearningProfile(db: PrismaClient, actor: LearningActor, studentId: number, options: { course?: number; page?: number; lessonPage?: number } = {}) {
  const page = options.page ?? 1, lessonPage = options.lessonPage ?? 1
  if (![page, lessonPage].every(n => Number.isSafeInteger(n) && n > 0 && n <= 10000) || (options.course != null && (!validId(options.course) || options.course === 0))) throw new LearningProfileError('Tham số không hợp lệ.', 400)
  const scope = await assertLearningStudent(db, actor, studentId)
  const [student, totalCourses, rows] = await Promise.all([
    db.user.findUnique({ where: { id: studentId }, select: { id: true, name: true, email: true, phone: true, image: true, role: true } }),
    db.enrollment.count({ where: scope }),
    db.enrollment.findMany({ where: scope, select: enrollmentSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ])
  if (!student) throw denied()
  // A course ID from the URL must pass the same scope even if off this course-list page.
  const selected = options.course != null
    ? await db.enrollment.findFirst({ where: { AND: [scope, { courseId: options.course }] }, select: enrollmentSelect })
    : rows[0] ?? null
  if (options.course != null && !selected) throw denied()
  const enrollmentIds = [...new Set([...rows.map(row => row.id), ...(selected ? [selected.id] : [])])]
  const [states, submissions] = enrollmentIds.length ? await Promise.all([
    db.lessonProgress.groupBy({ by: ['enrollmentId', 'status'], where: { enrollmentId: { in: enrollmentIds }, status: { not: 'RESET' } }, _count: { _all: true }, _max: { updatedAt: true } }),
    db.lessonProgress.groupBy({ by: ['enrollmentId'], where: { enrollmentId: { in: enrollmentIds }, status: { not: 'RESET' }, submittedAt: { not: null } }, _count: { _all: true } }),
  ]) : [[], []]
  const summarize = (row: typeof rows[number]) => {
    const state = states.filter(item => item.enrollmentId === row.id)
    const lastActivityAt = state.map(item => item._max.updatedAt).filter((date): date is Date => date != null).sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    const completed = state.filter(item => item.status === 'COMPLETED').reduce((sum, item) => sum + item._count._all, 0)
    return { ...row, completed, submitted: submissions.find(item => item.enrollmentId === row.id)?._count._all ?? 0, total: row.course._count.lessons, lastActivityAt }
  }
  const base = { student, viewer: actor.role === 'ADMIN' ? 'admin' : actor.id === studentId ? 'self' : 'teacher', courses: rows.map(summarize), totalCourses, page, pageSize: PAGE_SIZE }
  if (!selected) return { ...base, selected: null }
  const [lessons, totalLessons] = await Promise.all([
    db.lesson.findMany({ where: { courseId: selected.courseId }, orderBy: [{ order: 'asc' }, { id: 'asc' }], select: { id: true, order: true, title: true, isDailyChallenge: true }, skip: (lessonPage - 1) * LESSON_PAGE_SIZE, take: LESSON_PAGE_SIZE }),
    db.lesson.count({ where: { courseId: selected.courseId } }),
  ])
  const lessonIds = lessons.map(lesson => lesson.id)
  const [progress, comments] = lessonIds.length ? await Promise.all([
    db.lessonProgress.findMany({ where: { enrollmentId: selected.id, lessonId: { in: lessonIds }, status: { not: 'RESET' } }, select: { lessonId: true, status: true, submittedAt: true, totalScore: true, assignment: true, scores: true, maxTime: true, duration: true, updatedAt: true } }),
    db.lessonComment.findMany({ where: { lessonId: { in: lessonIds }, OR: [{ userId: studentId }, ...(selected.course.teacherId == null ? [] : [{ userId: selected.course.teacherId, parent: { userId: studentId } }])] }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 101, select: { id: true, lessonId: true, content: true, createdAt: true, userId: true } }),
  ]) : [[], []]
  const startedAt = selected.startedAt
  return { ...base, selected: { ...summarize(selected), lessonPage, lessonPageSize: LESSON_PAGE_SIZE, totalLessons, commentsTruncated: comments.length > 100,
    lessons: lessons.map(lesson => {
      const row = progress.find(item => item.lessonId === lesson.id)
      const deadline = lesson.isDailyChallenge && startedAt ? computeLessonDeadlineUTC(startedAt, lesson.order) : null
      const submissionStatus = row?.submittedAt ? deadline == null ? 'Đã nộp' : row.submittedAt.getTime() <= deadline ? 'Đúng hạn' : 'Nộp muộn' : deadline != null && Date.now() <= deadline ? 'Chưa tới hạn' : 'Chưa nộp'
      return { ...lesson, status: row?.status || 'NOT_STARTED', submissionStatus, submittedAt: row?.submittedAt ?? null, totalScore: row?.submittedAt ? row.totalScore : null,
        assignment: row?.assignment ?? null, scores: row?.scores ?? null,
        watchPercent: row && row.duration > 0 ? Math.max(0, Math.min(100, Math.round(row.maxTime / row.duration * 100))) : null,
        comments: comments.slice(0, 100).filter(comment => comment.lessonId === lesson.id).map(comment => ({ ...comment, author: comment.userId === studentId ? 'Học viên' : 'Giảng viên' })),
      }
    }),
  } }
}

export type LearningProfile = Awaited<ReturnType<typeof readLearningProfile>>
