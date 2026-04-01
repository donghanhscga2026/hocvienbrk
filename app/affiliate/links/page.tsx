'use server'

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"

async function getAffiliateLinks(userId: number) {
    const links = await prisma.affiliateLink.findMany({
        where: { userId },
        include: {
            campaign: true,
            _count: {
                select: { clicks: true, conversions: true }
            }
        },
        orderBy: { createdAt: "desc" }
    })
    return links
}

export default async function AffiliateLinksPage() {
    const session = await auth()
    if (!session?.user?.id) {
        redirect('/login')
    }

    const userId = Number(session.user.id)
    const links = await getAffiliateLinks(userId)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <a href="/affiliate" className="text-blue-600 hover:underline mb-2 inline-block">
                        ← Quay lại Dashboard
                    </a>
                    <h1 className="text-2xl font-bold">Quản lý Link Affiliate</h1>
                    <p className="text-gray-600">Tạo và theo dõi các link giới thiệu của bạn</p>
                </div>

                {/* My Main Link */}
                {links.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h2 className="text-lg font-semibold mb-4">Link Affiliate chính của bạn</h2>
                        
                        {links.filter(l => l.name === 'Link chính').map(link => (
                            <div key={link.id} className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Chính</span>
                                        <span className="ml-2 text-sm text-gray-600">
                                            Code: <strong>{link.code}</strong>
                                        </span>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p><span className="text-gray-500">Clicks:</span> <strong>{link._count.clicks}</strong></p>
                                        <p><span className="text-gray-500">Conversions:</span> <strong>{link._count.conversions}</strong></p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={`${baseUrl}/register?ref=${link.code}`}
                                        readOnly
                                        className="flex-1 px-3 py-2 border rounded-lg bg-white"
                                    />
                                    <button
                                        onClick={() => navigator.clipboard.writeText(`${baseUrl}/register?ref=${link.code}`)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* All Links */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Tất cả Link ({links.length})</h2>
                    
                    {links.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Chưa có link nào được tạo</p>
                            <p className="text-sm mt-2">Link chính của bạn sẽ tự động được tạo khi bạn chia sẻ</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {links.map(link => (
                                <div key={link.id} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-medium">{link.name || 'Link không tên'}</p>
                                            <p className="text-sm text-gray-500">
                                                {link.source && `Nguồn: ${link.source}`}
                                            </p>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="font-bold text-xl">{link._count.clicks}</p>
                                                <p className="text-gray-500">Clicks</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-xl">{link._count.conversions}</p>
                                                <p className="text-gray-500">Conversions</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={`${baseUrl}/register?ref=${link.code}`}
                                            readOnly
                                            className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50"
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(`${baseUrl}/register?ref=${link.code}`)}
                                            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 text-sm"
                                        >
                                            Copy
                                        </button>
                                        <a
                                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/register?ref=${link.code}`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
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
                <div className="mt-6 bg-yellow-50 rounded-lg p-6">
                    <h3 className="font-semibold mb-3">Mẹo chia sẻ hiệu quả</h3>
                    <ul className="text-sm text-yellow-800 space-y-2">
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
