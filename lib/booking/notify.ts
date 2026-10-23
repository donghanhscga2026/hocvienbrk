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
