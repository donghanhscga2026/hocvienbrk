import { NextResponse } from 'next/server'
import { getSlotsForDate } from '@/lib/booking/service'
import { bookingErrorResponse } from '@/lib/booking/http'

export const dynamic = 'force-dynamic'

/** Danh sách khung giờ của một ngày cho một phiên hẹn. */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const date = new URL(request.url).searchParams.get('date') || ''
    const result = await getSlotsForDate(code, date)
    return NextResponse.json(result)
  } catch (error) {
    return bookingErrorResponse(error)
  }
}
