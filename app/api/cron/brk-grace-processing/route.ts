import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import { processGracePeriodExpirations } from '@/lib/brk/activation-service'

async function handler(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processGracePeriodExpirations()

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
    } catch (_) {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withCronLogging('brk-grace-processing', handler)
