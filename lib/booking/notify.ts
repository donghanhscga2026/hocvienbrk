/**
 * Thông báo cho tính năng đặt lịch 1:1: email xác nhận cho khách (Brevo,
 * kèm file .ics khi lịch đã xác nhận), chuông trong app và Telegram cho
 * chuyên gia. Mọi kênh đều bọc try/catch riêng — lỗi thông báo không bao
 * giờ làm hỏng booking đã ghi.
 */
import prisma from '@/lib/prisma'
import { sendTransactionalEmail } from '@/lib/brevo'
import { sendTelegramToUser } from '@/lib/telegram-bot'
import { buildIcsBase64 } from './ics'

export function formatVnDateTime(at: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Saigon',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface BookingNoticeData {
  bookingId: number
  bookingCode: string
  guestName: string
  guestEmail: string
  guestUserId: number | null
  expertId: number
  expertName: string
  sessionTitle: string
  meetingUrl: string | null
  startsAt: Date
  endsAt: Date
  status: 'CONFIRMED' | 'PENDING'
}

export async function notifyBookingCreated(data: BookingNoticeData): Promise<void> {
  const when = formatVnDateTime(data.startsAt)
  const confirmed = data.status === 'CONFIRMED'

  // Email cho khách
  try {
    const subject = confirmed
      ? `Xác nhận lịch hẹn: ${data.sessionTitle} — ${when}`
      : `Đã nhận đăng ký lịch hẹn (chờ chuyên gia xác nhận): ${data.sessionTitle}`
    const meetingLine = confirmed && data.meetingUrl
      ? `<p>Link buổi gặp: <a href="${escapeHtml(data.meetingUrl)}">${escapeHtml(data.meetingUrl)}</a></p>`
      : '<p>Link buổi gặp sẽ được gửi sau khi chuyên gia xác nhận lịch hẹn.</p>'
    const htmlContent = [
      `<p>Chào <b>${escapeHtml(data.guestName)}</b>,</p>`,
      confirmed
        ? `<p>Lịch hẹn của bạn với chuyên gia <b>${escapeHtml(data.expertName)}</b> đã được xác nhận.</p>`
        : `<p>Đăng ký lịch hẹn của bạn với chuyên gia <b>${escapeHtml(data.expertName)}</b> đã được ghi nhận và đang chờ xác nhận.</p>`,
      `<p><b>Phiên:</b> ${escapeHtml(data.sessionTitle)}<br/>`,
      `<b>Thời gian:</b> ${when} (giờ Việt Nam)<br/>`,
      `<b>Mã đặt lịch:</b> ${data.bookingCode}</p>`,
      meetingLine,
      '<p>Vui lòng lưu mã đặt lịch — bạn sẽ dùng mã này cùng email để tra cứu, đổi hoặc hủy lịch hẹn.</p>',
    ].join('')
    await sendTransactionalEmail({
      to: [{ email: data.guestEmail, name: data.guestName }],
      subject,
      htmlContent,
      tags: ['booking'],
      attachment: confirmed
        ? [{
            name: `lich-hen-${data.bookingCode}.ics`,
            content: buildIcsBase64({
              uid: `booking-${data.bookingCode}@brk-academy`,
              startsAt: data.startsAt,
              endsAt: data.endsAt,
              summary: `${data.sessionTitle} — ${data.expertName}`,
              description: `Mã đặt lịch: ${data.bookingCode}`,
              location: data.meetingUrl || undefined,
            }),
          }]
        : undefined,
    })
  } catch (error) {
    console.error('notifyBookingCreated: gửi email khách thất bại', error)
  }

  // Chuông trong app cho chuyên gia
  try {
    await prisma.appNotification.create({
      data: {
        eventKey: `booking-created:${data.bookingId}`,
        recipientId: data.expertId,
        kind: 'BOOKING_CREATED',
        title: `Lịch hẹn 1:1 mới: ${data.guestName} — ${data.sessionTitle}, ${when}`,
      },
    })
  } catch (error) {
    console.error('notifyBookingCreated: tạo thông báo chuyên gia thất bại', error)
  }

  // Chuông cho khách nếu là học viên có tài khoản
  if (data.guestUserId != null) {
    try {
      await prisma.appNotification.create({
        data: {
          eventKey: `booking-created-guest:${data.bookingId}`,
          recipientId: data.guestUserId,
          kind: 'BOOKING_CREATED',
          title: confirmed
            ? `Đã xác nhận lịch hẹn: ${data.sessionTitle}, ${when}`
            : `Đã nhận đăng ký lịch hẹn: ${data.sessionTitle}, ${when}`,
        },
      })
    } catch (error) {
      console.error('notifyBookingCreated: tạo thông báo khách thất bại', error)
    }
  }

  // Telegram cho chuyên gia (nếu đã liên kết)
  try {
    await sendTelegramToUser(
      data.expertId,
      `📅 <b>Lịch hẹn 1:1 mới</b>\n👤 Khách: <b>${escapeHtml(data.guestName)}</b>\n📌 Phiên: ${escapeHtml(data.sessionTitle)}\n🕐 ${when}\n🔖 Mã: ${data.bookingCode}${confirmed ? '' : '\n⏳ Trạng thái: chờ bạn xác nhận'}`,
    )
  } catch (error) {
    console.error('notifyBookingCreated: gửi Telegram thất bại', error)
  }
}

