import { PrismaClient } from '@prisma/client'
import { CrmActor } from './shared'

export async function learningSummaries(db: PrismaClient, actor: CrmActor, contacts: { id: number; studentProfile: boolean; studentUserId: number | null; linkedUserId: number | null; ownerId: number | null }[]) {
  const ids = [...new Set(contacts.map(c => c.studentProfile ? c.studentUserId : c.linkedUserId).filter((id): id is number => id != null))]
  if (!ids.length) return new Map()
  const enrollments = await db.enrollment.findMany({
    where: { userId: { in: ids }, ...(actor.role === 'ADMIN' ? {} : { course: { teacherId: actor.id } }) },
    select: { id: true, userId: true, status: true, course: { select: { id: true, id_khoa: true, name_lop: true, teacherId: true, _count: { select: { lessons: true } } } } },
  })
  const progress = enrollments.length ? await db.lessonProgress.findMany({
    where: { enrollmentId: { in: enrollments.map(e => e.id) }, status: { not: 'RESET' } },
    select: { enrollmentId: true, status: true, updatedAt: true, lesson: { select: { courseId: true, id: true, title: true } } }, orderBy: { updatedAt: 'desc' },
  }) : []
  return new Map(contacts.map(contact => [contact.id, enrollments.filter(e => e.userId === (contact.studentProfile ? contact.studentUserId : contact.linkedUserId) && (!contact.studentProfile || e.course.teacherId === contact.ownerId)).map(e => {
    const rows = progress.filter(p => p.enrollmentId === e.id && p.lesson.courseId === e.course.id)
    return { courseId: e.course.id, title: e.course.name_lop, slug: e.course.id_khoa, status: e.status,
      completed: rows.filter(p => p.status === 'COMPLETED').length, total: e.course._count.lessons,
      lastActivityAt: rows[0]?.updatedAt ?? null, lastLesson: rows[0]?.lesson.title ?? null,
    }
  })]))
}
