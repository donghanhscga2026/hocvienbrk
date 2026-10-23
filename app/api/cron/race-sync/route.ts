import { NextResponse } from "next/server"
import { syncActiveRaces } from "@/lib/race/points-sync"

/**
 * Cron tính lại điểm cho mọi cuộc đua đang chạy từ các nguồn tự động.
 * Bảo vệ bằng CRON_SECRET (Bearer). Idempotent — chạy lại cập nhật đúng
 * tổng lũy kế hiện tại vào MetricEvent kỳ TOTAL.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const results = await syncActiveRaces()
    return NextResponse.json({ success: true, races: results })
  } catch (error) {
    console.error('[CRON race-sync] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
