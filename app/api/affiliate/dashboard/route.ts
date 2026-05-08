import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        // Lấy user từ session
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        const userId = Number(session.user.id)
        
        const [
            wallet,
            confirmedPoints,
            allReferrals,
            commissions,
            recentTransactions,
            campaign,
            myLink,
            closures
        ] = await Promise.all([
            prisma.affiliateWallet.findUnique({ where: { userId } }),
            prisma.registrationPoint.aggregate({
                where: { referrerId: userId, status: 'CONFIRMED' },
                _count: true,
                _sum: { points: true }
            }),
            prisma.registrationPoint.groupBy({
                by: ['status'],
                where: { referrerId: userId },
                _count: true
            }),
            prisma.affiliateCommission.findMany({
                where: { affiliateId: userId },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            prisma.affiliateTransaction.findMany({
                where: { wallet: { userId } },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            prisma.affiliateCampaign.findFirst({
                where: { slug: 'default', isActive: true },
                include: { levels: { orderBy: { level: 'asc' } } }
            }),
            getOrCreateLink(userId),
            prisma.userClosure.findMany({
                where: { ancestorId: userId, depth: 1 },
                include: {
                    descendant: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            emailVerified: true,
                            createdAt: true
                        }
                    }
                }
            })
        ])
        
        const f1Count = closures.filter(c => 
            c.descendant.emailVerified && c.descendantId !== 0
        ).length
        
        const commissionSummary = { pending: 0, available: 0, total: 0 }
        for (const c of commissions) {
            if (c.status === 'PENDING') commissionSummary.pending += c.netAmount
            else commissionSummary.available += c.netAmount
            commissionSummary.total += c.netAmount
        }
        
        return NextResponse.json({
            data: {
                wallet,
                points: {
                    total: confirmedPoints._sum.points || 0,
                    referrals: confirmedPoints._count || 0
                },
                levelBreakdown: { f1: f1Count, f2: 0, f3: 0 },
                directReferrals: closures
                    .filter(c => c.descendant.emailVerified && c.descendantId !== 0)
                    .map(c => c.descendant),
                commissionSummary,
                commissions,
                recentTransactions
            },
            campaign,
            myLink,
            _debug: {
                userId,
                closuresCount: closures.length,
                f1Filtered: f1Count,
                timestamp: new Date().toISOString()
            }
        })
    } catch (error) {
        console.error('[API] Dashboard error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

async function getOrCreateLink(userId: number) {
    const campaign = await prisma.affiliateCampaign.findFirst({
        where: { slug: 'default', isActive: true }
    })
    
    if (!campaign) return null

    // Dùng userId trực tiếp làm code
    const code = userId.toString()
    
    // Tìm link với code = userId
    const existing = await prisma.affiliateLink.findFirst({
        where: { code, userId }
    })

    if (existing) return existing

    // Tạo mới
    try {
        return await prisma.affiliateLink.create({
            data: {
                userId,
                campaignId: campaign.id,
                code,
                name: 'Link chính',
                source: 'website'
            }
        })
    } catch (error: any) {
        // Nếu bị trùng code, fallback về link bất kỳ của user
        if (error.code === 'P2002') {
            return await prisma.affiliateLink.findFirst({ where: { userId } })
        }
        return null
    }
}
