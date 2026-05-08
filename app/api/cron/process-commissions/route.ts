import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { CommissionStatus } from "@prisma/client"

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization')
        const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-here'
        
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        
        // 1. Lấy tất cả commissions đang ở trạng thái PENDING và đã qua pendingDays
        const pendingCommissions = await prisma.affiliateCommission.findMany({
            where: {
                status: CommissionStatus.PENDING,
                availableAt: { lte: now }
            },
            include: {
                affiliate: {
                    select: { id: true }
                }
            }
        })

        if (pendingCommissions.length === 0) {
            return NextResponse.json({ 
                message: 'No commissions to process',
                processed: 0 
            })
        }

        let processed = 0
        const errors: string[] = []

        // 2. Xử lý từng commission
        for (const commission of pendingCommissions) {
            try {
                await prisma.$transaction(async (tx) => {
                    // Cập nhật commission status
                    await tx.affiliateCommission.update({
                        where: { id: commission.id },
                        data: { status: CommissionStatus.AVAILABLE }
                    })

                    // Cập nhật wallet: chuyển từ pendingBalance -> balance
                    const wallet = await tx.affiliateWallet.findUnique({
                        where: { userId: commission.affiliateId }
                    })

                    if (wallet) {
                        await tx.affiliateWallet.update({
                            where: { userId: commission.affiliateId },
                            data: {
                                balance: { increment: commission.netAmount },
                                pendingBalance: { 
                                    decrement: Math.min(commission.netAmount, wallet.pendingBalance) 
                                },
                                totalEarned: { increment: commission.netAmount }
                            }
                        })

                        // Ghi transaction log
                        await tx.affiliateTransaction.create({
                            data: {
                                walletId: wallet.id,
                                amount: commission.netAmount,
                                type: 'COMMISSION',
                                description: `Hoa hồng từ đơn hàng #${commission.conversionId} (Tầng ${commission.level})`,
                                refId: String(commission.id),
                                balanceBefore: wallet.balance,
                                balanceAfter: wallet.balance + commission.netAmount
                            }
                        })
                    }
                })

                processed++
            } catch (error) {
                errors.push(`Commission #${commission.id}: ${String(error)}`)
            }
        }

        console.log(`[Cron] Processed ${processed}/${pendingCommissions.length} commissions`)

        return NextResponse.json({
            message: 'Commissions processed',
            processed,
            total: pendingCommissions.length,
            errors: errors.length > 0 ? errors : undefined
        })

    } catch (error) {
        console.error('[Cron] Process commissions error:', error)
        return NextResponse.json({ 
            error: 'Internal server error' 
        }, { status: 500 })
    }
}

// GET để kiểm tra status
export async function GET(request: Request) {
    try {
        const now = new Date()
        
        const stats = await prisma.affiliateCommission.groupBy({
            by: ['status'],
            _count: true,
            _sum: { netAmount: true }
        })

        const pendingCount = stats.find(s => s.status === CommissionStatus.PENDING)?._count || 0
        const pendingAmount = stats.find(s => s.status === CommissionStatus.PENDING)?._sum.netAmount || 0
        const availableCount = stats.find(s => s.status === CommissionStatus.AVAILABLE)?._count || 0
        const availableAmount = stats.find(s => s.status === CommissionStatus.AVAILABLE)?._sum.netAmount || 0

        const readyToProcess = await prisma.affiliateCommission.count({
            where: {
                status: CommissionStatus.PENDING,
                availableAt: { lte: now }
            }
        })

        return NextResponse.json({
            stats: {
                pending: { count: pendingCount, amount: pendingAmount },
                available: { count: availableCount, amount: availableAmount },
                readyToProcess
            }
        })

    } catch (error) {
        console.error('[Cron] Stats error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
