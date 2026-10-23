import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { confirmBooking } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/**
 * Xác nhận đặt lịch (bước 2–4): thông tin liên hệ + biểu mẫu intake.
 * Khách không cần tài khoản; nếu đang đăng nhập thì gắn booking vào
 * tài khoản học viên.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const session = await auth()
    const result = await confirmBooking({
      bookingCode: String(data.bookingCode || ''),
      name: String(data.name || ''),
      email: String(data.email || ''),
      phone: typeof data.phone === 'string' ? data.phone : undefined,
      answers: (data.answers && typeof data.answers === 'object' ? data.answers : {}) as Record<string, unknown>,
      userId: session?.user?.id ? Number(session.user.id) : null,
      website: typeof data.website === 'string' ? data.website : undefined,
    })
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
