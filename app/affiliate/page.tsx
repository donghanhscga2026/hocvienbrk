'use client'

import { useEffect, useState } from 'react'
import Link from "next/link"

interface DashboardData {
    points: { total: number; referrals: number }
    levelBreakdown: { f1: number; f2: number; f3: number }
    wallet: { balance: number; pendingBalance: number; totalEarned: number } | null
    directReferrals: any[]
    commissions: any[]
    recentTransactions: any[]
    commissionSummary: { pending: number; available: number; total: number }
}

interface Campaign {
    levels: { level: number; percentage: number }[]
    pointsRequired: number
    pendingDays: number
    pointRedemptionValue: number
}

interface MyLink {
    code: string
}

export default function AffiliateDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [myLink, setMyLink] = useState<MyLink | null>(null)
    const [loading, setLoading] = useState(true)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const res = await fetch('/api/affiliate/dashboard')
            if (res.ok) {
                const result = await res.json()
                setData(result.data)
                setCampaign(result.campaign)
                setMyLink(result.myLink)
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    async function copyLink() {
        if (myLink) {
            try {
                await navigator.clipboard.writeText(`${baseUrl}/register?ref=${myLink.code}`)
                alert('Đã copy!')
            } catch (e) {
                console.error(e)
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-brk-background flex items-center justify-center">
                <p>Đang tải...</p>
            </div>
        )
    }

    const affiliateUrl = myLink ? `${baseUrl}/register?ref=${myLink.code}` : ''

    return (
        <div className="min-h-screen bg-brk-background p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-brk-on-surface">Affiliate Dashboard</h1>
                    <p className="text-brk-muted">Chào mừng bạn đến với chương trình Affiliate</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-brk-primary to-blue-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">Điểm Đăng Ký</h3>
                        <p className="text-3xl font-bold mt-2">{data?.points.total || 0}</p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            {data?.points.referrals || 0} người đăng ký qua bạn
                        </p>
                        {campaign && (
                            <p className="text-xs mt-2 opacity-75">
                                Cần {campaign.pointsRequired} điểm để đổi khóa học
                            </p>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-brk-primary to-indigo-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">F1 - Người đăng ký qua bạn</h3>
                        <p className="text-3xl font-bold mt-2">{data?.levelBreakdown.f1 || 0}</p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            Mỗi người = 1 điểm
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-brk-accent to-green-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">Số dư khả dụng</h3>
                        <p className="text-3xl font-bold mt-2">
                            {(data?.wallet?.balance || 0).toLocaleString('vi-VN')}đ
                        </p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            Có thể rút ngay
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-brk-primary to-yellow-600 rounded-lg shadow p-6 text-brk-on-primary">
                        <h3 className="text-brk-on-primary/80 text-sm">Chờ xử lý</h3>
                        <p className="text-3xl font-bold mt-2">
                            {(data?.wallet?.pendingBalance || 0).toLocaleString('vi-VN')}đ
                        </p>
                        <p className="text-brk-on-primary/80 text-sm mt-1">
                            Đang trong thời gian đối soát
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
                                onClick={copyLink}
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

                {/* Danh sách F1 */}
                {data?.directReferrals && data.directReferrals.length > 0 && (
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
