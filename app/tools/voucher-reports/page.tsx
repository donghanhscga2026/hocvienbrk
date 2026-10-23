'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { BarChart3, Search, Loader2, Download, Gift, Wallet, Receipt } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'

interface ReportData {
  filters: any
  summary: {
    vouchersGranted: number
    vouchersUsed: number
    paymentsWithBenefit: number
    totalListed: number
    totalDiscount: number
    totalMbvDeducted: number
    totalActual: number
    mbvCredited: number
    mbvSpent: number
  }
  userVouchers: any[]
  payments: any[]
  mbvTransactions: any[]
}

const fmt = (n: number) => Number(n || 0).toLocaleString('vi-VN')
const fmtDate = (d: string) => new Date(d).toLocaleString('vi-VN')

export default function VoucherReportsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string
  const allowed = role === 'ADMIN' || role === 'TEACHER'

  const [filters, setFilters] = useState({ voucherId: '', courseId: '', userId: '', dateFrom: '', dateTo: '' })
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'vouchers' | 'payments' | 'mbv'>('vouchers')

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v) })
      const res = await fetch(`/api/admin/voucher-reports?${qs.toString()}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      alert('Lỗi tải báo cáo: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { if (allowed) fetchReport() }, [allowed])

  const exportCsv = () => {
    if (!data) return
    const rows: string[] = []
    if (tab === 'vouchers') {
      rows.push('ID,Trạng thái,Mã voucher,Tên voucher,User,Email,Ngày tặng,Ngày dùng')
      data.userVouchers.forEach((v: any) => rows.push(
        [v.id, v.status, v.voucher?.code, `"${v.voucher?.name || ''}"`, `"${v.user?.name || ''}"`, v.user?.email || '', fmtDate(v.createdAt), v.usedAt ? fmtDate(v.usedAt) : ''].join(',')
      ))
    } else if (tab === 'payments') {
      rows.push('ID Payment,Trạng thái,Số tiền thực thu,Giảm giá,Trừ MBV,Mã voucher,Khóa học,User,Ngày')
      data.payments.forEach((p: any) => rows.push(
        [p.id, p.status, p.amount, p.discountAmount, p.mbvDeducted, p.voucher?.code || '', `"${p.enrollment?.course?.name_lop || ''}"`, `"${p.enrollment?.user?.name || ''}"`, fmtDate(p.createdAt)].join(',')
      ))
    } else {
      rows.push('ID,Số tiền,Loại,Mô tả,Ref,User,Ngày')
      data.mbvTransactions.forEach((t: any) => rows.push(
        [t.id, t.amount, t.type, `"${(t.description || '').replace(/"/g, "'")}"`, t.refId || '', `"${t.user?.name || ''}"`, fmtDate(t.createdAt)].join(',')
      ))
    }
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `bao-cao-voucher-mbv-${tab}.csv`
    a.click()
  }

  if (!allowed) {
    return <div className="min-h-screen bg-brk-background"><MainHeader title="Báo cáo Voucher/MBV" /><main className="max-w-7xl mx-auto px-4 py-8 text-sm text-red-600">Bạn không có quyền xem trang này.</main></div>
  }

  const s = data?.summary

  return (
    <div className="min-h-screen bg-brk-background">
      <MainHeader title="Báo cáo Voucher / MBV" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-brk-on-surface flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-brk-accent" /> Báo cáo Voucher & MBV
          </h1>
          <button onClick={exportCsv} disabled={!data} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Xuất CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { k: 'voucherId', label: 'ID voucher', ph: 'vd: 12' },
              { k: 'courseId', label: 'ID khóa học', ph: 'vd: 45' },
              { k: 'userId', label: 'ID học viên', ph: 'vd: 1023' },
            ].map(f => (
              <label key={f.k} className="text-xs font-bold text-gray-600">
                {f.label}
                <input value={(filters as any)[f.k]} onChange={e => setFilters({ ...filters, [f.k]: e.target.value })}
                  placeholder={f.ph} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal" />
              </label>
            ))}
            <label className="text-xs font-bold text-gray-600">Từ ngày
              <input type="date" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal" />
            </label>
            <label className="text-xs font-bold text-gray-600">Đến ngày
              <input type="date" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal" />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={fetchReport} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-brk-accent text-white rounded-xl text-sm font-bold hover:bg-brk-accent/90 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Lọc báo cáo
            </button>
            <button onClick={() => setFilters({ voucherId: '', courseId: '', userId: '', dateFrom: '', dateTo: '' })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">Xóa lọc</button>
          </div>
        </div>

        {s && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Quà tặng đã phát', value: fmt(s.vouchersGranted), icon: <Gift className="h-4 w-4" />, color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { label: 'Quà tặng đã dùng', value: fmt(s.vouchersUsed), icon: <Gift className="h-4 w-4" />, color: 'bg-green-50 text-green-700 border-green-200' },
              { label: 'Giá niêm yết (tổng)', value: fmt(s.totalListed) + 'đ', icon: <Receipt className="h-4 w-4" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Thực thu (sau trừ)', value: fmt(s.totalActual) + 'đ', icon: <Receipt className="h-4 w-4" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Tổng giảm giá', value: fmt(s.totalDiscount) + 'đ', icon: <Receipt className="h-4 w-4" />, color: 'bg-red-50 text-red-700 border-red-200' },
              { label: 'Đã trừ điểm MBV', value: fmt(s.totalMbvDeducted) + 'đ', icon: <Wallet className="h-4 w-4" />, color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { label: 'MBV đã cộng', value: fmt(s.mbvCredited), icon: <Wallet className="h-4 w-4" />, color: 'bg-teal-50 text-teal-700 border-teal-200' },
              { label: 'MBV đã tiêu', value: fmt(s.mbvSpent), icon: <Wallet className="h-4 w-4" />, color: 'bg-gray-100 text-gray-700 border-gray-200' },
            ].map((c, i) => (
              <div key={i} className={`${c.color} rounded-xl p-4 border`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-70">{c.icon}{c.label}</div>
                <div className="text-2xl font-black mt-1">{c.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {([['vouchers', 'Quà tặng đã phát/dùng'], ['payments', 'Thanh toán có ưu đãi'], ['mbv', 'Luồng điểm MBV']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border ${tab === k ? 'bg-brk-accent text-white border-brk-accent' : 'bg-white text-gray-600 border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brk-accent" /></div>
          ) : !data ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nhấn "Lọc báo cáo" để xem dữ liệu</div>
          ) : tab === 'vouchers' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['ID', 'Trạng thái', 'Mã voucher', 'Tên voucher', 'Học viên', 'Ngày tặng', 'Ngày dùng'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">{h}</th>))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.userVouchers.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{v.id}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.status === 'USED' ? 'bg-green-100 text-green-700' : v.status === 'EXPIRED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>{v.status}</span></td>
                    <td className="px-4 py-2"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{v.voucher?.code}</code></td>
                    <td className="px-4 py-2 font-bold">{v.voucher?.name}</td>
                    <td className="px-4 py-2">#{v.user?.id} {v.user?.name}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtDate(v.createdAt)}</td>
                    <td className="px-4 py-2 text-gray-500">{v.usedAt ? fmtDate(v.usedAt) : '-'}</td>
                  </tr>
                ))}
                {data.userVouchers.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          ) : tab === 'payments' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['Payment', 'Khóa học', 'Học viên', 'Niêm yết', 'Giảm', 'Trừ MBV', 'Thực thu', 'Mã voucher', 'Ngày'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">{h}</th>))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">#{p.id} <span className="text-xs text-gray-400">{p.status}</span></td>
                    <td className="px-4 py-2 font-bold">{p.enrollment?.course?.name_lop}</td>
                    <td className="px-4 py-2">#{p.enrollment?.user?.id} {p.enrollment?.user?.name}</td>
                    <td className="px-4 py-2">{fmt(p.enrollment?.course?.phi_coc)}đ</td>
                    <td className="px-4 py-2 text-red-600">-{fmt(p.discountAmount)}đ</td>
                    <td className="px-4 py-2 text-orange-600">-{fmt(p.mbvDeducted)}đ</td>
                    <td className="px-4 py-2 font-black">{fmt(p.amount)}đ</td>
                    <td className="px-4 py-2">{p.voucher ? <code className="text-xs bg-gray-100 px-2 py-1 rounded">{p.voucher.code}</code> : '-'}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtDate(p.createdAt)}</td>
                  </tr>
                ))}
                {data.payments.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                {['ID', 'User', 'Số tiền', 'Loại', 'Mô tả', 'Ngày'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase">{h}</th>))}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.mbvTransactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{t.id}</td>
                    <td className="px-4 py-2">#{t.user?.id} {t.user?.name}</td>
                    <td className={`px-4 py-2 font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.amount >= 0 ? '+' : ''}{fmt(t.amount)}</td>
                    <td className="px-4 py-2"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{t.type}</code></td>
                    <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={t.description}>{t.description}</td>
                    <td className="px-4 py-2 text-gray-500">{fmtDate(t.createdAt)}</td>
                  </tr>
                ))}
                {data.mbvTransactions.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
