/**
 * Chính sách tự phục vụ của khách đặt lịch 1:1 — Giai đoạn 2, logic thuần
 * không chạm DB, test độc lập bằng scripts/test-booking.cjs.
 *
 * - Đổi/hủy: khách chỉ tự đổi hoặc hủy được lịch đang CONFIRMED hoặc
 *   PENDING, và phải còn cách giờ bắt đầu ít nhất cancelBeforeHours của
 *   phiên (đúng mốc biên vẫn được phép).
 * - Nhắc hẹn: cron phân loại mốc nhắc 24 giờ / 1 giờ theo khoảng cách tới
 *   giờ bắt đầu. Cửa sổ có tính bắt kịp (cron lỡ một nhịp thì nhịp sau vẫn
 *   nhắc), chống gửi trùng bằng hai cột mốc reminder24SentAt /
 *   reminder1SentAt trên Booking chứ không bằng cửa sổ hẹp.
 */

export type GuestModifyBlock = 'OK' | 'NOT_MODIFIABLE' | 'TOO_LATE'

const MODIFIABLE_STATUSES = ['CONFIRMED', 'PENDING']

const HOUR_MS = 60 * 60_000

/** Mốc thời gian cuối cùng khách còn tự đổi/hủy được. */
export function guestModifyDeadline(startsAt: Date, cancelBeforeHours: number): Date {
  return new Date(startsAt.getTime() - cancelBeforeHours * HOUR_MS)
}

/** Kiểm tra khách có được tự đổi/hủy lịch này không, và vì sao không. */
export function checkGuestModify(
  status: string,
  startsAt: Date,
  cancelBeforeHours: number,
  now: Date,
): GuestModifyBlock {
  if (!MODIFIABLE_STATUSES.includes(status)) return 'NOT_MODIFIABLE'
  if (now.getTime() > guestModifyDeadline(startsAt, cancelBeforeHours).getTime()) return 'TOO_LATE'
  return 'OK'
}

export type ReminderKind = 'BEFORE_24H' | 'BEFORE_1H'

/**
 * Mốc nhắc cần gửi cho một lịch hẹn tại thời điểm now, hoặc null.
 * Lịch còn dưới 1 giờ: ưu tiên mốc 1 giờ. Lịch trong 24 giờ tới mà chưa
 * nhắc mốc 24 giờ thì nhắc mốc 24 giờ (kể cả khi lịch được đặt sát giờ —
 * khách vẫn nhận một email nhắc kèm file lịch trước buổi hẹn).
 */
export function reminderKindFor(
  startsAt: Date,
  now: Date,
  sent24: boolean,
  sent1: boolean,
): ReminderKind | null {
  const ms = startsAt.getTime() - now.getTime()
  if (ms <= 0) return null
  if (ms <= HOUR_MS) return sent1 ? null : 'BEFORE_1H'
  if (ms <= 24 * HOUR_MS) return sent24 ? null : 'BEFORE_24H'
  return null
}
