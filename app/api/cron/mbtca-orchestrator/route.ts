import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import { runMbtcaOrchestrator } from '@/lib/brk/mbtca-orchestrator-service'

export const maxDuration = 300

async function handler(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await runMbtcaOrchestrator(new Date())
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('MB TCA orchestrator failed:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      await sendTelegramAdmin(`❌ <b>[CRON] MB TCA FAILED</b>\n⚠️ ${message}`)
    } catch {}
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export const GET = withCronLogging('mbtca-orchestrator', handler)
