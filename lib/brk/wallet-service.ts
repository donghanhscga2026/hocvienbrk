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
  refId?: string
) {
  const wallet = await ensureBrkWallet(userId)
  const field = balanceType === 'BRKD' ? 'brkd' : balanceType === 'VOUCHER' ? 'voucherBalance' : 'balance'

  const oldVal = Number(wallet[field])
  const newVal = oldVal + amount

  const updateData: Record<string, any> = { [field]: newVal }
  if (balanceType === 'CASH') {
    updateData.totalEarned = { increment: amount }
  }

  const [updated] = await prisma.$transaction([
    prisma.brkWallet.update({
      where: { userId },
      data: updateData
    }),
    prisma.brkTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type,
        description,
        refId,
        balanceType,
        balanceBefore: oldVal,
        balanceAfter: newVal,
      }
    })
  ])

  return updated
}

export async function creditBrkWallet(
  userId: number,
  amount: number,
  type: BrkTransactionType,
  description: string,
  refId?: string
) {
  return creditBalance(userId, amount, 'CASH', type, description, refId)
}

export async function creditBrkdWallet(
  userId: number,
  amount: number,
  description: string,
  refId?: string
) {
  return creditBalance(userId, amount, 'BRKD', 'BRKD_CREDIT', description, refId)
}

export async function creditVoucherWallet(
  userId: number,
  amount: number,
  description: string,
  refId?: string
) {
  return creditBalance(userId, amount, 'VOUCHER', 'VOUCHER_CREDIT', description, refId)
}

export async function debitBrkWallet(
  userId: number,
  amount: number,
  type: BrkTransactionType,
  description: string,
  refId?: string
) {
  const wallet = await ensureBrkWallet(userId)
  if (Number(wallet.balance) < amount) {
    throw new Error('Số dư BRK wallet không đủ')
  }
  const newBalance = Number(wallet.balance) - amount

  const [updated] = await prisma.$transaction([
    prisma.brkWallet.update({
      where: { userId },
      data: {
        balance: newBalance,
        totalWithdrawn: { increment: amount }
      }
    }),
    prisma.brkTransaction.create({
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
