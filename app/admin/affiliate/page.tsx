'use server'

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { AdminSubNav, affiliateSubNav } from "../AdminNav"

async function getAffiliateStats() {
    const [
        totalWallets,
        totalCommissions,
        pendingCommissions,
        totalPaid,
        pendingPayouts,
        recentCommissions,
        recentPayouts
    ] = await Promise.all([
        prisma.affiliateWallet.count(),
        prisma.affiliateCommission.count(),
        prisma.affiliateCommission.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                affiliate: { select: { id: true, name: true, email: true } }
            }
        }),
        prisma.affiliateCommission.aggregate({
            where: { status: { in: ['AVAILABLE', 'WITHDRAWN'] } },
            _sum: { netAmount: true }
        }),
        prisma.affiliatePayout.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: 5,
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        }),
        prisma.affiliateCommission.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                affiliate: { select: { id: true, name: true, email: true } }
            }
        }),
        prisma.affiliatePayout.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        })
    ])

    return {
        totalWallets,
        totalCommissions,
        pendingCommissions,
        totalPaid: totalPaid._sum.netAmount || 0,
        pendingPayoutRequests: pendingPayouts,
        recentCommissions,
        recentPayouts
    }
}

async function getCampaign() {
    const campaign = await prisma.affiliateCampaign.findFirst({
        where: { slug: 'default' },
        include: {
            levels: { orderBy: { level: 'asc' } }
        }
    })
    return campaign
}

async function getRegistrationStats() {
    const stats = await prisma.registrationPoint.groupBy({
        by: ['status'],
        _count: true,
        _sum: { points: true }
    })

    return {
        total: stats.reduce((acc, s) => acc + s._count, 0),
        confirmed: stats.find(s => s.status === 'CONFIRMED')?._count || 0,
        pending: stats.find(s => s.status === 'PENDING')?._count || 0,
        totalPoints: stats.reduce((acc, s) => acc + (s._sum.points || 0), 0)
    }
}

export default async function AdminAffiliatePage() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/')
    }

    const [stats, campaign, regStats] = await Promise.all([
        getAffiliateStats(),
        getCampaign(),
        getRegistrationStats()
    ])

    return (
        <div>
            <AdminSubNav title="Affiliate" items={affiliateSubNav} />
            
            <div className="p-6">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
                    <p className="text-gray-600">Quản lý chương trình Affiliate</p>
                </div>

                {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Tổng CTV</h3>
                    <p className="text-3xl font-bold">{stats.totalWallets}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Tổng Hoa Hồng</h3>
                    <p className="text-3xl font-bold text-green-600">
                        {stats.totalPaid.toLocaleString('vi-VN')}đ
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Chờ Xử Lý</h3>
                    <p className="text-3xl font-bold text-yellow-600">
                        {stats.pendingCommissions.length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Yêu Cầu Rút Tiền</h3>
                    <p className="text-3xl font-bold text-blue-600">
                        {stats.pendingPayoutRequests.length}
                    </p>
                </div>
            </div>

            {/* Registration Stats */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4">Điểm Đăng Ký</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <p className="text-gray-500 text-sm">Tổng đăng ký</p>
                        <p className="text-2xl font-bold">{regStats.total}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Đã xác nhận</p>
                        <p className="text-2xl font-bold text-green-600">{regStats.confirmed}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm">Tổng điểm</p>
                        <p className="text-2xl font-bold text-blue-600">{regStats.totalPoints}</p>
                    </div>
                </div>
            </div>

            {/* Campaign Config */}
            {campaign && (
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Cấu hình Campaign</h2>
                        <span className={`px-3 py-1 rounded-full text-sm ${campaign.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {campaign.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-gray-500 text-sm">Tên Campaign</p>
                            <p className="font-medium">{campaign.name}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Số tầng tối đa</p>
                            <p className="font-medium">{campaign.maxLevels} tầng</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Ngày chờ</p>
                            <p className="font-medium">{campaign.pendingDays} ngày</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Rút tối thiểu</p>
                            <p className="font-medium">{campaign.minPayout.toLocaleString('vi-VN')}đ</p>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <p className="text-gray-500 text-sm mb-2">Hoa hồng theo tầng</p>
                        <div className="flex gap-4">
                            {campaign.levels.map(level => (
                                <div key={level.level} className="bg-gray-100 px-4 py-2 rounded">
                                    <span className="font-medium">F{level.level}:</span> {level.percentage}%
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-gray-500 text-sm">Điểm/đăng ký</p>
                            <p className="font-medium">{campaign.pointsPerRegistration} điểm</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Điểm cần đổi</p>
                            <p className="font-medium">{campaign.pointsRequired} điểm</p>
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Giá trị đổi</p>
                            <p className="font-medium">{campaign.pointRedemptionValue.toLocaleString('vi-VN')}đ</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Commissions */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Hoa Hồng Gần Đây</h2>
                    {stats.recentCommissions.length === 0 ? (
                        <p className="text-gray-500">Chưa có hoa hồng nào</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.recentCommissions.map(commission => (
                                <div key={commission.id} className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <p className="font-medium">
                                            #{commission.affiliate.id} - {commission.affiliate.name || 'Unknown'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Tầng {commission.level} • {commission.percentage}%
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-green-600">
                                            +{commission.netAmount.toLocaleString('vi-VN')}đ
                                        </p>
                                        <p className={`text-xs ${commission.status === 'PENDING' ? 'text-yellow-600' : 'text-green-600'}`}>
                                            {commission.status === 'PENDING' ? 'Chờ' : 'Khả dụng'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Payouts */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Yêu Cầu Rút Tiền</h2>
                    {stats.recentPayouts.length === 0 ? (
                        <p className="text-gray-500">Chưa có yêu cầu nào</p>
                    ) : (
                        <div className="space-y-3">
                            {stats.recentPayouts.map(payout => (
                                <div key={payout.id} className="flex justify-between items-center border-b pb-2">
                                    <div>
                                        <p className="font-medium">
                                            #{payout.user.id} - {payout.user.name || 'Unknown'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {payout.bankName} • ****{payout.bankAccount.slice(-4)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">
                                            {payout.netAmount.toLocaleString('vi-VN')}đ
                                        </p>
                                        <p className={`text-xs ${
                                            payout.status === 'PENDING' ? 'text-yellow-600' :
                                            payout.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {payout.status === 'PENDING' ? 'Chờ duyệt' :
                                             payout.status === 'COMPLETED' ? 'Đã chi' : 'Từ chối'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Thao tác nhanh</h2>
                <div className="flex gap-4">
                    <a
                        href="/admin/affiliate/payouts"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Duyệt rút tiền ({stats.pendingPayoutRequests.length})
                    </a>
                    <a
                        href="/admin/affiliate/commissions"
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Xem hoa hồng
                    </a>
                    <a
                        href="/admin/affiliate/affiliates"
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                    >
                        Danh sách CTV
                    </a>
                </div>
            </div>
        </div>
        </div>
    )
}
