import prisma from '@/lib/prisma'
import { ensureWalletAndUpdate, createTransactionLog } from "./wallet-service"

export interface ConversionData {
    refCode: string
    userId: number
    landingSlug?: string | null
    orderAmount?: number
    type: 'REGISTRATION' | 'PURCHASE'
    enrollmentId?: number
}

export async function processRegistrationPoints(userId: number, landingSlug?: string | null) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, referrerId: true }
    })

    if (!user || !user.referrerId) return

    const campaign = await prisma.affiliateCampaign.findFirst({
        where: { slug: 'default', isActive: true }
    })

    if (!campaign) return

    // Create conversion record
    let landingId: number | undefined
    if (landingSlug) {
        const landing = await prisma.landingPage.findUnique({
            where: { slug: landingSlug }
        })
        if (landing) landingId = landing.id
    }

    await prisma.affiliateConversion.create({
        data: {
            campaignId: campaign.id,
            customerId: userId,
            type: 'REGISTRATION',
            status: 'CONFIRMED',
            landingSlug,
            landingId
        }
    })
    
    // Update F1 wallet points & Log transaction (Dùng service mới)
    const pointsToAdd = campaign.pointsPerRegistration || 1
    const updatedWallet = await ensureWalletAndUpdate(user.referrerId, { points: pointsToAdd })
    
    await createTransactionLog({
        userId: user.referrerId,
        amount: pointsToAdd,
        type: 'POINT_EARNED',
        description: `Nhận điểm từ đăng ký${landingSlug ? ` (${landingSlug})` : ''}`,
        balanceBefore: updatedWallet.points - pointsToAdd,
        balanceAfter: updatedWallet.points
    })
}

export async function getCommissionConfig(
    campaignId: number,
    landingSlug?: string | null
) {
    const campaign = await prisma.affiliateCampaign.findUnique({
        where: { id: campaignId },
        include: { levels: true }
    })

    if (!campaign) return null

    // Check for landing override
    if (landingSlug && campaign.landingOverrides) {
        const overrides = campaign.landingOverrides as Record<string, any>
        if (overrides[landingSlug]) {
            return {
                maxLevels: campaign.maxLevels,
                levels: [
                    { level: 1, percentage: overrides[landingSlug].f1 },
                    { level: 2, percentage: overrides[landingSlug].f2 },
                    { level: 3, percentage: overrides[landingSlug].f3 }
                ].filter(l => l.level <= campaign.maxLevels)
            }
        }
    }
    
    return {
        maxLevels: campaign.maxLevels,
        levels: campaign.levels.map(l => ({
            level: l.level,
            percentage: l.percentage
        }))
    }
}
