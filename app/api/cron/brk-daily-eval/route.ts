import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import prisma from '@/lib/prisma'
import { processSystemDailyEval } from '@/lib/brk/daily-eval-service'

const LOCK_KEY = 'brk_daily_eval_lock'
const LAST_ROUND_KEY = 'brk_level_promotion_last_round'
const START_TIME_KEY = 'level_promotion_start_time'
const LOCK_TIMEOUT_MS = 120_000
const PROMOTION_INTERVAL_MS = 30 * 60 * 60 * 1000

async function acquireLock(): Promise<boolean> {
  const now = Date.now()
  try {
    const existing = await prisma.systemConfig.findUnique({ where: { key: LOCK_KEY } })
    if (existing?.value) {
      const lockTime = Number(existing.value)
      if (Number.isFinite(lockTime) && now - lockTime < LOCK_TIMEOUT_MS) return false
    }
    const lockValue = now.toString()
    await prisma.systemConfig.upsert({
      where: { key: LOCK_KEY },
      update: { value: lockValue },
      create: { key: LOCK_KEY, value: lockValue },
    })
    const recheck = await prisma.systemConfig.findUnique({ where: { key: LOCK_KEY } })
    return recheck?.value === lockValue
  } catch {
    return false
  }
}

async function releaseLock() {
  try {
    await prisma.systemConfig.update({ where: { key: LOCK_KEY }, data: { value: '' } })
  } catch {}
}

async function getDuePromotionRound(now: Date) {
  const [startConfig, lastRoundConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: START_TIME_KEY } }),
    prisma.systemConfig.findUnique({ where: { key: LAST_ROUND_KEY } }),
  ])
  if (typeof startConfig?.value !== 'string') {
    throw new Error(`Missing ${START_TIME_KEY} config`)
  }

  const startTime = new Date(startConfig.value)
  if (Number.isNaN(startTime.getTime())) {
    throw new Error(`Invalid ${START_TIME_KEY} config`)
  }
  if (now < startTime) return null

  const roundNumber = Math.floor(
    (now.getTime() - startTime.getTime()) / PROMOTION_INTERVAL_MS,
  )
  const lastRound = lastRoundConfig ? Number(lastRoundConfig.value) : -1
  if (Number.isFinite(lastRound) && lastRound >= roundNumber) return null
  return { roundNumber, startTime }
}

async function handler(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await acquireLock())) {
      return NextResponse.json({ success: true, reason: 'Another instance running, skipping' })
    }

    try {
      const now = new Date()
      const dueRound = await getDuePromotionRound(now)
      if (!dueRound) {
        return NextResponse.json({ success: true, reason: 'No 30-hour round is due' })
      }

      const promoConfig = await prisma.systemConfig.findUnique({
        where: { key: 'brk_promotion_logic' },
      })
      if (promoConfig?.value !== 'B') {
        return NextResponse.json({ success: true, reason: 'Not Method B, skipping' })
      }

      const allSystemTrees = await prisma.systemTree.findMany()
      const results = []
      let totalChecked = 0
      let totalConfirmed = 0
      for (const systemTree of allSystemTrees) {
        const result = await processSystemDailyEval(systemTree, now, now)
        results.push(result)
        totalChecked += result.checked
        totalConfirmed += result.confirmed
      }

      await prisma.systemConfig.upsert({
        where: { key: LAST_ROUND_KEY },
        update: { value: dueRound.roundNumber.toString() },
        create: { key: LAST_ROUND_KEY, value: dueRound.roundNumber.toString() },
      })

      const { sendTelegramAdmin } = await import('@/lib/notifications')
      await sendTelegramAdmin(
        `✅ <b>[CRON] BRK Level Promotion</b>\n`
        + `🔁 Kỳ 30h: ${dueRound.roundNumber}\n`
        + `📊 Hệ thống: ${results.length} | Kiểm tra: ${totalChecked} | Xác nhận: ${totalConfirmed}\n`
        + `⏰ Eval: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
      )

      return NextResponse.json({
        success: true,
        roundNumber: dueRound.roundNumber,
        systemsProcessed: results.length,
        results,
        checked: totalChecked,
        confirmed: totalConfirmed,
        evalTime: now.toISOString(),
      })
    } finally {
      await releaseLock()
    }
  } catch (error) {
    console.error('BRK level promotion error:', error)
    try {
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      const message = error instanceof Error ? error.message : String(error)
      await sendTelegramAdmin(`❌ <b>[CRON] BRK Level Promotion FAILED</b>\n⚠️ ${message}`)
    } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withCronLogging('brk-level-promotion', handler)
