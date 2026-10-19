'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Media = { path: string; filename: string; folder: boolean; url: string; size: number; mime: string; createdAt?: string; name?: string; description?: string; uploaderName?: string }
type Usage = { references: { type: string; id: string }[]; unchecked: string[]; note: string }
type Preview = Usage & { path: string }
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50'
const input = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900'
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Không thể xử lý yêu cầu.')
  return body
}
const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export default function MediaManager() {
  const [path, setPath] = useState(''), [page, setPage] = useState(0), [query, setQuery] = useState(''), [search, setSearch] = useState('')
  const [items, setItems] = useState<Media[]>([]), [hasMore, setHasMore] = useState(false), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(''), [type, setType] = useState('all'), [view, setView] = useState('grid')
  const [selected, setSelected] = useState<string[]>([]), [detail, setDetail] = useState<Media | null>(null), [usage, setUsage] = useState<Usage | null>(null), [checking, setChecking] = useState(false)
  const [preview, setPreview] = useState<Preview[] | null>(null), [revision, setRevision] = useState(0)
  const requestId = useRef(0)
  const prepareLoad = useCallback(() => { setLoading(true); setItems([]); setSelected([]) }, [])
  const reload = useCallback(() => { prepareLoad(); setRevision(value => value + 1) }, [prepareLoad])
  useEffect(() => {
    const controller = new AbortController()
    api('/api/admin/media?' + new URLSearchParams({ path, page: String(page), q: search }), { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setItems(data.items); setHasMore(data.hasMore) } })
      .catch(error => { if (!controller.signal.aborted) setMessage(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, page, search, revision])
  function navigate(next: string) { prepareLoad(); setMessage(''); setPath(next); setPage(0); setSearch(''); setQuery(''); setDetail(null); setPreview(null); setRevision(value => value + 1) }
  async function openDetail(item: Media) {
    const id = ++requestId.current
    setDetail(item); setUsage(null); setChecking(true)
    try {
      const result = await api('/api/admin/media?' + new URLSearchParams({ path: item.path, usage: '1' }))
      if (id === requestId.current) setUsage(result)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể kiểm tra file.') }
    finally { if (id === requestId.current) setChecking(false) }
  }
  async function previewDelete(paths: string[]) {
    setBusy(true); setMessage(''); setPreview(null)
    try {
      const results: Preview[] = []
      for (const filePath of paths) results.push({ path: filePath, ...await api('/api/admin/media', json('DELETE', { path: filePath })) })
      setPreview(results)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể kiểm tra.') }
    finally { setBusy(false) }
  }
  const visible = items.filter(item => item.folder || type === 'all' || (type === 'images' ? item.mime.startsWith('image/') : !item.mime.startsWith('image/')))
  return <main className="mx-auto max-w-7xl space-y-5 p-4 text-slate-900 sm:p-6">
    <Link href="/tools/wi-website" className="text-sm text-emerald-800">← Quản trị website</Link>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Thư viện media</h1><p className="mt-2 text-sm text-slate-600">Ảnh và file trong kho uploads dùng chung của hệ thống. Chỉ Admin được quản lý.</p></div>
      <label className={button + ' relative cursor-pointer bg-emerald-700 text-white'}>Thêm ảnh / file<input aria-label="Thêm ảnh hoặc file" disabled={busy} className="absolute inset-0 w-full cursor-pointer opacity-0" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/zip,.zip,text/plain" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
        if (file.size > 4 * 1024 * 1024) { setMessage('File tối đa 4 MB.'); return }
        setBusy(true); setMessage('')
        try { const form = new FormData(); form.set('file', file); await api('/api/admin/media', { method: 'POST', body: form }); navigate('media'); reload() }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Tải lên thất bại.') }
        finally { setBusy(false) }
      }} /></label></div>
    <p className="text-xs leading-5 text-slate-500">Ảnh JPG/PNG/WebP/GIF được tối ưu sang WebP; hỗ trợ PDF, ZIP, TXT; tối đa 4 MB/file. File cũ có thể chưa có thông tin người tải lên.</p>
    <nav aria-label="Thư mục media" className="flex flex-wrap items-center gap-2 text-sm"><button disabled={busy} className={button} onClick={() => navigate('')}>Kho uploads</button>{path.split('/').filter(Boolean).map((part, index) => <button disabled={busy} key={index} className={button} onClick={() => navigate(path.split('/').slice(0, index + 1).join('/'))}>{part}</button>)}</nav>
    <div className="flex flex-wrap gap-2"><form className="flex min-w-0 flex-1 gap-2" onSubmit={event => { event.preventDefault(); prepareLoad(); setPage(0); setSearch(query); setRevision(value => value + 1) }}><input aria-label="Tìm tên file trong thư mục" placeholder="Tìm tên file trong thư mục này…" className={input} value={query} onChange={event => setQuery(event.target.value)} /><button className={button}>Tìm</button></form>
      <select aria-label="Loại file" className={button} value={type} onChange={event => setType(event.target.value)}><option value="all">Tất cả loại file</option><option value="images">Ảnh</option><option value="files">Tài liệu / file</option></select>
      <select aria-label="Cách hiển thị" className={button} value={view} onChange={event => setView(event.target.value)}><option value="grid">Dạng lưới</option><option value="list">Danh sách</option></select>
      <button disabled={loading || busy} className={button} onClick={reload}>Tải lại</button>
    </div>
    {message && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">{message}</p>}
    {busy && <p role="status">Đang xử lý…</p>}
    {loading ? <p role="status">Đang tải media…</p> : <>
      <div className="flex flex-wrap items-center gap-3 text-sm"><span>Đã chọn {selected.length}/20 file</span><button disabled={!selected.length || busy} className={button + ' text-red-700'} onClick={() => void previewDelete(selected)}>Kiểm tra & xóa đã chọn</button><button disabled={!selected.length || busy} className={button} onClick={() => setSelected([])}>Bỏ chọn</button></div>
      <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5' : 'space-y-2'}>{visible.map(item => <article key={item.path} className={'min-w-0 rounded-xl border border-slate-200 bg-white p-3 ' + (view === 'list' ? 'flex flex-wrap items-center gap-3' : '')}>
        {!item.folder && <input type="checkbox" disabled={busy || (!selected.includes(item.path) && selected.length >= 20)} aria-label={'Chọn ' + item.filename} checked={selected.includes(item.path)} onChange={event => setSelected(event.target.checked ? [...selected, item.path] : selected.filter(value => value !== item.path))} className="h-5 w-5" />}
        <button disabled={busy} className={'min-w-0 text-left ' + (view === 'grid' ? 'mt-2 block w-full' : 'flex flex-1 items-center gap-3')} onClick={() => item.folder ? navigate(item.path) : void openDetail(item)}>
          <span className={'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-3xl ' + (view === 'grid' ? 'aspect-square w-full' : 'h-14 w-14')}>
            {item.folder ? '📁' : item.mime.startsWith('image/') ? <Image src={item.url} alt="" fill unoptimized className="object-contain" loading="lazy" /> : '📄'}
          </span><span className="block min-w-0"><span className="mt-2 block break-words text-sm font-semibold">{item.name || item.filename}</span><span className="mt-1 block break-all text-xs text-slate-500">{item.folder ? 'Mở thư mục' : (item.size / 1024 / 1024).toFixed(2) + ' MB · ' + item.filename}</span></span>
        </button>
      </article>)}</div>
      {!visible.length && <p className="py-8 text-center text-slate-500">Không có file phù hợp trong trang của thư mục này.</p>}
      <div className="flex items-center justify-center gap-3"><button className={button} disabled={page === 0 || busy} onClick={() => { prepareLoad(); setPage(page - 1) }}>Trước</button><span>Trang {page + 1}</span><button className={button} disabled={!hasMore || busy} onClick={() => { prepareLoad(); setPage(page + 1) }}>Sau</button></div>
      <p className="text-xs text-slate-500">60 mục mỗi trang. Tìm theo tên file gốc trong thư mục; bộ lọc loại file áp dụng cho trang đang xem.</p>
    </>}
    {detail && <section aria-label="Chi tiết media" className="space-y-3 rounded-xl border border-slate-300 bg-white p-4">
      <div className="flex justify-between gap-3"><h2 className="text-lg font-bold">Chi tiết ảnh / file</h2><button className={button} onClick={() => { ++requestId.current; setDetail(null) }}>Đóng</button></div>
      <p className="break-all text-sm">{detail.filename} · {detail.mime} · {(detail.size / 1024 / 1024).toFixed(2)} MB</p>
      <p className="text-sm">Ngày tải: {detail.createdAt ? new Date(detail.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có thông tin'} · Người tải: {detail.uploaderName || 'Chưa có thông tin'}</p>
      <form key={detail.path} className="space-y-3" onSubmit={async event => {
        event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true)
        try { await api('/api/admin/media', json('PATCH', { path: detail.path, name: values.get('name'), description: values.get('description') })); reload(); setMessage('Đã lưu tên hiển thị và mô tả; đường dẫn file giữ nguyên.') }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Lưu thất bại.') }
        finally { setBusy(false) }
      }}><label className="block text-sm">Tên hiển thị<input className={input + ' mt-1'} name="name" defaultValue={detail.name || detail.filename} required maxLength={200} /></label><label className="block text-sm">Mô tả<textarea className={input + ' mt-1 py-2'} rows={3} name="description" defaultValue={detail.description || ''} maxLength={1000} /></label><button disabled={busy} className={button}>Lưu thông tin</button></form>
      <label className="block text-sm">Đường dẫn<input readOnly value={detail.url} className={input + ' mt-1'} onFocus={event => event.target.select()} /></label>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={async () => { try { await navigator.clipboard.writeText(detail.url); setMessage('Đã sao chép đường dẫn.') } catch { setMessage('Chọn và sao chép đường dẫn trong ô bên trên.') } }}>Sao chép đường dẫn</button><a href={detail.url} target="_blank" rel="noopener noreferrer" className={button}>Mở file</a><button disabled={busy || checking} className={button + ' text-red-700'} onClick={() => void previewDelete([detail.path])}>Kiểm tra & xóa file</button></div>
      {checking ? <p role="status">Đang kiểm tra nơi sử dụng…</p> : usage && <UsageView usage={usage} />}
      <p className="text-xs text-slate-500">Mô tả này dùng để quản lý thư viện. Để thay ảnh đang dùng, tải ảnh mới và cập nhật tại trang/khóa học tương ứng.</p>
    </section>}
    {preview && <section aria-label="Xác nhận xóa media" className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-4"><h2 className="text-lg font-bold">Kiểm tra trước khi xóa</h2>
      {preview.map(item => <div key={item.path} className="rounded-lg bg-white p-3"><p className="break-all font-semibold">{item.path}</p><UsageView usage={item} /></div>)}
      <p className="text-sm">Xóa vĩnh viễn file trong Storage. Chỉ xóa file không tìm thấy liên kết và đã kiểm tra đủ các nguồn nêu trên. Liên kết bên ngoài có thể bị hỏng.</p>
      <div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => setPreview(null)}>Hủy</button><button disabled={busy || !preview.some(item => !item.references.length && !item.unchecked.length)} className={button + ' text-red-700'} onClick={async () => {
        setBusy(true)
        const results: string[] = []
        for (const item of preview.filter(value => !value.references.length && !value.unchecked.length)) {
          try { await api('/api/admin/media', json('DELETE', { path: item.path, execute: true, confirm: 'DELETE' })); results.push('Đã xóa: ' + item.path) }
          catch (error) { results.push(item.path + ': ' + (error instanceof Error ? error.message : 'Xóa thất bại.')) }
        }
        setBusy(false); setPreview(null); setDetail(null); reload(); setMessage(results.join('\n'))
      }}>Xác nhận xóa file đủ điều kiện</button></div>
    </section>}
  </main>
}

function UsageView({ usage }: { usage: Usage }) {
  return <div className="mt-2 space-y-2 text-sm"><p>{usage.references.length ? 'Đang được tham chiếu (cần gỡ trước khi xóa):' : 'Chưa tìm thấy tham chiếu trong các nguồn đã kiểm tra.'}</p>{usage.references.map((ref, index) => <p key={index} className="break-all">• {ref.type} #{ref.id}</p>)}{usage.unchecked.length > 0 && <p className="text-red-700">Chưa kiểm tra được: {usage.unchecked.join(', ')}. Tạm chặn xóa.</p>}<p className="text-xs leading-5 text-slate-500">{usage.note}</p></div>
}
