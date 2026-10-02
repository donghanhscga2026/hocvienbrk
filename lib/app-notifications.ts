import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { CrmError } from '@/lib/crm/service'

export async function notificationActor() {
  const session = await auth()
  const id = session?.user?.id == null ? NaN : Number(session.user.id)
  if (!Number.isInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } })
  if (!user) throw new CrmError('Vui lòng đăng nhập lại.', 401)
  return user
}

type Actor = Awaited<ReturnType<typeof notificationActor>>
// Kiểm tra quyền HIỆN TẠI, không chỉ người nhận đã lưu lúc phát sinh sự kiện.
// Đổi giáo viên, thu hồi vai trò hoặc hoàn tất công việc đều có hiệu lực ngay.
export function visibleNotifications(actor: Actor) {
  const crm = ['ADMIN', 'TEACHER', 'INSTRUCTOR'].includes(actor.role)
  const admin = actor.role === 'ADMIN'
  return Prisma.sql`
    SELECT n.*, c.id_khoa AS slug, r."lessonId" AS "requestLessonId", lc."lessonId" AS "commentLessonId"
    FROM public."AppNotification" n
    LEFT JOIN public."Course" c ON c.id = n."courseId"
    LEFT JOIN public."CrmRequest" r ON r.id = n."requestId"
    LEFT JOIN public."Enrollment" e ON e.id = n."enrollmentId"
    LEFT JOIN public."LessonComment" lc ON lc.id = n."commentId"
    LEFT JOIN public."CrmTask" t ON t.id = n."taskId"
    LEFT JOIN public."CrmContact" ct ON ct.id = t."contactId"
    WHERE n."recipientId" = ${actor.id} AND n."notBefore" <= ${new Date()}
      AND (
        (n.kind = 'REQUEST_INCOMING' AND ${crm} AND r.id IS NOT NULL
          AND (r."ownerId" = ${actor.id} OR (${admin} AND r."ownerId" IS NULL))
          AND (${admin} OR r."courseId" IS NULL OR c."teacherId" = ${actor.id}))
        OR (n.kind IN ('REQUEST_RECEIVED', 'REQUEST_UPDATED') AND r."userId" = ${actor.id})
        OR (n.kind = 'ENROLLMENT_TEACHER' AND ${crm} AND e.id IS NOT NULL AND c."teacherId" = ${actor.id})
        OR (n.kind = 'ENROLLMENT_RECEIVED' AND e."userId" = ${actor.id})
        OR (n.kind = 'ENROLLMENT_ACTIVE' AND e."userId" = ${actor.id} AND e.status = 'ACTIVE')
        OR (n.kind = 'COMMENT_REPLY' AND lc.id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public."LessonComment" p WHERE p.id = lc."parentId" AND p."userId" = ${actor.id}
        ) AND (${admin} OR c."teacherId" = ${actor.id} OR EXISTS (
          SELECT 1 FROM public."Enrollment" ce WHERE ce."courseId" = c.id AND ce."userId" = ${actor.id} AND ce.status = 'ACTIVE'
        ) OR EXISTS (SELECT 1 FROM public."CourseLibAccess" ca WHERE ca."courseId" = c.id AND ca.email = ${actor.email})))
        OR (n.kind = 'TASK_DUE' AND ${crm} AND t."completedAt" IS NULL AND ct.id IS NOT NULL
          AND (${admin} OR (ct."ownerId" = ${actor.id} AND (NOT ct."studentProfile" OR EXISTS (
            SELECT 1 FROM public."Enrollment" se JOIN public."Course" sc ON sc.id = se."courseId"
            WHERE se."userId" = ct."studentUserId" AND sc."teacherId" = ${actor.id}
          )))))
      )`
}

type NotificationRow = { id: string; kind: string; title: string; readAt: Date | null; createdAt: Date; notBefore: Date; requestId: string | null; taskId: number | null; commentId: number | null; slug: string | null; commentLessonId: string | null }
export function notificationHref(row: NotificationRow) {
  if (row.kind === 'REQUEST_INCOMING') return '/tools/crm?view=requests&request=' + encodeURIComponent(row.requestId!)
  if (row.kind.startsWith('REQUEST_')) return '/my-requests?request=' + encodeURIComponent(row.requestId!)
  if (row.kind === 'TASK_DUE') return '/tools/crm?view=tasks'
  if (row.slug && row.kind === 'COMMENT_REPLY') return '/courses/' + encodeURIComponent(row.slug) + '/learn?lesson=' + encodeURIComponent(row.commentLessonId!)
  return row.slug ? '/khoa-hoc/' + encodeURIComponent(row.slug) : '/tools'
}
export async function readNotifications(actor: Actor, page: number) {
  const visible = visibleNotifications(actor)
  const [rows, stats] = await prisma.$transaction([
    prisma.$queryRaw<NotificationRow[]>(Prisma.sql`WITH visible AS (${visible}) SELECT * FROM visible ORDER BY "notBefore" DESC, id DESC LIMIT 20 OFFSET ${(page - 1) * 20}`),
    prisma.$queryRaw<{ total: bigint; unread: bigint }[]>(Prisma.sql`WITH visible AS (${visible}) SELECT count(*) AS total, count(*) FILTER (WHERE "readAt" IS NULL) AS unread FROM visible`),
  ])
  return { notifications: rows.map(row => ({ id: row.id, title: row.title, kind: row.kind, readAt: row.readAt, createdAt: row.notBefore, href: notificationHref(row) })), total: Number(stats[0].total), unread: Number(stats[0].unread) }
}
export async function markNotifications(actor: Actor, ids: string[] | null) {
  const visible = visibleNotifications(actor)
  const condition = ids == null ? Prisma.sql`TRUE` : Prisma.sql`n.id IN (${Prisma.join(ids)})`
  const count = await prisma.$executeRaw(Prisma.sql`WITH visible AS (${visible}) UPDATE public."AppNotification" n SET "readAt" = ${new Date()} WHERE n.id IN (SELECT id FROM visible) AND n."readAt" IS NULL AND ${condition}`)
  return { updated: count }
}
