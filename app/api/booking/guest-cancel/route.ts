import { NextResponse } from 'next/server'
import { guestCancelBooking } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Khách tự hủy lịch hẹn qua cổng tra cứu (Email + Mã đặt lịch). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await guestCancelBooking(
      String(data.email || ''),
      String(data.code || ''),
      typeof data.reason === 'string' ? data.reason : undefined,
    )
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
