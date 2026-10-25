/**
 * Cron đặt lịch hẹn 1:1 (Giai đoạn 2): dọn lượt giữ chỗ hết hạn, gửi
 * nhắc hẹn trước 24 giờ / 1 giờ và quét danh sách chờ để mời đặt lịch
 * khi ngày chờ có slot trống. Lịch chạy mỗi giờ qua GitHub Actions;
 * mọi lần gửi đều có cột mốc hoặc trạng thái chống trùng nên chạy
 * chồng nhịp vẫn an toàn.
 */
import prisma from '@/lib/prisma'
import { vnDateString } from './slots'
import { reminderKindFor } from './policy'
import { notifyBookingReminder } from './notify'
import { notifyWaitlistForDate } from './service'

export async function runBookingCron(now = new Date()) {
  // 1) Nhả các lượt giữ chỗ đã hết 10 phút mà khách không hoàn tất —
  // các lượt này vô danh (chưa có email) nên chuyển sang đã hủy kèm lý do.
  const expiredHolds = await prisma.booking.updateMany({
    where: { status: 'HELD', holdExpiresAt: { lt: now }, guestEmail: '' },
    data: { status: 'CANCELLED', cancelReason: 'Giữ chỗ hết hạn' },
  })

  // 2) Nhắc hẹn cho các lịch đã xác nhận trong 24 giờ tới.
  const upcoming = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      guestEmail: { not: '' },
      startsAt: { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60_000) },
    },
    orderBy: { startsAt: 'asc' },
    take: 200,
    include: {
      session: { select: { title: true, meetingUrl: true } },
      expert: { select: { name: true } },
    },
  })
  let reminded24 = 0
  let reminded1 = 0
  for (const booking of upcoming) {
    const kind = reminderKindFor(
      booking.startsAt,
      now,
      !!booking.reminder24SentAt,
      !!booking.reminder1SentAt,
    )
    if (!kind) continue
    await notifyBookingReminder({
      bookingId: booking.id,
      bookingCode: booking.code,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestUserId: booking.userId,
      expertId: booking.expertId,
      expertName: booking.expert.name || 'Chuyên gia',
      sessionTitle: booking.session.title,
      meetingUrl: booking.session.meetingUrl,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      kind,
    })
    await prisma.booking.update({
      where: { id: booking.id },
      data: kind === 'BEFORE_24H' ? { reminder24SentAt: now } : { reminder1SentAt: now },
    })
    if (kind === 'BEFORE_24H') reminded24++
    else reminded1++
  }

  // 3) Quét danh sách chờ: mỗi cặp (phiên, ngày) còn người đang chờ và
  // ngày chưa qua — có slot trống thì mời theo thứ tự đăng ký.
  const waitingDays = await prisma.bookingWaitlist.findMany({
    where: {
      status: 'WAITING',
      date: { gte: new Date(`${vnDateString(now)}T00:00:00.000Z`) },
    },
    select: { sessionId: true, date: true },
    distinct: ['sessionId', 'date'],
    take: 100,
  })
  let waitlistNotified = 0
  for (const day of waitingDays) {
    waitlistNotified += await notifyWaitlistForDate(day.sessionId, day.date.toISOString().slice(0, 10))
  }

  return { expiredHolds: expiredHolds.count, reminded24, reminded1, waitlistNotified }
}
