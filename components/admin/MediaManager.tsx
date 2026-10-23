'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Media = { path: string; filename: string; folder: boolean; url: string; size: number; mime: string; createdAt?: string; name?: string; description?: string; uploaderName?: string; trashedAt?: string }
type Usage = { references: { type: string; id: string; title?: string; href?: string; scope?: 'current' | 'published' | 'history' | 'legacy' }[]; unchecked: string[]; missingTables?: string[]; note: string }
type Preview = Usage & { path: string }
const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50'
const input = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900'
async function api(url: string, options?: RequestInit) {
  try {
    const timeout = AbortSignal.timeout(40000)
    const response = await fetch(url, { ...options, cache: 'no-store', signal: options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body) throw new Error(body?.error || 'Máy chủ chưa hoàn tất xử lý. Hãy tải lại danh sách trước khi thử lại.')
    return body
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new Error('Đã hết thời gian chờ. Hãy tải lại danh sách để kiểm tra kết quả trước khi thử lại.')
    throw error
  }
}
const json = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
function fileDate(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có thông tin'
}
const sourceNames: Record<string, string> = { Course: 'Khóa học', Lesson: 'Bài học', Post: 'Bài viết', SiteProfile: 'Website', LandingPage: 'Trang giới thiệu', CoursePage: 'Trang khóa học', CourseSection: 'Nội dung trang khóa học', CoursePageVersion: 'Phiên bản trang khóa học', CoursePageTemplate: 'Mẫu cũ', LessonComment: 'Bình luận bài học', Payment: 'Thanh toán', SystemConfig: 'Cấu hình hệ thống' }
const scopeNames = { published: 'Trang đang công khai', current: 'Nội dung hiện tại / bản đang chỉnh', history: 'Lịch sử phiên bản', legacy: 'Mẫu cũ đã lưu' }

export default function MediaManager() {
  const [path, setPath] = useState(''), [page, setPage] = useState(0), [query, setQuery] = useState(''), [search, setSearch] = useState('')
  const [items, setItems] = useState<Media[]>([]), [hasMore, setHasMore] = useState(false), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(''), [type, setType] = useState('all'), [view, setView] = useState('grid')
  const [selected, setSelected] = useState<string[]>([]), [detail, setDetail] = useState<Media | null>(null), [usage, setUsage] = useState<Usage | null>(null), [checking, setChecking] = useState(false)
  const [preview, setPreview] = useState<Preview[] | null>(null), [revision, setRevision] = useState(0)
  const [progress, setProgress] = useState('')
  const [trash, setTrash] = useState(false)
  const [action, setAction] = useState<'trash' | 'restore' | 'purge'>('trash')
  const previewRef = useRef<HTMLElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const requestId = useRef(0)
  useEffect(() => { if (preview) previewRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }, [preview])
  useEffect(() => { if (detail) detailRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }, [detail])
  const prepareLoad = useCallback(() => { setLoading(true); setItems([]); setSelected([]) }, [])
  const reload = useCallback(() => { prepareLoad(); setRevision(value => value + 1) }, [prepareLoad])
  useEffect(() => {
    const controller = new AbortController()
    api('/api/admin/media?' + new URLSearchParams({ path, page: String(page), q: search, trash: trash ? '1' : '0' }), { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) { setItems(data.items); setHasMore(data.hasMore) } })
      .catch(error => { if (!controller.signal.aborted) setMessage(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, page, search, revision, trash])
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
  async function previewDelete(paths: string[], nextAction: 'trash' | 'restore' | 'purge' = 'trash') {
    setAction(nextAction)
    setBusy(true); setMessage(''); setPreview(null); setProgress(`Đang kiểm tra ${paths.length} file…`)
    try {
      const result = await api('/api/admin/media/batch', json('POST', { paths, action: nextAction }))
      setPreview(result.items)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể kiểm tra.') }
    finally { setBusy(false); setProgress('') }
  }
  const visible = items.filter(item => item.folder || type === 'all' || (type === 'images' ? item.mime.startsWith('image/') : !item.mime.startsWith('image/')))
  const canProcess = (item: Usage) => !item.unchecked.length && (action !== 'purge' || !item.references.length)
  return <main className="mx-auto max-w-7xl space-y-5 p-4 text-slate-900 sm:p-6">
    <nav className="flex flex-wrap gap-4 text-sm text-emerald-800"><Link href="/tools/wi-website">← Quản trị website</Link><Link href="/tools/courses/templates/legacy" className="underline">Mẫu cũ</Link><Link href="/tools/courses/templates/history" className="underline">Lịch sử trang</Link></nav>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Thư viện media</h1><p className="mt-2 text-sm text-slate-600">Ảnh và file trong kho uploads dùng chung của hệ thống. Chỉ Admin được quản lý.</p></div>
      <label className={button + ' relative cursor-pointer bg-emerald-700 text-white'}>Thêm ảnh / file<input aria-label="Thêm ảnh hoặc file" disabled={busy} className="absolute inset-0 w-full cursor-pointer opacity-0" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/zip,.zip,text/plain" onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
        if (file.size > 4 * 1024 * 1024) { setMessage('File tối đa 4 MB.'); return }
        setBusy(true); setMessage('')
        try { const form = new FormData(); form.set('file', file); await api('/api/admin/media', { method: 'POST', body: form }); setTrash(false); navigate('media'); reload() }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Tải lên thất bại.') }
        finally { setBusy(false) }
      }} /></label></div>
    <p className="text-xs leading-5 text-slate-500">Ảnh JPG/PNG/WebP/GIF được tối ưu sang WebP; hỗ trợ PDF, ZIP, TXT; tối đa 4 MB/file. File cũ có thể chưa có thông tin người tải lên.</p>
    <div className="flex gap-2" role="group" aria-label="Kho media"><button disabled={busy} aria-pressed={!trash} className={button} onClick={() => { setTrash(false); navigate('') }}>Đang sử dụng</button><button disabled={busy} aria-pressed={trash} className={button} onClick={() => { setTrash(true); navigate('') }}>Thùng rác</button></div>
    <p className="text-xs leading-5 text-slate-500">Chuyển vào thùng rác giữ lại file để khôi phục, không tự động xóa. File vẫn chiếm dung lượng và liên kết cũ vẫn có thể truy cập. Chỉ Xóa vĩnh viễn mới loại bỏ file khỏi Storage.</p>
    {!trash && <nav aria-label="Thư mục media" className="flex flex-wrap items-center gap-2 text-sm"><button disabled={busy} className={button} onClick={() => navigate('')}>Kho uploads</button>{path.split('/').filter(Boolean).map((part, index) => <button disabled={busy} key={index} className={button} onClick={() => navigate(path.split('/').slice(0, index + 1).join('/'))}>{part}</button>)}</nav>}
    <div className="flex flex-wrap gap-2"><form className="flex min-w-0 flex-1 gap-2" onSubmit={event => { event.preventDefault(); prepareLoad(); setPage(0); setSearch(query); setRevision(value => value + 1) }}><input aria-label="Tìm tên file trong thư mục" placeholder="Tìm tên file trong thư mục này…" className={input} value={query} onChange={event => setQuery(event.target.value)} /><button className={button}>Tìm</button></form>
      <select aria-label="Loại file" className={button} value={type} onChange={event => setType(event.target.value)}><option value="all">Tất cả loại file</option><option value="images">Ảnh</option><option value="files">Tài liệu / file</option></select>
      <select aria-label="Cách hiển thị" className={button} value={view} onChange={event => setView(event.target.value)}><option value="grid">Dạng lưới</option><option value="list">Danh sách</option></select>
      <button disabled={loading || busy} className={button} onClick={reload}>Tải lại</button>
    </div>
    {message && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">{message}</p>}
    {busy && <p role="status">{progress || 'Đang xử lý…'}</p>}
    {loading ? <p role="status">Đang tải media…</p> : <>
      <div className="flex flex-wrap items-center gap-3 text-sm"><span>Đã chọn {selected.length}/20 file</span>{trash ? <><button disabled={!selected.length || busy} className={button} onClick={() => void previewDelete(selected, 'restore')}>Khôi phục đã chọn</button><button disabled={!selected.length || busy} className={button + ' text-red-700'} onClick={() => void previewDelete(selected, 'purge')}>Xóa vĩnh viễn đã chọn</button></> : <button disabled={!selected.length || busy} className={button + ' text-red-700'} onClick={() => void previewDelete(selected)}>Chuyển vào thùng rác</button>}<button disabled={!selected.length || busy} className={button} onClick={() => setSelected([])}>Bỏ chọn</button></div>
      <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5' : 'space-y-2'}>{visible.map(item => <article key={item.path} className={'min-w-0 rounded-xl border border-slate-200 bg-white p-3 ' + (view === 'list' ? 'flex flex-wrap items-center gap-3' : '')}>
        {!item.folder && <input type="checkbox" disabled={busy || (!selected.includes(item.path) && selected.length >= 20)} aria-label={'Chọn ' + item.filename} checked={selected.includes(item.path)} onChange={event => setSelected(event.target.checked ? [...selected, item.path] : selected.filter(value => value !== item.path))} className="h-5 w-5" />}
        <button disabled={busy} className={'min-w-0 text-left ' + (view === 'grid' ? 'mt-2 block w-full' : 'flex flex-1 items-center gap-3')} onClick={() => item.folder ? navigate(item.path) : void openDetail(item)}>
          <span className={'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-3xl ' + (view === 'grid' ? 'aspect-square w-full' : 'h-14 w-14')}>
            {item.folder ? '📁' : item.mime.startsWith('image/') ? <Image src={item.url} alt="" fill unoptimized className="object-contain" loading="lazy" /> : '📄'}
          </span><span className="block min-w-0"><span className="mt-2 block break-words text-sm font-semibold">{item.name || item.filename}</span><span className="mt-1 block break-all text-xs text-slate-500">{item.folder ? 'Mở thư mục' : (item.size / 1024 / 1024).toFixed(2) + ' MB · ' + item.filename}</span>{!item.folder && <span className="mt-1 block text-xs text-slate-600">Tải lên: {fileDate(item.createdAt)}</span>}{item.trashedAt && <span className="mt-1 block text-xs text-slate-500">Vào thùng rác: {fileDate(item.trashedAt)}</span>}</span>
        </button>
        {!item.folder && <button disabled={busy} className={button + ' mt-2 w-full text-emerald-800'} onClick={() => void openDetail(item)}>Xem trước / Nơi sử dụng</button>}
      </article>)}</div>
      {!visible.length && <p className="py-8 text-center text-slate-500">Không có file phù hợp trong trang của thư mục này.</p>}
      <div className="flex items-center justify-center gap-3"><button className={button} disabled={page === 0 || busy} onClick={() => { prepareLoad(); setPage(page - 1) }}>Trước</button><span>Trang {page + 1}</span><button className={button} disabled={!hasMore || busy} onClick={() => { prepareLoad(); setPage(page + 1) }}>Sau</button></div>
      <p className="text-xs text-slate-500">60 mục mỗi trang. Tìm theo tên file gốc trong thư mục; bộ lọc loại file áp dụng cho trang đang xem.</p>
    </>}
    {detail && <section ref={detailRef} aria-label="Chi tiết media" className="scroll-mt-6 space-y-3 rounded-xl border border-slate-300 bg-white p-4">
      <div className="flex justify-between gap-3"><h2 className="text-lg font-bold">Chi tiết ảnh / file</h2><button className={button} onClick={() => { ++requestId.current; setDetail(null) }}>Đóng</button></div>
      <p className="break-all text-sm">{detail.filename} · {detail.mime} · {(detail.size / 1024 / 1024).toFixed(2)} MB</p>
      <p className="text-sm">Ngày tải (giờ Việt Nam): {fileDate(detail.createdAt)} · Người tải: {detail.uploaderName || 'Chưa có thông tin'}</p>
      {detail.mime.startsWith('image/') ? <div className="relative h-80 w-full rounded-lg bg-slate-100"><Image src={detail.url} alt={detail.name || detail.filename} fill unoptimized className="object-contain" /></div> : /\.html?$/i.test(detail.filename) || detail.mime === 'application/pdf' ? <div className="space-y-2"><iframe key={detail.path} title={'Xem trước ' + detail.filename} src={/\.html?$/i.test(detail.filename) ? '/api/admin/media?' + new URLSearchParams({ path: detail.path, preview: '1' }) : detail.url} sandbox="" referrerPolicy="no-referrer" loading="lazy" className="h-[32rem] w-full rounded-lg border bg-white" /><p className="text-xs text-slate-500">Bản xem trước chặn script và biểu mẫu. Nếu trình duyệt không hiển thị file, dùng nút Mở file hoặc tải về.</p></div> : <p className="rounded-lg bg-slate-50 p-3 text-sm">{detail.mime.includes('zip') || /\.zip$/i.test(detail.filename) ? 'File ZIP: tải về và giải nén để xem nội dung.' : 'File này chưa hỗ trợ xem trước trực tiếp. Bạn có thể mở hoặc tải về để kiểm tra.'}</p>}
      <div aria-label="Nơi sử dụng" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><h3 className="font-semibold">Đang dùng tại</h3>{checking ? <p role="status">Đang kiểm tra nơi sử dụng…</p> : usage ? <UsageView usage={usage} /> : <p className="text-sm">Chưa kiểm tra được nơi sử dụng. Hãy mở lại chi tiết để thử lại.</p>}</div>
      <form key={detail.path} className="space-y-3" onSubmit={async event => {
        event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true)
        try { await api('/api/admin/media', json('PATCH', { path: detail.path, name: values.get('name'), description: values.get('description') })); reload(); setMessage('Đã lưu tên hiển thị và mô tả; đường dẫn file giữ nguyên.') }
        catch (error) { setMessage(error instanceof Error ? error.message : 'Lưu thất bại.') }
        finally { setBusy(false) }
      }}><label className="block text-sm">Tên hiển thị<input className={input + ' mt-1'} name="name" defaultValue={detail.name || detail.filename} required maxLength={200} /></label><label className="block text-sm">Mô tả<textarea className={input + ' mt-1 py-2'} rows={3} name="description" defaultValue={detail.description || ''} maxLength={1000} /></label><button disabled={busy} className={button}>Lưu thông tin</button></form>
      <label className="block text-sm">Đường dẫn<input readOnly value={detail.url} className={input + ' mt-1'} onFocus={event => event.target.select()} /></label>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={async () => { try { await navigator.clipboard.writeText(detail.url); setMessage('Đã sao chép đường dẫn.') } catch { setMessage('Chọn và sao chép đường dẫn trong ô bên trên.') } }}>Sao chép đường dẫn</button><a href={detail.url} target="_blank" rel="noopener noreferrer" className={button}>Mở file</a><a href={detail.url + '?download=' + encodeURIComponent(detail.name || detail.filename)} download={detail.name || detail.filename} target="_blank" rel="noopener noreferrer" className={button}>Tải về</a>{trash && <button disabled={busy} className={button} onClick={() => void previewDelete([detail.path], 'restore')}>Khôi phục file</button>}<button disabled={busy || checking} className={button + ' text-red-700'} onClick={() => void previewDelete([detail.path], trash ? 'purge' : 'trash')}>{trash ? 'Xóa vĩnh viễn file' : 'Chuyển file vào thùng rác'}</button></div>
      <p className="text-xs text-slate-500">Mô tả này dùng để quản lý thư viện. Để thay ảnh đang dùng, tải ảnh mới và cập nhật tại trang/khóa học tương ứng.</p>
    </section>}
    {preview && <section ref={previewRef} aria-label="Xác nhận xóa media" className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-4"><h2 className="text-lg font-bold">{action === 'trash' ? 'Chuyển vào thùng rác' : action === 'restore' ? 'Khôi phục file' : 'Xóa vĩnh viễn'}</h2>
      <p className="text-sm">{preview.filter(canProcess).length}/{preview.length} file đủ điều kiện. Bấm xác nhận bên dưới để thực hiện.</p>
      <div className="max-h-80 space-y-2 overflow-y-auto">{preview.map(item => <div key={item.path} className="rounded-lg bg-white p-3"><p className="break-all font-semibold">{item.path}</p><UsageView usage={item} /></div>)}</div>
      <p className="text-sm">{action === 'trash' ? 'File còn liên kết vẫn có thể chuyển vào thùng rác: nội dung và đường dẫn được giữ nguyên nên trang vẫn hoạt động. Chỉ xóa vĩnh viễn mới cần gỡ các liên kết.' : action === 'restore' ? 'Đưa file trở lại danh sách đang sử dụng, giữ nguyên nội dung và đường dẫn.' : 'File sẽ bị xóa vĩnh viễn khỏi Storage, không thể khôi phục qua thùng rác. Liên kết bên ngoài có thể bị hỏng.'}</p>
      <div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => setPreview(null)}>Hủy</button><button disabled={busy || !preview.some(canProcess)} className={button + ' text-red-700'} onClick={async () => {
        const paths = preview.filter(canProcess).map(item => item.path)
        setBusy(true); setProgress(`Đang ${action === 'trash' ? 'chuyển vào thùng rác' : action === 'restore' ? 'khôi phục' : 'kiểm tra lại và xóa vĩnh viễn'} ${paths.length} file…`)
        try {
          const result = await api('/api/admin/media/batch', json('POST', { paths, action, execute: true, confirm: action === 'trash' ? 'TRASH' : action === 'restore' ? 'RESTORE' : 'DELETE' }))
          setPreview(result.blocked.length ? result.blocked : null); setDetail(null); reload()
          setMessage(`${action === 'trash' ? 'Đã chuyển vào thùng rác' : action === 'restore' ? 'Đã khôi phục' : 'Đã xóa vĩnh viễn'} ${result.processed.length}/${paths.length} file.` + (result.blocked.length ? ` ${result.blocked.length} file bị chặn vì đang được dùng hoặc chưa kiểm tra được.` : '') + (result.failed.length ? ` ${result.failed.length} file chưa hoàn tất: ${result.failed.map((item: { error: string }) => item.error).join(' ')}` : ''))
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Xóa thất bại.'); reload() }
        finally { setBusy(false); setProgress('') }
      }}>{action === 'trash' ? 'Xác nhận chuyển vào thùng rác' : action === 'restore' ? 'Xác nhận khôi phục' : 'Xác nhận xóa vĩnh viễn'}</button></div>
    </section>}
  </main>
}

