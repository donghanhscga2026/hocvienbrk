'use server'

import prisma from '@/lib/prisma'
import type { BrkTransactionType, BalanceType } from '@prisma/client'

export async function ensureBrkWallet(userId: number) {
  let wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  if (!wallet) {
    wallet = await prisma.brkWallet.create({
      data: { userId }
    })
  }
  return wallet
}

export async function getBrkWallet(userId: number) {
  return prisma.brkWallet.findUnique({ where: { userId } })
}

async function creditBalance(
  userId: number,
  amount: number,
  balanceType: BalanceType,
  type: BrkTransactionType,
  description: string,
  refId?: string,
  createdAt?: Date,
  sourceMemberId?: number,
  applicationId?: number
) {
  await ensureBrkWallet(userId)
  const field = balanceType === 'BRKD' ? 'brkd' : balanceType === 'VOUCHER' ? 'voucherBalance' : 'balance'

  const [updated] = await prisma.$transaction(async (tx) => {
    // Read wallet INSIDE transaction to prevent race condition
    const wallet = await tx.brkWallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('Wallet not found')

    const oldVal = Number(wallet[field])
    const newVal = oldVal + amount

    const updateData: Record<string, any> = { [field]: newVal }
    if (balanceType === 'CASH') {
      updateData.totalEarned = { increment: amount }
    }

    const [updatedWallet] = await Promise.all([
      tx.brkWallet.update({ where: { userId }, data: updateData }),
      tx.brkTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type,
          description,
          refId,
          sourceMemberId,
          applicationId,
          balanceType,
          balanceBefore: oldVal,
          balanceAfter: newVal,
          createdAt,
        }
      })
    ])

    return [updatedWallet] as const
  }, { timeout: 30000 })

  try {
    const { logActivity } = await import('@/lib/activity-logger')
    await logActivity({
      userId,
      action: 'WALLET_CHANGE',
      detail: `${balanceType} +${amount.toLocaleString()}đ: ${description}`,
      metadata: { balanceType, amount, type, refId }
    })
  } catch {}

  return updated
}

export async function creditBrkWallet(
  userId: number,
  amount: number,
  type: BrkTransactionType,
  description: string,
  refId?: string,
  createdAt?: Date,
  sourceMemberId?: number,
  applicationId?: number
) {
  return creditBalance(userId, amount, 'CASH', type, description, refId, createdAt, sourceMemberId, applicationId)
}

export async function creditBrkdWallet(
  userId: number,
  amount: number,
  description: string,
  refId?: string,
  createdAt?: Date,
  sourceMemberId?: number,
  applicationId?: number
) {
  return creditBalance(userId, amount, 'BRKD', 'BRKD_CREDIT', description, refId, createdAt, sourceMemberId, applicationId)
}

export async function creditVoucherWallet(
  userId: number,
  amount: number,
  description: string,
  refId?: string,
  createdAt?: Date,
  sourceMemberId?: number,
  applicationId?: number
) {
  return creditBalance(userId, amount, 'VOUCHER', 'VOUCHER_CREDIT', description, refId, createdAt, sourceMemberId, applicationId)
}

export async function debitBrkWallet(
  userId: number,
  amount: number,
  type: BrkTransactionType,
  description: string,
  refId?: string,
  sourceMemberId?: number
) {
  await ensureBrkWallet(userId)

  const [updated] = await prisma.$transaction(async (tx) => {
    // Read wallet INSIDE transaction to prevent race condition
    const wallet = await tx.brkWallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('Wallet not found')
    if (Number(wallet.balance) < amount) {
      throw new Error('Số dư BRK wallet không đủ')
    }
    const newBalance = Number(wallet.balance) - amount

    const [updatedWallet] = await Promise.all([
      tx.brkWallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          totalWithdrawn: { increment: amount }
        }
      }),
      tx.brkTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type,
          description,
          refId,
          sourceMemberId,
          balanceType: 'CASH',
          balanceBefore: Number(wallet.balance),
          balanceAfter: newBalance,
        }
      })
    ])

    return [updatedWallet] as const
  }, { timeout: 30000 })

  try {
    const { logActivity } = await import('@/lib/activity-logger')
    await logActivity({
      userId,
      action: 'WALLET_CHANGE',
      detail: `CASH -${amount.toLocaleString()}đ: ${description}`,
      metadata: { balanceType: 'CASH', amount: -amount, type, refId }
    })
  } catch {}

  return updated
}

export async function getBrkTransactionHistory(userId: number, limit = 50) {
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  if (!wallet) return []
  return prisma.brkTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
}

export async function getSystemSnapshotAt(userId: number, onSystem: number, at: Date) {
  const system = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } },
  })
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  if (!system) {
    return { cash: 0, brkd: 0, brkp: 0, teamSize: 0, brkdVolume: 0, cashVolume: 0 }
  }

  return {
    cash: wallet ? Number(wallet.balance) : 0,
    brkd: wallet ? Number(wallet.brkd) : 0,
    brkp: Number(system.totalPoints || 0),
    teamSize: system.officialTeamSize,
    brkdVolume: Number(system.totalMbdtVolume),
    cashVolume: Number(system.totalCashVolume),
  }
}

