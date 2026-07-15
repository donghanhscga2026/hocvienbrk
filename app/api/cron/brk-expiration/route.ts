import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import prisma from '@/lib/prisma'

async function handler(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const expired = await prisma.system.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now }
      },
      data: { status: 'EXPIRED' }
    })

    const { sendTelegramAdmin } = await import('@/lib/notifications')
    await sendTelegramAdmin(
      `✅ <b>[CRON] BRK Expiration</b>\n` +
      `📊 Hết hạn: ${expired.count} thành viên`
    )

    return NextResponse.json({ success: true, expired: expired.count })
  } catch (error) {
    console.error('BRK expiration error:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      const errMsg = error instanceof Error ? error.message : String(error)
      await sendTelegramAdmin(`❌ <b>[CRON] BRK Expiration FAILED</b>\n⚠️ ${errMsg}`)
    } catch (_) {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withCronLogging('brk-expiration', handler)
