import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAndPromoteLevel } from '@/lib/brk/level-manager'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
    const isOptionB = promoConfig?.value === 'B'

    const activeMembers = await prisma.system.findMany({
      where: { status: 'ACTIVE' }
    })

    let promoted = 0
    const now = new Date()
    for (const member of activeMembers) {
      // For Method B, skip members whose grace period hasn't ended (not yet confirmed)
      if (isOptionB && member.gracePeriodEnd && member.gracePeriodEnd > now) continue

      const result = await checkAndPromoteLevel(member.userId, member.onSystem, now)
      if (result) promoted++
    }

    const { sendTelegramAdmin } = await import('@/lib/notifications')
    await sendTelegramAdmin(
      `✅ <b>[CRON] BRK Level Check</b>\n` +
      `📊 Kiểm tra: ${activeMembers.length} | Thăng cấp: ${promoted}`
    )

    return NextResponse.json({ success: true, checked: activeMembers.length, promoted })
  } catch (error) {
    console.error('BRK level check error:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      const errMsg = error instanceof Error ? error.message : String(error)
      await sendTelegramAdmin(`❌ <b>[CRON] BRK Level Check FAILED</b>\n⚠️ ${errMsg}`)
    } catch (_) {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
