'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import TemplatePreviewFrame from '@/components/course/TemplatePreviewFrame'

type Version = { id: string; coursePageId: string; name: string; versionNumber: number; createdAt: string; kind: string | null; protected: boolean; live: boolean }
const endpoint = '/api/admin/course-page-templates/history'
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50'
async function request(url: string, body?: object) {
  const response = await fetch(url, { method: body ? 'DELETE' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(30000), ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw new Error(result?.error || 'Không nhận được kết quả. Hãy tải lại danh sách để kiểm tra.')
  return result
}
export default function CourseHistoryManager({ initialId = '' }: { initialId?: string }) {
  const [items, setItems] = useState<Version[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [id, setId] = useState(initialId), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(0), [hasMore, setHasMore] = useState(false), [revision, setRevision] = useState(0)
  const [preview, setPreview] = useState<Version | null>(null), [removal, setRemoval] = useState<Version | null>(null), [device, setDevice] = useState(1280)
  const detailRef = useRef<HTMLElement>(null), removalRef = useRef<HTMLElement>(null)
  useEffect(() => { (removal ? removalRef : detailRef).current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }, [preview, removal])
  useEffect(() => {
    let active = true
    request(endpoint + '?' + new URLSearchParams({ ...(id ? { id } : {}), q: search, page: String(page) }))
      .then(data => { if (active) { setItems(data.items); setHasMore(data.hasMore) } })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Không tải được lịch sử.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, search, page, revision])
  function reload() { setLoading(true); setItems([]); setRemoval(null); setRevision(value => value + 1) }
  async function inspect(version: Version) {
    setBusy(true); setMessage(''); setRemoval(null)
    try { const data = await request(endpoint, { id: version.id }); setRemoval(data.version) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không kiểm tra được phiên bản.') }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-6xl space-y-5 p-4 text-slate-900 sm:p-6">
    <nav className="flex flex-wrap gap-3 text-sm text-emerald-800 underline"><Link href="/tools/media">← Thư viện media</Link><Link href="/tools/courses/templates/legacy">Mẫu cũ</Link></nav>
    <h1 className="text-2xl font-bold">Lịch sử trang</h1>
    <p className="text-sm text-slate-600">Admin có thể xem trước và xóa các phiên bản cũ. Luôn giữ bản lưu mới nhất và bản xuất bản mới nhất của mỗi trang. Xóa lịch sử không xóa file media; sau đó bạn có thể kiểm tra và dọn file trong thùng rác.</p>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setLoading(true); setItems([]); setRemoval(null); setId(''); setPage(0); setSearch(query); setRevision(value => value + 1) }}><input aria-label="Tìm lịch sử theo tên trang" placeholder="Tìm tên trang khóa học…" value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border px-3" /><button disabled={busy} className={button}>Tìm</button><button type="button" disabled={busy} className={button} onClick={reload}>Tải lại</button>{id && <button type="button" className={button} onClick={() => { setId(''); setPage(0); reload() }}>Xem tất cả lịch sử</button>}</form>
    {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}
    {loading ? <p role="status">Đang tải lịch sử…</p> : <div className="space-y-3">{items.map(item => <article key={item.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4"><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{item.name} · Phiên bản {item.versionNumber}</h2><p className="mt-2 text-sm text-slate-600">{item.kind === 'published' ? 'Bản xuất bản' : 'Bản lưu'} · {new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p><p className="mt-1 text-sm text-emerald-800">{item.live ? 'Đang phục vụ trang công khai · Được bảo vệ' : item.protected ? 'Bản mới nhất · Được bảo vệ' : 'Lịch sử cũ · Có thể xóa'}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => setPreview(item)}>Xem trước</button><button disabled={busy || item.protected} className={button + ' text-red-700'} onClick={() => void inspect(item)}>Xóa lịch sử</button></div></article>)}{!items.length && <p>Không có lịch sử phù hợp.</p>}</div>}
    <div className="flex items-center justify-center gap-3"><button disabled={!page || busy || loading} className={button} onClick={() => { setPage(page - 1); reload() }}>Trước</button><span>Trang {page + 1}</span><button disabled={!hasMore || busy || loading} className={button} onClick={() => { setPage(page + 1); reload() }}>Sau</button></div>
    {preview && <section ref={detailRef} aria-label="Xem trước lịch sử" className="scroll-mt-6 space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{preview.name} · Phiên bản {preview.versionNumber}</h2><div className="flex gap-2"><button className={button} onClick={() => setDevice(1280)}>Máy tính</button><button className={button} onClick={() => setDevice(390)}>Điện thoại</button><button className={button} onClick={() => setPreview(null)}>Đóng</button></div></div><TemplatePreviewFrame title={'Lịch sử: ' + preview.name} src={'/tools/courses/templates/preview?' + new URLSearchParams({ version: preview.id })} width={device} /><p className="text-xs text-slate-500">File nguồn đã bị xóa trước đây có thể khiến bản xem trước không đầy đủ.</p></section>}
    {removal && <section ref={removalRef} aria-label="Xác nhận xóa lịch sử" className="scroll-mt-6 space-y-3 rounded-xl border border-red-300 bg-red-50 p-4"><h2 className="font-semibold">Xóa phiên bản {removal.versionNumber} của “{removal.name}”?</h2><p className="text-sm">Xóa vĩnh viễn đúng 1 bản lịch sử. Bạn sẽ không thể khôi phục trang từ phiên bản này. Nội dung trang hiện tại và file media được giữ nguyên.</p><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => setRemoval(null)}>Hủy</button><button disabled={busy} className={button + ' text-red-700'} onClick={async () => {
      setBusy(true); setMessage('')
      try { await request(endpoint, { id: removal.id, execute: true, confirm: 'DELETE_COURSE_HISTORY' }); if (preview?.id === removal.id) setPreview(null); reload(); setMessage('Đã xóa lịch sử. Mở lại chi tiết media để kiểm tra các nơi sử dụng còn lại.') }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa xóa được lịch sử. Hãy tải lại để kiểm tra.'); setRemoval(null) }
      finally { setBusy(false) }
    }}>Xác nhận xóa lịch sử</button></div></section>}
  </main>
}
