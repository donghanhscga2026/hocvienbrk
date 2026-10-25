'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CalendarClock, CheckCircle2, Clock3, Inbox, RefreshCw } from 'lucide-react'
import { formatCrmDate, REQUEST_STATUSES } from '@/lib/crm/shared'

type Dashboard = {
  stats: { newRequests: number; processing: number; resolved: number; overdue: number; today: number; completed: number };
  queue: { id: string; name: string; content: string; source: string; status: keyof typeof REQUEST_STATUSES; createdAt: string }[];
  appointments: { id: number; title: string; dueAt: string; contactId: number; contact: { name: string } }[];
  recent: { id: string; name: string; source: string; status: keyof typeof REQUEST_STATUSES; updatedAt: string }[];
  generatedAt: string;
}
export default function CrmOverview({ revision, report = false, onTasks, onOpen }: { revision: number; report?: boolean; onTasks: (due: string) => void; onOpen: (id: number) => void }) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const abort = new AbortController()
    setError(''); setData(null)
    fetch('/api/crm?view=overview', { cache: 'no-store', signal: abort.signal }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không tải được tổng quan.')
      if (!abort.signal.aborted) setData(result)
    }).catch(e => { if (!abort.signal.aborted) setError(e.message) })
    return () => abort.abort()
  }, [revision, refresh])
  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm">{error}<button className="ml-3 underline" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div>
  if (!data) return <p role="status" className="p-4 text-sm text-slate-500">Đang tải tổng quan…</p>
  const cards = report ? [
    { label: 'Yêu cầu đang mở', value: data.stats.newRequests + data.stats.processing, icon: Inbox, href: '/tools/crm?view=requests' },
    { label: 'Yêu cầu đã xử lý', value: data.stats.resolved, icon: CheckCircle2, href: '/tools/crm?view=requests&status=RESOLVED' },
    { label: 'Việc đã hoàn thành', value: data.stats.completed, icon: CheckCircle2, due: 'done' },
    { label: 'Việc quá hạn', value: data.stats.overdue, icon: Clock3, due: 'overdue' },
  ] : [
    { label: 'Yêu cầu mới', value: data.stats.newRequests, icon: Inbox, href: '/tools/crm?view=requests&status=NEW' },
    { label: 'Đang xử lý', value: data.stats.processing, icon: Clock3, href: '/tools/crm?view=requests&status=IN_PROGRESS' },
    { label: 'Việc quá hạn', value: data.stats.overdue, icon: Clock3, due: 'overdue' },
    { label: 'Lịch hôm nay', value: data.stats.today, icon: CalendarClock, due: 'today' },
  ]
  const cardClass = 'group min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 sm:p-5'
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{report ? 'Trạng thái hiện tại trong phạm vi phụ trách; số hoàn thành tính toàn bộ thời gian.' : 'Ưu tiên yêu cầu chờ phản hồi và lịch đến hạn.'}</p><button aria-label="Làm mới tổng quan" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border bg-white" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button></div>
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{cards.map(card => {
      const content = <><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">{card.label}</span><card.icon size={16} className="shrink-0 text-slate-400" /></div><div className="mt-3 flex items-end justify-between"><strong className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{card.value}</strong><ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-700" /></div></>
      return card.href ? <Link key={card.label} href={card.href} className={cardClass}>{content}</Link> : <button key={card.label} className={cardClass} onClick={() => onTasks(card.due!)}>{content}</button>
    })}</div>
    {!report && <>
      <p className="text-xs text-slate-500">Một lịch đến hạn hôm nay có thể đã quá giờ và được tính cả vào “Việc quá hạn”. Giờ Việt Nam.</p>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Yêu cầu cần phản hồi</h3><Link href="/tools/crm?view=requests" className="text-xs font-medium text-emerald-800">Xem tất cả</Link></div><p className="mb-2 text-xs text-slate-500">Tối đa 6 yêu cầu đang mở, chờ lâu nhất trước.</p><div className="divide-y divide-slate-100">{data.queue.map(row => <Link key={row.id} href={'/tools/crm?view=requests&request=' + row.id} className="block space-y-1 py-3 hover:text-emerald-800"><div className="flex justify-between gap-2"><strong className="min-w-0 truncate text-sm">{row.name}</strong><span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">{REQUEST_STATUSES[row.status]}</span></div><p className="line-clamp-1 break-words text-sm text-slate-600">{row.content}</p><p className="truncate text-xs text-slate-400">{row.source} · {formatCrmDate(row.createdAt)}</p></Link>)}{!data.queue.length && <p className="py-5 text-sm text-slate-500">Không có yêu cầu đang chờ.</p>}</div></section>
        <div className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Lịch cần xử lý</h3><button className="min-h-11 text-xs font-medium text-emerald-800" onClick={() => onTasks('all')}>Xem tất cả</button></div><p className="mb-2 text-xs text-slate-500">Tối đa 6 việc quá hạn hoặc đến hạn hôm nay.</p><div className="divide-y divide-slate-100">{data.appointments.map(row => <button key={row.id} className="block w-full space-y-1 py-3 text-left" onClick={() => onOpen(row.contactId)}><strong className="block break-words text-sm">{row.title}</strong><span className="block truncate text-xs text-slate-500">{row.contact.name}</span><span className={'block text-xs ' + (new Date(row.dueAt).getTime() < new Date(data.generatedAt).getTime() ? 'text-red-700' : 'text-slate-500')}>{formatCrmDate(row.dueAt)}</span></button>)}{!data.appointments.length && <p className="py-5 text-sm text-slate-500">Chưa có lịch cần xử lý.</p>}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-2 font-semibold">Yêu cầu vừa cập nhật</h3><div className="divide-y divide-slate-100">{data.recent.map(row => <Link key={row.id} href={'/tools/crm?view=requests&request=' + row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="min-w-0 flex-1 truncate">{row.name} · {REQUEST_STATUSES[row.status]}</span><span className="text-xs text-slate-400">{formatCrmDate(row.updatedAt)}</span></Link>)}{!data.recent.length && <p className="text-sm text-slate-500">Chưa có cập nhật.</p>}</div></section></div>
      </div>
      <Link href="/tools/crm?view=today" className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"><span><strong className="block text-sm text-emerald-900">Data hôm nay</strong><span className="text-xs text-emerald-800">Số lượng và danh sách hồ sơ, yêu cầu, tài khoản mới đăng ký hôm nay</span></span><ArrowUpRight size={18} className="shrink-0 text-emerald-700" /></Link>
      <Link href="/tools/crm?view=partners" className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"><span><strong className="block text-sm">Đối tác WI300</strong><span className="text-xs text-slate-500">Hồ sơ doanh nghiệp, giảng viên · Phân công, đánh giá và xuất Excel</span></span><ArrowUpRight size={18} className="shrink-0 text-emerald-700" /></Link>
    </>}
  </div>
}
