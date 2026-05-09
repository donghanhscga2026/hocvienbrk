'use server'

import prisma from "@/lib/prisma"
import { PointStatus } from "@prisma/client"
import { ensureWalletAndUpdate, createTransactionLog } from "./wallet-service"

const DEFAULT_CAMPAIGN_SLUG = 'default'

export async function onEmailVerified(userId: number) {
    try {
        // 1. Lấy thông tin user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, emailVerified: true, referrerId: true }
        })

        if (!user || !user.emailVerified) {
            return { success: false, error: 'User not found or email not verified' }
        }

        // 2. Nếu không có referrer, không có điểm thưởng
        if (!user.referrerId) {
            return { success: true, message: 'No referrer' }
        }

        // 3. Lấy campaign mặc định
        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { slug: DEFAULT_CAMPAIGN_SLUG, isActive: true }
        })

        if (!campaign) {
            return { success: false, error: 'No active point campaign' }
        }

        // 4. Kiểm tra xem đã được cộng điểm cho đăng ký này chưa (tránh trùng lặp)
        const existingPoint = await prisma.registrationPoint.findFirst({
            where: { refereeId: userId, campaignId: campaign.id }
        })

        if (existingPoint) {
            return { success: true, message: 'Points already awarded' }
        }

        const pointsToAdd = campaign.pointsPerRegistration || 0
        if (pointsToAdd <= 0) return { success: true }

        // 5. Tìm ID của F1 (người giới thiệu trực tiếp)
        const f1Id = user.referrerId

        // 6. Ghi nhận điểm thưởng (Transaction)
        await prisma.registrationPoint.create({
            data: {
                referrerId: f1Id,
                refereeId: userId,
                campaignId: campaign.id,
                points: pointsToAdd,
                status: PointStatus.CONFIRMED,
                confirmedAt: user.emailVerified
            }
        })

        // 7. Update wallet & 8. Transaction log (Dùng service mới)
        const updatedWallet = await ensureWalletAndUpdate(f1Id, { points: pointsToAdd })
        
        await createTransactionLog({
            userId: f1Id,
            amount: pointsToAdd,
            type: 'POINT_EARNED',
            description: `Nhận ${pointsToAdd} điểm từ F1 (#${user.id})`,
            balanceBefore: updatedWallet.points - pointsToAdd,
            balanceAfter: updatedWallet.points
        })

        console.log(`[Affiliate] F1 #${f1Id}: +${pointsToAdd} điểm từ #${user.id}`)

        // 9. Check auto-redeem
        if (campaign.autoRedeem) {
            await checkAndRedeemPoints(f1Id, campaign.id)
        }

        return { success: true, points: pointsToAdd }

    } catch (error) {
        console.error('[Affiliate Points] Error:', error)
        return { success: false, error: String(error) }
    }
}

export async function checkAndRedeemPoints(userId: number, campaignId: number) {
    try {
        const campaign = await prisma.affiliateCampaign.findUnique({
            where: { id: campaignId }
        })

        if (!campaign || !campaign.redemptionCourseId) return { success: false }

        // Lấy ví của user
        const wallet = await prisma.affiliateWallet.findUnique({
            where: { userId }
        })

        const currentPoints = wallet?.points || 0
        const requiredPoints = campaign.pointsRequired || 0

        if (currentPoints >= requiredPoints && requiredPoints > 0) {
            // Kiểm tra xem đã sở hữu khóa học chưa
            const existingEnrollment = await prisma.enrollment.findFirst({
                where: {
                    userId,
                    courseId: campaign.redemptionCourseId
                }
            })

            if (existingEnrollment) return { success: false, error: 'Already enrolled' }

            // Thực hiện đổi điểm
            // 1. Tạo enrollment mới
            await prisma.enrollment.create({
                data: {
                    userId,
                    courseId: campaign.redemptionCourseId,
                    status: 'ACTIVE',
                    startedAt: new Date()
                }
            })

            // 2. Trừ điểm & Ghi transaction log (Dùng service mới)
            const updatedWallet = await ensureWalletAndUpdate(userId, { points: -requiredPoints })

            await createTransactionLog({
                userId,
                amount: -requiredPoints,
                type: 'POINT_REDEEMED',
                description: `Đổi ${requiredPoints} điểm lấy khóa học #${campaign.redemptionCourseId} (${campaign.name})`,
                balanceBefore: updatedWallet.points + requiredPoints,
                balanceAfter: updatedWallet.points
            })

            console.log(`[Affiliate] User #${userId} redeemed ${requiredPoints} points for course #${campaign.redemptionCourseId}`)

            return { success: true, pointsRedeemed: requiredPoints }
        }

        return { success: false, error: 'Insufficient points' }

    } catch (error) {
        console.error('[Affiliate Redemption] Error:', error)
        return { success: false, error: String(error) }
    }
}

export async function getPointsSummary(userId: number) {
    const stats = await prisma.registrationPoint.aggregate({
        where: { referrerId: userId },
        _count: true,
        _sum: { points: true }
    })

    return {
        totalReferrals: stats._count,
        totalPoints: stats._sum.points || 0
    }
}
