'use server'

import { auth } from "@/auth"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import prisma from "@/lib/prisma"

async function getUserAffiliateData(userId: number) {
    const wallet = await prisma.affiliateWallet.findUnique({
        where: { userId }
    })
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { affiliateCode: true, name: true, email: true }
    })
    
    const myCommissions = await prisma.affiliateCommission.findMany({
        where: { affiliateId: userId },
        include: {
            conversion: {
                include: {
                    link: {
                        include: {
                            user: { select: { name: true } }
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    })
    
    const myPayouts = await prisma.affiliatePayout.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
    })
    
    const myRegistrations = await prisma.registrationPoint.findMany({
        where: { referrerId: userId },
        orderBy: { earnedAt: 'desc' },
        take: 10,
        include: {
            referee: { select: { name: true, email: true } }
        }
    })
    
    const campaign = await prisma.affiliateCampaign.findFirst({
        where: { slug: 'default' },
        include: { levels: { orderBy: { level: 'asc' } } }
    })
    
    const myLinks = await prisma.affiliateLink.findMany({
        where: { userId },
        include: {
            _count: { select: { clicks: true, conversions: true } }
        }
    })
    
    return {
        wallet,
        user,
        commissions: myCommissions,
        payouts: myPayouts,
        registrations: myRegistrations,
        campaign,
        links: myLinks
    }
}

export default async function AffiliateDashboardPage() {
    const session = await auth()
    
    if (!session?.user?.id) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Vui lòng đăng nhập</h1>
                    <Link href="/login" className="text-blue-600 hover:underline">
                        Đăng nhập
                    </Link>
                </div>
            </div>
        )
    }
    
    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id
    const data = await getUserAffiliateData(userId)
    const wallet = data.wallet
    const user = data.user
    const campaign = data.campaign
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-black text-white shadow-lg">
                <div className="flex items-center justify-between p-4 max-w-6xl mx-auto">
                    <Link href="/" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="text-sm font-black tracking-wider">VỀ TRANG CHỦ</span>
                    </Link>
                    <h1 className="text-lg font-black tracking-widest text-yellow-400">
                        AFFILIATE
                    </h1>
                    <div className="w-24"></div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto p-6">
                {/* Welcome */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold">Xin chào, {user?.name || 'CTV'}!</h1>
                    <p className="text-gray-600">Đây là trang quản lý Affiliate của bạn</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm">Điểm Đăng Ký</h3>
                        <p className="text-3xl font-bold text-blue-600">{wallet?.points || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm">Số dư khả dụng</h3>
                        <p className="text-3xl font-bold text-green-600">
                            {(wallet?.balance || 0).toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm">Đang chờ</h3>
                        <p className="text-3xl font-bold text-yellow-600">
                            {(wallet?.pendingBalance || 0).toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-gray-500 text-sm">Tổng kiếm được</h3>
                        <p className="text-3xl font-bold text-purple-600">
                            {(wallet?.totalEarned || 0).toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                </div>

                {/* My Affiliate Link */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-semibold mb-4">Link Affiliate của bạn</h2>
                    {user?.affiliateCode ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500 mb-1">Link trang chủ:</p>
                                <code className="text-blue-600 break-all">
                                    {typeof window !== 'undefined' ? window.location.origin : ''}/?ref={user.affiliateCode}
                                </code>
                            </div>
                            {data.links.map(link => (
                                <div key={link.id} className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500 mb-1">Landing page ({link.name || 'default'}):</p>
                                    <code className="text-blue-600 break-all">
                                        {typeof window !== 'undefined' ? window.location.origin : ''}/{link.name || ''}?ref={user.affiliateCode}
                                    </code>
                                    <div className="mt-2 text-xs text-gray-500">
                                        Clicks: {link._count.clicks} | Conversions: {link._count.conversions}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">Bạn chưa có mã affiliate. Liên hệ admin để được cấp.</p>
                    )}
                </div>

                {/* Campaign Info */}
                {campaign && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4">Cấu hình hoa hồng</h2>
                        <div className="flex gap-4 mb-4">
                            {campaign.levels.map(level => (
                                <div key={level.level} className="bg-gray-100 px-4 py-2 rounded">
                                    <span className="font-medium">F{level.level}:</span> {level.percentage}%
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500">
                            • Điểm/đăng ký: {campaign.pointsPerRegistration} điểm<br/>
                            • Rút tối thiểu: {campaign.minPayout.toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Commissions */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">Hoa Hồng Gần Đây</h2>
                        {data.commissions.length === 0 ? (
                            <p className="text-gray-500">Chưa có hoa hồng nào</p>
                        ) : (
                            <div className="space-y-3">
                                {data.commissions.map(commission => (
                                    <div key={commission.id} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <p className="font-medium">
                                                #{commission.conversionId} - {commission.conversion.link?.user?.name || 'Khách hàng'}
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

                    {/* Recent Registrations */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">Đăng Ký Gần Đây</h2>
                        {data.registrations.length === 0 ? (
                            <p className="text-gray-500">Chưa có F1 nào</p>
                        ) : (
                            <div className="space-y-3">
                                {data.registrations.map(reg => (
                                    <div key={reg.id} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <p className="font-medium">
                                                {reg.referee?.name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {reg.status === 'CONFIRMED' ? '✓ Xác nhận' : '⏳ Chờ'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-blue-600">
                                                +{reg.points} điểm
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
                        <Link
                            href="/affiliate/links"
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Quản lý Links
                        </Link>
                        {(wallet?.balance || 0) >= (campaign?.minPayout || 200000) && (
                            <Link
                                href="/affiliate/withdraw"
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                Rút tiền
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
