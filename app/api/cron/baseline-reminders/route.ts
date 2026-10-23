import { NextResponse } from "next/server"
import { runBaselineReminders } from "@/lib/baseline/reminder-runner"

/**
 * Cron nhắc học viên ghi Điểm A (sau ghi danh 3 ngày chưa ghi) và Điểm B
 * (sau Điểm A 14 ngày chưa ghi) qua chuông thông báo trong app. Khóa
 * eventKey duy nhất chống nhắc trùng trong tháng. CRON_SECRET (Bearer).
 */
async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await runBaselineReminders()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[CRON baseline-reminders] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Vercel Cron gọi bằng GET; bộ lập lịch ngoài có thể gọi POST — cả hai dùng chung một xử lý.
export const GET = handleCron
export const POST = handleCron
