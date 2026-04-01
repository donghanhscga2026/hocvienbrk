'use server'

import prisma from "@/lib/prisma"
import { CommissionStatus, ConversionStatus } from "@prisma/client"

export async function processEnrollmentCommission(
    userId: number,
    enrollmentId: number,
    coursePrice: number
) {
    try {
        // 1. Tìm thông tin user và referrer
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, referrerId: true }
        })

        if (!user) {
            console.error('[Commission] User not found:', userId)
            return { success: false, error: 'User not found' }
        }

        // 2. Nếu không có referrer, không cần tính hoa hồng
        if (!user.referrerId || user.referrerId === 0) {
            console.log('[Commission] User has no referrer')
            return { success: true, message: 'No referrer' }
        }

        // 3. Tìm campaign mặc định
        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { slug: 'default', isActive: true },
            include: { levels: true }
        })

        if (!campaign) {
            console.log('[Commission] No active campaign found')
            return { success: true, message: 'No campaign' }
        }

        // 4. Tạo hoặc lấy link affiliate của referrer
        const existingLink = await prisma.affiliateLink.findFirst({
            where: {
                userId: user.referrerId,
                campaignId: campaign.id
            }
        })

        let linkId: number

        if (!existingLink) {
            const newLink = await prisma.affiliateLink.create({
                data: {
                    userId: user.referrerId,
                    campaignId: campaign.id,
                    code: `REF${user.referrerId}`,
                    name: 'Auto-generated',
                    source: 'system'
                }
            })
            linkId = newLink.id
        } else {
            linkId = existingLink.id
        }

        // 5. Tạo Conversion
        const pendingUntil = new Date()
        pendingUntil.setDate(pendingUntil.getDate() + campaign.pendingDays)

        const conversion = await prisma.affiliateConversion.create({
            data: {
                linkId,
                campaignId: campaign.id,
                customerId: userId,
                enrollmentId,
                orderId: `ENR-${enrollmentId}-${Date.now()}`,
                orderAmount: coursePrice,
                productType: 'COURSE',
                status: ConversionStatus.PENDING,
                pendingUntil
            }
        })

        // 6. Trace upline và tính hoa hồng
        const uplineChain = await traceUpline(userId, campaign.maxLevels)

        let totalCommission = 0
        const commissionResults = []

        for (const upline of uplineChain) {
            const levelConfig = campaign.levels.find(l => l.level === upline.level)

            if (!levelConfig) continue

            // Kiểm tra đơn hàng tối thiểu
            if (levelConfig.minOrder && coursePrice < levelConfig.minOrder) {
                continue
            }

            // Tính hoa hồng
            const grossAmount = Math.floor(coursePrice * (levelConfig.percentage / 100))
            const taxAmount = grossAmount * (campaign.taxRate / 100)
            const feeAmount = campaign.feeAmount
            const netAmount = grossAmount - taxAmount - feeAmount

            if (netAmount <= 0) continue

            // Tạo commission record
            const commission = await prisma.affiliateCommission.create({
                data: {
                    conversionId: conversion.id,
                    affiliateId: upline.userId,
                    level: upline.level,
                    percentage: levelConfig.percentage,
                    grossAmount,
                    taxAmount,
                    feeAmount,
                    netAmount,
                    status: CommissionStatus.PENDING,
                    availableAt: pendingUntil
                }
            })

            // Cập nhật ví của affiliate
            await ensureWalletAndUpdate(
                upline.userId,
                { pendingBalance: netAmount }
            )

            commissionResults.push({
                affiliateId: upline.userId,
                level: upline.level,
                percentage: levelConfig.percentage,
                grossAmount,
                netAmount
            })

            totalCommission += netAmount
        }

        console.log(`[Commission] Created ${commissionResults.length} commissions, total: ${totalCommission}`)

        return {
            success: true,
            conversionId: conversion.id,
            commissions: commissionResults,
            totalCommission
        }

    } catch (error) {
        console.error('[Commission] Error:', error)
        return { success: false, error: String(error) }
    }
}

async function traceUpline(userId: number, maxLevels: number) {
    const chain: { userId: number; level: number }[] = []

    // Sử dụng closure table để trace nhanh
    // Lấy tất cả ancestors của user với depth <= maxLevels
    const ancestors = await prisma.userClosure.findMany({
        where: {
            descendantId: userId,
            depth: { gt: 0, lte: maxLevels }
        },
        include: {
            ancestor: {
                select: { id: true }
            }
        },
        orderBy: {
            depth: 'asc'
        }
    })

    let level = 1
    for (const ancestor of ancestors) {
        chain.push({
            userId: ancestor.ancestor.id,
            level: level
        })
        level++
    }

    return chain
}

async function ensureWalletAndUpdate(
    userId: number,
    updates: { balance?: number; pendingBalance?: number }
) {
    const existingWallet = await prisma.affiliateWallet.findUnique({
        where: { userId }
    })

    if (!existingWallet) {
        await prisma.affiliateWallet.create({
            data: {
                userId,
                balance: updates.balance || 0,
                pendingBalance: updates.pendingBalance || 0
            }
        })
    } else {
        const updateData: any = {}
        if (updates.balance !== undefined) {
            updateData.balance = { increment: updates.balance }
        }
        if (updates.pendingBalance !== undefined) {
            updateData.pendingBalance = { increment: updates.pendingBalance }
        }

        await prisma.affiliateWallet.update({
            where: { userId },
            data: updateData
        })
    }
}

export async function getCommissionsByUser(userId: number, options?: {
    status?: CommissionStatus
    limit?: number
}) {
    const where: any = { affiliateId: userId }
    if (options?.status) {
        where.status = options.status
    }

    const commissions = await prisma.affiliateCommission.findMany({
        where,
        include: {
            conversion: {
                include: {
                    campaign: true
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50
    })

    return commissions
}

export async function getCommissionsSummary(userId: number) {
    const stats = await prisma.affiliateCommission.groupBy({
        by: ['status'],
        where: { affiliateId: userId },
        _sum: {
            netAmount: true
        },
        _count: true
    })

    const totalEarned = await prisma.affiliateCommission.aggregate({
        where: {
            affiliateId: userId,
            status: { in: [CommissionStatus.AVAILABLE, CommissionStatus.WITHDRAWN] }
        },
        _sum: { netAmount: true }
    })

    return {
        pending: stats.find(s => s.status === CommissionStatus.PENDING)?._sum.netAmount || 0,
        available: stats.find(s => s.status === CommissionStatus.AVAILABLE)?._sum.netAmount || 0,
        withdrawn: stats.find(s => s.status === CommissionStatus.WITHDRAWN)?._sum.netAmount || 0,
        totalEarned: totalEarned._sum.netAmount || 0,
        count: stats.reduce((acc, s) => acc + s._count, 0)
    }
}
