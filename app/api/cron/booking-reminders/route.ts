import { NextResponse } from "next/server"
import { runBookingCron } from "@/lib/booking/cron"

/**
 * Cron đặt lịch hẹn 1:1 (Giai đoạn 2): dọn giữ chỗ hết hạn, nhắc hẹn
 * 24 giờ / 1 giờ, mời danh sách chờ khi có slot trống. Khóa CRON_SECRET
 * (Bearer) như các cron khác; GitHub Actions gọi mỗi giờ.
 */
async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await runBookingCron()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[CRON booking-reminders] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Vercel Cron gọi bằng GET; bộ lập lịch ngoài có thể gọi POST — cả hai dùng chung một xử lý.
export const GET = handleCron
export const POST = handleCron
