'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import TemplatePreviewFrame from '@/components/course/TemplatePreviewFrame'

type Template = { id: string; name: string; description?: string | null; sourceType: string; createdAt: string; updatedAt: string }
const endpoint = '/api/admin/course-page-templates/legacy'
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50'
async function request(url: string, body?: object) {
  const response = await fetch(url, { method: body ? 'DELETE' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(30000), ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw new Error(result?.error || 'Không nhận được kết quả. Hãy tải lại danh sách để kiểm tra.')
  return result
}
export default function LegacyTemplateManager({ initialId = '' }: { initialId?: string }) {
  const [items, setItems] = useState<Template[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [id, setId] = useState(initialId), [query, setQuery] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(0), [hasMore, setHasMore] = useState(false), [revision, setRevision] = useState(0)
  const [preview, setPreview] = useState<Template | null>(null), [removal, setRemoval] = useState<Template | null>(null), [device, setDevice] = useState(1280)
  const previewRef = useRef<HTMLElement>(null), removalRef = useRef<HTMLElement>(null)
  useEffect(() => { (removal ? removalRef : previewRef).current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }, [preview, removal])
  useEffect(() => {
    let active = true
    request(endpoint + '?' + new URLSearchParams({ ...(id ? { id } : {}), q: search, page: String(page) }))
      .then(data => { if (active) { setItems(data.items); setHasMore(data.hasMore) } })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Không tải được mẫu.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, search, page, revision])
  function reload() { setLoading(true); setItems([]); setRemoval(null); setRevision(value => value + 1) }
  async function inspect(template: Template) {
    setBusy(true); setMessage(''); setRemoval(null)
    try { const data = await request(endpoint, { id: template.id, updatedAt: template.updatedAt }); setRemoval(data.template) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không kiểm tra được mẫu.') }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-6xl space-y-5 p-4 text-slate-900 sm:p-6">
    <nav className="flex flex-wrap gap-3 text-sm"><Link href="/tools/media" className="text-emerald-800 underline">← Thư viện media</Link><Link href="/tools/courses/templates" className="text-emerald-800 underline">Giao diện khóa học</Link><Link href="/tools/courses/templates/history" className="text-emerald-800 underline">Lịch sử trang</Link></nav>
    <h1 className="text-2xl font-bold">Mẫu cũ</h1><p className="text-sm text-slate-600">Kho HTML/ZIP đã lưu trước đây, dành cho Admin xem trước và dọn mẫu không dùng. Các trang khóa học đã áp dụng mẫu có bản nội dung riêng.</p>
    <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setLoading(true); setItems([]); setId(''); setPage(0); setSearch(query); setRevision(value => value + 1) }}><input aria-label="Tìm mẫu cũ" placeholder="Tìm tên mẫu…" value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border px-3" /><button disabled={busy} className={button}>Tìm</button><button type="button" disabled={busy} className={button} onClick={reload}>Tải lại</button>{id && <button type="button" className={button} onClick={() => { setId(''); setPage(0); reload() }}>Xem tất cả mẫu cũ</button>}</form>
    {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}
    {loading ? <p role="status">Đang tải mẫu cũ…</p> : <div className="space-y-3">{items.map(item => <article key={item.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4"><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{item.name}</h2>{item.description && <p className="mt-1 break-words text-sm text-slate-600">{item.description}</p>}<p className="mt-2 text-xs text-slate-500">{item.sourceType} · Cập nhật: {new Date(item.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => setPreview(item)}>Xem trước</button><button disabled={busy} className={button + ' text-red-700'} onClick={() => void inspect(item)}>Xóa mẫu cũ</button></div></article>)}{!items.length && <p>Không có mẫu cũ phù hợp.</p>}</div>}
    <div className="flex items-center justify-center gap-3"><button disabled={!page || busy || loading} className={button} onClick={() => { setPage(page - 1); reload() }}>Trước</button><span>Trang {page + 1}</span><button disabled={!hasMore || busy || loading} className={button} onClick={() => { setPage(page + 1); reload() }}>Sau</button></div>
    {preview && <section ref={previewRef} aria-label="Xem trước mẫu cũ" className="scroll-mt-6 space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{preview.name}</h2><div className="flex gap-2"><button className={button} onClick={() => setDevice(1280)}>Máy tính</button><button className={button} onClick={() => setDevice(390)}>Điện thoại</button><button className={button} onClick={() => setPreview(null)}>Đóng</button></div></div><TemplatePreviewFrame title={'Mẫu cũ: ' + preview.name} src={'/tools/courses/templates/preview?' + new URLSearchParams({ id: preview.id })} width={device} /><p className="text-xs text-slate-500">Nếu file nguồn đã bị xóa trước đây, bản xem trước có thể không hiển thị đầy đủ.</p></section>}
    {removal && <section ref={removalRef} aria-label="Xác nhận xóa mẫu cũ" className="scroll-mt-6 space-y-3 rounded-xl border border-red-300 bg-red-50 p-4"><h2 className="font-semibold">Xóa mẫu “{removal.name}”?</h2><p className="text-sm">Xóa 1 bản mẫu khỏi kho cũ, không thể hoàn tác tại đây. Không thay đổi trang khóa học, lịch sử phiên bản hoặc file media. File còn được lịch sử hay trang công khai sử dụng vẫn được bảo vệ khi xóa vĩnh viễn.</p><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => setRemoval(null)}>Hủy</button><button disabled={busy} className={button + ' text-red-700'} onClick={async () => {
      setBusy(true); setMessage('')
      try { await request(endpoint, { id: removal.id, updatedAt: removal.updatedAt, execute: true, confirm: 'DELETE_LEGACY_TEMPLATE' }); if (preview?.id === removal.id) setPreview(null); reload(); setMessage('Đã xóa mẫu cũ. Mở lại chi tiết media để kiểm tra các nơi sử dụng còn lại.') }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa xóa được mẫu. Hãy tải lại để kiểm tra.'); setRemoval(null) }
      finally { setBusy(false) }
    }}>Xác nhận xóa mẫu cũ</button></div></section>}
  </main>
}
