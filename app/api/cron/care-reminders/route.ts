import { NextResponse } from "next/server"
import { runCareReminders } from "@/lib/care/runner"
import { processDueFollowUps } from "@/lib/care/followup-runner"

/**
 * Cron Care Engine: quét 6 luật chăm sóc mỗi sáng và tự gửi nhắc cho
 * các luật phía học viên (R1/R2/R3/R6) qua thông báo trong app + Web Push.
 * GĐ2: cùng lượt quét này xử lý luôn hẹn giờ theo dõi đã tới hạn (tự hủy
 * nếu học viên đã phản hồi, chưa thì gửi nhắc) — tái dùng lịch 07:15 sẵn
 * có trong cron-jobs.yml, không cần thêm lịch mới vì các mốc hẹn tính
 * theo ngày (1/3/7 ngày).
 * CRON_SECRET (Bearer). Mặc định chỉ chạy thử (dry-run, đếm số sẽ gửi);
 * chạy thật khi có ?execute=1 — cùng cơ chế với cron crm-automation.
 */
async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const execute = new URL(request.url).searchParams.get('execute') === '1'
    const now = new Date()
    const result = await runCareReminders(now, { dryRun: !execute })
    const followUps = await processDueFollowUps(now, { dryRun: !execute })
    return NextResponse.json({ success: true, ...result, followUps })
  } catch (error) {
    console.error('[CRON care-reminders] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Vercel Cron gọi bằng GET; bộ lập lịch ngoài có thể gọi POST — cả hai dùng chung một xử lý.
export const GET = handleCron
export const POST = handleCron
