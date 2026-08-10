import { NextResponse } from 'next/server'
import { withCronLogging, acquireCronLock, releaseCronLock } from '@/lib/cron-logger'
import { runMbtcaOrchestrator } from '@/lib/brk/mbtca-orchestrator-service'

export const maxDuration = 300

const LOCK_KEY = 'mbtca_orchestrator_lock'
// Lớn hơn maxDuration — tránh 2 nguồn kích hoạt cron (GitHub Actions + dịch
// vụ cron ngoài chạy song song để dự phòng) cùng xử lý 1 cycle một lúc, từng
// gây lỗi "Unique constraint failed" trên mbtcaWorkflowRun.upsert().
const LOCK_STALE_MS = 290_000

async function handler(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gotLock = await acquireCronLock(LOCK_KEY, LOCK_STALE_MS)
  if (!gotLock) {
    return NextResponse.json({ success: true, skipped: true, reason: 'Đang có lượt chạy khác xử lý, bỏ qua để tránh xung đột.' })
  }

  try {
    const result = await runMbtcaOrchestrator(new Date())
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('MB TCA orchestrator failed:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      await sendTelegramAdmin(`❌ <b>[CRON] MB TCA FAILED</b>\n⚠️ ${message}`)
    } catch (notifyErr) {
      console.error('❌ mbtca-orchestrator: Failed to send Telegram error notification:', notifyErr);
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    await releaseCronLock(LOCK_KEY)
  }
}

export const GET = withCronLogging('mbtca-orchestrator', handler)
