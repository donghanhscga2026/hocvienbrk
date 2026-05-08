import prisma from '@/lib/prisma'

export interface ConversionData {
    refCode: string
    userId: number
    landingSlug?: string | null
    orderAmount?: number
    type: 'REGISTRATION' | 'PURCHASE'
    enrollmentId?: number
}

export async function trackAffiliateConversion(data: ConversionData) {
    const { refCode, userId, landingSlug, orderAmount = 0, type, enrollmentId } = data
    
    // Find the affiliate link by code
    const link = await prisma.affiliateLink.findUnique({
        where: { code: refCode },
        include: { campaign: true }
    })
    
    if (!link) {
        console.warn(`[Track] Affiliate link not found: ${refCode}`)
        return null
    }
    
    // Find landing if slug provided
    let landingId: number | undefined
    if (landingSlug) {
        const landing = await prisma.landingPage.findUnique({
            where: { slug: landingSlug }
        })
        if (landing) {
            landingId = landing.id
        }
    }
    
    // Create conversion record
    const conversion = await prisma.affiliateConversion.create({
        data: {
            linkId: link.id,
            campaignId: link.campaignId,
            customerId: userId,
            enrollmentId,
            orderAmount,
            status: 'PENDING',
            pendingUntil: type === 'REGISTRATION' 
                ? new Date() // Immediate for registration
                : new Date(Date.now() + (link.campaign.pendingDays || 30) * 24 * 60 * 60 * 1000),
            landingSlug,
            landingId
        }
    })
    
    // For registrations, immediately process the registration points
    if (type === 'REGISTRATION') {
        await processRegistrationPoints({
            userId,
            campaignId: link.campaignId,
            landingSlug,
            landingId
        })
    }
    
    return conversion
}

async function processRegistrationPoints(data: {
    userId: number
    campaignId: number
    landingSlug?: string | null
    landingId?: number
}) {
    const { userId, campaignId, landingSlug, landingId } = data
    
    // Get user's referrer (F1)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referrerId: true }
    })
    
    if (!user?.referrerId) {
        return
    }
    
    // Get campaign config
    const campaign = await prisma.affiliateCampaign.findUnique({
        where: { id: campaignId }
    })
    
    if (!campaign) {
        return
    }
    
    // Create registration point for F1
    await prisma.registrationPoint.create({
        data: {
            referrerId: user.referrerId,
            refereeId: userId,
            campaignId,
            points: campaign.pointsPerRegistration || 1,
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            landingSlug,
            landingId
        }
    })
    
    // Update F1 wallet points
    await prisma.affiliateWallet.upsert({
        where: { userId: user.referrerId },
        create: {
            userId: user.referrerId,
            points: campaign.pointsPerRegistration || 1
        },
        update: {
            points: { increment: campaign.pointsPerRegistration || 1 }
        }
    })
    
    // Log transaction
    const wallet = await prisma.affiliateWallet.findUnique({
        where: { userId: user.referrerId }
    })
    
    if (wallet) {
        await prisma.affiliateTransaction.create({
            data: {
                walletId: wallet.id,
                amount: campaign.pointsPerRegistration || 1,
                type: 'POINT_EARNED',
                description: `Nhận điểm từ đăng ký${landingSlug ? ` (${landingSlug})` : ''}`,
                balanceBefore: wallet.points - (campaign.pointsPerRegistration || 1),
                balanceAfter: wallet.points
            }
        })
    }
}

export async function getCommissionConfig(
    campaignId: number,
    landingSlug?: string | null
): Promise<{
    maxLevels: number
    levels: { level: number; percentage: number }[]
}> {
    const campaign = await prisma.affiliateCampaign.findUnique({
        where: { id: campaignId },
        include: { levels: true }
    })
    
    if (!campaign) {
        return { maxLevels: 3, levels: [{ level: 1, percentage: 10 }] }
    }
    
    // Check for landing-specific override
    if (landingSlug && campaign.landingOverrides) {
        const overrides = campaign.landingOverrides as Record<string, { f1: number; f2: number; f3: number }>
        if (overrides[landingSlug]) {
            const custom = overrides[landingSlug]
            return {
                maxLevels: campaign.maxLevels,
                levels: [
                    { level: 1, percentage: custom.f1 },
                    { level: 2, percentage: custom.f2 },
                    { level: 3, percentage: custom.f3 },
                ].filter((_, i) => i < campaign.maxLevels)
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
