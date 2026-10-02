'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { REQUEST_CATEGORIES, REQUEST_STATUSES, formatCrmDate } from '@/lib/crm/shared'

type Row = { id: string; content: string; publicReply: string; category: keyof typeof REQUEST_CATEGORIES; status: keyof typeof REQUEST_STATUSES; version: number; createdAt: string; updatedAt: string; lessonId: string | null; course: { name_lop: string; id_khoa: string } | null }
export default function MyRequests() {
  const queryTarget = useSearchParams().get('request') || ''
  const [rows, setRows] = useState<Row[]>([]); const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1); const [target, setTarget] = useState('')
  const [revision, setRevision] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  useEffect(() => { setTarget(queryTarget); setPage(1) }, [queryTarget])
  useEffect(() => {
    const abort = new AbortController()
    const load = async () => {
      setLoading(true); setError('')
      const params = new URLSearchParams({ page: String(page) }); if (target) params.set('request', target)
      try { const response = await fetch('/api/my-requests?' + params, { signal: abort.signal, cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!abort.signal.aborted) { setRows(data.requests); setTotal(data.total) } }
      catch (e) { if (!abort.signal.aborted) { setRows([]); setTotal(0); setError(e instanceof Error ? e.message : 'Không tải được yêu cầu.') } }
      finally { if (!abort.signal.aborted) setLoading(false) }
    }; void load(); return () => abort.abort()
  }, [page, target, revision])
  const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border bg-white px-3 text-sm disabled:opacity-50'
  return <main className="mx-auto max-w-3xl space-y-4 p-4 text-slate-900 sm:p-6"><h1 className="text-xl font-bold">Yêu cầu của tôi</h1><p className="text-sm text-slate-600">Theo dõi việc tiếp nhận và câu trả lời của người phụ trách. Thông báo mới xuất hiện ở biểu tượng chuông.</p>
    <div className="flex gap-2"><button className={button} onClick={() => setRevision(v => v + 1)}>Tải lại</button>{target && <button className={button} onClick={() => { setTarget(''); setPage(1) }}>Xem tất cả yêu cầu</button>}</div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Đang tải…</p> : rows.length ? rows.map(row => <article key={row.id} className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap justify-between gap-2"><strong>{row.course?.name_lop || 'Yêu cầu tư vấn'}</strong><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs">{REQUEST_STATUSES[row.status]}</span></div>
      <p className="text-xs text-slate-500">{REQUEST_CATEGORIES[row.category]} · Gửi lúc {formatCrmDate(row.createdAt)}</p><p className="whitespace-pre-wrap break-words text-sm">{row.content}</p>
      {row.publicReply ? <div className="rounded-xl bg-emerald-50 p-3"><h2 className="text-sm font-semibold">Phản hồi từ người phụ trách</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{row.publicReply}</p><p className="mt-2 text-xs text-slate-500">Cập nhật {formatCrmDate(row.updatedAt)}</p></div> : <p className="text-sm text-slate-500">Chưa có câu trả lời. Người phụ trách sẽ phản hồi sau khi kiểm tra yêu cầu.</p>}
      <div className="flex flex-wrap gap-2">{row.course && <a className={button} href={row.lessonId ? '/courses/' + encodeURIComponent(row.course.id_khoa) + '/learn?lesson=' + encodeURIComponent(row.lessonId) : '/khoa-hoc/' + encodeURIComponent(row.course.id_khoa)}>Mở {row.lessonId ? 'bài học' : 'khóa học'}</a>}{row.status === 'RESOLVED' && <button disabled={busy} className={button} onClick={async () => { setBusy(true); setError(''); try { const response = await fetch('/api/my-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, version: row.version }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRevision(v => v + 1) } catch (e) { setError(e instanceof Error ? e.message : 'Không mở lại được yêu cầu.') } finally { setBusy(false) } }}>Tôi vẫn cần hỗ trợ</button>}</div>
    </article>) : <p className="rounded-xl bg-white p-4">Không có yêu cầu phù hợp. Bạn có thể gửi yêu cầu từ nút “Hỏi giáo viên” trong khóa học.</p>}
    <div className="flex items-center justify-between text-sm"><span>{total} yêu cầu · Trang {page}</span><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><button className={button} disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Sau</button></div></div>
  </main>
}
