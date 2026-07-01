'use server'

import prisma from '@/lib/prisma'
import type { BrkTransactionType } from '@prisma/client'

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

export async function creditBrkWallet(
  userId: number,
  amount: number,
  type: BrkTransactionType,
  description: string,
  refId?: string
) {
  const wallet = await ensureBrkWallet(userId)
  const newBalance = Number(wallet.balance) + amount

  const [updated] = await prisma.$transaction([
    prisma.brkWallet.update({
      where: { userId },
      data: {
        balance: newBalance,
        totalEarned: { increment: amount }
      }
    }),
    prisma.brkTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type,
        description,
        refId,
        balanceBefore: Number(wallet.balance),
        balanceAfter: newBalance,
      }
    })
  ])

  return updated
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
