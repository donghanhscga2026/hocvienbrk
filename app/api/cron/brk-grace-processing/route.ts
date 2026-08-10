import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import { processGracePeriodExpirations } from '@/lib/brk/activation-service'

export const maxDuration = 300
// Chừa dư so với maxDuration để dừng gọn trước khi Vercel cắt ngang — xem
// comment trong processGracePeriodExpirations (activation-service.ts).
const GRACE_PROCESSING_BUDGET_MS = 260_000

async function handler(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processGracePeriodExpirations(new Date(), undefined, undefined, GRACE_PROCESSING_BUDGET_MS)

    const { sendTelegramAdmin } = await import('@/lib/notifications')
    const details = result as Record<string, unknown>
    await sendTelegramAdmin(
      `✅ <b>[CRON] BRK Grace Processing</b>\n` +
      `📊 Kết quả: ${JSON.stringify(details)}`
    )

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('BRK grace processing error:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      const errMsg = error instanceof Error ? error.message : String(error)
      await sendTelegramAdmin(`❌ <b>[CRON] BRK Grace Processing FAILED</b>\n⚠️ ${errMsg}`)
    } catch (notifyErr) {
      console.error('❌ brk-grace-processing: Failed to send Telegram error notification:', notifyErr);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withCronLogging('brk-grace-processing', handler)