export async function makeSystemSnapshotDescription(
  userId: number,
  onSystem: number,
  event: string,
  title: string,
  desc: string,
  extra: any = {},
  overrides: any = {}
) {
  const system = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  
  const snapshot = await getSystemSnapshotAt(userId, onSystem, new Date())
  const teamCount = snapshot.teamSize

  const cash = (wallet ? Number(wallet.balance) : 0) + (overrides.cash ?? 0)
  const brkd = (wallet ? Number(wallet.brkd) : 0) + (overrides.brkd ?? 0)
  const voucher = (wallet ? Number(wallet.voucherBalance) : 0) + (overrides.voucher ?? 0)

  return JSON.stringify({
    sys4: true,
    event,
    title,
    desc,
    level: system?.level ?? 0,
    points: Number(system?.totalPoints ?? 0),
    teamCount,
    balances: {
      cash,
      brkd,
      voucher
    },
    extra
  })
}

export async function createBrkTimelineRecord(data: {
  userId: number
  onSystem: number
  type: string
  time: Date
  title: string
  description: string
  accumulatedCash?: number
  accumulatedBrkd?: number
  accumulatedBrkp?: number
  accumulatedTeamSize?: number
  accumulatedBrkdVolume?: number
  accumulatedCashVolume?: number
  amountCash?: number
  amountBrkd?: number
  amountVoucher?: number
  txType?: string
  targetMemberId?: number
  targetMemberName?: string
  pathStr?: string
  fromLevel?: number
  toLevel?: number
  sourceMemberId?: number
  eventStatus?: string
  eventMbp?: number
  eventMbdtVolume?: number
  eventCashVolume?: number
  applicationId?: number
}) {
  let cash = data.accumulatedCash
  let brkd = data.accumulatedBrkd
  let brkp = data.accumulatedBrkp
  let teamSize = data.accumulatedTeamSize
  let brkdVol = data.accumulatedBrkdVolume
  let cashVol = data.accumulatedCashVolume

  if (data.applicationId != null) {
    const snapshot = await getSystemSnapshotAt(data.userId, data.onSystem, data.time)
    if (cash === undefined) cash = snapshot.cash
    if (brkd === undefined) brkd = snapshot.brkd
    if (brkp === undefined) brkp = snapshot.brkp
    if (teamSize === undefined) teamSize = snapshot.teamSize
    if (brkdVol === undefined) brkdVol = snapshot.brkdVolume
    if (cashVol === undefined) cashVol = snapshot.cashVolume
  } else {
    const [system, wallet, lastRec] = await Promise.all([
      prisma.system.findUnique({ where: { userId_onSystem: { userId: data.userId, onSystem: data.onSystem } } }),
      prisma.brkWallet.findUnique({ where: { userId: data.userId } }),
      prisma.brkTimelineRecord.findFirst({
        where: { userId: data.userId, onSystem: data.onSystem },
        orderBy: { id: 'desc' },
      }),
    ])
    if (cash === undefined) cash = wallet ? Number(wallet.balance) : 0
    if (brkd === undefined) brkd = wallet ? Number(wallet.brkd) : 0
    if (brkp === undefined) brkp = system ? Number(system.totalPoints) : 0
    if (teamSize === undefined) {
      teamSize = lastRec
        ? lastRec.accumulatedTeamSize + (data.type === 'ACTIVATION' || data.txType === 'ADJUSTMENT' ? 1 : 0)
        : 1
    }
    if (brkdVol === undefined || cashVol === undefined) {
      brkdVol = lastRec ? Number(lastRec.accumulatedBrkdVolume) : 0
      cashVol = lastRec ? Number(lastRec.accumulatedCashVolume) : 0
      if (data.type === 'TRANSACTION' && data.txType === 'RETURN_FEE') {
        const sysTree = await prisma.systemTree.findUnique({ where: { onSystem: data.onSystem }, select: { fee: true } })
        brkdVol += data.amountBrkd ? Math.round(data.amountBrkd / 0.21) : 0
        cashVol += sysTree ? Number(sysTree.fee) : 26866666
      }
    }
  }

  const created = await prisma.brkTimelineRecord.create({
    data: {
      userId: data.userId,
      onSystem: data.onSystem,
      type: data.type,
      time: data.time,
      title: data.title,
      description: data.description,
      accumulatedCash: cash,
      accumulatedBrkd: brkd,
      accumulatedBrkp: brkp,
      accumulatedTeamSize: teamSize,
      accumulatedBrkdVolume: brkdVol,
      accumulatedCashVolume: cashVol,
      amountCash: data.amountCash ?? 0,
      amountBrkd: data.amountBrkd ?? 0,
      amountVoucher: data.amountVoucher ?? 0,
      txType: data.txType,
      targetMemberId: data.targetMemberId,
      targetMemberName: data.targetMemberName,
      pathStr: data.pathStr,
      fromLevel: data.fromLevel,
      toLevel: data.toLevel,
      sourceMemberId: data.sourceMemberId,
      eventStatus: data.eventStatus,
      eventMbp: data.eventMbp ?? 0,
      eventMbdtVolume: data.eventMbdtVolume ?? 0,
      eventCashVolume: data.eventCashVolume ?? 0,
      applicationId: data.applicationId,
    }
  })

  return created
}
