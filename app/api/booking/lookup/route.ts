import { NextResponse } from 'next/server'
import { getGuestBooking } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Tra cứu lịch hẹn phía khách bằng Email + Mã đặt lịch (cổng /tra-cuu-hen). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await getGuestBooking(String(data.email || ''), String(data.code || ''))
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
