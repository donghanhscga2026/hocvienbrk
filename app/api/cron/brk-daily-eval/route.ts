import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { distributeCommission } from '@/lib/brk/commission-calculator'
import { checkAndPromoteLevel, create2F1Voucher } from '@/lib/brk/level-manager'
import { creditBrkWallet, creditBrkdWallet } from '@/lib/brk/wallet-service'

const BRKD_PER_ACTIVATION = 12_868_686

// 06:08 AM Vietnam (UTC+7) = 23:08 UTC previous day
function getEvalTime(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day - 1, 23, 8, 0))
}

function getCurrentEvalTime(): Date {
  const now = new Date()
  const todayEval = getEvalTime(now.getFullYear(), now.getMonth(), now.getDate())
  return todayEval <= now ? todayEval : getEvalTime(now.getFullYear(), now.getMonth(), now.getDate() - 1)
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
    if (!promoConfig || promoConfig.value !== 'B') {
      return NextResponse.json({ success: true, reason: 'Not Method B, skipping' })
    }

    const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } })
    if (!systemTree) return NextResponse.json({ success: false, reason: 'System tree not found' })

    const fee = Number(systemTree.fee)
    const returnPct = Number(systemTree.returnPct || 21)
    const evalTime = getCurrentEvalTime()
    const now = new Date()

    // Find members whose grace period has ended but haven't been confirmed yet
    const dueMembers = await prisma.system.findMany({
      where: {
        onSystem: 4,
        status: 'ACTIVE',
        gracePeriodEnd: { lt: now },
      }
    })

    let confirmed = 0
    for (const member of dueMembers) {
      // Check if already confirmed (look for RETURN_FEE as marker)
      const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
      if (wallet) {
        const existingReturn = await prisma.brkTransaction.findFirst({
          where: { walletId: wallet.id, type: 'RETURN_FEE' }
        })
        if (existingReturn) continue
      }

      // Credit self points (MP) — not awarded until now (previously 0)
      await prisma.system.update({
        where: { userId_onSystem: { userId: member.userId, onSystem: 4 } },
        data: { totalPoints: { increment: 17 } }
      })

      // Distribute commissions + BRKP to ancestors
      await distributeCommission(member.userId, 4, fee, systemTree, evalTime)

      // Return fee 21% to member
      const returnAmt = (fee * returnPct) / 100
      if (returnAmt > 0) {
        await creditBrkWallet(
          member.userId,
          returnAmt,
          'RETURN_FEE',
          `Hoàn ${returnPct}% phí tham gia sau 1 ngày cân nhắc`,
          undefined,
          evalTime
        )

        const brkdReturn = Math.round((BRKD_PER_ACTIVATION * returnPct) / 100)
        if (brkdReturn > 0) {
          await creditBrkdWallet(
            member.userId,
            brkdReturn,
            `BRKD hoàn ${returnPct}% sau 1 ngày cân nhắc`,
            undefined,
            evalTime
          )
        }
      }

      // 2F1 voucher for referrer
      if (member.refSysId > 0) {
        await create2F1Voucher(member.refSysId, 4, evalTime)
      }

      // Level-up for the confirmed member
      await checkAndPromoteLevel(member.userId, 4, evalTime)

      // Level-up for ancestors (their points just increased from commission distribution)
      const closures = await prisma.systemClosure.findMany({
        where: { descendantId: member.autoId, depth: { gte: 1 }, systemId: 4 }
      })
      const ancestorSystems = await prisma.system.findMany({
        where: { autoId: { in: closures.map(c => c.ancestorId) } }
      })
      for (const ancestor of ancestorSystems) {
        await checkAndPromoteLevel(ancestor.userId, 4, evalTime)
      }

      confirmed++
    }

    return NextResponse.json({
      success: true,
      checked: dueMembers.length,
      confirmed,
      evalTime: evalTime.toISOString()
    })
  } catch (error) {
    console.error('BRK daily eval error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
