'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowUpRight, CheckCircle2, ChevronDown, Clock3, MessageCircle, Plus, RefreshCw, Send, X } from 'lucide-react'
import { REQUEST_TOPICS, type RequestTopic } from '@/lib/crm/request-workflow'
import { REQUEST_CATEGORIES, REQUEST_STATUSES, formatCrmDate } from '@/lib/crm/shared'

type Row = { topic: RequestTopic; thread: { action: string; content: string; changedAt: string }[]; id: string; content: string; publicReply: string; category: keyof typeof REQUEST_CATEGORIES; status: keyof typeof REQUEST_STATUSES; version: number; createdAt: string; updatedAt: string; lessonId: string | null; course: { name_lop: string; id_khoa: string } | null }
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brk-primary disabled:cursor-not-allowed disabled:opacity-50'
const primary = button + ' bg-brk-primary text-white hover:brightness-95'
const secondary = button + ' border border-brk-outline bg-white text-brk-on-surface hover:bg-brk-background'
const statusStyles = { NEW: 'bg-amber-50 text-amber-800', IN_PROGRESS: 'bg-blue-50 text-blue-800', RESOLVED: 'bg-emerald-50 text-emerald-800' }

export default function MyRequests() {
  const queryTarget = useSearchParams().get('request') || ''
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState('')
  const [reply, setReply] = useState<Record<string, string>>({})
  const [composer, setComposer] = useState<string | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const updating = useRef(false)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { setTarget(queryTarget); setPage(1); setComposer(null) }, [queryTarget])
  useEffect(() => { if (composer) input.current?.focus() }, [composer])
  useEffect(() => {
    const abort = new AbortController()
    const load = async () => {
      setLoading(true); setError('')
      const params = new URLSearchParams({ page: String(page) })
      if (target) params.set('request', target)
      try {
        const response = await fetch('/api/my-requests?' + params, { signal: abort.signal, cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        if (!abort.signal.aborted) { setRows(data.requests); setTotal(data.total) }
      } catch (e) {
        if (!abort.signal.aborted) { setRows([]); setTotal(0); setError(e instanceof Error ? e.message : 'Không tải được yêu cầu.') }
      } finally { if (!abort.signal.aborted) setLoading(false) }
    }
    void load()
    return () => abort.abort()
  }, [page, target, revision])

  // Giữ version để server phát hiện xung đột; chỉ sửa yêu cầu thuộc tài khoản hiện tại.
  const update = async (row: Row, content?: string) => {
    if (updating.current) return
    updating.current = true
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/my-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, version: row.version, ...(content !== undefined ? { content } : {}) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (content !== undefined) setReply(values => ({ ...values, [row.id]: '' }))
      setComposer(null)
      setRevision(value => value + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa cập nhật được yêu cầu.') }
    finally { updating.current = false; setBusy(false) }
  }

  return <main className="mx-auto w-full max-w-4xl space-y-5 px-3 py-6 text-brk-on-surface sm:px-6 sm:py-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brk-primary"><MessageCircle className="h-4 w-4" aria-hidden="true" />Hỗ trợ & phản hồi</div><h1 className="text-2xl font-bold sm:text-3xl">Yêu cầu của tôi</h1><p className="mt-2 max-w-xl text-sm leading-6 text-brk-muted">Theo dõi câu trả lời và gửi thêm thông tin khi cần hỗ trợ.</p></div>
      <button type="button" className={secondary} disabled={loading || busy} onClick={() => setRevision(v => v + 1)}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Tải lại</button>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-brk-muted">{loading ? 'Đang tải yêu cầu…' : `${total} yêu cầu`}<span className="mx-2 text-brk-outline">·</span>Phản hồi mới sẽ xuất hiện ở chuông thông báo.</p>{target && <button type="button" className="min-h-11 font-semibold text-brk-primary" onClick={() => { setTarget(''); setPage(1); setComposer(null) }}>Xem tất cả yêu cầu →</button>}</div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {loading ? <p role="status" className="rounded-2xl border border-brk-outline bg-white p-6 text-sm text-brk-muted">Đang tải…</p> : rows.length ? <div className="space-y-4">{rows.map(row => {
      const resolved = row.status === 'RESOLVED'
      const lastReply = [...(row.thread || [])].reverse().find(event => event.action === 'SEND_REPLY')
      const replyContent = lastReply?.content || row.publicReply
      const StatusIcon = resolved ? CheckCircle2 : Clock3
      return <article key={row.id} aria-label={row.course?.name_lop || REQUEST_TOPICS[row.topic] || 'Yêu cầu tư vấn'} className="min-w-0 overflow-hidden rounded-2xl border border-brk-outline bg-white shadow-sm">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><p className="mb-1 text-xs font-medium text-brk-muted">{REQUEST_TOPICS[row.topic] || REQUEST_CATEGORIES[row.category]} · {formatCrmDate(row.createdAt)}</p><h2 className="break-words text-base font-bold leading-6 sm:text-lg">{row.course?.name_lop || REQUEST_TOPICS[row.topic] || 'Yêu cầu tư vấn'}</h2></div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[row.status]}`}><StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />{REQUEST_STATUSES[row.status]}</span>
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-brk-muted">{row.content}</p>
          {replyContent ? <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 sm:p-4"><p className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-semibold text-emerald-800">Phản hồi gần nhất</span><span className="text-brk-muted">{formatCrmDate(lastReply?.changedAt || row.updatedAt)}</span></p><p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6">{replyContent}</p></div> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-brk-muted">Người phụ trách chưa phản hồi. Bạn sẽ nhận được thông báo khi có câu trả lời.</p>}
          <details className="group rounded-xl border border-brk-outline">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold text-brk-muted [&::-webkit-details-marker]:hidden">Xem nội dung & trao đổi<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            <div className="space-y-3 border-t border-brk-outline p-3 sm:p-4">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-brk-muted">Bạn · {formatCrmDate(row.createdAt)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{row.content}</p></div>
              {row.thread?.length ? row.thread.map((event, index) => <div key={index} className={event.action === 'SEND_REPLY' ? 'rounded-xl bg-emerald-50 p-3' : 'rounded-xl bg-slate-50 p-3'}><p className="text-xs font-semibold text-brk-muted">{event.action === 'SEND_REPLY' ? 'Người phụ trách' : 'Bạn'} · {formatCrmDate(event.changedAt)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{event.content}</p></div>) : row.publicReply ? <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-800">Người phụ trách · {formatCrmDate(row.updatedAt)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{row.publicReply}</p></div> : null}
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-2 border-t border-brk-outline pt-4">
            {resolved && <button type="button" disabled={busy} className={primary} onClick={() => void update(row)}><MessageCircle className="h-4 w-4" aria-hidden="true" />Cần hỗ trợ thêm</button>}
            <button type="button" disabled={busy} aria-expanded={composer === row.id} aria-controls={`request-composer-${row.id}`} className={resolved ? secondary : primary} onClick={() => setComposer(composer === row.id ? null : row.id)}><Plus className="h-4 w-4" aria-hidden="true" />Bổ sung thông tin</button>
            {row.course && <a className={button + ' text-brk-primary hover:bg-brk-background'} href={row.lessonId ? '/courses/' + encodeURIComponent(row.course.id_khoa) + '/learn?lesson=' + encodeURIComponent(row.lessonId) : '/khoa-hoc/' + encodeURIComponent(row.course.id_khoa)}>Mở {row.lessonId ? 'bài học' : 'khóa học'}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>}
          </div>
          {composer === row.id && <form id={`request-composer-${row.id}`} className="space-y-3 rounded-xl bg-slate-50 p-3 sm:p-4" onSubmit={event => { event.preventDefault(); const content = reply[row.id]?.trim(); if (content) void update(row, content) }}>
            <label htmlFor={`reply-${row.id}`} className="block text-sm font-semibold">Thông tin bạn muốn bổ sung</label>
            <textarea ref={input} id={`reply-${row.id}`} required maxLength={4000} rows={3} readOnly={busy} placeholder="Viết thêm câu hỏi hoặc thông tin cần hỗ trợ…" className="w-full resize-y rounded-xl border border-brk-outline bg-white p-3 text-sm leading-6 focus:border-brk-primary focus:outline-2 focus:outline-brk-primary" value={reply[row.id] || ''} onChange={event => setReply(values => ({ ...values, [row.id]: event.target.value }))} />
            {resolved && <p className="text-xs leading-5 text-brk-muted">Gửi bổ sung sẽ mở lại yêu cầu để người phụ trách tiếp tục hỗ trợ.</p>}
            <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy || !reply[row.id]?.trim()} className={primary}><Send className="h-4 w-4" aria-hidden="true" />{busy ? 'Đang gửi…' : 'Gửi bổ sung'}</button><button type="button" disabled={busy} className={secondary} onClick={() => setComposer(null)}><X className="h-4 w-4" aria-hidden="true" />Đóng</button></div>
          </form>}
        </div>
      </article>
    })}</div> : <div className="rounded-2xl border border-brk-outline bg-white px-5 py-10 text-center"><MessageCircle className="mx-auto mb-3 h-8 w-8 text-brk-muted" aria-hidden="true" /><h2 className="font-semibold">Chưa có yêu cầu phù hợp</h2><p className="mt-2 text-sm leading-6 text-brk-muted">Bạn có thể gửi yêu cầu từ nút “Hỏi giáo viên” trong khóa học.</p></div>}
    {!loading && total > 0 && <nav aria-label="Phân trang yêu cầu" className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-brk-muted">Trang {page}/{Math.max(1, Math.ceil(total / 20))}</span>{total > 20 && <div className="flex gap-2"><button type="button" className={secondary} disabled={page <= 1 || busy} onClick={() => { setPage(page - 1); setComposer(null) }}>Trước</button><button type="button" className={secondary} disabled={page * 20 >= total || busy} onClick={() => { setPage(page + 1); setComposer(null) }}>Sau</button></div>}</nav>}
  </main>
}
