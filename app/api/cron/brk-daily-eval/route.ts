import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import prisma from '@/lib/prisma'
import { processSystemDailyEval } from '@/lib/brk/daily-eval-service'

const LOCK_KEY = 'brk_daily_eval_lock'
const LOCK_TIMEOUT_MS = 120_000 // 2 minutes

async function acquireLock(): Promise<boolean> {
  const now = Date.now()
  try {
    const existing = await prisma.systemConfig.findUnique({ where: { key: LOCK_KEY } })
    if (existing && existing.value) {
      const lockTime = parseInt(String(existing.value))
      if (now - lockTime < LOCK_TIMEOUT_MS) {
        return false // Another instance holds the lock
      }
    }
    await prisma.systemConfig.upsert({
      where: { key: LOCK_KEY },
      update: { value: now.toString() },
      create: { key: LOCK_KEY, value: now.toString() }
    })
    // Re-check after upsert to handle race between two concurrent acquireLock calls
    const recheck = await prisma.systemConfig.findUnique({ where: { key: LOCK_KEY } })
    return recheck?.value === now.toString()
  } catch {
    return false
  }
}

async function releaseLock() {
  try {
    await prisma.systemConfig.update({ where: { key: LOCK_KEY }, data: { value: '' } })
  } catch {}
}

async function handler(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mutex: prevent concurrent runs
    if (!(await acquireLock())) {
      return NextResponse.json({ success: true, reason: 'Another instance running, skipping' })
    }

    try {
      const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
      if (!promoConfig || promoConfig.value !== 'B') {
        return NextResponse.json({ success: true, reason: 'Not Method B, skipping' })
      }

      const allSystemTrees = await prisma.systemTree.findMany()
      if (allSystemTrees.length === 0) {
        return NextResponse.json({ success: true, reason: 'No system trees found', systems: [] })
      }

      const now = new Date()
      const evalTime = now

      const results = []
      let totalChecked = 0
      let totalConfirmed = 0

      for (const systemTree of allSystemTrees) {
        const result = await processSystemDailyEval(systemTree, evalTime, now)
        results.push(result)
        totalChecked += result.checked
        totalConfirmed += result.confirmed
      }

      const { sendTelegramAdmin } = await import('@/lib/notifications')
      await sendTelegramAdmin(
        `✅ <b>[CRON] BRK Daily Eval</b>\n` +
        `📊 Hệ thống: ${results.length} | Kiểm tra: ${totalChecked} | Xác nhận: ${totalConfirmed}\n` +
        `⏰ Eval: ${evalTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
      )

      return NextResponse.json({
        success: true,
        systemsProcessed: results.length,
        results,
        checked: totalChecked,
        confirmed: totalConfirmed,
        evalTime: evalTime.toISOString()
      })
    } finally {
      await releaseLock()
    }
  } catch (error) {
    console.error('BRK daily eval error:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      const errMsg = error instanceof Error ? error.message : String(error)
      await sendTelegramAdmin(`❌ <b>[CRON] BRK Daily Eval FAILED</b>\n⚠️ ${errMsg}`)
    } catch (_) {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withCronLogging('brk-daily-eval', handler)
