import { NextResponse } from 'next/server'
import { registerMemberFromBooking } from '@/lib/booking/member'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/**
 * Tạo tài khoản thành viên từ thông tin của một lịch hẹn (khách đồng ý ở màn hình
 * đặt lịch thành công). Thông tin lấy từ bản ghi lịch hẹn phía server.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await registerMemberFromBooking(String(data.code || ''), String(data.email || ''))
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
