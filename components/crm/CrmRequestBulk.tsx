'use client'
import { useState } from 'react'
import { Download, Users, CheckCheck, Play, X } from 'lucide-react'
import type { CrmOwner } from '@/lib/crm/shared'
import type { bulkFilters } from '@/lib/crm/request-bulk'
import type { z } from 'zod'
import CrmDrawer from './CrmDrawer'

export type SelectedRequest = { id: string; version: number }
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:opacity-50'
export default function CrmRequestBulk({ rows, chosen, setChosen, filters, owners, isAdmin, onChanged, loading }: {
  rows: SelectedRequest[]; chosen: SelectedRequest[]; setChosen: (rows: SelectedRequest[]) => void;
  filters: z.infer<typeof bulkFilters>; owners: CrmOwner[]; isAdmin: boolean; onChanged: () => void; loading: boolean;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [failures, setFailures] = useState<{ id: string; error: string }[]>([])
  const [action, setAction] = useState<'ASSIGN' | 'PROCESS' | 'RESOLVE' | null>(null), [owner, setOwner] = useState(''), [resolution, setResolution] = useState('')
  const call = (body: unknown) => fetch('/api/crm/requests/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const selectAll = async () => {
    setBusy(true); setError(''); setNotice('')
    try { const response = await call({ action: 'SELECT', filters }), data = await response.json(); if (!response.ok) throw new Error(data.error); setChosen(data.items); setNotice(`Đã chọn ${data.items.length} yêu cầu theo bộ lọc.`) }
    catch (e) { setError(e instanceof Error ? e.message : 'Không chọn được yêu cầu.') } finally { setBusy(false) }
  }
  const download = async () => {
    setBusy(true); setError('')
    try {
      const response = await call({ action: 'EXPORT', ...(chosen.length ? { ids: chosen.map(row => row.id) } : { filters }) })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error) }
      const url = URL.createObjectURL(await response.blob()), link = document.createElement('a'); link.href = url; link.download = 'crm-requests.xlsx'; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Không xuất được file.') } finally { setBusy(false) }
  }
  const apply = async () => {
    if (!action || busy) return
    setBusy(true); setError(''); setFailures([])
    try {
      const response = await call({ action, items: chosen, ...(action === 'ASSIGN' ? { ownerId: owner === '' ? null : Number(owner) } : action === 'RESOLVE' ? { resolution } : {}) }), data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setNotice(`Đã cập nhật ${data.updated} yêu cầu${data.failed ? `; ${data.failed} yêu cầu chưa cập nhật được.` : '.'}`)
      setFailures(data.results.filter((row: { updated: boolean }) => !row.updated)); setChosen([]); setAction(null); setResolution(''); onChanged()
    } catch (e) { setError(e instanceof Error ? e.message : 'Không cập nhật được yêu cầu.'); onChanged(); setChosen([]) } finally { setBusy(false) }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <label className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={loading || busy || !rows.length} checked={!!rows.length && rows.every(row => chosen.some(item => item.id === row.id))} onChange={e => setChosen(e.target.checked ? [...chosen.filter(item => !rows.some(row => row.id === item.id)), ...rows.map(({ id, version }) => ({ id, version }))] : chosen.filter(item => !rows.some(row => row.id === item.id)))} className="h-4 w-4 accent-emerald-700" />Chọn trang này</label>
      <button disabled={busy || loading} className={button} onClick={selectAll}>Chọn toàn bộ kết quả lọc</button>
      <button disabled={busy || loading} className={button + ' sm:ml-auto'} onClick={download}><Download size={16} />{busy ? 'Đang xử lý…' : chosen.length ? 'Xuất mục đã chọn' : 'Xuất theo bộ lọc'}</button>
    </div>
    {!!chosen.length && <div role="region" aria-label="Thao tác yêu cầu đã chọn" className="sticky top-32 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm"><strong className="mr-2 text-sm text-emerald-900">Đã chọn {chosen.length}</strong>{isAdmin && <button disabled={busy} className={button} onClick={() => setAction('ASSIGN')}><Users size={16} />Giao phụ trách</button>}<button disabled={busy} className={button} onClick={() => setAction('PROCESS')}><Play size={16} />Đang xử lý</button><button disabled={busy} className={button} onClick={() => setAction('RESOLVE')}><CheckCheck size={16} />Hoàn tất</button><button disabled={busy} className={button} onClick={() => setChosen([])}><X size={16} />Bỏ chọn</button></div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    {failures.length > 0 && <details className="rounded-xl bg-amber-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">Xem {failures.length} yêu cầu chưa cập nhật</summary>{failures.map(row => <p key={row.id} className="mt-2 break-words">{row.id}: {row.error}</p>)}</details>}
    {error && !action && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {action && <CrmDrawer title={action === 'ASSIGN' ? 'Giao người phụ trách' : action === 'PROCESS' ? 'Chuyển sang đang xử lý' : 'Hoàn tất yêu cầu'} onClose={() => { if (!busy) { setAction(null); setError('') } }}><form className="space-y-4" onSubmit={e => { e.preventDefault(); void apply() }}><p>Áp dụng cho <strong>{chosen.length} yêu cầu đã chọn</strong>.</p>{action === 'ASSIGN' && <label className="block text-sm">Người phụ trách<select className={button + ' mt-2 w-full'} value={owner} onChange={e => setOwner(e.target.value)}><option value="">Chưa phân công</option>{owners.map(person => <option key={person.id} value={person.id}>{person.name || person.email}</option>)}</select><span className="mt-2 block text-xs text-slate-500">Yêu cầu từ khóa học hoặc Page giữ người phụ trách nguồn.</span></label>}{action === 'RESOLVE' && <label className="block text-sm">Kết quả xử lý chung<textarea required maxLength={4000} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 p-3" value={resolution} onChange={e => setResolution(e.target.value)} /><span className="mt-2 block text-xs text-slate-500">Chỉ hoàn tất cùng lúc những yêu cầu có chung kết quả xử lý.</span></label>}<p className="text-xs text-slate-500">Mỗi yêu cầu được lưu lịch sử riêng. Phản hồi cho khách được gửi trong từng hồ sơ.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || !chosen.length} className={button + ' bg-emerald-700 text-emerald-900'}>{busy ? 'Đang cập nhật…' : 'Xác nhận cập nhật'}</button></form></CrmDrawer>}
  </div>
}
