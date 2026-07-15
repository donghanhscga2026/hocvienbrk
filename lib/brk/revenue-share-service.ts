'use server'

import prisma from '@/lib/prisma'
import { creditBrkWallet, creditBrkdWallet } from './wallet-service'

export async function processRevenueShareForSystem(onSystem: number, distributedAt?: Date) {
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  if (!systemTree) return { processed: false, reason: 'System not found' }

  const distDate = distributedAt || new Date()
  const intervalDays = systemTree.revenueShareIntervalDays || 3
  const sharePct = Number(systemTree.revenueSharePct || 2.0)
  const periodStart = new Date(distDate.getTime() - intervalDays * 24 * 60 * 60 * 1000)
  const periodEnd = distDate

  // Check if Method B (need to filter by gracePeriodEnd)
  const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
  const isOptionB = promoConfig?.value === 'B'

  const lastPool = await prisma.brkRevenuePool.findFirst({
    where: { systemId: onSystem },
    orderBy: { roundNumber: 'desc' }
  })
  const roundNumber = (lastPool?.roundNumber || 0) + 1

  const newActivationsQuery: any = {
    onSystem,
    status: 'ACTIVE',
    activatedAt: {
      gte: periodStart,
      lt: periodEnd
    }
  }
  if (isOptionB) {
    newActivationsQuery.gracePeriodEnd = { lt: distDate }
  }

  const newActivations = await prisma.system.findMany({
    where: newActivationsQuery
  })

  const totalRevenue = newActivations.length * Number(systemTree.fee)
  if (totalRevenue <= 0) {
    await prisma.brkRevenuePool.create({
      data: {
        systemId: onSystem,
        roundNumber,
        periodStart,
        periodEnd,
        totalRevenue: 0,
        poolAmount: 0,
        qualifiedCount: 0,
        status: 'DISTRIBUTED',
        distributedAt: distDate,
      }
    })
    return { processed: true, poolAmount: 0, qualifiedCount: 0 }
  }

  const poolAmount = (totalRevenue * sharePct) / 100

  const activeMembers = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
      gracePeriodEnd: { lte: periodEnd }, // Phải chính thức hết cân nhắc trong kỳ này
      activatedAt: { lte: periodEnd },
      expiresAt: { gte: periodStart }
    }
  })

  const qualified: typeof activeMembers = []
  for (const member of activeMembers) {
    const f1Count = await prisma.systemClosure.count({
      where: {
        ancestorId: member.autoId,
        depth: 1,
        systemId: onSystem,
        descendant: {
          status: 'ACTIVE',
          gracePeriodEnd: { lte: periodEnd } // F1 con cũng phải chính thức hết cân nhắc
        }
      }
    })
    if (f1Count >= 1) {
      qualified.push(member)
    }
  }

  const qualifiedCount = qualified.length
  if (qualifiedCount === 0) {
    await prisma.brkRevenuePool.create({
      data: {
        systemId: onSystem,
        roundNumber,
        periodStart,
        periodEnd,
        totalRevenue,
        poolAmount,
        qualifiedCount: 0,
        status: 'DISTRIBUTED',
        distributedAt: distDate,
      }
    })
    return { processed: true, poolAmount, qualifiedCount: 0 }
  }

  const amountPerPerson = Math.floor((poolAmount * 100) / qualifiedCount) / 100

  const pool = await prisma.brkRevenuePool.create({
    data: {
      systemId: onSystem,
      roundNumber,
      periodStart,
      periodEnd,
      totalRevenue,
      poolAmount,
      qualifiedCount,
      status: 'DISTRIBUTED',
      distributedAt: distDate,
    }
  })

  const BRKD_PER_ACTIVATION = 12_868_686

  let totalBrkdRevenue = 0
  for (const act of newActivations) {
    const returnBrkdRefId = `return_brkd_sys_${onSystem}_user_${act.userId}`
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: act.userId } })
    let mMBDT = BRKD_PER_ACTIVATION
    if (wallet) {
      const returnBrkdTx = await prisma.brkTransaction.findFirst({
        where: { walletId: wallet.id, refId: returnBrkdRefId }
      })
      if (returnBrkdTx) {
        // Reverse refund percent to reconstruct original MBDT
        mMBDT = Math.round(Number(returnBrkdTx.amount) / (Number(systemTree.returnPct || 21) / 100))
      }
    }
    totalBrkdRevenue += mMBDT
  }

  const brkdPoolAmount = (totalBrkdRevenue * sharePct) / 100
  const brkdShare = Math.round(brkdPoolAmount / qualifiedCount)

  for (const member of qualified) {
    await creditBrkWallet(
      member.userId,
      amountPerPerson,
      'REVENUE_SHARE',
      `Chia đều doanh thu kỳ ${roundNumber} (${sharePct}% của ${totalRevenue}$)`,
      `pool_${pool.id}`
    )

    // BRKD calculated directly from BRKD pool
    if (brkdShare > 0) {
      await creditBrkdWallet(
        member.userId,
        brkdShare,
        `BRKD chia doanh thu kỳ ${roundNumber}`,
        `pool_${pool.id}`
      )
    }

    await prisma.brkRevenueAward.create({
      data: {
        poolId: pool.id,
        userId: member.userId,
        amount: amountPerPerson,
        paid: true,
      }
    })
  }

  return { processed: true, poolAmount, qualifiedCount, amountPerPerson, roundNumber }
}

export async function processAllBrkRevenueShares() {
  const brkSystems = await prisma.systemTree.findMany({
    where: { fee: { gt: 0 } }
  })

  const results = []
  for (const sys of brkSystems) {
    const result = await processRevenueShareForSystem(sys.onSystem)
    results.push({ systemId: sys.onSystem, ...result })
  }
  return results
}

export async function getRevenueShareHistory(userId: number, onSystem: number, limit = 20) {
  const awards = await prisma.brkRevenueAward.findMany({
    where: { userId },
    include: {
      pool: {
        select: {
          systemId: true,
          roundNumber: true,
          totalRevenue: true,
          poolAmount: true,
          qualifiedCount: true,
          distributedAt: true,
        }
      }
    },
    orderBy: { pool: { roundNumber: 'desc' } },
    take: limit
  })

  return awards.filter(a => a.pool.systemId === onSystem)
}
