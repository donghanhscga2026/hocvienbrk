import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { sendTransactionalEmail } from '@/lib/brevo'
import { logActivity } from '@/lib/activity-logger'
import { BookingError } from './service'

/**
 * Cầu nối đặt lịch ↔ tài khoản thành viên:
 * - Tự điền thông tin (gồm số điện thoại) cho thành viên đã đăng nhập.
 * - Sau khi khách đặt lịch thành công, gợi ý tạo tài khoản bằng đúng thông tin
 *   vừa điền (phương án A ní duyệt 29/10/2026): tạo ngay, gửi link đặt mật khẩu
 *   dùng chung cơ chế PasswordReset với luồng quên mật khẩu, gắn lịch theo email.
 */

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://giautoandien.io.vn'
}

/** Thông tin tự điền cho thành viên đã đăng nhập khi mở trang đặt lịch. */
export async function getMemberPrefill(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  })
  if (!user) return null
  return {
    name: user.name || '',
    email: user.email,
    phone: user.phone || '',
    hasPhone: !!user.phone,
  }
}

async function findBookingByCodeEmail(codeRaw: string, emailRaw: string) {
  const code = codeRaw.trim().toUpperCase()
  const email = emailRaw.trim().toLowerCase()
  if (!code || !email) throw new BookingError('Thiếu mã đặt lịch hoặc email.', 400)
  const booking = await prisma.booking.findUnique({ where: { code } })
  if (!booking || booking.guestEmail.toLowerCase() !== email || booking.status === 'CANCELLED') {
    throw new BookingError('Không tìm thấy lịch hẹn phù hợp.', 404)
  }
  return booking
}

/**
 * Email vừa đặt lịch đã thuộc tài khoản thành viên nào chưa?
 * Chỉ trả lời khi có mã đặt lịch thật đi kèm (chống dò tài khoản).
 */
export async function checkBookingEmailMember(code: string, email: string) {
  const booking = await findBookingByCodeEmail(code, email)
  const user = await prisma.user.findUnique({
    where: { email: booking.guestEmail },
    select: { id: true },
  })
  return { isMember: !!user }
}

/**
 * Tạo tài khoản thành viên từ thông tin của một lịch hẹn (khách đã đồng ý).
 * Tên/email/SĐT luôn lấy từ bản ghi lịch hẹn phía server, không tin dữ liệu client gửi lên.
 */
export async function registerMemberFromBooking(code: string, email: string) {
  const booking = await findBookingByCodeEmail(code, email)
  if (booking.userId) throw new BookingError('Lịch hẹn này đã gắn với một tài khoản thành viên.', 409)

  const existing = await prisma.user.findUnique({ where: { email: booking.guestEmail } })
  if (existing) return { created: false, alreadyMember: true, phoneSkipped: false }

  // SĐT là duy nhất theo tài khoản: trùng số của người khác thì bỏ qua, không chặn tạo tài khoản.
  let phoneToSave: string | null = null
  let phoneSkipped = false
  const guestPhone = (booking.guestPhone || '').trim()
  if (guestPhone) {
    const phoneOwner = await prisma.user.findFirst({ where: { phone: guestPhone }, select: { id: true } })
    if (phoneOwner) phoneSkipped = true
    else phoneToSave = guestPhone
  }

  const user = await prisma.user.create({
    data: {
      name: booking.guestName,
      email: booking.guestEmail,
      phone: phoneToSave,
      password: null,
      // Tài khoản chưa thể đăng nhập cho tới khi chủ email bấm link đặt mật khẩu
      // (mật khẩu đang null) — việc nhận được link trong hộp thư chính là bằng chứng
      // sở hữu email, nên đánh dấu đã xác minh ngay để khỏi qua thêm vòng OTP.
      emailVerified: new Date(),
    },
  })

  // Gắn mọi lịch hẹn trùng email (chưa gắn tài khoản) vào tài khoản mới.
  await prisma.booking.updateMany({
    where: { guestEmail: { equals: booking.guestEmail, mode: 'insensitive' }, userId: null },
    data: { userId: user.id },
  })

  // Link đặt mật khẩu: dùng chung bảng PasswordReset + trang /reset-password/[token]
  // với luồng quên mật khẩu và link admin gửi. Hạn 7 ngày cho tài khoản mới.
  const token = crypto.randomBytes(32).toString('hex')
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } })
  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  })
  const resetUrl = `${appUrl()}/reset-password/${token}`

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #047857;">Chào mừng bạn đến với giautoandien.io.vn</h2>
      <p>Xin chào <b>${booking.guestName}</b>,</p>
      <p>Tài khoản thành viên của bạn đã được tạo bằng thông tin bạn vừa dùng để đặt lịch hẹn
      (mã lịch ${booking.code}). Mọi lịch hẹn đặt bằng email này đã được gắn vào tài khoản của bạn —
      đăng nhập là xem, đổi giờ hoặc hủy được ngay tại mục <b>Lịch hẹn của tôi</b>.</p>
      <p>Chỉ còn một bước: đặt mật khẩu cho tài khoản.</p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}" style="background: #047857; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Đặt mật khẩu và kích hoạt tài khoản</a>
      </p>
      <p style="color: #64748b; font-size: 13px;">Link có hiệu lực trong 7 ngày. Nếu bạn không yêu cầu tạo tài khoản,
      cứ bỏ qua email này — tài khoản sẽ không thể đăng nhập nếu chưa đặt mật khẩu.</p>
    </div>`
  await sendTransactionalEmail({
    to: [{ email: booking.guestEmail, name: booking.guestName }],
    subject: 'Tài khoản thành viên của bạn đã được tạo — hãy đặt mật khẩu',
    htmlContent,
    tags: ['booking-member-register'],
  })

  await logActivity({
    userId: user.id,
    action: 'SYSTEM_JOIN',
    detail: `Tự đăng ký thành viên sau khi đặt lịch hẹn ${booking.code}`,
    metadata: { email: booking.guestEmail, bookingCode: booking.code, phoneSkipped },
  }).catch(() => undefined)

  return { created: true, alreadyMember: false, phoneSkipped }
}

/**
 * Lưu SĐT khách vừa dùng khi đặt lịch vào hồ sơ thành viên (khi họ đồng ý).
 * Chỉ lưu khi hồ sơ chưa có SĐT và số chưa thuộc tài khoản khác.
 */
export async function saveMemberPhone(userId: number, phoneRaw: string) {
  const phone = phoneRaw.trim()
  if (!phone) throw new BookingError('Chưa có số điện thoại để lưu.', 400)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
  if (!user) throw new BookingError('Không tìm thấy tài khoản thành viên.', 404)
  if (user.phone) return { saved: false, reason: 'HAS_PHONE' as const }
  const owner = await prisma.user.findFirst({ where: { phone, id: { not: userId } }, select: { id: true } })
  if (owner) return { saved: false, reason: 'PHONE_TAKEN' as const }
  await prisma.user.update({ where: { id: userId }, data: { phone } })
  return { saved: true, reason: null }
}