// ─── Giai đoạn 2: hủy, đổi lịch, nhắc hẹn, danh sách chờ ───

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'
}

function formatVnDate(dateVN: string): string {
  const [y, m, d] = dateVN.split('-').map(Number)
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Saigon',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

export interface BookingChangeData {
  bookingId: number
  bookingCode: string
  guestName: string
  guestEmail: string
  guestUserId: number | null
  expertId: number
  expertName: string
  sessionTitle: string
  meetingUrl: string | null
  startsAt: Date
  endsAt: Date
}

async function bell(recipientId: number, eventKey: string, kind: string, title: string): Promise<void> {
  try {
    await prisma.appNotification.create({ data: { eventKey, recipientId, kind, title } })
  } catch (error) {
    console.error(`notify: tạo chuông ${kind} thất bại`, error)
  }
}

async function telegramToExpert(expertId: number, html: string): Promise<void> {
  try {
    await sendTelegramToUser(expertId, html)
  } catch (error) {
    console.error('notify: gửi Telegram chuyên gia thất bại', error)
  }
}

/** Báo hủy lịch: email cho khách; nếu khách tự hủy thì báo thêm chuyên gia. */
export async function notifyBookingCancelled(data: BookingChangeData & { byGuest: boolean }): Promise<void> {
  const when = formatVnDateTime(data.startsAt)
  try {
    await sendTransactionalEmail({
      to: [{ email: data.guestEmail, name: data.guestName }],
      subject: `Lịch hẹn đã hủy: ${data.sessionTitle} — ${when}`,
      htmlContent: [
        `<p>Chào <b>${escapeHtml(data.guestName)}</b>,</p>`,
        `<p>Lịch hẹn <b>${escapeHtml(data.sessionTitle)}</b> với chuyên gia <b>${escapeHtml(data.expertName)}</b> vào ${when} (giờ Việt Nam) đã được hủy.</p>`,
        `<p><b>Mã đặt lịch:</b> ${data.bookingCode}</p>`,
        '<p>Nếu bạn muốn hẹn lại, hãy dùng link đặt lịch của chuyên gia để chọn khung giờ khác. Cảm ơn bạn.</p>',
      ].join(''),
      tags: ['booking'],
    })
  } catch (error) {
    console.error('notifyBookingCancelled: gửi email khách thất bại', error)
  }
  if (data.guestUserId != null) {
    await bell(data.guestUserId, `booking-cancelled-guest:${data.bookingId}`, 'BOOKING_CANCELLED', `Lịch hẹn đã hủy: ${data.sessionTitle}, ${when}`)
  }
  if (data.byGuest) {
    await bell(data.expertId, `booking-cancelled:${data.bookingId}`, 'BOOKING_CANCELLED', `Khách tự hủy lịch: ${data.guestName} — ${data.sessionTitle}, ${when}`)
    await telegramToExpert(
      data.expertId,
      `❌ <b>Lịch hẹn bị khách hủy</b>\n👤 Khách: <b>${escapeHtml(data.guestName)}</b>\n📌 Phiên: ${escapeHtml(data.sessionTitle)}\n🕐 ${when}\n🔖 Mã: ${data.bookingCode}`,
    )
  }
}

/** Báo đổi lịch: email cho khách kèm file lịch mới, chuông + Telegram cho chuyên gia. */
export async function notifyBookingRescheduled(data: BookingChangeData & { oldStartsAt: Date }): Promise<void> {
  const when = formatVnDateTime(data.startsAt)
  const oldWhen = formatVnDateTime(data.oldStartsAt)
  try {
    await sendTransactionalEmail({
      to: [{ email: data.guestEmail, name: data.guestName }],
      subject: `Lịch hẹn đã đổi giờ: ${data.sessionTitle} — ${when}`,
      htmlContent: [
        `<p>Chào <b>${escapeHtml(data.guestName)}</b>,</p>`,
        `<p>Lịch hẹn <b>${escapeHtml(data.sessionTitle)}</b> với chuyên gia <b>${escapeHtml(data.expertName)}</b> đã được đổi từ ${oldWhen} sang <b>${when}</b> (giờ Việt Nam).</p>`,
        `<p><b>Mã đặt lịch:</b> ${data.bookingCode}</p>`,
        data.meetingUrl
          ? `<p>Link buổi gặp: <a href="${escapeHtml(data.meetingUrl)}">${escapeHtml(data.meetingUrl)}</a></p>`
          : '',
        '<p>File lịch đính kèm đã là giờ mới — bạn có thể xóa sự kiện cũ trong ứng dụng lịch của mình.</p>',
      ].join(''),
      tags: ['booking'],
      attachment: [{
        name: `lich-hen-${data.bookingCode}.ics`,
        content: buildIcsBase64({
          uid: `booking-${data.bookingCode}@brk-academy`,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          summary: `${data.sessionTitle} — ${data.expertName}`,
          description: `Mã đặt lịch: ${data.bookingCode}`,
          location: data.meetingUrl || undefined,
        }),
      }],
    })
  } catch (error) {
    console.error('notifyBookingRescheduled: gửi email khách thất bại', error)
  }
  if (data.guestUserId != null) {
    await bell(data.guestUserId, `booking-rescheduled-guest:${data.bookingId}:${data.startsAt.getTime()}`, 'BOOKING_RESCHEDULED', `Lịch hẹn đã đổi giờ: ${data.sessionTitle}, ${when}`)
  }
  await bell(data.expertId, `booking-rescheduled:${data.bookingId}:${data.startsAt.getTime()}`, 'BOOKING_RESCHEDULED', `Khách đổi lịch: ${data.guestName} — ${data.sessionTitle}, ${oldWhen} → ${when}`)
  await telegramToExpert(
    data.expertId,
    `🔁 <b>Khách đổi lịch hẹn</b>\n👤 Khách: <b>${escapeHtml(data.guestName)}</b>\n📌 Phiên: ${escapeHtml(data.sessionTitle)}\n🕐 ${oldWhen} → <b>${when}</b>\n🔖 Mã: ${data.bookingCode}`,
  )
}

/** Nhắc hẹn cho khách (email + file lịch) và chuyên gia (chuông; mốc 1 giờ thêm Telegram). */
export async function notifyBookingReminder(data: BookingChangeData & { kind: 'BEFORE_24H' | 'BEFORE_1H' }): Promise<void> {
  const when = formatVnDateTime(data.startsAt)
  const soon = data.kind === 'BEFORE_1H'
  try {
    await sendTransactionalEmail({
      to: [{ email: data.guestEmail, name: data.guestName }],
      subject: `Nhắc lịch hẹn ${soon ? 'sắp diễn ra' : 'ngày mai'}: ${data.sessionTitle} — ${when}`,
      htmlContent: [
        `<p>Chào <b>${escapeHtml(data.guestName)}</b>,</p>`,
        `<p>Đây là lời nhắc cho lịch hẹn <b>${escapeHtml(data.sessionTitle)}</b> với chuyên gia <b>${escapeHtml(data.expertName)}</b> vào <b>${when}</b> (giờ Việt Nam).</p>`,
        `<p><b>Mã đặt lịch:</b> ${data.bookingCode}</p>`,
        data.meetingUrl
          ? `<p>Link buổi gặp: <a href="${escapeHtml(data.meetingUrl)}">${escapeHtml(data.meetingUrl)}</a></p>`
          : '',
        `<p>Nếu cần đổi hoặc hủy lịch, hãy mở trang tra cứu hẹn: <a href="${appUrl()}/tra-cuu-hen">${appUrl()}/tra-cuu-hen</a> và nhập email cùng mã đặt lịch.</p>`,
      ].join(''),
      tags: ['booking'],
      attachment: [{
        name: `lich-hen-${data.bookingCode}.ics`,
        content: buildIcsBase64({
          uid: `booking-${data.bookingCode}@brk-academy`,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          summary: `${data.sessionTitle} — ${data.expertName}`,
          description: `Mã đặt lịch: ${data.bookingCode}`,
          location: data.meetingUrl || undefined,
        }),
      }],
    })
  } catch (error) {
    console.error('notifyBookingReminder: gửi email khách thất bại', error)
  }
  await bell(
    data.expertId,
    `booking-reminder-${soon ? '1h' : '24h'}:${data.bookingId}:${data.startsAt.getTime()}`,
    'BOOKING_REMINDER',
    `Sắp có lịch hẹn 1:1: ${data.guestName} — ${data.sessionTitle}, ${when}`,
  )
  if (soon) {
    await telegramToExpert(
      data.expertId,
      `⏰ <b>Lịch hẹn 1:1 trong 1 giờ tới</b>\n👤 Khách: <b>${escapeHtml(data.guestName)}</b>\n📌 Phiên: ${escapeHtml(data.sessionTitle)}\n🕐 ${when}\n🔖 Mã: ${data.bookingCode}`,
    )
  }
}

/** Mời một người trong danh sách chờ đặt lịch khi ngày họ chờ đã có slot trống. */
export async function notifyWaitlistSlotOpen(data: {
  name: string
  email: string
  sessionTitle: string
  sessionCode: string
  expertName: string
  dateVN: string
}): Promise<void> {
  const link = `${appUrl()}/dat-lich/${data.sessionCode}`
  try {
    await sendTransactionalEmail({
      to: [{ email: data.email, name: data.name }],
      subject: `Đã có khung giờ trống: ${data.sessionTitle} — ${formatVnDate(data.dateVN)}`,
      htmlContent: [
        `<p>Chào <b>${escapeHtml(data.name)}</b>,</p>`,
        `<p>Phiên <b>${escapeHtml(data.sessionTitle)}</b> của chuyên gia <b>${escapeHtml(data.expertName)}</b> mà bạn đăng ký chờ hiện đã có khung giờ trống vào <b>${formatVnDate(data.dateVN)}</b>.</p>`,
        `<p>Đặt lịch ngay tại: <a href="${link}">${link}</a></p>`,
        '<p>Khung giờ trống có thể được người khác đặt trước, bạn nên đặt sớm. Nếu ngày này không còn phù hợp, bạn cứ bỏ qua email này.</p>',
      ].join(''),
      tags: ['booking'],
    })
  } catch (error) {
    console.error('notifyWaitlistSlotOpen: gửi email thất bại', error)
  }
}

