'use client'
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Code2, Eye, Save, X } from 'lucide-react'
import ManagementWorkspace from '@/components/layout/ManagementWorkspace'
import TemplatePreviewFrame from './TemplatePreviewFrame'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import { compileCourseCode } from '@/lib/course-page/course-code'
import { compileTemplateSource, type TemplateSource } from '@/lib/course-page/template-source'
import { templateWorkspaceRequest } from '@/lib/course-page/template-workspace-client'
import type { PageRevision } from '@/lib/course-page/stage-template'
import type { CourseEditorControls } from '@/lib/course-page/editor-controls'

const CodeEditor = dynamic(() => import('@/components/website/TemplateCodeEditor'), { ssr: false, loading: () => <p className="p-4 text-sm">Đang tải trình sửa code…</p> })
const endpoint = '/api/course-templates'
const starter = '<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>\n/* Giao diện điện thoại trước, tự mở rộng theo màn hình */\nbody{margin:0;font-family:Arial,sans-serif;color:#203126;background:#fffaf0}\nsection{max-width:1000px;margin:auto;padding:48px 20px}\nh1{font-size:clamp(28px,5vw,52px)}\na{display:inline-block;padding:14px 24px;background:#236c1e;color:white;border-radius:10px;text-decoration:none}\n</style>\n</head>\n<body>\n<section><h1>Tên khóa học</h1><p>Giới thiệu lợi ích khóa học tại đây.</p>\n<!-- Nút này mở đăng ký của hệ thống -->\n<a href="#dang-ky">Đăng ký khóa học</a></section>\n<script>\n// Đặt JavaScript cho giao diện tại đây.\n</script>\n</body>\n</html>'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary disabled:opacity-50'
function previewUrl(id: string, token?: string, page = false) { const query = new URLSearchParams({ [page ? 'page' : 'system']: id }); if (token) query.set('token', token); return `/tools/courses/templates/preview?${query}` }
type WorkspaceProps = { embedded?: boolean; workflow?: boolean; disabled?: boolean; controls?: Ref<CourseEditorControls>; onBusyChange?: (busy: boolean) => void; context?: { slug: string; name: string; courseId?: number }; startPageId?: string; startCode?: boolean; onApplied?: () => void; onDirtyChange?: (dirty: boolean) => void }
type Preview = { id: string; name: string; page?: boolean; copying?: boolean; token?: string }

