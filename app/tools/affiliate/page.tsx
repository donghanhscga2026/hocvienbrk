'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ToolHeader from '@/components/tools/ToolHeader'
import { requestPayout } from '@/app/actions/affiliate-actions'

interface DashboardData {
    points: { total: number; referrals: number }
    levelBreakdown: { f1: number; f2: number; f3: number }
    wallet: { balance: number; pendingBalance: number; totalEarned: number } | null
    directReferrals: any[]
    commissions: any[]
    commissionSummary: { pending: number; available: number; total: number }
}

interface Campaign {
    levels: { level: number; percentage: number }[]
    pointsRequired: number
    pendingDays: number
    pointRedemptionValue: number
    minPayout: number
    taxRate: number
    feeAmount: number
}

interface MyLink {
    code: string
}

interface LinkItem {
    id: number
    code: string
    name: string | null
    source: string | null
    _count: { clicks: number; conversions: number }
}

function DashboardTab() {
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
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    async function copyLink() {
        if (myLink) {
            try {
                await navigator.clipboard.writeText(`${baseUrl}/register?ref=${myLink.code}`)
                alert('Đã copy!')
            } catch (e) { console.error(e) }
        }
    }

    if (loading) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>Đang tải...</p>
            </div>
        )
    }

    const affiliateUrl = myLink ? `${baseUrl}/register?ref=${myLink.code}` : ''

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl p-4 text-white">
                    <p className="text-xs opacity-80">Điểm Đăng Ký</p>
                    <p className="text-2xl font-bold mt-1">{data?.points.total || 0}</p>
                    <p className="text-xs opacity-80 mt-1">{data?.points.referrals || 0} người</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                    <p className="text-xs opacity-80">F1</p>
                    <p className="text-2xl font-bold mt-1">{data?.levelBreakdown.f1 || 0}</p>
                    <p className="text-xs opacity-80 mt-1">Người đăng ký</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-green-600 rounded-xl p-4 text-white">
                    <p className="text-xs opacity-80">Số dư khả dụng</p>
                    <p className="text-2xl font-bold mt-1">{(data?.wallet?.balance || 0).toLocaleString('vi-VN')}đ</p>
                    <p className="text-xs opacity-80 mt-1">Có thể rút ngay</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl p-4 text-white">
                    <p className="text-xs opacity-80">Chờ xử lý</p>
                    <p className="text-2xl font-bold mt-1">{(data?.wallet?.pendingBalance || 0).toLocaleString('vi-VN')}đ</p>
                    <p className="text-xs opacity-80 mt-1">Đối soát</p>
                </div>
            </div>

            {myLink && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">Link Affiliate của bạn</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={affiliateUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                        />
                        <button
                            onClick={copyLink}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            )}

            {campaign && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">Cấu hình hoa hồng</h3>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                        {campaign.levels.map(level => (
                            <div key={level.level} className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-emerald-600">{level.percentage}%</p>
                                <p className="text-xs text-gray-500">F{level.level}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500">
                        {campaign.pointsRequired} điểm = {campaign.pointRedemptionValue.toLocaleString('vi-VN')}đ • 
                        Đối soát: {campaign.pendingDays} ngày
                    </p>
                </div>
            )}

            {data?.directReferrals && data.directReferrals.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">Người đăng ký qua link ({data.directReferrals.length})</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left">Tên</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-left">Ngày</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.directReferrals.map((ref: any) => (
                                    <tr key={ref.id} className="border-t">
                                        <td className="px-3 py-2">{ref.name || 'Chưa cập nhật'}</td>
                                        <td className="px-3 py-2 text-gray-500">{ref.email}</td>
                                        <td className="px-3 py-2 text-gray-500">{new Date(ref.createdAt).toLocaleDateString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function LinksTab() {
    const [links, setLinks] = useState<LinkItem[]>([])
    const [loading, setLoading] = useState(true)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

    useEffect(() => {
        fetch('/api/affiliate/links')
            .then(res => res.ok ? res.json() : { links: [] })
            .then(data => { setLinks(data.links || []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text)
            alert('Đã copy!')
        } catch (e) { console.error(e) }
    }

    if (loading) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>Đang tải...</p>
            </div>
        )
    }

    const mainLink = links.find(l => l.name === 'Link chính')

    return (
        <div className="space-y-6">
            {mainLink && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded">Chính</span>
                            <span className="ml-2 text-sm text-gray-500">Code: <strong>{mainLink.code}</strong></span>
                        </div>
                        <div className="text-right text-sm">
                            <p><span className="text-gray-400">Clicks:</span> <strong>{mainLink._count.clicks}</strong></p>
                            <p><span className="text-gray-400">Conversions:</span> <strong>{mainLink._count.conversions}</strong></p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={`${baseUrl}/register?ref=${mainLink.code}`}
                            readOnly
                            className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
                        />
                        <button
                            onClick={() => copyToClipboard(`${baseUrl}/register?ref=${mainLink.code}`)}
                            className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm"
                        >
                            Copy
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3">Tất cả Link ({links.length})</h3>
                {links.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Chưa có link nào</p>
                ) : (
                    <div className="space-y-3">
                        {links.map(link => (
                            <div key={link.id} className="border border-gray-100 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-medium text-gray-900">{link.name || 'Link không tên'}</p>
                                    <div className="flex gap-4 text-sm">
                                        <span><strong>{link._count.clicks}</strong> clicks</span>
                                        <span><strong>{link._count.conversions}</strong> conversions</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={`${baseUrl}/register?ref=${link.code}`}
                                        readOnly
                                        className="flex-1 px-2 py-1 border rounded text-sm bg-gray-50"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(`${baseUrl}/register?ref=${link.code}`)}
                                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
                <h4 className="font-bold text-amber-800 mb-2">Mẹo chia sẻ hiệu quả</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Chia sẻ link trên Facebook, Zalo, Telegram</li>
                    <li>• Sử dụng hình ảnh đẹp và lời mời hấp dẫn</li>
                    <li>• Khi người đăng ký xác thực email, bạn nhận điểm</li>
                    <li>• Khi người đăng ký mua khóa học, bạn nhận hoa hồng</li>
                </ul>
            </div>
        </div>
    )
}

function WithdrawTab() {
    const [wallet, setWallet] = useState<{ balance: number } | null>(null)
    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [user, setUser] = useState<{ bankName: string | null; bankAccount: string | null; bankHolder: string | null } | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const res = await fetch('/api/affiliate/dashboard')
            if (res.ok) {
                const result = await res.json()
                setWallet(result.data.wallet)
                setCampaign(result.campaign)
                const userRes = await fetch('/api/user/profile')
                if (userRes.ok) {
                    const userData = await userRes.json()
                    setUser(userData.user || userData)
                }
            }
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    async function handleWithdraw(formData: FormData) {
        setSubmitting(true)
        setMessage(null)
        
        const amount = Number(formData.get('amount'))
        
        try {
            const res = await fetch('/api/affiliate/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    bankName: user?.bankName || '',
                    bankAccount: user?.bankAccount || '',
                    accountHolder: user?.bankHolder || ''
                })
            })
            
            if (res.ok) {
                setMessage({ type: 'success', text: 'Yêu cầu rút tiền đã gửi thành công!' })
                loadData()
            } else {
                const data = await res.json()
                setMessage({ type: 'error', text: data.error || 'Lỗi khi gửi yêu cầu' })
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Đã xảy ra lỗi' })
        }
        
        setSubmitting(false)
    }

    if (loading) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>Đang tải...</p>
            </div>
        )
    }

    const balance = wallet?.balance || 0
    const minPayout = campaign?.minPayout || 200000
    const feeAmount = campaign?.feeAmount || 3300

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm text-center">
                <p className="text-gray-500 text-sm">Số dư khả dụng</p>
                <p className="text-4xl font-bold text-emerald-600 mt-2">{balance.toLocaleString('vi-VN')}đ</p>
            </div>

            {user?.bankAccount && user?.bankName ? (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3">Thông tin tài khoản</h3>
                    <div className="text-sm space-y-1 text-gray-600">
                        <p>Ngân hàng: <strong>{user.bankName}</strong></p>
                        <p>Số tài khoản: <strong>{user.bankAccount}</strong></p>
                        <p>Chủ tài khoản: <strong>{user.bankHolder}</strong></p>
                    </div>
                </div>
            ) : (
                <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-red-700 text-sm">
                        Bạn chưa cập nhật thông tin tài khoản ngân hàng. 
                        Vui lòng cập nhật trong <Link href="/settings" className="underline font-medium">Cài đặt tài khoản</Link>.
                    </p>
                </div>
            )}

            {message && (
                <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form action={handleWithdraw} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Yêu cầu rút tiền</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số tiền muốn rút</label>
                    <input
                        type="number"
                        name="amount"
                        min={minPayout}
                        max={balance}
                        placeholder={`Tối thiểu ${minPayout.toLocaleString('vi-VN')}đ`}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Tối thiểu: {minPayout.toLocaleString('vi-VN')}đ</p>
                </div>

                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Phí chuyển khoản:</span>
                        <span>{feeAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                        <span>Thực nhận (ước tính):</span>
                        <span className="text-emerald-600">~{(balance - feeAmount).toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting || balance < minPayout || !user?.bankAccount}
                    className="w-full bg-emerald-500 text-white py-3 rounded-lg font-medium hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
                </button>
            </form>

            <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <h4 className="font-bold text-gray-700 mb-2">Lưu ý</h4>
                <ul className="text-gray-500 space-y-1">
                    <li>• Xử lý trong 24-48 giờ</li>
                    <li>• Phí: {feeAmount.toLocaleString('vi-VN')}đ/lần</li>
                    <li>• Thuế 5% áp dụng khi {'>'} 2 triệu</li>
                </ul>
            </div>
        </div>
    )
}

interface AffiliateRef {
    id: number
    refKey: string
    type: string
    description: string | null
    isActive: boolean
    createdAt: string
}

function RefsTab() {
    const [refs, setRefs] = useState<AffiliateRef[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [newRefKey, setNewRefKey] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

    useEffect(() => {
        loadRefs()
    }, [])

    async function loadRefs() {
        try {
            const res = await fetch('/api/affiliate/refs')
            if (res.ok) {
                const data = await res.json()
                setRefs(data.refs || [])
            }
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    async function createRef() {
        if (!newRefKey.trim()) {
            setError('Vui lòng nhập ref key')
            return
        }

        const normalized = newRefKey.toLowerCase().trim()
        if (!/^[a-z0-9]{1,10}$/.test(normalized)) {
            setError('Ref key: 1-10 ký tự, chỉ a-z và số')
            return
        }

        setError(null)
        try {
            const res = await fetch('/api/affiliate/refs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refKey: normalized,
                    description: newDescription.trim() || null,
                    type: 'CUSTOM_ALIAS'
                })
            })
            const data = await res.json()
            
            if (!res.ok) {
                setError(data.error || 'Lỗi khi tạo ref')
                return
            }

            setSuccess('Tạo ref thành công!')
            setNewRefKey('')
            setNewDescription('')
            setShowForm(false)
            loadRefs()
            setTimeout(() => setSuccess(null), 3000)
        } catch (e) {
            setError('Lỗi khi tạo ref')
        }
    }

    async function deleteRef(id: number) {
        if (!confirm('Bạn có chắc muốn xóa ref này?')) return
        
        try {
            const res = await fetch(`/api/affiliate/refs?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadRefs()
            }
        } catch (e) {
            console.error(e)
        }
    }

    async function toggleRef(ref: AffiliateRef) {
        try {
            await fetch('/api/affiliate/refs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    refId: ref.id,
                    isActive: !ref.isActive
                })
            })
            loadRefs()
        } catch (e) {
            console.error(e)
        }
    }

    if (loading) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>Đang tải...</p>
            </div>
        )
    }

    return (
        <div>
            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 className="font-bold text-blue-700 mb-2">🔤 Custom Refs</h4>
                <p className="text-sm text-blue-600">
                    Tạo ref key tùy chỉnh để chia sẻ link dễ nhớ. 
                    Ví dụ: <code>nbcuong</code> → <code>{baseUrl}/register?ref=nbcuong</code>
                </p>
                <ul className="text-xs text-blue-500 mt-2 space-y-1">
                    <li>• 1-10 ký tự, chỉ a-z và số</li>
                    <li>• Không trùng với user ID hoặc affiliate code</li>
                    <li>• Người click sẽ được track về bạn</li>
                </ul>
            </div>

            {/* Success message */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">
                    {success}
                </div>
            )}

            {/* Create form */}
            {showForm ? (
                <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
                    <h3 className="font-bold text-gray-700 mb-3">Tạo Ref Mới</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500">Ref Key *</label>
                            <input
                                type="text"
                                value={newRefKey}
                                onChange={(e) => setNewRefKey(e.target.value.toLowerCase())}
                                placeholder="nbcuong"
                                maxLength={10}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Mô tả (tùy chọn)</label>
                            <input
                                type="text"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Link của anh Cường"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={createRef}
                                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-medium text-sm"
                            >
                                Tạo
                            </button>
                            <button
                                onClick={() => { setShowForm(false); setError(null); setNewRefKey(''); setNewDescription('') }}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold mb-4"
                >
                    + Tạo Ref Mới
                </button>
            )}

            {/* Refs list */}
            {refs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <p>Chưa có ref nào</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {refs.map((ref) => (
                        <div
                            key={ref.id}
                            className={`bg-white rounded-xl border p-4 flex items-center justify-between ${
                                ref.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'
                            }`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800">{ref.refKey}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                        ref.type === 'USER_ID' ? 'bg-blue-100 text-blue-600' :
                                        ref.type === 'AFFILIATE_CODE' ? 'bg-purple-100 text-purple-600' :
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        {ref.type}
                                    </span>
                                    {!ref.isActive && (
                                        <span className="text-xs text-gray-400">(Tắt)</span>
                                    )}
                                </div>
                                {ref.description && (
                                    <p className="text-xs text-gray-500 mt-1">{ref.description}</p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                    {baseUrl}/register?ref={ref.refKey}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleRef(ref)}
                                    className={`text-xs px-2 py-1 rounded ${
                                        ref.isActive 
                                            ? 'bg-yellow-100 text-yellow-700' 
                                            : 'bg-green-100 text-green-700'
                                    }`}
                                >
                                    {ref.isActive ? 'Tắt' : 'Bật'}
                                </button>
                                <button
                                    onClick={() => deleteRef(ref.id)}
                                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700"
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function AffiliateToolsPage() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'links' | 'withdraw' | 'refs'>('dashboard')

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <ToolHeader title="AFFILIATE" backUrl="/tools" />

            <div className="max-w-4xl mx-auto p-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 flex">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'dashboard'
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        📊 Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('links')}
                        className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'links'
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        🔗 Links
                    </button>
                    <button
                        onClick={() => setActiveTab('refs')}
                        className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'refs'
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        🔤 Refs
                    </button>
                    <button
                        onClick={() => setActiveTab('withdraw')}
                        className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs transition-all ${
                            activeTab === 'withdraw'
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        💰 Rút tiền
                    </button>
                </div>

                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'links' && <LinksTab />}
                {activeTab === 'refs' && <RefsTab />}
                {activeTab === 'withdraw' && <WithdrawTab />}
            </div>
        </div>
    )
}