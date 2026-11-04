import type { Prisma } from '@prisma/client'
import { readOfferingDetails } from './server'

/** Gọi trong transaction có khóa đặt lịch để hai yêu cầu không vượt số buổi. */
export async function assertServiceBooking(db: Prisma.TransactionClient, session: { courseId: number | null; code: string }, userId?: number | null) {
  if (session.courseId == null) return
  const course = await db.course.findUnique({ where: { id: session.courseId }, select: { productGroup: true } })
  if (course?.productGroup !== 'SERVICE') return
  const details = await readOfferingDetails(session.courseId, db)
  // Phiên lịch cũ giữ nguyên cách hoạt động tới khi được gắn rõ trong dịch vụ.
  if (!details.bookingCode) return
  if (details.bookingCode !== session.code) throw new Error('Phiên hẹn này không còn được sử dụng cho dịch vụ. Vui lòng mở lại trang dịch vụ.')
  if (userId == null) throw new Error('Vui lòng đăng nhập bằng tài khoản đã mua dịch vụ để đặt lịch.')
  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: session.courseId } }, select: { status: true } })
  if (!enrollment || !['ACTIVE', 'COMPLETED'].includes(enrollment.status)) throw new Error('Dịch vụ chưa được kích hoạt cho tài khoản này.')
  const used = await db.booking.count({ where: { userId, session: { courseId: session.courseId }, status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] } } })
  if (used >= details.sessions) throw new Error('Bạn đã sử dụng hoặc đặt đủ số buổi trong gói dịch vụ. Vui lòng liên hệ chuyên gia.')
}
