'use server'

import prisma from '@/lib/prisma'
import {
  creditBrkWallet,
  creditBrkdWallet,
  makeSystemSnapshotDescription,
  createBrkTimelineRecord,
} from './wallet-service'
import { getEffectivePlanApplication, MB_TCA_PLAN_CODE } from './business-plan-service'

const DONG_CHIA_SYSTEM_ID = 4
const DONG_CHIA_INTERVAL_MS = 7 * 60 * 60 * 1000

function configString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function getDongChiaPeriod(runTime: Date, applicationStartsAt?: Date) {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'dongchia_start_time' },
  })
  const rawStart = configString(config?.value)
  if (!applicationStartsAt && !rawStart) throw new Error('Missing dongchia_start_time config')

  const startTime = applicationStartsAt ?? new Date(rawStart!)
  if (Number.isNaN(startTime.getTime())) {
    throw new Error('Invalid dongchia_start_time config')
  }

  const completedRound = Math.floor(
    (runTime.getTime() - startTime.getTime()) / DONG_CHIA_INTERVAL_MS,
  ) - 1
  if (completedRound < 0) return null

  const periodStart = new Date(
    startTime.getTime() + completedRound * DONG_CHIA_INTERVAL_MS,
  )
  return {
    roundNumber: completedRound,
    periodStart,
    periodEnd: new Date(periodStart.getTime() + DONG_CHIA_INTERVAL_MS),
  }
}

async function syncDongChiaMembers(onSystem: number, at: Date, applicationId?: number) {
  const officialEvents = await prisma.brkTimelineRecord.findMany({
    where: { onSystem, eventStatus: 'OFFICIAL', time: { lte: at }, applicationId: applicationId ?? null },
    distinct: ['userId'],
    select: { userId: true },
  })
  const officialUserIds = officialEvents.map(event => event.userId)
  const officialMembers = await prisma.system.findMany({
    where: {
      onSystem,
      applicationId: applicationId ?? null,
      userId: { in: officialUserIds },
      status: 'ACTIVE',
      expiresAt: { gte: at },
    },
    select: { autoId: true },
  })

  const qualifiedIds: number[] = []
  for (const member of officialMembers) {
    const officialF1Count = await prisma.systemClosure.count({
      where: {
        ancestorId: member.autoId,
        systemId: onSystem,
        depth: 1,
        descendant: {
          userId: { in: officialUserIds },
          status: 'ACTIVE',
          expiresAt: { gte: at },
        },
      },
    })
    if (officialF1Count > 0) qualifiedIds.push(member.autoId)
  }

  await prisma.$transaction([
    prisma.system.updateMany({
      where: { onSystem, applicationId: applicationId ?? null, inDongChia: true },
      data: { inDongChia: false },
    }),
    prisma.system.updateMany({
      where: { autoId: { in: qualifiedIds } },
      data: { inDongChia: true },
    }),
  ])

  return prisma.system.findMany({
    where: { autoId: { in: qualifiedIds } },
    select: { autoId: true, userId: true },
  })
}

async function getOfficialRevenue(
  onSystem: number,
  periodStart: Date,
  periodEnd: Date,
  applicationId?: number,
) {
  const aggregate = await prisma.brkTimelineRecord.aggregate({
    where: {
      onSystem,
      eventStatus: 'OFFICIAL',
      applicationId: applicationId ?? null,
      time: { gte: periodStart, lt: periodEnd },
    },
    _count: { _all: true },
    _sum: { eventCashVolume: true, eventMbdtVolume: true },
  })

  return {
    officialCount: aggregate._count._all,
    totalCashRevenue: Number(aggregate._sum.eventCashVolume || 0),
    totalMbdtRevenue: Number(aggregate._sum.eventMbdtVolume || 0),
  }
}

async function hasPoolCredit(userId: number, refId: string, balanceType: 'CASH' | 'BRKD') {
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  if (!wallet) return false
  const transaction = await prisma.brkTransaction.findFirst({
    where: { walletId: wallet.id, refId, balanceType },
    select: { id: true },
  })
  return Boolean(transaction)
}

