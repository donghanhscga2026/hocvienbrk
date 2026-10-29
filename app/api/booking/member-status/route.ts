import { NextResponse } from 'next/server'
import { checkBookingEmailMember } from '@/lib/booking/member'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Email vừa đặt lịch đã là thành viên chưa (cần mã đặt lịch thật đi kèm). */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await checkBookingEmailMember(String(data.code || ''), String(data.email || ''))
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
