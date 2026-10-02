'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { REQUEST_CATEGORIES, REQUEST_STATUSES, CrmOwner, formatCrmDate } from '@/lib/crm/shared'

type Row = { id: string; contactId: number | null; ownerId: number | null; name: string; email: string | null; phone: string | null; category: keyof typeof REQUEST_CATEGORIES; status: keyof typeof REQUEST_STATUSES; content: string; resolution: string; publicReply: string; userId: number | null; version: number; createdAt: string; source: string; lessonId: string | null; course: { name_lop: string; id_khoa: string } | null }
export default function CrmRequests({ contactId, onChanged, onOpen, owners = [], isAdmin = false }: { owners?: CrmOwner[]; isAdmin?: boolean; contactId?: number; onChanged: () => void; onOpen?: (id: number) => void }) {
  const queryTarget = useSearchParams().get('request') || ''
  const [rows, setRows] = useState<Row[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [filter, setFilter] = useState('NEW')
  const [revision, setRevision] = useState(0); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const [selected, setSelected] = useState<Row | null>(null); const [status, setStatus] = useState<Row['status']>('NEW'); const [resolution, setResolution] = useState('')
  const [publicReply, setPublicReply] = useState('')
  const [target, setTarget] = useState('')
  useEffect(() => { if (contactId == null) { setTarget(queryTarget); setPage(1); if (queryTarget) setFilter('') } }, [contactId, queryTarget])
  const [ownerId, setOwnerId] = useState('')
  const [source, setSource] = useState<{ lesson: { title: string; content: string | null } | null; comment: { content: string } | null } | null>(null)
  useEffect(() => {
    const abort = new AbortController(); const params = new URLSearchParams({ page: String(page) }); if (target) params.set('request', target); if (filter) params.set('status', filter); if (contactId != null) params.set('contactId', String(contactId))
    const load = async () => {
      setLoading(true); setError(''); setSelected(null); setSource(null)
      try { const response = await fetch('/api/crm/requests?' + params, { signal: abort.signal, cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRows(data.requests); setTotal(data.total) }
      catch (e) { if (!abort.signal.aborted) { setRows([]); setTotal(0); setError(e instanceof Error ? e.message : 'Không tải được yêu cầu.') } }
      finally { if (!abort.signal.aborted) setLoading(false) }
    }; void load(); return () => abort.abort()
  }, [page, filter, contactId, revision, target])
  const button = 'min-h-11 rounded-lg border bg-white px-3 text-sm disabled:opacity-50'
  return <section className="space-y-3 rounded-2xl border bg-white p-4">
    <h3 className="font-bold">Yêu cầu cần giải đáp</h3><p className="text-xs text-slate-500">Yêu cầu học tập và hỗ trợ được xử lý riêng với bước tư vấn bán hàng. Ghi chú nội bộ và câu trả lời gửi học viên được lưu riêng.</p>
    <div className="flex flex-wrap gap-2">{target && <button className={button} onClick={() => { setTarget(''); setPage(1) }}>Xem tất cả yêu cầu</button>}<select aria-label="Trạng thái yêu cầu" className={button} value={filter} onChange={e => { setFilter(e.target.value); setTarget(''); setPage(1); setSelected(null) }}><option value="">Tất cả trạng thái</option>{Object.entries(REQUEST_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button className={button} onClick={() => { setRevision(v => v + 1); setSelected(null) }}>Tải lại</button></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {loading ? <p role="status">Đang tải yêu cầu…</p> : rows.length ? rows.map(row => <article key={row.id} className="space-y-2 rounded-xl border p-3">
      <div className="flex flex-wrap justify-between gap-2"><strong>{row.name}</strong><span className="text-xs">{REQUEST_CATEGORIES[row.category]} · {REQUEST_STATUSES[row.status]}</span></div>
      <p className="text-xs text-slate-500">{row.course?.name_lop || row.source} · {formatCrmDate(row.createdAt)}</p><p className="whitespace-pre-wrap break-words text-sm">{row.content}</p>
      <p className="break-all text-xs">{row.email} {row.phone}</p>
      {row.publicReply && <p className="whitespace-pre-wrap break-words rounded-lg bg-emerald-50 p-2 text-sm">{row.userId != null ? 'Trả lời cho học viên' : 'Nội dung tư vấn đã lưu'}: {row.publicReply}</p>}
      {row.resolution && <p className="whitespace-pre-wrap break-words text-sm">Kết quả xử lý: {row.resolution}</p>}
      <div className="flex flex-wrap gap-2">{row.course && <a className={button + ' inline-flex items-center'} href={'/khoa-hoc/' + encodeURIComponent(row.course.id_khoa)}>Mở khóa học</a>}{row.lessonId && <button disabled={busy} className={button} onClick={async () => { setBusy(true); setSource(null); try { const response = await fetch('/api/crm/requests?sourceId=' + row.id, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setSource(data) } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được nguồn.') } finally { setBusy(false) } }}>Xem bài học / bình luận gốc</button>}{row.contactId != null && onOpen && <button className={button} onClick={() => onOpen(row.contactId!)}>Mở hồ sơ</button>}<button disabled={busy} className={button} onClick={() => { setSelected(row); setOwnerId(row.ownerId == null ? '' : String(row.ownerId)); setStatus(row.status); setResolution(row.resolution); setPublicReply(row.publicReply) }}>Cập nhật xử lý</button></div>
    </article>) : <p className="text-sm text-slate-500">Chưa có yêu cầu phù hợp.</p>}
    {source && <div className="space-y-2 rounded-xl border bg-slate-50 p-3"><button className={button} onClick={() => setSource(null)}>Đóng nguồn yêu cầu</button><h4 className="font-semibold">{source.lesson?.title || 'Bài học không còn tồn tại'}</h4><p className="whitespace-pre-wrap break-words text-sm">{source.lesson?.content?.replace(/<[^>]*>/g, ' ') || 'Bài học không có nội dung văn bản.'}</p>{source.comment && <p className="whitespace-pre-wrap break-words text-sm">Bình luận gốc: {source.comment.content}</p>}</div>}
    {selected && <form className="space-y-3 rounded-xl bg-emerald-50 p-3" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError('')
      try { const response = await fetch('/api/crm/requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, version: selected.version, status, resolution, publicReply, ...(isAdmin && selected.course == null ? { ownerId: ownerId === '' ? null : Number(ownerId) } : {}) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setSelected(null); setRevision(v => v + 1); onChanged() }
      catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được.') } finally { setBusy(false) }
    }}><strong className="text-sm">Xử lý yêu cầu của {selected.name}</strong><select aria-label="Trạng thái xử lý" className={button} value={status} onChange={e => setStatus(e.target.value as Row['status'])}>{Object.entries(REQUEST_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{isAdmin && selected.course == null && <label className="block text-sm">Người phụ trách<select className={button} value={ownerId} onChange={e => setOwnerId(e.target.value)}><option value="">Chưa phân công</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name || owner.email}</option>)}</select></label>}<label className="block text-sm">Ghi chú nội bộ / việc đã xử lý<textarea required={status === 'RESOLVED'} maxLength={4000} rows={3} className="mt-1 w-full rounded-lg border bg-white p-2" value={resolution} onChange={e => setResolution(e.target.value)} /></label><label className="block text-sm">Trả lời gửi cho học viên<textarea maxLength={4000} rows={4} className="mt-1 w-full rounded-lg border bg-white p-2" value={publicReply} onChange={e => setPublicReply(e.target.value)} /><span className="text-xs text-slate-600">{selected.userId != null ? 'Học viên xem câu trả lời ở “Yêu cầu của tôi” và nhận thông báo qua chuông.' : 'Khách chưa có tài khoản: cần liên hệ qua email/điện thoại. Câu trả lời này chưa tự gửi email.'}</span></label><div className="flex gap-2"><button disabled={busy} className={button}>Lưu kết quả</button><button disabled={busy} type="button" className={button} onClick={() => setSelected(null)}>Hủy</button></div></form>}
    <div className="flex items-center justify-between gap-2 text-xs"><span>{total} yêu cầu · Trang {page}/{Math.max(1, Math.ceil(total / 20))}</span><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => { setPage(page - 1); setSelected(null) }}>Trước</button><button className={button} disabled={page * 20 >= total} onClick={() => { setPage(page + 1); setSelected(null) }}>Sau</button></div></div>
  </section>
}
