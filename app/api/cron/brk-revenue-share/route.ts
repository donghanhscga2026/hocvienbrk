import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import { processAllBrkRevenueShares } from '@/lib/brk/revenue-share-service'

async function handler(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await processAllBrkRevenueShares()

    const { sendTelegramAdmin } = await import('@/lib/notifications')
    await sendTelegramAdmin(
      `✅ <b>[CRON] BRK Revenue Share</b>\n` +
      `📊 Kết quả: ${JSON.stringify(results)}`
    )

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('BRK revenue share processing error:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      const errMsg = error instanceof Error ? error.message : String(error)
      await sendTelegramAdmin(`❌ <b>[CRON] BRK Revenue Share FAILED</b>\n⚠️ ${errMsg}`)
    } catch (_) {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withCronLogging('brk-revenue-share', handler)
