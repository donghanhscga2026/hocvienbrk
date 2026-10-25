import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { requireDomainModule } from '@/lib/website/domain-context'

export async function GET() {
    try {
        await requireDomainModule('affiliate')
        // Lấy user từ session
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        const userId = Number(session.user.id)

        // [OPTIMIZE] campaign được lấy trước riêng vì getOrCreateLink() cũng cần
        // đúng dòng này — trước đây getOrCreateLink tự truy vấn lại từ đầu,
        // thành 2 lần truy vấn giống hệt nhau trong cùng 1 request.
        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { slug: 'default', isActive: true },
            include: { levels: { orderBy: { level: 'asc' } } }
        })

        const [
            wallet,
            confirmedPoints,
            allReferrals,
            commissions,
            recentTransactions,
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
            getOrCreateLink(userId, campaign?.id ?? null),
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
        
        // Tổng hợp trên TOÀN BỘ hoa hồng (không dùng danh sách 10 dòng gần nhất
        // ở trên — danh sách đó chỉ để hiển thị). "Đã chốt" theo cùng quy tắc
        // trang Quyết Toán GV: status khác PENDING, hoặc PENDING nhưng đã tới
        // hạn availableAt. Dòng CANCELLED không tính.
        const now = new Date()
        const [settledAgg, dueAgg, awaitingAgg] = await Promise.all([
            prisma.affiliateCommission.aggregate({
                where: { affiliateId: userId, status: { in: ['AVAILABLE', 'WITHDRAWN'] } },
                _sum: { netAmount: true }
            }),
            prisma.affiliateCommission.aggregate({
                where: { affiliateId: userId, status: 'PENDING', availableAt: { lte: now } },
                _sum: { netAmount: true }
            }),
            prisma.affiliateCommission.aggregate({
                where: { affiliateId: userId, status: 'PENDING', OR: [{ availableAt: null }, { availableAt: { gt: now } }] },
                _sum: { netAmount: true }
            })
        ])
        const settledAmount = (settledAgg._sum.netAmount || 0) + (dueAgg._sum.netAmount || 0)
        const awaitingAmount = awaitingAgg._sum.netAmount || 0
        const commissionSummary = {
            pending: awaitingAmount,
            available: settledAmount,
            total: settledAmount + awaitingAmount,
            settled: settledAmount,
            awaiting: awaitingAmount
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

async function getOrCreateLink(userId: number, campaignId: number | null) {
    if (!campaignId) return null

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
                campaignId,
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