export default function CourseTemplateWorkspace({ embedded = false, workflow = false, disabled = false, controls, onBusyChange, context, startPageId, startCode = false, onApplied, onDirtyChange }: WorkspaceProps = {}) {
  const params = useSearchParams()
  const courseSlug = context?.slug ?? params.get('course') ?? '', courseName = context?.name ?? params.get('name') ?? courseSlug, courseId = context?.courseId ?? Number(params.get('courseId'))
  const back = courseId > 0 ? `/tools/courses/new?id=${courseId}&tab=sales` : '/tools/courses'
  const [html, setHtml] = useState<string | null>(null), [baseline, setBaseline] = useState('')
  const [revision, setRevision] = useState<PageRevision | null>(null)
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(Boolean(courseSlug)), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [device, setDevice] = useState(1280), [mobilePanel, setMobilePanel] = useState<'code' | 'preview'>('code'), [auto, setAuto] = useState(true), [rendered, setRendered] = useState(''), [compileError, setCompileError] = useState(''), [warnings, setWarnings] = useState<string[]>([])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [retry, setRetry] = useState(0)
  const [sourceMissing, setSourceMissing] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null), request = useRef<AbortController | null>(null)
  const dirty = html !== null && html !== baseline
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  useEffect(() => { onBusyChange?.(busy || loading) }, [busy, loading, onBusyChange])
  useEffect(() => { if (preview) dialog.current?.showModal(); else dialog.current?.close() }, [preview])
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty])
  function openCode(code: string, changed = false) {
    setSourceMissing(false)
    setHtml(code); setBaseline(changed ? '' : code); setPreview(null); setError(''); setNotice(''); setRendered(''); setCompileError(''); setMobilePanel('code')
  }
  useEffect(() => {
    if (!courseSlug) return
    const controller = new AbortController()
    setLoading(true); setError(''); setRevision(null)
    // Chỉ đọc mã khi mở Sửa code; chọn mẫu không tải nguồn mọi mẫu.
    templateWorkspaceRequest(`${endpoint}?course=${encodeURIComponent(courseSlug)}`, undefined, controller.signal).then(async data => {
      if (controller.signal.aborted) return
      // Giữ revision ngay cả khi tải mã cũ lỗi, để người dùng chủ động dán mã thay thế.
      setRevision(data.revision)
      const source = startPageId ? await templateWorkspaceRequest(`${endpoint}?page=${encodeURIComponent(startPageId)}`, undefined, controller.signal) : null
      if (controller.signal.aborted) return
      setRevision(source?.revision || data.revision)
      if (source?.sourceMissing) { openCode('', true); setSourceMissing(true) }
      else if (source?.renderPage) setPreview({ id: startPageId!, name: source.name, page: true, copying: true, token: crypto.randomUUID() })
      else if (source?.source) openCode(compileTemplateSource(source.source as TemplateSource).analysisHtml)
      else if (startCode) openCode(starter, true)
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không tải được giao diện khóa học.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // Component được khóa theo bối cảnh khóa học từ nơi gọi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry])
  const renderPreview = useCallback(() => {
    if (html === null || !html.trim()) return
    try { const result = compileCourseCode(html); setRendered(result.html); setCompileError(''); setWarnings(result.warnings) }
    catch (error) { setCompileError(error instanceof Error ? error.message : 'Không tạo được bản xem trước.') }
  }, [html])
  useEffect(() => { if (!auto || html === null) return; const timer = setTimeout(renderPreview, 650); return () => clearTimeout(timer) }, [auto, html, renderPreview])
  const copyBuiltin = useCallback((code: string) => { if (preview?.copying) openCode(code, true) }, [preview])
  async function apply(id: string, name: string) {
    if (!courseSlug || busy || loading || !window.confirm(`Tạo bản nháp từ mẫu “${name}” cho “${courseName}”? Trang công khai chỉ đổi khi bạn Xuất bản.`)) return
    setBusy(true); setError('')
    try {
      await templateWorkspaceRequest(endpoint, { action: 'apply', id, system: true, slug: courseSlug, name: courseName })
      setNotice('Đã tạo bản nháp. Kiểm tra nội dung rồi bấm Xuất bản.'); setPreview(null); onApplied?.()
      const current = await templateWorkspaceRequest(`${endpoint}?course=${encodeURIComponent(courseSlug)}`); setRevision(current.revision)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không áp dụng được mẫu.') }
    finally { setBusy(false) }
  }
  async function save() {
    if (html === null || busy || loading || !courseSlug || !revision) return false
    if (!dirty && revision.id) return true
    setBusy(true); setError(''); setNotice(''); const controller = new AbortController(); request.current = controller
    try {
      compileCourseCode(html)
      const result = await templateWorkspaceRequest(endpoint, { action: 'save-course-code', slug: courseSlug, name: courseName, html, revision }, controller.signal)
      setSourceMissing(false)
      setBaseline(html); setRevision(result.revision); setWarnings(result.warnings || []); setNotice('Đã lưu bản nháp vào khóa học. Bấm Xuất bản để cập nhật trang công khai.'); onApplied?.()
      return true
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được code. Mã đang sửa được giữ lại.') }
    finally { setBusy(false); request.current = null }
    return false
  }
  useImperativeHandle(controls, () => ({ save }))
  async function formatCode() {
    if (html === null || busy) return
    setBusy(true); setError('')
    try {
      const prettier = await import('prettier/standalone'), plugin = await import('prettier/plugins/html')
      setHtml(await prettier.format(html, { parser: 'html', plugins: [plugin.default] }))
    } catch { setError('Không định dạng được code. Hãy kiểm tra cú pháp.') }
    finally { setBusy(false) }
  }
  function leaveEditor() { if (busy || dirty && !window.confirm('Code đang sửa chưa lưu. Quay lại chọn giao diện?')) return; setHtml(null); setError(''); setNotice('') }
  const content = <>
    {!workflow && <>{html !== null ? <button type="button" onClick={leaveEditor} className={button}><ArrowLeft size={16} />Chọn giao diện</button> : !embedded && <Link href={back} className={button}><ArrowLeft size={16} />Quản lý khóa học</Link>}
    <h1 className="text-2xl font-bold text-brk-primary">{html === null ? 'Giao diện trang bán khóa học' : 'Giao diện bằng code'}</h1>
    {courseSlug && <p className="text-sm text-brk-muted">Khóa học: <strong>{courseName}</strong></p>}</>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {sourceMissing && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Mẫu cũ không còn tồn tại. Bạn có thể dán mã HTML mới bên dưới rồi bấm Lưu nháp.</p>}
    {loading && <p role="status" className="text-sm">Đang tải giao diện khóa học…</p>}
    {html === null && workflow ? <>{!loading && !preview && <div className="flex flex-wrap gap-3"><button type="button" disabled={disabled || busy} onClick={() => setRetry(value => value + 1)} className={button}>Tải lại mã trang</button><button type="button" disabled={disabled || busy || !revision} onClick={() => { openCode('', true); setNotice('Dán mã HTML mới bên dưới. Mã cũ chỉ được thay khi bạn bấm Lưu nháp. Trang công khai chỉ đổi khi Xuất bản.') }} className={button}><Code2 size={17} />Dán mã HTML mới</button></div>}</> : html === null ? <>
      <p className="text-sm text-brk-muted">Chọn mẫu có sẵn hoặc dán code riêng cho khóa học. Thay đổi được lưu nháp trước khi xuất bản.</p>
      {!courseSlug && <p className="rounded-xl bg-brk-background p-4 text-sm">Mở một khóa học → Trang bán khóa học để chọn hoặc sửa giao diện.</p>}
      <div className="grid gap-4 md:grid-cols-2">{COURSE_TEMPLATE_LIBRARY.map(item => <article key={item.key} className="min-w-0 rounded-2xl border border-brk-outline bg-white p-4">
        <h2 className="font-bold">{item.name}</h2><p className="mt-2 text-sm text-brk-muted">{item.description}</p>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setPreview({ id: item.key, name: item.name })} className={button}><Eye size={16} />Xem trước</button>{courseSlug && <><button type="button" disabled={busy || loading} onClick={() => void apply(item.key, item.name)} className={button}>Dùng mẫu</button><button type="button" disabled={busy || loading} onClick={() => setPreview({ id: item.key, name: item.name, copying: true, token: crypto.randomUUID() })} className={button}>Sửa code từ mẫu</button></>}</div>
      </article>)}</div>
      {courseSlug && <button type="button" disabled={busy || loading || !revision} onClick={() => openCode(starter, true)} className={button}><Code2 size={17} />Dán code riêng</button>}
    </> : <>
      <p className="rounded-xl bg-brk-background p-3 text-sm">Dán HTML hoàn chỉnh, CSS trong &lt;style&gt;, JavaScript trong &lt;script&gt;. Ảnh dùng URL HTTPS; tối đa 1 MB, không nhúng file Base64. Nút đăng ký dùng <code>#dang-ky</code>.</p>
      <div className="flex gap-2 xl:hidden">{(['code', 'preview'] as const).map(value => <button key={value} type="button" onClick={() => setMobilePanel(value)} aria-pressed={mobilePanel === value} className={button}>{value === 'code' ? 'Code' : 'Xem trước'}</button>)}</div>
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={`${mobilePanel === 'preview' ? 'hidden xl:block' : ''} min-w-0 space-y-3 rounded-2xl border border-brk-outline bg-white p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">HTML / CSS / JavaScript</h2><button type="button" disabled={busy || disabled} onClick={() => void formatCode()} className={button}>Định dạng</button></div><CodeEditor value={html} language="html" disabled={busy || disabled} onChange={setHtml} /><p className="text-xs text-brk-muted">Ctrl+F tìm kiếm · Ctrl+Z hoàn tác · Ctrl+Shift+Z làm lại.</p>
        </section>
        <section className={`${mobilePanel === 'code' ? 'hidden xl:block' : ''} min-w-0 space-y-3 rounded-2xl border border-brk-outline bg-white p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Xem trước</h2><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={auto} onChange={event => setAuto(event.target.checked)} />Tự cập nhật</label></div>
          <div className="flex flex-wrap gap-2">{[{ width: 1280, label: 'Máy tính' }, { width: 768, label: 'Tablet' }, { width: 390, label: 'Điện thoại' }].map(item => <button key={item.width} type="button" onClick={() => setDevice(item.width)} aria-pressed={device === item.width} className={button}>{item.label}</button>)}<button type="button" onClick={renderPreview} className={button}>Cập nhật</button></div>
          {compileError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{compileError} · Đang giữ bản xem trước hợp lệ gần nhất.</p>}{rendered && <TemplatePreviewFrame html={rendered} width={device} />}{warnings.map(warning => <p key={warning} className="text-xs text-amber-700">{warning}</p>)}
        </section>
      </div>
      {!workflow && <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brk-outline bg-white p-4 shadow-lg"><span role="status" className="text-sm">{busy ? 'Đang xử lý…' : dirty ? 'Có thay đổi chưa lưu' : 'Code hiện tại của khóa học'}</span><button type="button" disabled={busy || loading || !revision} onClick={() => void save()} className={button}><Save size={17} />Lưu bản nháp cho khóa học</button></div>}
    </>}
    <dialog ref={dialog} aria-label="Xem trước giao diện" onCancel={() => setPreview(null)} className="m-auto max-h-[95dvh] w-[calc(100%_-_1rem)] max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 backdrop:bg-black/50">
      {preview && <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{preview.copying ? 'Đang lấy code: ' : 'Xem trước: '}{preview.name}</h2><button type="button" onClick={() => setPreview(null)} className={button}><X size={16} />Đóng</button></div><TemplatePreviewFrame src={previewUrl(preview.id, preview.token, preview.page)} width={device} exportToken={preview.token} onSource={copyBuiltin} />{preview.copying ? <p className="mt-3 text-sm">Code sẽ mở khi giao diện tải xong. Nếu chưa phản hồi, đóng và thử lại.</p> : courseSlug && <button type="button" disabled={busy || loading} onClick={() => void apply(preview.id, preview.name)} className={`${button} mt-3`}>Dùng mẫu cho khóa học</button>}</>}
    </dialog>
  </>
  return embedded ? <div className="min-w-0 space-y-4">{content}</div> : <ManagementWorkspace active="courses">{content}</ManagementWorkspace>
}
