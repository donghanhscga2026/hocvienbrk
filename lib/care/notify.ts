import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

/**
 * Gửi 1 thông báo care cho học viên: tạo AppNotification (chống trùng bằng
 * eventKey duy nhất) rồi xếp hàng Web Push cho các thiết bị đã đăng ký của
 * người nhận. Hàm queueAnnouncementPush sẵn có chỉ phục vụ thông báo bài
 * học (khóa theo kind LESSON_ANNOUNCEMENT + eventKey của đợt phát), nên
 * care dùng hàm xếp hàng tương đương theo đúng notificationId — cùng bảng
 * WebPushDelivery, cùng khóa chống trùng (notificationId, subscriptionId).
 */
export async function queueCarePush(notificationId: string): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO public."WebPushDelivery" ("notificationId", "subscriptionId", "subscriptionVersion")
    SELECT n.id, s.id, s.version FROM public."AppNotification" n
    JOIN public."WebPushSubscription" s ON s."userId" = n."recipientId"
    WHERE n.id = ${notificationId}
    ON CONFLICT ("notificationId", "subscriptionId") DO NOTHING`)
}

export interface NotifyUserInput {
  userId: number
  eventKey: string
  kind: string
  title: string
  courseId?: number | null
  enrollmentId?: number | null
}

/** Trả created=false khi eventKey đã tồn tại (đã nhắc rồi) — không gửi trùng. */
export async function notifyUser(input: NotifyUserInput): Promise<{ created: boolean; id: string }> {
  const existing = await prisma.appNotification.findUnique({ where: { eventKey: input.eventKey }, select: { id: true } })
  if (existing) return { created: false, id: existing.id }
  const created = await prisma.appNotification.create({
    data: {
      eventKey: input.eventKey,
      recipientId: input.userId,
      kind: input.kind,
      title: input.title,
      courseId: input.courseId ?? null,
      enrollmentId: input.enrollmentId ?? null,
    },
    select: { id: true },
  })
  try {
    await queueCarePush(created.id)
  } catch (error) {
    // Push chỉ là kênh phụ — lỗi xếp hàng không được làm hỏng thông báo trong app.
    console.error('[care] Không xếp được hàng Web Push:', error instanceof Error ? error.name : 'Unknown error')
  }
  return { created: true, id: created.id }
}
