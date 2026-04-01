'use server'

import prisma from "@/lib/prisma"
import { PayoutStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

// ==================== WALLET ====================

export async function getAffiliateWallet(userId: number) {
    try {
        let wallet = await prisma.affiliateWallet.findUnique({
            where: { userId }
        })

        if (!wallet) {
            wallet = await prisma.affiliateWallet.create({
                data: { userId }
            })
        }

        return { success: true, wallet }
    } catch (error) {
        console.error('[Wallet] Get error:', error)
        return { success: false, error: String(error) }
    }
}

export async function getWalletTransactions(userId: number, options?: {
    type?: string
    limit?: number
}) {
    try {
        const wallet = await prisma.affiliateWallet.findUnique({
            where: { userId }
        })

        if (!wallet) {
            return { success: true, transactions: [] }
        }

        const where: any = { walletId: wallet.id }
        if (options?.type) {
            where.type = options.type
        }

        const transactions = await prisma.affiliateTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 50
        })

        return { success: true, transactions }
    } catch (error) {
        console.error('[Wallet] Transactions error:', error)
        return { success: false, error: String(error) }
    }
}

// ==================== PAYOUT ====================

export async function requestPayout(
    userId: number,
    bankInfo: {
        bankName: string
        bankAccount: string
        accountHolder: string
    },
    amount: number
) {
    try {
        // 1. Kiểm tra số dư
        const wallet = await prisma.affiliateWallet.findUnique({
            where: { userId }
        })

        if (!wallet) {
            return { success: false, error: 'Wallet not found' }
        }

        if (wallet.balance < amount) {
            return { success: false, error: 'Số dư không đủ' }
        }

        // 2. Lấy campaign để kiểm tra minPayout
        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { isActive: true }
        })

        if (campaign && amount < campaign.minPayout) {
            return { success: false, error: `Số tiền tối thiểu là ${campaign.minPayout.toLocaleString('vi-VN')}đ` }
        }

        // 3. Tính thuế và phí
        const taxRate = campaign?.taxRate || 0
        const feeAmount = campaign?.feeAmount || 3300
        const taxAmount = amount > 2000000 ? amount * taxRate : 0
        const netAmount = amount - taxAmount - feeAmount

        // 4. Tạo payout request
        const payout = await prisma.affiliatePayout.create({
            data: {
                userId,
                amount,
                taxAmount,
                feeAmount,
                netAmount,
                bankName: bankInfo.bankName,
                bankAccount: bankInfo.bankAccount,
                accountHolder: bankInfo.accountHolder,
                status: PayoutStatus.PENDING
            }
        })

        // 5. Trừ số dư
        await prisma.affiliateWallet.update({
            where: { userId },
            data: {
                balance: { decrement: amount }
            }
        })

        // 6. Ghi transaction log
        await prisma.affiliateTransaction.create({
            data: {
                walletId: wallet.id,
                amount: -amount,
                type: 'WITHDRAWAL',
                description: `Yêu cầu rút tiền #${payout.id}`,
                refId: String(payout.id),
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance - amount
            }
        })

        revalidatePath('/affiliate')
        revalidatePath('/affiliate/wallet')

        return { success: true, payout }

    } catch (error) {
        console.error('[Payout] Request error:', error)
        return { success: false, error: String(error) }
    }
}

export async function getPayoutHistory(userId: number) {
    try {
        const payouts = await prisma.affiliatePayout.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, payouts }
    } catch (error) {
        console.error('[Payout] History error:', error)
        return { success: false, error: String(error) }
    }
}

// ==================== ADMIN ACTIONS ====================

export async function getPendingPayouts() {
    try {
        const payouts = await prisma.affiliatePayout.findMany({
            where: { status: PayoutStatus.PENDING },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        return { success: true, payouts }
    } catch (error) {
        console.error('[Admin] Pending payouts error:', error)
        return { success: false, error: String(error) }
    }
}

export async function approvePayout(payoutId: number) {
    try {
        const payout = await prisma.affiliatePayout.update({
            where: { id: payoutId },
            data: {
                status: PayoutStatus.COMPLETED,
                processedAt: new Date()
            }
        })

        revalidatePath('/admin/affiliate/payouts')

        return { success: true, payout }
    } catch (error) {
        console.error('[Admin] Approve payout error:', error)
        return { success: false, error: String(error) }
    }
}

export async function rejectPayout(payoutId: number, notes: string) {
    try {
        const payout = await prisma.affiliatePayout.update({
            where: { id: payoutId },
            data: {
                status: PayoutStatus.REJECTED,
                notes,
                processedAt: new Date()
            }
        })

        // Hoàn tiền cho user
        const wallet = await prisma.affiliateWallet.findUnique({
            where: { userId: payout.userId }
        })

        if (wallet) {
            await prisma.affiliateWallet.update({
                where: { userId: payout.userId },
                data: {
                    balance: { increment: payout.amount }
                }
            })

            await prisma.affiliateTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount: payout.amount,
                    type: 'REFUND',
                    description: `Hoàn tiền - Yêu cầu rút bị từ chối #${payoutId}`,
                    refId: String(payoutId),
                    balanceBefore: wallet.balance - payout.amount,
                    balanceAfter: wallet.balance
                }
            })
        }

        revalidatePath('/admin/affiliate/payouts')

        return { success: true, payout }
    } catch (error) {
        console.error('[Admin] Reject payout error:', error)
        return { success: false, error: String(error) }
    }
}

export async function getAffiliateStats() {
    try {
        const [
            totalAffiliates,
            totalCommissions,
            pendingCommissions,
            totalPayouts,
            pendingPayouts
        ] = await Promise.all([
            prisma.affiliateWallet.count(),
            prisma.affiliateCommission.aggregate({
                _sum: { netAmount: true }
            }),
            prisma.affiliateCommission.aggregate({
                where: { status: 'PENDING' },
                _sum: { netAmount: true }
            }),
            prisma.affiliatePayout.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { netAmount: true }
            }),
            prisma.affiliatePayout.aggregate({
                where: { status: 'PENDING' },
                _sum: { netAmount: true }
            })
        ])

        return {
            success: true,
            stats: {
                totalAffiliates,
                totalCommissions: totalCommissions._sum.netAmount || 0,
                pendingCommissions: pendingCommissions._sum.netAmount || 0,
                totalPayouts: totalPayouts._sum.netAmount || 0,
                pendingPayouts: pendingPayouts._sum.netAmount || 0
            }
        }
    } catch (error) {
        console.error('[Admin] Stats error:', error)
        return { success: false, error: String(error) }
    }
}
