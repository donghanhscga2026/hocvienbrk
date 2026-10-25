import { NextResponse } from 'next/server'
import { joinWaitlist } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Khách đăng ký danh sách chờ cho một ngày đã kín lịch của một phiên hẹn. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await joinWaitlist({
      code: String(data.code || ''),
      dateVN: String(data.dateVN || ''),
      name: String(data.name || ''),
      email: String(data.email || ''),
      phone: typeof data.phone === 'string' ? data.phone : undefined,
      note: typeof data.note === 'string' ? data.note : undefined,
      website: typeof data.website === 'string' ? data.website : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
