'use server'

import prisma from "@/lib/prisma"
import { PointStatus } from "@prisma/client"

const DEFAULT_CAMPAIGN_SLUG = 'default'

export async function onEmailVerified(userId: number) {
    try {
        // 1. Lấy thông tin user vừa xác thực
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, referrerId: true, emailVerified: true }
        })

        if (!user) {
            console.error('[Affiliate] User not found:', userId)
            return { success: false, error: 'User not found' }
        }

        // 2. Nếu không có referrer hoặc referrer = 0, không cộng điểm
        if (!user.referrerId || user.referrerId === 0) {
            console.log('[Affiliate] User has no referrer, skip point assignment')
            return { success: true, message: 'No referrer' }
        }

        // 3. Tìm campaign mặc định
        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { 
                slug: DEFAULT_CAMPAIGN_SLUG,
                isActive: true 
            }
        })

        if (!campaign) {
            console.log('[Affiliate] No active campaign found, skip point assignment')
            return { success: true, message: 'No campaign' }
        }

        // 4. Chỉ cộng điểm cho F1 (direct referrer)
        const f1Id = user.referrerId

        // Verify F1 is also verified
        const f1 = await prisma.user.findUnique({
            where: { id: f1Id },
            select: { emailVerified: true }
        })
        if (!f1?.emailVerified) {
            console.log('[Affiliate] F1 has not verified email, skip point assignment')
            return { success: true, message: 'F1 not verified' }
        }

        // 5. Kiểm tra đã có point record chưa (tránh trùng lặp)
        const existingPoint = await prisma.registrationPoint.findFirst({
            where: {
                refereeId: user.id,
                referrerId: f1Id
            }
        })

        if (existingPoint) {
            console.log('[Affiliate] Point already assigned for this referral')
            return { success: true, message: 'Already assigned' }
        }

        // 6. Tạo RegistrationPoint record
        const pointsToAdd = campaign.pointsPerRegistration

        await prisma.registrationPoint.create({
            data: {
                referrerId: f1Id,
                refereeId: user.id,
                campaignId: campaign.id,
                points: pointsToAdd,
                status: PointStatus.CONFIRMED,
                confirmedAt: user.emailVerified || new Date()
            }
        })

        // 7. Update wallet
        let wallet = await prisma.affiliateWallet.findUnique({
            where: { userId: f1Id }
        })

        if (!wallet) {
            wallet = await prisma.affiliateWallet.create({
                data: { userId: f1Id, points: pointsToAdd }
            })
        } else {
            await prisma.affiliateWallet.update({
                where: { userId: f1Id },
                data: { points: { increment: pointsToAdd } }
            })
        }

        // 8. Transaction log
        await prisma.affiliateTransaction.create({
            data: {
                walletId: f1Id,
                amount: pointsToAdd,
                type: 'POINT_EARNED',
                description: `Nhận ${pointsToAdd} điểm từ F1 (#${user.id})`,
                balanceBefore: wallet.points,
                balanceAfter: wallet.points + pointsToAdd
            }
        })

        console.log(`[Affiliate] F1 #${f1Id}: +${pointsToAdd} điểm từ #${user.id}`)

        // 9. Check auto-redeem
        if (campaign.autoRedeem) {
            await checkAndRedeemPoints(f1Id, campaign.id)
        }

        return { success: true, pointsAdded: pointsToAdd }

    } catch (error) {
        console.error('[Affiliate] Error in onEmailVerified:', error)
        return { success: false, error: String(error) }
    }
}

export async function checkAndRedeemPoints(userId: number, campaignId: number) {
    try {
        const wallet = await prisma.affiliateWallet.findUnique({
            where: { userId }
        })

        const campaign = await prisma.affiliateCampaign.findUnique({
            where: { id: campaignId }
        })

        if (!wallet || !campaign || !campaign.redemptionCourseId) {
            return { success: false, error: 'Missing data' }
        }

        const requiredPoints = campaign.pointsRequired
        
        // Kiểm tra đủ điểm chưa
        if (wallet.points < requiredPoints) {
            return { success: false, error: 'Not enough points' }
        }

        // Kiểm tra đã enrolled khóa học này chưa
        const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
                userId,
                courseId: campaign.redemptionCourseId
            }
        })

        if (existingEnrollment) {
            return { success: false, error: 'Already enrolled' }
        }

        // Tạo enrollment miễn phí
        await prisma.enrollment.create({
            data: {
                userId,
                courseId: campaign.redemptionCourseId,
                status: 'ACTIVE',
                startedAt: new Date()
            }
        })

        // Trừ điểm
        await prisma.affiliateWallet.update({
            where: { userId },
            data: { points: { decrement: requiredPoints } }
        })

        // Ghi transaction log
        await prisma.affiliateTransaction.create({
            data: {
                walletId: userId,
                amount: -requiredPoints,
                type: 'POINT_REDEEMED',
                description: `Đổi ${requiredPoints} điểm lấy khóa học #${campaign.redemptionCourseId} (${campaign.name})`,
                balanceBefore: wallet.points,
                balanceAfter: wallet.points - requiredPoints
            }
        })

        console.log(`[Affiliate] User #${userId} redeemed ${requiredPoints} points for course #${campaign.redemptionCourseId}`)

        return { success: true, pointsRedeemed: requiredPoints }

    } catch (error) {
        console.error('[Affiliate] Error in checkAndRedeemPoints:', error)
        return { success: false, error: String(error) }
    }
}

export async function getWalletPoints(userId: number) {
    const wallet = await prisma.affiliateWallet.findUnique({
        where: { userId }
    })
    
    return wallet?.points || 0
}

export async function getReferralStats(userId: number) {
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
