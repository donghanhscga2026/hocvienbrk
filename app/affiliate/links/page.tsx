'use client'

import { useEffect, useState } from 'react'
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import Link from "next/link"

interface LinkItem {
    id: number
    code: string
    name: string | null
    source: string | null
    _count: { clicks: number; conversions: number }
}

interface LandingItem {
    slug: string
    title: string
}

export default function AffiliateLinksPage() {
    const [links, setLinks] = useState<LinkItem[]>([])
    const [landings, setLandings] = useState<LandingItem[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const res = await fetch('/api/affiliate/links')
            if (res.ok) {
                const data = await res.json()
                setLinks(data.links || [])
                setLandings(data.landings || [])
                setUser(data.user)
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text)
            alert('Đã copy!')
        } catch (e) {
            console.error(e)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-brk-background flex items-center justify-center">
                <p>Đang tải...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-brk-background p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <a href="/affiliate" className="text-brk-primary hover:underline mb-2 inline-block">
                        ← Quay lại Dashboard
                    </a>
                    <h1 className="text-2xl font-bold text-brk-on-surface">Quản lý Link Affiliate</h1>
                    <p className="text-brk-muted">Tạo và theo dõi các link giới thiệu của bạn</p>
                </div>

                {/* My Main Link */}
                {links.length > 0 && (
                    <div className="bg-brk-surface rounded-lg shadow p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4 text-brk-on-surface">Link Affiliate chính của bạn</h2>
                        
                        {links.filter(l => l.name === 'Link chính').map(link => (
                            <div key={link.id} className="rounded-lg p-4" style={{ backgroundColor: 'rgba(14,165,233,0.1)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="bg-brk-primary text-brk-on-primary text-xs px-2 py-1 rounded">Chính</span>
                                        <span className="ml-2 text-sm text-brk-muted">
                                            Code: <strong>{link.code}</strong>
                                        </span>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p><span className="text-brk-muted">Clicks:</span> <strong>{link._count.clicks}</strong></p>
                                        <p><span className="text-brk-muted">Conversions:</span> <strong>{link._count.conversions}</strong></p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={`${baseUrl}/register?ref=${link.code}`}
                                        readOnly
                                        className="flex-1 px-3 py-2 border border-brk-outline rounded-lg bg-brk-background text-brk-on-surface"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(`${baseUrl}/register?ref=${link.code}`)}
                                        className="bg-brk-primary text-brk-on-surface px-4 py-2 rounded-lg hover:brightness-110"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* All Links */}
                <div className="bg-brk-surface rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-brk-on-surface">Tất cả Link ({links.length})</h2>
                    
                    {links.length === 0 ? (
                        <div className="text-center py-8 text-brk-muted">
                            <p>Chưa có link nào được tạo</p>
                            <p className="text-sm mt-2">Link chính của bạn sẽ tự động được tạo khi bạn chia sẻ</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {links.map(link => (
                                <div key={link.id} className="border border-brk-outline rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-medium text-brk-on-surface">{link.name || 'Link không tên'}</p>
                                            <p className="text-sm text-brk-muted">
                                                {link.source && `Nguồn: ${link.source}`}
                                            </p>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="font-bold text-xl text-brk-on-surface">{link._count.clicks}</p>
                                                <p className="text-brk-muted">Clicks</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-xl text-brk-on-surface">{link._count.conversions}</p>
                                                <p className="text-brk-muted">Conversions</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={`${baseUrl}/register?ref=${link.code}`}
                                            readOnly
                                            className="flex-1 px-3 py-2 border border-brk-outline rounded-lg text-sm bg-brk-background text-brk-on-surface"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(`${baseUrl}/register?ref=${link.code}`)}
                                            className="bg-brk-background text-brk-on-surface px-3 py-2 rounded-lg hover:bg-brk-surface text-sm"
                                        >
                                            Copy
                                        </button>
                                        <a
                                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/register?ref=${link.code}`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-brk-primary text-brk-on-surface px-3 py-2 rounded-lg hover:brightness-110 text-sm"
                                        >
                                            Share FB
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Share Tips */}
                <div className="mt-6 rounded-lg p-6" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                    <h3 className="font-semibold mb-3 text-brk-on-surface">Mẹo chia sẻ hiệu quả</h3>
                    <ul className="text-sm text-brk-muted space-y-2">
                        <li>• Chia sẻ link trên <strong>Facebook, Zalo, Telegram</strong> để tiếp cận nhiều người</li>
                        <li>• Sử dụng hình ảnh đẹp và lời mời hấp dẫn để thu hút clicks</li>
                        <li>• Theo dõi số clicks và conversions để tối ưu chiến lược</li>
                        <li>• Khi có người đăng ký qua link của bạn và xác thực email, bạn sẽ nhận được <strong>điểm</strong></li>
                        <li>• Khi người đăng ký mua khóa học, bạn sẽ nhận được <strong>hoa hồng</strong></li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
