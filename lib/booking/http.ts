import { NextResponse } from 'next/server'
import { BookingError } from './service'

/** Chuẩn hóa lỗi service thành phản hồi JSON cho các route đặt lịch. */
export function bookingErrorResponse(error: unknown) {
  if (error instanceof BookingError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('booking api:', error)
  return NextResponse.json({ error: 'Đã có lỗi xảy ra, vui lòng thử lại.' }, { status: 500 })
}
