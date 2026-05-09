'use server'

import prisma from "@/lib/prisma"
import { Prisma, TransactionType } from "@prisma/client"

export interface WalletUpdateParams {
    balance?: number
    pendingBalance?: number
    points?: number
}

/**
 * Service quản lý ví Affiliate tập trung
 */
export async function ensureWalletAndUpdate(userId: number, updates: WalletUpdateParams) {
    const updateData: Prisma.AffiliateWalletUpdateInput = {}
    const createData: Prisma.AffiliateWalletCreateInput = { 
        user: { connect: { id: userId } },
        balance: 0,
        pendingBalance: 0,
        points: 0
    }

    if (updates.balance !== undefined) {
        updateData.balance = { increment: updates.balance }
        createData.balance = updates.balance
    }
    if (updates.pendingBalance !== undefined) {
        updateData.pendingBalance = { increment: updates.pendingBalance }
        createData.pendingBalance = updates.pendingBalance
    }
    if (updates.points !== undefined) {
        updateData.points = { increment: updates.points }
        createData.points = updates.points
    }

    return await prisma.affiliateWallet.upsert({
        where: { userId },
        create: createData,
        update: updateData
    })
}

/**
 * Ghi log transaction cho ví
 */
export async function createTransactionLog(params: {
    userId: number
    amount: number
    type: TransactionType
    description: string
    balanceBefore: number
    balanceAfter: number
}) {
    const wallet = await prisma.affiliateWallet.findUnique({
        where: { userId: params.userId },
        select: { id: true }
    })
    
    if (!wallet) {
        console.error(`[WalletService] Wallet not found for user ${params.userId} to log transaction`)
        return null
    }

    return await prisma.affiliateTransaction.create({
        data: {
            walletId: wallet.id,
            amount: params.amount,
            type: params.type,
            description: params.description,
            balanceBefore: params.balanceBefore,
            balanceAfter: params.balanceAfter
        }
    })
}
