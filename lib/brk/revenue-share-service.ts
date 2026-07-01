'use server'

import prisma from '@/lib/prisma'
import { creditBrkWallet } from './wallet-service'

export async function processRevenueShareForSystem(onSystem: number) {
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  if (!systemTree) return { processed: false, reason: 'System not found' }

  const intervalDays = systemTree.revenueShareIntervalDays || 3
  const sharePct = Number(systemTree.revenueSharePct || 2.0)
  const now = new Date()
  const periodStart = new Date(now.getTime() - intervalDays * 24 * 60 * 60 * 1000)
  const periodEnd = now

  const lastPool = await prisma.brkRevenuePool.findFirst({
    where: { systemId: onSystem },
    orderBy: { roundNumber: 'desc' }
  })
  const roundNumber = (lastPool?.roundNumber || 0) + 1

  const newActivations = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
      activatedAt: {
        gte: periodStart,
        lte: periodEnd
      }
    }
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
        distributedAt: now,
      }
    })
    return { processed: true, poolAmount: 0, qualifiedCount: 0 }
  }

  const poolAmount = (totalRevenue * sharePct) / 100

  const activeMembers = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
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
        systemId: onSystem
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
        distributedAt: now,
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
      distributedAt: now,
    }
  })

  for (const member of qualified) {
    await creditBrkWallet(
      member.userId,
      amountPerPerson,
      'REVENUE_SHARE',
      `Chia đều doanh thu kỳ ${roundNumber} (${sharePct}% của ${totalRevenue}$)`,
      `pool_${pool.id}`
    )

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