export async function processRevenueShareForSystem(
  onSystem: number,
  distributedAt: Date = new Date(),
  applicationId?: number,
) {
  if (onSystem !== DONG_CHIA_SYSTEM_ID) {
    return { processed: false, reason: 'Dong chia only applies to system 4' }
  }

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  if (!systemTree) return { processed: false, reason: 'System not found' }

  const planApplication = applicationId != null
    ? await prisma.systemPlanApplication.findUnique({ where: { id: applicationId } })
    : null
  const period = await getDongChiaPeriod(distributedAt, planApplication?.startsAt)
  if (!period) return { processed: false, reason: 'Dong chia has not started' }

  const existingPool = applicationId != null
    ? await prisma.brkRevenuePool.findFirst({ where: { applicationId, roundNumber: period.roundNumber } })
    : await prisma.brkRevenuePool.findFirst({
      where: { systemId: onSystem, applicationId: null, roundNumber: period.roundNumber },
    })
  if (existingPool?.status === 'DISTRIBUTED') {
    return {
      processed: false,
      reason: 'Round already distributed',
      roundNumber: period.roundNumber,
    }
  }
  if (existingPool && (
    existingPool.periodStart.getTime() !== period.periodStart.getTime()
    || existingPool.periodEnd.getTime() !== period.periodEnd.getTime()
  )) {
    throw new Error(`Round ${period.roundNumber} conflicts with legacy revenue pool`)
  }

  const qualified = await syncDongChiaMembers(onSystem, period.periodEnd, applicationId)
  const revenue = await getOfficialRevenue(
    onSystem,
    period.periodStart,
    period.periodEnd,
    applicationId,
  )
  const sharePct = Number(systemTree.revenueSharePct || 2)
  const cashPoolAmount = (revenue.totalCashRevenue * sharePct) / 100
  const mbdtPoolAmount = (revenue.totalMbdtRevenue * sharePct) / 100
  const amountCash = qualified.length > 0
    ? Math.floor((cashPoolAmount * 100) / qualified.length) / 100
    : 0
  const amountBrkd = qualified.length > 0
    ? Math.floor(mbdtPoolAmount / qualified.length)
    : 0

  const pool = existingPool ?? await prisma.brkRevenuePool.create({
    data: {
      systemId: onSystem,
      applicationId,
      roundNumber: period.roundNumber,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      totalRevenue: revenue.totalCashRevenue,
      poolAmount: cashPoolAmount,
      qualifiedCount: qualified.length,
      status: 'PENDING',
    },
  })

  for (const member of qualified) {
    const cashRefId = `dongchia_pool_${pool.id}_cash`
    const brkdRefId = `dongchia_pool_${pool.id}_brkd`
    const description = await makeSystemSnapshotDescription(
      member.userId,
      onSystem,
      'REVENUE_SHARE',
      'Đồng chia 2%',
      `Đồng chia 2% kỳ ${period.roundNumber}`,
      {},
      { cash: amountCash, brkd: amountBrkd },
    )

    if (amountCash > 0 && !(await hasPoolCredit(member.userId, cashRefId, 'CASH'))) {
      await creditBrkWallet(
        member.userId,
        amountCash,
        'REVENUE_SHARE',
        description,
        cashRefId,
        period.periodEnd,
        undefined,
        applicationId,
      )
    }
    if (amountBrkd > 0 && !(await hasPoolCredit(member.userId, brkdRefId, 'BRKD'))) {
      await creditBrkdWallet(
        member.userId,
        amountBrkd,
        description,
        brkdRefId,
        period.periodEnd,
        undefined,
        applicationId,
      )
    }

    const existingAward = await prisma.brkRevenueAward.findFirst({
      where: { poolId: pool.id, userId: member.userId },
    })
    if (!existingAward) {
      await prisma.brkRevenueAward.create({
        data: {
          poolId: pool.id,
          userId: member.userId,
          applicationId,
          amount: amountCash,
          paid: true,
        },
      })
    }

    const existingTimeline = await prisma.brkTimelineRecord.findFirst({
      where: {
        userId: member.userId,
        onSystem,
        time: period.periodEnd,
        txType: 'REVENUE_SHARE',
        applicationId,
      },
    })
    if (!existingTimeline) {
      await createBrkTimelineRecord({
        userId: member.userId,
        onSystem,
        type: 'TRANSACTION',
        time: period.periodEnd,
        title: 'Đồng chia 2%',
        description: `Đồng chia 2% kỳ ${period.roundNumber}`,
        amountCash,
        amountBrkd,
        txType: 'REVENUE_SHARE',
        applicationId,
      })
    }
  }

  await prisma.brkRevenuePool.update({
    where: { id: pool.id },
    data: {
      totalRevenue: revenue.totalCashRevenue,
      poolAmount: cashPoolAmount,
      qualifiedCount: qualified.length,
      status: 'DISTRIBUTED',
      distributedAt,
    },
  })

  return {
    processed: true,
    roundNumber: period.roundNumber,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    officialCount: revenue.officialCount,
    qualifiedCount: qualified.length,
    totalCashRevenue: revenue.totalCashRevenue,
    totalMbdtRevenue: revenue.totalMbdtRevenue,
    cashPoolAmount,
    mbdtPoolAmount,
    amountCash,
    amountBrkd,
  }
}

export async function processAllBrkRevenueShares(runTime: Date = new Date()) {
  const application = await getEffectivePlanApplication(DONG_CHIA_SYSTEM_ID, runTime)
  const applicationId = application?.businessPlan.code === MB_TCA_PLAN_CODE ? application.id : undefined
  const result = await processRevenueShareForSystem(DONG_CHIA_SYSTEM_ID, runTime, applicationId)
  return [{ systemId: DONG_CHIA_SYSTEM_ID, ...result }]
}

export async function getRevenueShareHistory(userId: number, onSystem: number, limit = 20) {
  const awards = await prisma.brkRevenueAward.findMany({
    where: { userId, pool: { systemId: onSystem } },
    include: {
      pool: {
        select: {
          systemId: true,
          roundNumber: true,
          totalRevenue: true,
          poolAmount: true,
          qualifiedCount: true,
          distributedAt: true,
        },
      },
    },
    orderBy: { pool: { roundNumber: 'desc' } },
    take: limit,
  })
  return awards
}
