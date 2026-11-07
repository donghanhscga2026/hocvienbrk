'use client'
import { useEffect, useState } from 'react'
import { Bell, Flame, Inbox, PauseCircle, RefreshCw, Search } from 'lucide-react'

type CareRuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6'
type CareStatus = 'pending' | 'reminded' | 'capped' | 'skipped' | 'takeover'
type CareRow = {
  userId: number; userName: string; courseId: number; courseName: string; enrollmentId: number | null
  ruleId: CareRuleId; ruleName: string; score: number; signal: string; detail: string; message: string; status: CareStatus
}
type CareData = {
  date: string
  stats: { total: number; highRisk: number; remindedToday: number; capped: number; takeover: number; byRule: Record<CareRuleId, number> }
  rows: CareRow[]
}

const RULES: CareRuleId[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']
const RULE_BADGE: Record<CareRuleId, string> = {
  R1: 'bg-red-50 text-red-800 ring-red-200',
  R2: 'bg-amber-50 text-amber-800 ring-amber-200',
  R3: 'bg-violet-50 text-violet-800 ring-violet-200',
  R4: 'bg-rose-50 text-rose-800 ring-rose-200',
  R5: 'bg-sky-50 text-sky-800 ring-sky-200',
  R6: 'bg-teal-50 text-teal-800 ring-teal-200',
}
const STATUS_LABEL: Record<CareStatus, string> = {
  pending: 'Chưa nhắc',
  reminded: 'Đã nhắc hôm nay',
  capped: 'Đã đạt trần 1 nhắc/ngày',
  skipped: 'Đã bỏ qua hôm nay',
  takeover: 'Tạm dừng — người thật đang xử lý',
}
const STATUS_CLASS: Record<CareStatus, string> = {
  pending: 'text-slate-500',
  reminded: 'text-emerald-700',
  capped: 'text-amber-700',
  skipped: 'text-slate-400',
  takeover: 'text-violet-700',
}

async function postCare(path: string, body: unknown) {
  const response = await fetch(path, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || 'Không xử lý được yêu cầu.')
  return data
}

export default function CrmCareToday({ revision }: { revision: number }) {
  const [data, setData] = useState<CareData | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [rule, setRule] = useState<CareRuleId | 'all'>('all')
  const [query, setQuery] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const abort = new AbortController()
    setError(''); setData(null)
    fetch('/api/crm/care-today', { cache: 'no-store', signal: abort.signal }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không tải được hàng đợi cần chăm.')
      if (!abort.signal.aborted) setData(result)
    }).catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được hàng đợi cần chăm.') })
    return () => abort.abort()
  }, [revision, refresh])

  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button className="ml-3 underline" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div>
  if (!data) return <p role="status" className="p-4 text-sm text-slate-500">Đang quét học viên cần chăm hôm nay…</p>

  const q = query.trim().toLowerCase()
  const rows = data.rows.filter(row => (rule === 'all' || row.ruleId === rule) && (!q || row.userName.toLowerCase().includes(q) || row.courseName.toLowerCase().includes(q)))
  const cards = [
    { label: 'Nguy cơ cao (điểm ≥ 75)', value: data.stats.highRisk, icon: Flame },
    { label: 'Tổng cần chăm hôm nay', value: data.stats.total, icon: Inbox },
    { label: 'Đã nhắc hôm nay', value: data.stats.remindedToday, icon: Bell },
    { label: 'Tạm dừng / đạt trần', value: data.stats.takeover + data.stats.capped, icon: PauseCircle },
  ]

  const act = async (row: CareRow, action: 'remind' | 'skip') => {
    const key = row.userId + ':' + row.courseId + ':' + row.ruleId
    setBusyKey(key); setActionError(''); setNotice('')
    try {
      const result = await postCare('/api/crm/care-today/' + action, { userId: row.userId, courseId: row.courseId, ruleId: row.ruleId })
      setData(current => current ? {
        ...current,
        stats: {
          ...current.stats,
          remindedToday: current.stats.remindedToday + (action === 'remind' ? 1 : 0),
        },
        rows: current.rows.map(item => item.userId === row.userId && item.courseId === row.courseId && item.ruleId === row.ruleId
          ? { ...item, status: result.status as CareStatus } : item),
      } : current)
      setNotice(action === 'remind' ? 'Đã gửi nhắc cho ' + row.userName + '.' : 'Đã bỏ qua dòng của ' + row.userName + ' trong hôm nay.')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Không xử lý được yêu cầu.')
    } finally { setBusyKey('') }
  }

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-slate-500">Ngày {data.date.split('-').reverse().join('/')} · giờ Việt Nam · 6 luật chăm sóc R1–R6 trong phạm vi phụ trách của bạn. Mỗi học viên tối đa 1 nhắc tự động/ngày; dòng đang có người thật xử lý sẽ tự tạm dừng.</p>
      <button aria-label="Làm mới hàng đợi cần chăm" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border bg-white" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">{cards.map(card => <div key={card.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">{card.label}</span><card.icon size={16} className="shrink-0 text-slate-400" /></div><strong className="mt-3 block text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{card.value}</strong></div>)}</div>

    <div className="flex flex-wrap items-center gap-2">
      <button type="button" aria-pressed={rule === 'all'} className={(rule === 'all' ? 'bg-emerald-700 text-white ' : 'bg-white text-slate-700 ring-1 ring-slate-300 ') + 'min-h-11 rounded-xl px-3 py-2 text-sm font-medium'} onClick={() => setRule('all')}>Tất cả · {data.stats.total}</button>
      {RULES.map(id => <button key={id} type="button" aria-pressed={rule === id} className={(rule === id ? 'bg-emerald-700 text-white ' : 'bg-white text-slate-700 ring-1 ring-slate-300 ') + 'min-h-11 rounded-xl px-3 py-2 text-sm font-medium'} onClick={() => setRule(id)}>{id} · {data.rows.find(r => r.ruleId === id)?.ruleName || id} · {data.stats.byRule[id]}</button>)}
      <label className="relative ml-auto block w-full sm:w-72">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} maxLength={100} placeholder="Tìm học viên hoặc khóa học" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </label>
    </div>

    {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">{rows.map(row => {
        const key = row.userId + ':' + row.courseId + ':' + row.ruleId
        const busy = busyKey === key
        const canRemind = row.status === 'pending' || row.status === 'takeover'
        const canSkip = row.status === 'pending' || row.status === 'takeover' || row.status === 'capped'
        return <article key={key} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="min-w-0 break-words text-sm text-slate-900">{row.userName}</strong>
            <span className={'rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ' + RULE_BADGE[row.ruleId]}>{row.ruleId} · {row.ruleName}</span>
            <span className={'rounded-md px-2 py-0.5 text-xs font-bold ' + (row.score >= 75 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600')}>Điểm {row.score}</span>
            <span className="text-xs text-slate-400">{row.courseName} · Học viên #{row.userId}</span>
          </div>
          <p className="text-sm text-slate-700">{row.signal}{row.detail ? <span className="text-slate-500"> · {row.detail}</span> : null}</p>
          <p className="line-clamp-2 text-xs leading-5 text-slate-500">Nội dung nhắc: “{row.message}”</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={'text-xs font-medium ' + STATUS_CLASS[row.status]}>{STATUS_LABEL[row.status]}</span>
            <span className="flex-1" />
            {canSkip && <button disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50" onClick={() => void act(row, 'skip')}>Bỏ qua hôm nay</button>}
            {canRemind && <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50" onClick={() => void act(row, 'remind')}><Bell size={16} />{busy ? 'Đang gửi…' : 'Gửi nhắc'}</button>}
          </div>
        </article>
      })}{rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Không có học viên nào khớp bộ lọc. Hàng đợi đang sạch — tốt lắm.</p>}</div>
    </section>
    <p className="text-xs text-slate-500">Đang hiện {rows.length} dòng theo bộ lọc, tối đa 300 dòng điểm cao nhất. Gửi nhắc sẽ tính lại tín hiệu từ dữ liệu thật trước khi gửi.</p>
  </div>
}
