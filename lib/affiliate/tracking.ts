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

/**
 * Theo dõi chuyển đổi Affiliate (Dùng cho cả đăng ký và mua hàng)
 */
export async function trackAffiliateConversion(data: ConversionData) {
    const { refCode, userId, landingSlug, orderAmount = 0, type, enrollmentId } = data
    
    // Tìm link affiliate bằng mã code
    const link = await prisma.affiliateLink.findUnique({
        where: { code: refCode },
        include: { campaign: true }
    })
    
    if (!link) {
        console.warn(`[Track] Affiliate link not found: ${refCode}`)
        return null
    }
    
    // Tìm landing if slug provided
    let landingId: number | undefined
    if (landingSlug) {
        const landing = await prisma.landingPage.findUnique({
            where: { slug: landingSlug }
        })
        if (landing) {
            landingId = landing.id
        }
    }
    
    // Tạo conversion record
    const conversion = await prisma.affiliateConversion.create({
        data: {
            linkId: link.id,
            campaignId: link.campaignId,
            customerId: userId,
            enrollmentId,
            orderAmount,
            status: 'PENDING',
            pendingUntil: type === 'REGISTRATION' 
                ? new Date() // Đăng ký thì có hiệu lực ngay
                : new Date(Date.now() + (link.campaign.pendingDays || 30) * 24 * 60 * 60 * 1000),
            landingSlug,
            landingId
        }
    })
    
    // Nếu là đăng ký, thực hiện cộng điểm ngay
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

/**
 * Xử lý cộng điểm đăng ký (Tối ưu dùng WalletService)
 */
export async function processRegistrationPoints(data: {
    userId: number
    campaignId: number
    landingSlug?: string | null
    landingId?: number
}) {
    const { userId, campaignId, landingSlug, landingId } = data
    
    // Lấy thông tin referrer của user
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referrerId: true }
    })
    
    if (!user?.referrerId) return
    
    // Lấy cấu hình campaign
    const campaign = await prisma.affiliateCampaign.findUnique({
        where: { id: campaignId }
    })
    
    if (!campaign) return
    
    const pointsToAdd = campaign.pointsPerRegistration || 1

    // 1. Ghi nhận điểm thưởng (RegistrationPoint)
    await prisma.registrationPoint.create({
        data: {
            referrerId: user.referrerId,
            refereeId: userId,
            campaignId,
            points: pointsToAdd,
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            landingSlug,
            landingId
        }
    })
    
    // 2. Cập nhật ví và Log giao dịch (Dùng WalletService tập trung)
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
