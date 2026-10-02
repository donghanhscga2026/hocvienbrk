import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { notificationActor } from '@/lib/app-notifications'
import { CrmError } from '@/lib/crm/service'

type Actor = Awaited<ReturnType<typeof notificationActor>>
type Send = { id: string; lessonId: string; courseId: number; senderId: number; title: string; recipientCount: number; createdAt: Date }
async function manageable(tx: Prisma.TransactionClient, actor: Actor, courseId: number, lessonId: string) {
  const rows = await tx.$queryRaw<{ title: string; courseName: string }[]>(Prisma.sql`
    SELECT l.title, c.name_lop AS "courseName" FROM public."Lesson" l
    JOIN public."Course" c ON c.id=l."courseId"
    WHERE l.id=${lessonId} AND c.id=${courseId}
      AND (${actor.role === 'ADMIN'} OR (${['TEACHER','INSTRUCTOR'].includes(actor.role)} AND c."teacherId"=${actor.id}))
    FOR SHARE OF l,c`)
  if (!rows[0]) throw new CrmError('Không tìm thấy bài học hoặc bạn không có quyền quản lý.', 403)
  return rows[0]
}
export async function previewLessonAnnouncement(actor: Actor, courseId: number, lessonId: string) {
  return prisma.$transaction(async tx => {
    const lesson = await manageable(tx, actor, courseId, lessonId)
    const counts = await tx.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT count(*) AS count FROM public."Enrollment" WHERE "courseId"=${courseId} AND status='ACTIVE'`)
    const last = await tx.$queryRaw<Send[]>(Prisma.sql`SELECT * FROM public."LessonAnnouncement" WHERE "lessonId"=${lessonId} AND "courseId"=${courseId} ORDER BY "createdAt" DESC,id DESC LIMIT 1`)
    return { recipientCount: Number(counts[0].count), defaultTitle: ('Bài học mới: ' + lesson.title + ' — ' + lesson.courseName).slice(0,500), lastSent: last[0] ? { createdAt: last[0].createdAt, recipientCount: last[0].recipientCount } : null }
  })
}
export async function sendLessonAnnouncement(actor: Actor, courseId: number, lessonId: string, id: string, title: string) {
  return prisma.$transaction(async tx => {
    // Tuần tự hóa cùng mã gửi; thử lại sau lỗi mạng trả kết quả cũ.
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`)
    await manageable(tx, actor, courseId, lessonId)
    const prior = await tx.$queryRaw<Send[]>(Prisma.sql`SELECT * FROM public."LessonAnnouncement" WHERE id=${id}`)
    if (prior[0]) {
      if (prior[0].senderId !== actor.id || prior[0].courseId !== courseId || prior[0].lessonId !== lessonId || prior[0].title !== title) throw new CrmError('Mã gửi đã được sử dụng. Hãy mở lại hộp thông báo.',409)
      return { recipientCount: prior[0].recipientCount, createdAt: prior[0].createdAt, repeated: true }
    }
    // Bản ghi gửi và chuông thông báo cùng giao dịch, lỗi sẽ hoàn tác toàn bộ.
    const sent = await tx.$queryRaw<{ recipientCount: number; createdAt: Date }[]>(Prisma.sql`
      WITH recipients AS MATERIALIZED (
        SELECT "userId" FROM public."Enrollment" WHERE "courseId"=${courseId} AND status='ACTIVE'
      ), batch AS (
        INSERT INTO public."LessonAnnouncement" (id,"lessonId","courseId","senderId",title,"recipientCount")
        SELECT ${id},${lessonId},${courseId},${actor.id},${title},count(*)::integer FROM recipients
        HAVING count(*) > 0 RETURNING *
      ), notifications AS (
        INSERT INTO public."AppNotification" ("eventKey","recipientId",kind,title,"courseId","lessonId")
        SELECT 'lesson-announcement:' || batch.id || ':' || recipients."userId",recipients."userId",'LESSON_ANNOUNCEMENT',batch.title,batch."courseId",batch."lessonId"
        FROM batch CROSS JOIN recipients RETURNING id
      )
      SELECT "recipientCount","createdAt" FROM batch`)
    if (!sent[0]) throw new CrmError('Chưa có học viên được kích hoạt để nhận thông báo.',409)
    return { ...sent[0], repeated: false }
  }, { timeout: 15000 })
}
