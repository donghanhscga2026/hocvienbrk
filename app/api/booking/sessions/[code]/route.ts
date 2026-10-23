import { NextResponse } from 'next/server'
import { getPublicSession } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Thông tin công khai của một phiên hẹn (trang đặt lịch phía khách). */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const session = await getPublicSession(code)
    if (!session) return NextResponse.json({ error: 'Phiên hẹn không tồn tại hoặc đã tạm dừng.' }, { status: 404 })
    return NextResponse.json({ session })
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
