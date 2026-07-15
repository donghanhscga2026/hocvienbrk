import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import prisma from '@/lib/prisma'
import { distributeCommission } from '@/lib/brk/commission-calculator'
import { checkAndPromoteLevel, create2F1Voucher } from '@/lib/brk/level-manager'
import { creditBrkWallet, creditBrkdWallet } from '@/lib/brk/wallet-service'
import { getAllLevelConfigs } from '@/lib/brk/config-service'
import type { SystemTree } from '@prisma/client'

const BRKD_PER_ACTIVATION = 12_868_686
const LOCK_KEY = 'brk_daily_eval_lock'
const LOCK_TIMEOUT_MS = 120_000 // 2 minutes

function getEvalTime(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day - 1, 23, 8, 0))
}

function getCurrentEvalTime(): Date {
  const now = new Date()
  const todayEval = getEvalTime(now.getFullYear(), now.getMonth(), now.getDate())
  return todayEval <= now ? todayEval : getEvalTime(now.getFullYear(), now.getMonth(), now.getDate() - 1)
}

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

async function processSystem(systemTree: SystemTree, evalTime: Date, now: Date) {
  const onSystem = systemTree.onSystem
  const fee = Number(systemTree.fee)
  const returnPct = Number(systemTree.returnPct || 21)

  const dueMembers = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
      gracePeriodEnd: { lt: now },
    }
  })

  const allConfigs = await getAllLevelConfigs(onSystem)
  const configMap = new Map(allConfigs.map(c => [c.level, c]))

  const BATCH_SIZE = 5
  let confirmed = 0

  for (let i = 0; i < dueMembers.length; i += BATCH_SIZE) {
    const batch = dueMembers.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(async (member) => {
      const returnRefId = `return_fee_sys_${onSystem}_user_${member.userId}`

      const existingReturn = await prisma.brkTransaction.findFirst({
        where: {
          wallet: { userId: member.userId },
          type: 'RETURN_FEE'
        }
      })
      if (existingReturn) return false

      await prisma.system.update({
        where: { userId_onSystem: { userId: member.userId, onSystem } },
        data: { totalPoints: { increment: 17 } }
      })

      const commissionResult = await distributeCommission(member.userId, onSystem, fee, systemTree, evalTime, configMap)

      const returnAmt = (fee * returnPct) / 100
      if (returnAmt > 0) {
        await creditBrkWallet(
          member.userId,
          returnAmt,
          'RETURN_FEE',
          `Hoàn ${returnPct}% phí tham gia sau 1 ngày cân nhắc`,
          returnRefId,
          evalTime
        )

        const brkdReturn = Math.round((BRKD_PER_ACTIVATION * returnPct) / 100)
        if (brkdReturn > 0) {
          const brkdRefId = `return_brkd_sys_${onSystem}_user_${member.userId}`
          await creditBrkdWallet(
            member.userId,
            brkdReturn,
            `BRKD hoàn ${returnPct}% sau 1 ngày cân nhắc`,
            brkdRefId,
            evalTime
          )
        }
      }

      if (member.refSysId > 0) {
        await create2F1Voucher(member.refSysId, onSystem, evalTime)
      }

      await checkAndPromoteLevel(member.userId, onSystem, evalTime, configMap)

      for (const { uplineSystem } of commissionResult.ancestorCredits) {
        await checkAndPromoteLevel(uplineSystem.userId, onSystem, evalTime, configMap)
      }

      return true
    }))
    confirmed += results.filter(Boolean).length
  }

  return { onSystem, checked: dueMembers.length, confirmed }
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
        const result = await processSystem(systemTree, evalTime, now)
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
