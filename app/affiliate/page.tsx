'use server'

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import Link from "next/link"

async function getLevelBreakdown(userId: number) {
    const closures = await prisma.userClosure.findMany({
        where: {
            ancestorId: userId,
            depth: 1
        },
        include: {
            descendant: { select: { emailVerified: true } }
        }
    })
    
    const f1 = closures.filter(c => 
        c.descendant.emailVerified && c.descendantId !== 0
    ).length
    
    return { f1, f2: 0, f3: 0 }
}

async function getDirectReferrals(userId: number) {
    const closures = await prisma.userClosure.findMany({
        where: {
            ancestorId: userId,
            depth: 1
        },
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
        },
        orderBy: { descendant: { createdAt: 'desc' } },
        take: 10
    })
    
    return closures
        .filter(c => c.descendant.emailVerified && c.descendantId !== 0)
        .map(c => c.descendant)
}

async function getAffiliateDashboardData(userId: number) {
    const [
        wallet,
        confirmedPoints,
        allReferrals,
        commissions,
        recentTransactions,
        levelBreakdown,
        directReferrals
    ] = await Promise.all([
        prisma.affiliateWallet.findUnique({
            where: { userId }
        }),
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
            take: 10,
            include: {
                conversion: {
                    include: { campaign: true }
                }
            }
        }),
        prisma.affiliateTransaction.findMany({
            where: {
                wallet: { userId }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        }),
        getLevelBreakdown(userId),
        getDirectReferrals(userId)
    ])

    // Calculate commission summary
    const commissionSummary = {
        pending: 0,
        available: 0,
        total: 0
    }

    for (const c of commissions) {
        if (c.status === 'PENDING') commissionSummary.pending += c.netAmount
        else commissionSummary.available += c.netAmount
        commissionSummary.total += c.netAmount
    }

    const totalReferrals = allReferrals.reduce((acc, s) => acc + s._count, 0)

    return {
        wallet,
        points: {
            total: confirmedPoints._sum.points || 0,
            referrals: confirmedPoints._count || 0
        },
        levelBreakdown,
        directReferrals,
        totalReferrals,
        commissionSummary,
        commissions,
        recentTransactions
    }
}

async function getCampaign() {
    return prisma.affiliateCampaign.findFirst({
        where: { slug: 'default', isActive: true },
        include: { levels: { orderBy: { level: 'asc' } } }
    })
}

async function getMyAffiliateLink(userId: number) {
    const campaign = await prisma.affiliateCampaign.findFirst({
        where: { slug: 'default', isActive: true }
    })
    
    if (!campaign) return null

    let link = await prisma.affiliateLink.findFirst({
        where: { userId, campaignId: campaign.id }
    })

    if (!link) {
        link = await prisma.affiliateLink.create({
            data: {
                userId,
                campaignId: campaign.id,
                code: `BRK${userId}`,
                name: 'Link chính',
                source: 'website'
            }
        })
    }

    return link
}