function UsageView({ usage }: { usage: Usage }) {
  return <div className="mt-2 space-y-2 text-sm"><p>{usage.references.length ? 'Các nơi còn liên kết tới file (cần gỡ trước khi xóa vĩnh viễn):' : 'Chưa tìm thấy nơi sử dụng trong các nguồn đã kiểm tra.'}</p>{(Object.keys(scopeNames) as (keyof typeof scopeNames)[]).map(scope => {
    const refs = usage.references.filter(ref => (ref.scope || 'current') === scope)
    return refs.length ? <section key={scope} className="rounded-lg border border-slate-200 bg-white p-2"><h4 className="font-semibold">{scopeNames[scope]}</h4>{refs.map((ref, index) => <p key={index} className="break-words">{ref.href ? <Link href={ref.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-emerald-800 underline">{sourceNames[ref.type] || ref.type}: {ref.title || '#' + ref.id} ↗</Link> : <span>{sourceNames[ref.type] || ref.type}: {ref.title || '#' + ref.id}</span>}</p>)}</section> : null
  })}{usage.references.length >= 21 && <p className="text-xs">Chỉ hiển thị tối đa 21 tham chiếu mỗi nguồn.</p>}{usage.unchecked.length > 0 && <p className="text-red-700">Chưa kiểm tra được: {usage.unchecked.map(source => sourceNames[source] || source).join(', ')}. Tạm chặn thao tác.</p>}{!!usage.missingTables?.length && <p className="text-xs text-slate-500">Nguồn tùy chọn chưa tồn tại: {usage.missingTables.map(source => sourceNames[source] || source).join(', ')}.</p>}<p className="text-xs leading-5 text-slate-500">{usage.note}</p></div>
}
