import { NextResponse } from 'next/server'
import { guestRescheduleBooking } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Khách tự đổi giờ lịch hẹn qua cổng tra cứu (Email + Mã đặt lịch). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await guestRescheduleBooking(
      String(data.email || ''),
      String(data.code || ''),
      String(data.dateVN || ''),
      Math.trunc(Number(data.startMin)),
    )
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
