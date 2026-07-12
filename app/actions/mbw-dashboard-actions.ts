'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { getLevelProgress } from '@/lib/brk/level-manager'
import { getCommissionsSummary } from '@/lib/affiliate/commission-calculator'

export interface MbwDashboardData {
  user: { name: string | null; email: string | null }
  balance: {
    cash: number
    brkd: number
    voucherBalance: number
    affiliatePending: number
    affiliateAvailable: number
    totalCash: number
  }
  systems: {
    onSystem: number
    nameSystem: string
    level: number
    totalPoints: number
    f1Count: number
    totalDownline: number
    activatedAt: string | null
    expiresAt: string | null
    levelProgress: {
      currentLevel: number
      totalPoints: number
      progress: number
      pointsNeeded: number
      nextLevel: number | null
    } | null
  }[]
  vouchers: {
    id: number
    voucherCode: string
    voucherName: string
    voucherType: string
    expiresAt: string | null
    awardedAt: string
  }[]
  recentTransactions: {
    id: number
    amount: number
    type: string
    description: string
    source: 'BRK' | 'Affiliate'
    createdAt: string
  }[]
  commission: {
    pending: number
    available: number
    withdrawn: number
    totalEarned: number
  }
}

export async function getMbwDashboard(): Promise<MbwDashboardData> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  const userId = Number(session.user.id)

  const [user, brkWallet, affWallet, systems, userVouchers, brkTxns, affTxns, commission] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    }),
    prisma.brkWallet.findUnique({ where: { userId } }),
    prisma.affiliateWallet.findUnique({ where: { userId } }),
    prisma.system.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { systemTree: { select: { onSystem: true, nameSystem: true } } }
    }),
    prisma.userVoucher.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { voucher: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.brkTransaction.findMany({
      where: { wallet: { userId } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, type: true, description: true, createdAt: true }
    }),
    prisma.affiliateTransaction.findMany({
      where: { wallet: { userId } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, type: true, description: true, createdAt: true }
    }),
    getCommissionsSummary(userId),
  ])

  const f1Counts = await Promise.all(
    systems.map((sys: any) =>
      prisma.systemClosure.count({
        where: { ancestorId: sys.autoId, depth: 1, systemId: sys.onSystem }
      })
    )
  )

  const brkBalance = Number(brkWallet?.balance ?? 0)
  const brkdBalance = Number(brkWallet?.brkd ?? 0)
  const voucherBalance = Number(brkWallet?.voucherBalance ?? 0)
  const affPending = Number(affWallet?.pendingBalance ?? 0)
  const affAvailable = Number(affWallet?.balance ?? 0)

  const systemInfos = await Promise.all(
    systems.map(async (sys: any, idx: number) => {
      const lp = await getLevelProgress(userId, sys.onSystem)
      const totalDownline = await prisma.systemClosure.count({
        where: { ancestorId: sys.autoId, depth: { gte: 1 }, systemId: sys.onSystem }
      })
      return {
        onSystem: sys.onSystem,
        nameSystem: sys.systemTree.nameSystem,
        level: sys.level,
        totalPoints: Number(sys.totalPoints),
        f1Count: f1Counts[idx],
        totalDownline,
        activatedAt: sys.activatedAt?.toISOString() || null,
        expiresAt: sys.expiresAt?.toISOString() || null,
        levelProgress: lp ? {
          currentLevel: lp.currentLevel,
          totalPoints: lp.totalPoints,
          progress: lp.progress,
          pointsNeeded: lp.pointsNeeded,
          nextLevel: lp.nextConfig?.level ?? null,
        } : null,
      }
    })
  )

  // Merge + sort transactions
  const mergedTxns = [
    ...brkTxns.map((t: any) => ({
      id: t.id,
      amount: Number(t.amount),
      type: String(t.type),
      description: t.description,
      source: 'BRK' as const,
      createdAt: t.createdAt.toISOString(),
    })),
    ...affTxns.map((t: any) => ({
      id: t.id + 1000000,
      amount: t.amount,
      type: String(t.type),
      description: t.description,
      source: 'Affiliate' as const,
      createdAt: t.createdAt.toISOString(),
    })),
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)

  return {
    user: { name: user?.name ?? null, email: user?.email ?? null },
    balance: {
      cash: brkBalance,
      brkd: brkdBalance,
      voucherBalance,
      affiliatePending: affPending,
      affiliateAvailable: affAvailable,
      totalCash: brkBalance + affAvailable,
    },
    systems: systemInfos,
    vouchers: userVouchers.map((uv: any) => ({
      id: uv.id,
      voucherCode: uv.voucher.code,
      voucherName: uv.voucher.name,
      voucherType: uv.voucher.type,
      expiresAt: uv.expiresAt?.toISOString() || null,
      awardedAt: uv.createdAt.toISOString(),
    })),
    recentTransactions: mergedTxns,
    commission,
  }
}
