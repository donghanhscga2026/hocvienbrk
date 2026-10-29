import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveMemberPhone } from '@/lib/booking/member'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Thành viên đồng ý lưu SĐT vừa dùng khi đặt lịch vào hồ sơ của mình. */
export async function POST(request: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id ? Number(session.user.id) : NaN
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để lưu số điện thoại.' }, { status: 401 })
    }
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
    }
    const data = body as Record<string, unknown>
    const result = await saveMemberPhone(userId, String(data.phone || ''))
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
