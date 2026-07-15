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
  createdAt?: Date
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
          balanceType,
          balanceBefore: oldVal,
          balanceAfter: newVal,
          createdAt,
        }
      })
    ])

    return [updatedWallet] as const
  })

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
  createdAt?: Date
) {
  return creditBalance(userId, amount, 'CASH', type, description, refId, createdAt)
}

export async function creditBrkdWallet(
  userId: number,
  amount: number,
  description: string,
  refId?: string,
  createdAt?: Date
) {
  return creditBalance(userId, amount, 'BRKD', 'BRKD_CREDIT', description, refId, createdAt)
}

export async function creditVoucherWallet(
  userId: number,
  amount: number,
  description: string,
  refId?: string,
  createdAt?: Date
) {
  return creditBalance(userId, amount, 'VOUCHER', 'VOUCHER_CREDIT', description, refId, createdAt)
}

export async function debitBrkWallet(
  userId: number,
  amount: number,
  type: BrkTransactionType,
  description: string,
  refId?: string
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
          balanceType: 'CASH',
          balanceBefore: Number(wallet.balance),
          balanceAfter: newBalance,
        }
      })
    ])

    return [updatedWallet] as const
  })

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