export default async function AffiliateDashboardPage() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect('/login')
    }

    const userId = Number(session.user.id)

    const [data, campaign, myLink] = await Promise.all([
        getAffiliateDashboardData(userId),
        getCampaign(),
        getMyAffiliateLink(userId)
    ])

    const affiliateUrl = myLink 
        ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/register?ref=${myLink.code}`
        : ''

    return (
        <div className="min-h-screen bg-brk-background p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-brk-on-surface">Affiliate Dashboard</h1>
                    <p className="text-brk-muted">Chào mừng bạn đến với chương trình Affiliate</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Points */}
                    <div className="bg-gradient-to-br from-brk-primary to-blue-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">Điểm Đăng Ký</h3>
                        <p className="text-3xl font-bold mt-2">{data.points.total}</p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            {data.points.referrals} người đăng ký qua bạn
                        </p>
                        {campaign && (
                            <p className="text-xs mt-2 opacity-75">
                                Cần {campaign.pointsRequired} điểm để đổi khóa học
                            </p>
                        )}
                    </div>

                    {/* Direct Referrals (F1) */}
                    <div className="bg-gradient-to-br from-brk-primary to-indigo-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">F1 - Người đăng ký qua bạn</h3>
                        <p className="text-3xl font-bold mt-2">{data.levelBreakdown.f1}</p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            Mỗi người = 1 điểm
                        </p>
                    </div>

                    {/* Balance */}
                    <div className="bg-gradient-to-br from-brk-accent to-green-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">Số dư khả dụng</h3>
                        <p className="text-3xl font-bold mt-2">
                            {(data.wallet?.balance || 0).toLocaleString('vi-VN')}đ
                        </p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            Có thể rút ngay
                        </p>
                    </div>

                    {/* Pending */}
                    <div className="bg-gradient-to-br from-brk-primary to-yellow-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">Chờ xử lý</h3>
                        <p className="text-3xl font-bold mt-2">
                            {(data.wallet?.pendingBalance || 0).toLocaleString('vi-VN')}đ
                        </p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            Đang trong thời gian đối soát
                        </p>
                    </div>

                    {/* Total Earned */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">Tổng thu nhập</h3>
                        <p className="text-3xl font-bold mt-2">
                            {data.commissionSummary.total.toLocaleString('vi-VN')}đ
                        </p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            Tất cả hoa hồng đã nhận
                        </p>
                    </div>
                </div>

                {/* Affiliate Link */}
                {myLink && (
                    <div className="bg-brk-surface rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-brk-on-surface">Link Affiliate của bạn</h2>
                        <div className="flex gap-4 items-center">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={affiliateUrl}
                                    readOnly
                                    className="w-full px-4 py-2 border border-brk-outline rounded-lg bg-brk-background text-brk-on-surface"
                                />
                            </div>
                            <button
                                onClick={() => navigator.clipboard.writeText(affiliateUrl)}
                                className="bg-brk-primary text-brk-on-surface px-4 py-2 rounded-lg hover:brightness-110"
                            >
                                Copy Link
                            </button>
                        </div>
                        <p className="text-sm text-brk-muted mt-2">
                            Chia sẻ link này để nhận hoa hồng khi có người đăng ký hoặc mua khóa học
                        </p>
                    </div>
                )}

                {/* Campaign Info */}
                {campaign && (
                    <div className="bg-brk-surface rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-brk-on-surface">Cấu hình hoa hồng</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {campaign.levels.map(level => (
                                <div key={level.level} className="bg-brk-background rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-brk-accent">{level.percentage}%</p>
                                    <p className="text-brk-muted">F{level.level}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(14,165,233,0.1)' }}>
                            <p className="text-sm text-brk-accent">
                                <strong>Quy đổi điểm:</strong> {campaign.pointsRequired} điểm = {campaign.pointRedemptionValue.toLocaleString('vi-VN')}đ
                            </p>
                            <p className="text-sm text-brk-accent mt-1">
                                Thời gian đối soát: {campaign.pendingDays} ngày
                            </p>
                        </div>
                    </div>
                )}

                {/* Danh sách F1 - Người đăng ký qua bạn */}
                {data.directReferrals.length > 0 && (
                    <div className="bg-brk-surface rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4 text-brk-on-surface">
                            Người đăng ký qua link của bạn ({data.directReferrals.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-brk-background">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-brk-on-surface">#ID</th>
                                        <th className="px-4 py-2 text-left text-brk-on-surface">Tên</th>
                                        <th className="px-4 py-2 text-left text-brk-on-surface">Email</th>
                                        <th className="px-4 py-2 text-left text-brk-on-surface">Ngày đăng ký</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.directReferrals.map((ref: any) => (
                                        <tr key={ref.id} className="border-t border-brk-outline">
                                            <td className="px-4 py-2 text-brk-on-surface">{ref.id}</td>
                                            <td className="px-4 py-2 text-brk-on-surface">{ref.name || 'Chưa cập nhật'}</td>
                                            <td className="px-4 py-2 text-brk-on-surface">{ref.email}</td>
                                            <td className="px-4 py-2 text-brk-on-surface">
                                                {new Date(ref.createdAt).toLocaleDateString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Commissions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-brk-surface rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-brk-on-surface">Hoa hồng gần đây</h2>
                            <Link href="/affiliate/commissions" className="text-brk-primary text-sm hover:underline">
                                Xem tất cả
                            </Link>
                        </div>
                        {data.commissions.length === 0 ? (
                            <p className="text-brk-muted text-center py-4">Chưa có hoa hồng nào</p>
                        ) : (
                            <div className="space-y-3">
                                {data.commissions.slice(0, 5).map(commission => (
                                    <div key={commission.id} className="flex justify-between items-center border-b border-brk-outline pb-2">
                                        <div>
                                            <p className="font-medium text-brk-on-surface">Tầng {commission.level}</p>
                                            <p className="text-sm text-brk-muted">
                                                {commission.percentage}% • #{commission.conversion?.id}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-brk-accent">
                                                +{commission.netAmount.toLocaleString('vi-VN')}đ
                                            </p>
                                            <p className={`text-xs ${
                                                commission.status === 'PENDING' ? 'text-brk-muted' : 'text-brk-accent'
                                            }`}>
                                                {commission.status === 'PENDING' ? 'Chờ' : 'Khả dụng'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-brk-surface rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-brk-on-surface">Giao dịch gần đây</h2>
                            <Link href="/affiliate/wallet" className="text-brk-primary text-sm hover:underline">
                                Xem tất cả
                            </Link>
                        </div>
                        {data.recentTransactions.length === 0 ? (
                            <p className="text-brk-muted text-center py-4">Chưa có giao dịch nào</p>
                        ) : (
                            <div className="space-y-3">
                                {data.recentTransactions.slice(0, 5).map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center border-b border-brk-outline pb-2">
                                        <div>
                                            <p className="font-medium text-sm text-brk-on-surface">{tx.description}</p>
                                            <p className="text-xs text-brk-muted">
                                                {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                                            </p>
                                        </div>
                                        <p className={`font-medium ${tx.amount >= 0 ? 'text-brk-accent' : 'text-brk-accent'}`}>
                                            {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-brk-background rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4 text-brk-on-surface">Thao tác nhanh</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            href="/affiliate/withdraw"
                            className="bg-brk-surface rounded-lg p-4 text-center hover:shadow-md transition"
                        >
                            <div className="text-2xl mb-2">💰</div>
                            <p className="font-medium text-brk-on-surface">Rút tiền</p>
                        </Link>
                        <Link
                            href="/affiliate/links"
                            className="bg-brk-surface rounded-lg p-4 text-center hover:shadow-md transition"
                        >
                            <div className="text-2xl mb-2">🔗</div>
                            <p className="font-medium text-brk-on-surface">Quản lý Link</p>
                        </Link>
                        <Link
                            href="/affiliate/earnings"
                            className="bg-brk-surface rounded-lg p-4 text-center hover:shadow-md transition"
                        >
                            <div className="text-2xl mb-2">📊</div>
                            <p className="font-medium text-brk-on-surface">Thu nhập</p>
                        </Link>
                        <Link
                            href="/affiliate/referrals"
                            className="bg-brk-surface rounded-lg p-4 text-center hover:shadow-md transition"
                        >
                            <div className="text-2xl mb-2">👥</div>
                            <p className="font-medium text-brk-on-surface">Người giới thiệu</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
