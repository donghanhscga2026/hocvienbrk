'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Inbox, RefreshCw, UserPlus, Users } from 'lucide-react'
import { formatCrmDate, REQUEST_STATUSES } from '@/lib/crm/shared'

type TodayData = {
  date: string
  stats: { contacts: number; requests: number; newUsers: number }
  contactsBySource: { label: string; count: number }[]
  contacts: { id: number; name: string; email: string | null; phone: string | null; source: string; createdAt: string; owner: { id: number; name: string | null; email: string } | null }[]
  contactsTotal: number
  page: number
  requests: { id: string; name: string; email: string | null; phone: string | null; source: string; status: keyof typeof REQUEST_STATUSES; content: string; createdAt: string; contactId: number | null; course: { name_lop: string } | null }[]
  requestsTotal: number
  newUsers: { id: number; name: string | null; email: string; phone: string | null; createdAt: string; referrerId: number | null }[]
  newUsersTotal: number
  generatedAt: string
}

export default function CrmToday({ revision, isAdmin, onOpen }: { revision: number; isAdmin?: boolean; onOpen: (id: number) => void }) {
  const [data, setData] = useState<TodayData | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [page, setPage] = useState(1)
  useEffect(() => {
    const abort = new AbortController()
    setError(''); setData(null)
    fetch('/api/crm?view=today&page=' + page, { cache: 'no-store', signal: abort.signal }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không tải được data hôm nay.')
      if (!abort.signal.aborted) setData(result)
    }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
    return () => abort.abort()
  }, [revision, refresh, page])
  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm">{error}<button className="ml-3 underline" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div>
  if (!data) return <p role="status" className="p-4 text-sm text-slate-500">Đang tải data hôm nay…</p>
  const pages = Math.max(1, Math.ceil(data.contactsTotal / 20))
  const cards = [
    { label: 'Hồ sơ khách mới', value: data.stats.contacts, icon: Users },
    { label: 'Yêu cầu mới gửi hôm nay', value: data.stats.requests, icon: Inbox },
    { label: 'Tài khoản website mới', value: data.stats.newUsers, icon: UserPlus },
  ]
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-slate-500">Ngày {data.date.split('-').reverse().join('/')} · giờ Việt Nam · trong phạm vi phụ trách của bạn. Một người có thể xuất hiện ở cả ba danh sách vì hệ thống không tự gộp danh tính giữa các nguồn.</p>
      <button aria-label="Làm mới data hôm nay" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border bg-white" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button>
    </div>
    <div className="grid grid-cols-3 gap-2 sm:gap-4">{cards.map(card => <div key={card.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">{card.label}</span><card.icon size={16} className="shrink-0 text-slate-400" /></div><strong className="mt-3 block text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{card.value}</strong></div>)}</div>

    {data.contactsBySource.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-semibold">Hồ sơ mới theo nguồn</h3><div className="mt-2 divide-y divide-slate-100">{data.contactsBySource.map(row => <p key={row.label} className="flex justify-between gap-3 py-2 text-sm"><span className="break-words">{row.label}</span><strong>{row.count}</strong></p>)}</div></section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Hồ sơ khách tạo hôm nay</h3><span className="text-xs text-slate-500">{data.contactsTotal} hồ sơ</span></div>
      <div className="divide-y divide-slate-100">{data.contacts.map(contact => <button key={contact.id} className="block w-full space-y-1 py-3 text-left hover:text-emerald-800" onClick={() => onOpen(contact.id)}><div className="flex flex-wrap justify-between gap-2"><strong className="min-w-0 break-words text-sm">{contact.name}</strong><span className="shrink-0 text-xs text-slate-400">{formatCrmDate(contact.createdAt)}</span></div><p className="break-all text-sm text-slate-600">{[contact.email, contact.phone].filter(Boolean).join(' · ') || 'Chưa có email / số điện thoại'}</p><p className="truncate text-xs text-slate-400">{contact.source} · Phụ trách: {contact.owner?.name || contact.owner?.email || 'Chưa phân công'}</p></button>)}{!data.contacts.length && <p className="py-5 text-sm text-slate-500">Hôm nay chưa có hồ sơ khách mới trong phạm vi của bạn.</p>}</div>
      {pages > 1 && <div className="flex items-center justify-between gap-2 pt-3 text-sm"><span>Trang {page}/{pages}</span><div className="flex gap-2"><button aria-label="Trang trước" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 hover:bg-slate-100 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><button aria-label="Trang sau" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 hover:bg-slate-100 disabled:opacity-50" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div></div>}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Yêu cầu gửi hôm nay</h3><Link href="/tools/crm?view=requests" className="text-xs font-medium text-emerald-800">Xem tất cả yêu cầu</Link></div>
      <p className="mb-2 text-xs text-slate-500">Tối đa 20 yêu cầu mới nhất trong tổng số {data.requestsTotal} yêu cầu hôm nay.</p>
      <div className="divide-y divide-slate-100">{data.requests.map(row => <Link key={row.id} href={'/tools/crm?view=requests&request=' + row.id} className="block space-y-1 py-3 hover:text-emerald-800"><div className="flex justify-between gap-2"><strong className="min-w-0 truncate text-sm">{row.name}</strong><span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">{REQUEST_STATUSES[row.status]}</span></div><p className="line-clamp-2 break-words text-sm text-slate-600">{row.content}</p><p className="truncate text-xs text-slate-400">{row.course?.name_lop || row.source} · {formatCrmDate(row.createdAt)}</p></Link>)}{!data.requests.length && <p className="py-5 text-sm text-slate-500">Hôm nay chưa có yêu cầu mới.</p>}</div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Tài khoản website tạo hôm nay</h3><Link href="/tools/students" className="text-xs font-medium text-emerald-800">Mở danh sách thành viên</Link></div>
      <p className="mb-2 text-xs text-slate-500">{isAdmin ? 'Toàn bộ tài khoản mới trên website.' : 'Chỉ tính tài khoản đã ghi danh vào khóa của bạn.'} Tối đa 20 tài khoản mới nhất trong tổng số {data.newUsersTotal}.</p>
      <div className="divide-y divide-slate-100">{data.newUsers.map(user => <div key={user.id} className="space-y-1 py-3"><div className="flex flex-wrap justify-between gap-2"><strong className="min-w-0 break-words text-sm">{user.name || 'Thành viên #' + user.id}</strong><span className="shrink-0 text-xs text-slate-400">{formatCrmDate(user.createdAt)}</span></div><p className="break-all text-sm text-slate-600">{[user.email, user.phone].filter(Boolean).join(' · ')}</p><p className="text-xs text-slate-400">Mã thành viên #{user.id}{user.referrerId != null ? ' · Người giới thiệu #' + user.referrerId : ''}</p></div>)}{!data.newUsers.length && <p className="py-5 text-sm text-slate-500">Hôm nay chưa có tài khoản mới phù hợp phạm vi.</p>}</div>
    </section>
  </div>
}
