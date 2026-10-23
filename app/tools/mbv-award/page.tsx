'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Coins, Loader2, Check, AlertTriangle } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { awardMbvManuallyAction } from '@/app/actions/voucher-mbv-admin'

export default function MbvAwardPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string
  const isAdmin = role === 'ADMIN'

  const [userIdentifier, setUserIdentifier] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null); setSuccess(null)
    try {
      const res = await awardMbvManuallyAction({
        userIdentifier,
        amount: Number(amount),
        reason
      })
      if (res.success) {
        setSuccess(`✅ Đã thưởng ${Number(amount).toLocaleString('vi-VN')} điểm MBV cho #${res.user?.id} ${res.user?.name || ''}`)
        setUserIdentifier(''); setAmount(''); setReason('')
      } else {
        setError(res.error || 'Thưởng thất bại')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return <div className="min-h-screen bg-brk-background"><MainHeader title="Thưởng điểm MBV" /><main className="max-w-3xl mx-auto px-4 py-8 text-sm text-red-600">Chỉ Admin mới có quyền truy cập trang này.</main></div>
  }

  return (
    <div className="min-h-screen bg-brk-background">
      <MainHeader title="Thưởng điểm MBV" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-brk-on-surface flex items-center gap-3 mb-2">
          <Coins className="h-7 w-7 text-brk-accent" /> Thưởng điểm MBV tay
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Cộng điểm MBV vào ví học viên (chiến dịch marketing, thưởng sự kiện...).
          Mỗi lần thưởng được ghi nhận là một giao dịch <code className="bg-gray-100 px-1 rounded text-xs">MBV_CREDIT</code> kèm lý do trong lịch sử ví.
        </p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm"><Check className="h-4 w-4 shrink-0" /> {success}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <label className="block text-sm font-bold text-gray-700">
            Học viên (ID / email / số điện thoại)
            <input value={userIdentifier} onChange={e => setUserIdentifier(e.target.value)} required
              placeholder="vd: 1023 hoặc email@example.com hoặc 0901234567"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-normal" />
          </label>
          <label className="block text-sm font-bold text-gray-700">
            Số điểm MBV thưởng
            <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} required
              placeholder="vd: 100000"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-normal" />
          </label>
          <label className="block text-sm font-bold text-gray-700">
            Lý do thưởng <span className="text-red-500">*</span>
            <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={3}
              placeholder="vd: Thưởng top 1 minigame tháng 10 — sẽ hiển thị trong lịch sử ví của học viên"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-normal" />
          </label>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brk-accent text-white rounded-xl font-bold text-sm hover:bg-brk-accent/90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            {loading ? 'Đang thưởng...' : 'Xác nhận thưởng MBV'}
          </button>
        </form>
      </main>
    </div>
  )
}
