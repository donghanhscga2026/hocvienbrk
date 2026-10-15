'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Search, Plus, Save, Upload, Code2, ArrowLeft, Eye, Loader2, X } from 'lucide-react'
import ManagementWorkspace from '@/components/layout/ManagementWorkspace'
import TemplatePreviewFrame from './TemplatePreviewFrame'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import { compileTemplateSource, sourceFromHtml, type TemplateSource } from '@/lib/course-page/template-source'
import { readZipTemplateSource } from '@/lib/course-page/importer/zip-browser'
import { templateWorkspaceRequest } from '@/lib/course-page/template-workspace-client'
import type { LibraryPolicy } from '@/lib/course-page/template-library'


const CodeEditor = dynamic(() => import('@/components/website/TemplateCodeEditor'), { ssr: false, loading: () => <p className="p-4 text-sm">Đang tải trình sửa code…</p> })
type Template = { id: string; name: string; description: string; sourceType: string; updatedAt: string; scope?: 'shared' | 'private'; published?: boolean; bytes?: number }
type Editor = { template: Partial<Template> & { name: string; description: string; sourceType: 'html' | 'zip' | 'url' }; source: TemplateSource }
const endpoint = '/api/course-templates'
const starter = '<!doctype html>\n<html lang="vi">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mẫu mới</title><style>body{margin:0;font-family:Arial,sans-serif;background:#f3f7df;color:#203126}.hero{padding:80px 24px;max-width:1100px;margin:auto}h1{font-size:40px}a{display:inline-block;padding:14px 24px;background:#236c1e;color:white;border-radius:10px;text-decoration:none}</style></head>\n<body><section class="hero"><h1>Tên khóa học của bạn</h1><p>Viết thông điệp và lợi ích của khóa học tại đây.</p><a href="#dang-ky">Đăng ký khóa học</a></section></body>\n</html>'
const field = 'min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3 text-sm'
const baseButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline px-4 text-sm font-semibold disabled:opacity-50'
const button = baseButton + ' bg-white text-brk-primary'
function previewUrl(id: string, system = false, token?: string) { const query = new URLSearchParams({ [system ? 'system' : 'id']: id }); if (token) query.set('token', token); return `/tools/courses/templates/preview?${query}` }

type WorkspaceProps = { embedded?: boolean; context?: { slug: string; name: string; courseId?: number }; startPageId?: string; onApplied?: () => void; onDirtyChange?: (dirty: boolean) => void }
export default function CourseTemplateWorkspace({ embedded = false, context, startPageId, onApplied, onDirtyChange }: WorkspaceProps = {}) {
  const params = useSearchParams(), courseSlug = context?.slug ?? params.get('course') ?? '', courseName = context?.name ?? params.get('name') ?? courseSlug, courseId = context?.courseId ?? Number(params.get('courseId'))
  const back = courseId > 0 ? `/tools/courses/new?id=${courseId}&tab=sales` : '/tools/courses'
  const [tab, setTab] = useState<'system' | 'mine'>('system'), [templates, setTemplates] = useState<Template[]>([]), [search, setSearch] = useState(''), [page, setPage] = useState(1)
  const [admin, setAdmin] = useState(false)
  const [policy, setPolicy] = useState<LibraryPolicy>({ maxPrivateTemplates: 1, maxTemplateMB: 2, maxPrivateMB: 4 })
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [editor, setEditor] = useState<Editor | null>(null), [baseline, setBaseline] = useState(''), [activeFile, setActiveFile] = useState('index.html'), [panel, setPanel] = useState<'info' | 'code'>('info')
  const [device, setDevice] = useState(1280), [mobilePanel, setMobilePanel] = useState<'code' | 'preview'>('code'), [auto, setAuto] = useState(true), [rendered, setRendered] = useState(''), [compileError, setCompileError] = useState(''), [warnings, setWarnings] = useState<string[]>([])
  const [sourceMode, setSourceMode] = useState<'html' | 'zip' | 'url'>('html'), [sourceUrl, setSourceUrl] = useState('')
  const [preview, setPreview] = useState<{ id: string; name: string; system: boolean; copying?: boolean; token?: string; page?: boolean } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null), request = useRef<AbortController | null>(null)
  const dirty = editor != null && JSON.stringify(editor) !== baseline
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  useEffect(() => { if (preview) dialog.current?.showModal(); else dialog.current?.close() }, [preview])
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { const prevent = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }; window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent) }, [dirty])
  async function reload(signal?: AbortSignal) {
    setLoading(true)
    try { const data = await templateWorkspaceRequest(endpoint, undefined, signal); if (!signal?.aborted) { setTemplates(data.templates || []); setAdmin(data.admin === true); if (data.policy) setPolicy(data.policy) } }
    catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Không tải được thư viện mẫu.') }
    finally { if (!signal?.aborted) setLoading(false) }
  }
  function openEditor(value: Editor, changed = false) { setEditor(value); setBaseline(changed ? '' : JSON.stringify(value)); setActiveFile(value.source.entryPath); setPanel('info'); setError(''); setNotice(''); setPreview(null); setRendered(''); setCompileError('') }
  useEffect(() => {
    const controller = new AbortController(); void reload(controller.signal)
    if (startPageId) {
      setBusy(true)
      templateWorkspaceRequest(`${endpoint}?page=${encodeURIComponent(startPageId)}`, undefined, controller.signal).then(data => {
        if (controller.signal.aborted) return
        if (data.renderPage) setPreview({ id: startPageId, name: data.name, system: false, page: true, copying: true, token: crypto.randomUUID() })
        else { openEditor(data); setPanel('code') }
      }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không tải được mã trang.') }).finally(() => { if (!controller.signal.aborted) setBusy(false) })
    } else if (params.get('mode') === 'import') openEditor({ template: { name: 'Mẫu mới', description: '', sourceType: 'html', scope: 'private', published: false }, source: sourceFromHtml(starter) }, true)
    return () => controller.abort()
    // Bối cảnh khóa học được giữ trên URL; không tải lại thư viện mỗi lần chuyển tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const source = editor?.source
  const renderPreview = useCallback(() => {
    if (!source) return
    try { const result = compileTemplateSource(source); setRendered(result.html); setCompileError(''); setWarnings(result.warnings) }
    catch (error) { setCompileError(error instanceof Error ? error.message : 'Không tạo được preview.') }
  }, [source])
  useEffect(() => { if (!auto || !source) return; const timer = setTimeout(renderPreview, 650); return () => clearTimeout(timer) }, [auto, source, renderPreview])
  useEffect(() => { setPage(1) }, [search, tab])
  const filtered = useMemo(() => (tab === 'system' ? [...COURSE_TEMPLATE_LIBRARY.map(item => ({ id: item.key, name: item.name, description: item.description, sourceType: 'system', updatedAt: '', scope: 'shared' as const, published: true })), ...templates.filter(item => item.scope === 'shared')] : templates.filter(item => item.scope === 'private')).filter(item => `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase())), [tab, templates, search])
  const totalPages = Math.max(1, Math.ceil(filtered.length / 6)), currentPage = Math.min(page, totalPages), visible = filtered.slice((currentPage - 1) * 6, currentPage * 6)
  async function editTemplate(id: string) {
    if (busy) return
    setBusy(true); setError('')
    try { const data = await templateWorkspaceRequest(`${endpoint}?id=${encodeURIComponent(id)}&edit=1`); openEditor(data) }
    catch (error) { setError(error instanceof Error ? error.message : 'Không tải được mã mẫu.') }
    finally { setBusy(false) }
  }
  async function copyShared(id: string) {
    setBusy(true); setError('')
    try { const data = await templateWorkspaceRequest(`${endpoint}?id=${encodeURIComponent(id)}`); openEditor({ ...data, template: { ...data.template, id: undefined, name: data.template.name + ' – Bản sao', scope: 'private', published: false } }, true) }
    catch (error) { setError(error instanceof Error ? error.message : 'Không sao chép được mẫu.') }
    finally { setBusy(false) }
  }
  async function savePolicy() {
    setBusy(true); setError('')
    try { await templateWorkspaceRequest(endpoint, { action: 'policy', policy }); setNotice('Đã lưu hạn mức mẫu cá nhân.') }
    catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được hạn mức.') }
    finally { setBusy(false) }
  }
  const copyBuiltin = useCallback((html: string) => {
    if (!preview?.copying) return
    const source = { ...sourceFromHtml(html), baseUrl: `${location.origin}/` }
    openEditor({ template: { name: `${preview.name} – Bản sao`, description: preview.page ? 'Bản HTML từ trang khóa học đang lưu' : 'Bản HTML từ mẫu hệ thống', sourceType: 'html', scope: 'private', published: false }, source }, true)
    setPanel('code')
  }, [preview])
  function startCopy(id: string, name: string) { setPreview({ id, name, system: true, copying: true, token: crypto.randomUUID() }) }
  async function apply(id: string, name: string, system: boolean) {
    if (!courseSlug || busy) return
    if (!window.confirm(`Tạo bản nháp từ mẫu “${name}” cho “${courseName}”? Trang công khai chỉ đổi khi bạn Xuất bản.`)) return
    setBusy(true); setError(''); setNotice('')
    try { await templateWorkspaceRequest(endpoint, { action: 'apply', id, system, slug: courseSlug, name: courseName }); setNotice('Đã tạo bản nháp. Mở Nội dung để chỉnh rồi Xuất bản.'); setPreview(null); onApplied?.() }
    catch (error) { setError(error instanceof Error ? error.message : 'Không áp dụng được mẫu.') }
    finally { setBusy(false) }
  }
  async function save(copy = false, thenApply = false) {
    if (!editor || busy) return
    const current = editor
    setBusy(true); setError(''); setNotice(''); const controller = new AbortController(); request.current = controller
    try {
      compileTemplateSource(current.source)
      const result = await templateWorkspaceRequest(endpoint, { action: 'save', ...(!copy && current.template.id ? { id: current.template.id, expectedUpdatedAt: current.template.updatedAt } : {}), name: current.template.name, description: current.template.description, sourceType: current.template.sourceType, scope: current.template.scope || 'private', published: current.template.published || false, source: current.source }, controller.signal)
      const next = { ...current, template: result.template }; setEditor(next); setBaseline(JSON.stringify(next)); setWarnings(result.warnings || []); setNotice('Đã lưu mẫu. Các khóa học đã dùng bản trước giữ nguyên giao diện.'); setTab(current.template.scope === 'shared' ? 'system' : 'mine'); await reload()
      if (thenApply && courseSlug && window.confirm(`Tạo bản nháp cho “${courseName}” từ mẫu vừa lưu?`)) {
        await templateWorkspaceRequest(endpoint, { action: 'apply', id: result.template.id, system: false, slug: courseSlug, name: courseName })
        setNotice('Đã lưu mẫu và tạo bản nháp cho khóa học.'); onApplied?.()
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được mẫu.') }
    finally { setBusy(false); request.current = null }
  }
  async function loadFile(file?: File) {
    if (!file || !editor || busy) return
    if (dirty && !window.confirm('Thay mã đang sửa bằng file mới? Hãy lưu nếu muốn giữ bản hiện tại.')) return
    setBusy(true); setError('')
    try {
      if (file.size > (sourceMode === 'zip' ? 32 : 8) * 1024 * 1024) throw new Error('File vượt giới hạn: HTML 8 MB, ZIP 32 MB.')
      let source: TemplateSource
      if (sourceMode === 'zip') source = await readZipTemplateSource(file)
      else {
        const html = await file.text()
        if (/cdn\.tailwindcss\.com|@tailwindcss\/browser/.test(html)) {
          const result = await templateWorkspaceRequest(endpoint, { action: 'prepare-html', html }); source = result.source
        } else source = sourceFromHtml(html)
      }
      compileTemplateSource(source)
      setEditor(current => current && ({ ...current, source, template: { ...current.template, sourceType: sourceMode === 'zip' ? 'zip' : 'html' } })); setActiveFile(source.entryPath); setNotice(`Đã đọc ${file.name}. Chưa lưu hoặc thay trang bán khóa học.`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Không đọc được file.') }
    finally { setBusy(false) }
  }
  async function importUrl() {
    if (!editor || busy) return
    if (dirty && !window.confirm('Thay mã đang sửa bằng trang từ URL?')) return
    setBusy(true); setError('')
    try { const result = await templateWorkspaceRequest(endpoint, { action: 'import-url', url: sourceUrl.trim() }); compileTemplateSource(result.source); setEditor(current => current && ({ ...current, source: result.source, template: { ...current.template, sourceType: 'url' } })); setActiveFile(result.source.entryPath); setWarnings(result.warnings || []) }
    catch (error) { setError(error instanceof Error ? error.message : 'Không nhập được URL.') }
    finally { setBusy(false) }
  }
  async function formatCode() {
    const file = editor?.source.files.find(item => item.path === activeFile)
    if (!file || file.kind === 'asset' || busy) return
    setBusy(true); setError('')
    try {
      const prettier = await import('prettier/standalone')
      const plugins = await Promise.all([import('prettier/plugins/html'), import('prettier/plugins/postcss'), import('prettier/plugins/babel'), import('prettier/plugins/estree')])
      const content = await prettier.format(file.content, { parser: file.kind === 'html' ? 'html' : file.kind === 'css' ? 'css' : 'babel', plugins: plugins.map(plugin => plugin.default) })
      setEditor(current => current && ({ ...current, source: { ...current.source, files: current.source.files.map(item => item.path === activeFile ? { ...item, content } : item) } }))
    } catch (error) { setError(error instanceof Error ? error.message : 'Không định dạng được mã. Kiểm tra cú pháp.') }
    finally { setBusy(false) }
  }
  function addFile() {
    if (!editor || busy) return
    const path = window.prompt('Tên file mới (ví dụ styles.css hoặc main.js):')?.trim()
    if (!path) return
    if (!/^[\w@() .\/-]+\.(html?|css|m?js)$/i.test(path) || path.startsWith('/') || path.split('/').some(part => !part || part === '..' || part === '.')) { setError('Tên file HTML/CSS/JS không hợp lệ.'); return }
    if (editor.source.files.some(file => file.path === path)) { setError('Tên file đã tồn tại.'); return }
    const kind = /\.css$/i.test(path) ? 'css' : /\.m?js$/i.test(path) ? 'js' : 'html'
    setEditor({ ...editor, source: { ...editor.source, files: [...editor.source.files, { path, kind, content: '' }] } }); setActiveFile(path)
  }
  function leaveEditor() { if (busy || dirty && !window.confirm('Mã đang sửa chưa lưu. Rời trình chỉnh sửa?')) return; setEditor(null); setError(''); setCompileError(''); setNotice('') }
  const selectedFile = editor?.source.files.find(file => file.path === activeFile)
  const content = <>
    <div className="flex flex-wrap items-center justify-between gap-3">{editor ? <button type="button" onClick={leaveEditor} className={button}><ArrowLeft size={16} />Thư viện mẫu</button> : !embedded && <Link href={back} className="inline-flex min-h-11 items-center gap-2 text-sm text-brk-primary"><ArrowLeft size={16} />{courseSlug ? 'Trang bán khóa học' : 'Quản lý khóa học'}</Link>}<span className="text-xs text-gray-500">Mẫu chung và mẫu riêng được phân quyền độc lập.</span></div>
    <h1 className="text-2xl font-bold text-brk-primary">{editor ? `Chỉnh sửa mẫu: ${editor.template.name}` : 'Thư viện mẫu trang bán khóa học'}</h1>
    {courseSlug && !embedded && <p className="rounded-xl bg-brk-background p-3 text-sm">Đang chọn mẫu cho: <strong>{courseName}</strong></p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {!editor ? <>
      <div className="flex flex-wrap items-center justify-between gap-3"><nav aria-label="Nguồn mẫu" className="flex gap-2">{(['system', 'mine'] as const).map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`${button} ${tab === value ? 'bg-brk-background' : ''}`}>{value === 'system' ? 'Mẫu có sẵn' : 'Mẫu của tôi'}</button>)}</nav><div className="flex flex-wrap gap-2">{admin && <button type="button" onClick={() => openEditor({ template: { name: 'Mẫu chung mới', description: '', sourceType: 'html', scope: 'shared', published: false }, source: sourceFromHtml(starter) }, true)} className={button}><Plus size={17} />Thêm mẫu dùng chung</button>}<button type="button" onClick={() => { openEditor({ template: { name: 'Mẫu mới', description: '', sourceType: 'html', scope: 'private', published: false }, source: sourceFromHtml(starter) }, true); setPanel('code') }} className={button}><Code2 size={17} />Tạo từ code</button><button type="button" onClick={() => openEditor({ template: { name: 'Mẫu mới', description: '', sourceType: 'html', scope: 'private', published: false }, source: sourceFromHtml(starter) }, true)} className={`${baseButton} bg-brk-primary text-white`}><Plus size={17} />Nhập mẫu ngoài</button></div></div>
      <p className="rounded-xl bg-brk-background p-3 text-sm">{tab === 'system' ? 'Mẫu chung do admin cung cấp. Chọn mẫu chỉ tạo bản nháp cho khóa học.' : `Chỉ bạn nhìn thấy. Đã dùng ${templates.filter(item => item.scope === 'private').length}/${policy.maxPrivateTemplates} mẫu · Tối đa ${policy.maxTemplateMB} MB/mẫu, ${policy.maxPrivateMB} MB tổng.`}</p>
      {admin && <details className="rounded-xl border border-brk-outline bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">Hạn mức mẫu cá nhân</summary><div className="mt-3 grid gap-3 sm:grid-cols-3">{([{ key: 'maxPrivateTemplates', label: 'Số mẫu / tài khoản', min: 0, max: 3 }, { key: 'maxTemplateMB', label: 'MB / mẫu', min: 1, max: 8 }, { key: 'maxPrivateMB', label: 'Tổng MB / tài khoản', min: 1, max: 24 }] as const).map(item => <label key={item.key} className="text-sm">{item.label}<input type="number" min={item.min} max={item.max} value={policy[item.key]} onChange={event => setPolicy({ ...policy, [item.key]: Number(event.target.value) })} className={field} /></label>)}</div><button type="button" disabled={busy} onClick={() => void savePolicy()} className={`${button} mt-3`}>Lưu hạn mức</button><Link href="/tools/courses/templates/legacy" className="ml-3 text-xs text-brk-muted">Mở kho mẫu cũ của admin →</Link></details>}
      <div className="flex flex-wrap gap-3"><label className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-3" /><input aria-label="Tìm tên mẫu" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên mẫu…" className={`${field} pl-10`} /></label><button type="button" disabled={loading} onClick={() => void reload()} className={button}>Tải lại thư viện</button></div>
      {loading && <p role="status" className="text-sm">Đang tải thư viện…</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(item => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-brk-outline bg-white"><TemplatePreviewFrame src={previewUrl(item.id, item.sourceType === 'system')} thumbnail title={`Ảnh xem trước ${item.name}`} /><div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><h2 className="break-words font-bold">{item.name}</h2><span className="shrink-0 rounded-full bg-brk-background px-2 py-1 text-xs text-brk-primary">{item.scope === 'shared' ? item.published ? 'Mẫu chung' : 'Nháp · admin' : 'Riêng tư'}</span></div><p className="line-clamp-3 text-xs leading-5 text-gray-500">{item.description}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPreview({ id: item.id, name: item.name, system: item.sourceType === 'system' })} className={button}><Eye size={16} />Xem trước</button><button type="button" disabled={busy} onClick={() => item.sourceType === 'system' ? startCopy(item.id, item.name) : item.scope === 'shared' && !admin ? void copyShared(item.id) : void editTemplate(item.id)} className={button}>{item.sourceType === 'system' || item.scope === 'shared' && !admin ? 'Tạo bản sao để sửa' : 'Sửa mẫu'}</button>{courseSlug && <button type="button" disabled={busy} onClick={() => void apply(item.id, item.name, item.sourceType === 'system')} className={`${baseButton} bg-brk-primary text-white`}>Dùng mẫu</button>}</div>{(tab === 'mine' || admin && item.sourceType !== 'system') && <button type="button" disabled={busy} onClick={async () => { if (!window.confirm(`Xóa mẫu “${item.name}” khỏi thư viện? Các khóa đã dùng mẫu giữ nguyên.`)) return; setBusy(true); try { await templateWorkspaceRequest(endpoint, { action: 'delete', id: item.id }); await reload() } catch (error) { setError(error instanceof Error ? error.message : 'Không xóa được mẫu.') } finally { setBusy(false) } }} className="min-h-11 text-xs text-red-700">Xóa khỏi thư viện</button>}</div></article>)}</div>
      {!filtered.length && !loading && <p className="rounded-xl bg-white p-6 text-sm text-gray-500">Chưa có mẫu phù hợp. Nhập HTML/ZIP/URL hoặc tạo từ code.</p>}
      <div className="flex items-center justify-between gap-3 text-sm"><span>{filtered.length} mẫu · Trang {currentPage}/{totalPages}</span><div className="flex gap-2"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={button}>Trước</button><button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className={button}>Sau</button></div></div>
      <Link href={`/tools/courses/templates/legacy?${new URLSearchParams({ ...(courseSlug ? { course: courseSlug, name: courseName } : {}), ...(courseId > 0 ? { courseId: String(courseId) } : {}) }).toString()}`} className="min-h-11 text-sm text-brk-primary">Mở công cụ nhập và chọn từng khối nâng cao →</Link>
    </> : <>
      <nav className="flex flex-wrap gap-2" aria-label="Chỉnh sửa mẫu"><button type="button" onClick={() => setPanel('info')} aria-pressed={panel === 'info'} className={button}>Thông tin mẫu / Nhập nguồn</button><button type="button" onClick={() => setPanel('code')} aria-pressed={panel === 'code'} className={button}><Code2 size={17} />Sửa code</button></nav>
      <div className="flex gap-2 xl:hidden">{(['code', 'preview'] as const).map(value => <button key={value} type="button" onClick={() => setMobilePanel(value)} aria-pressed={mobilePanel === value} className={button}>{value === 'code' ? 'Code / Thông tin' : 'Xem trước'}</button>)}</div>
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <section className={`${mobilePanel === 'preview' ? 'hidden xl:block' : ''} min-w-0 rounded-2xl border border-brk-outline bg-white p-4`}>
          <div hidden={panel !== 'info'} className="space-y-4">{admin && <div className="rounded-xl bg-brk-background p-3 text-sm"><p>Kho lưu: {editor.template.scope === 'shared' ? 'Mẫu có sẵn (dùng chung)' : 'Mẫu của tôi (riêng tư)'}</p>{editor.template.scope === 'shared' && <label className="mt-2 flex min-h-11 items-center gap-2"><input type="checkbox" checked={editor.template.published || false} onChange={event => setEditor({ ...editor, template: { ...editor.template, published: event.target.checked } })} />Công khai trong Mẫu có sẵn</label>}</div>}<h2 className="text-lg font-bold">Thông tin và nguồn mẫu</h2><label className="block space-y-2 text-sm font-semibold">Tên mẫu<input value={editor.template.name} disabled={busy} onChange={event => setEditor({ ...editor, template: { ...editor.template, name: event.target.value } })} className={field} /></label><label className="block space-y-2 text-sm font-semibold">Mô tả ngắn<textarea value={editor.template.description} disabled={busy} onChange={event => setEditor({ ...editor, template: { ...editor.template, description: event.target.value } })} rows={3} className={`${field} py-3`} /></label><div className="flex gap-2">{(['html', 'zip', ...(admin ? ['url'] : [])] as ('html' | 'zip' | 'url')[]).map(mode => <button type="button" key={mode} disabled={busy} onClick={() => setSourceMode(mode)} aria-pressed={sourceMode === mode} className={button}>{mode.toUpperCase()}</button>)}</div>{sourceMode === 'url' ? <div className="space-y-3"><input aria-label="URL nguồn mẫu" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://…" className={field} /><button type="button" disabled={busy} onClick={() => void importUrl()} className={button}>Đọc URL để sửa</button></div> : <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-brk-outline p-4 text-sm" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void loadFile(event.dataTransfer.files[0]) }}><Upload size={28} />Kéo thả hoặc chọn file {sourceMode.toUpperCase()}<input type="file" disabled={busy} accept={sourceMode === 'zip' ? '.zip' : '.html,.htm'} onChange={event => { void loadFile(event.target.files?.[0]); event.target.value = '' }} className="max-w-full text-xs" /></label>}<p className="text-xs leading-5 text-gray-500">HTML tối đa 8 MB, ZIP tối đa 32 MB; mã và tài nguyên sau đọc tối đa 8 MB. Chỉnh code hoặc xem trước trước khi lưu.</p><label className="block space-y-2 text-sm">HTML chính<select value={editor.source.entryPath} disabled={busy} onChange={event => { setEditor({ ...editor, source: { ...editor.source, entryPath: event.target.value } }); setActiveFile(event.target.value) }} className={field}>{editor.source.files.filter(file => file.kind === 'html').map(file => <option key={file.path} value={file.path}>{file.path}</option>)}</select></label></div>
          <div hidden={panel !== 'code'} className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Mã nguồn</h2><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={addFile} className={button}>+ File</button><button type="button" disabled={busy || selectedFile?.kind === 'asset'} onClick={() => void formatCode()} className={button}>Định dạng</button></div></div><div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]"><nav aria-label="File mã nguồn" className="flex gap-1 overflow-auto sm:max-h-[28rem] sm:flex-col">{editor.source.files.map(file => <button key={file.path} type="button" disabled={busy} onClick={() => setActiveFile(file.path)} aria-pressed={activeFile === file.path} className={`min-h-10 shrink-0 rounded-lg px-2 text-left text-xs sm:break-all ${activeFile === file.path ? 'bg-brk-background font-semibold text-brk-primary' : 'hover:bg-gray-50'}`}>{file.path}</button>)}</nav><div className="min-w-0">{selectedFile?.kind === 'asset' ? <div className="rounded-xl bg-gray-50 p-4"><p className="mb-3 text-sm">Tài nguyên được giữ cùng mã nguồn.</p>{selectedFile.content.startsWith('data:image/') && <img src={selectedFile.content} alt={selectedFile.path} className="max-h-72 max-w-full object-contain" />}</div> : selectedFile && <CodeEditor key={selectedFile.path} value={selectedFile.content} language={selectedFile.kind} disabled={busy} onChange={content => setEditor(current => current && ({ ...current, source: { ...current.source, files: current.source.files.map(file => file.path === activeFile ? { ...file, content } : file) } }))} />}</div></div><p className="text-xs text-gray-500">Ctrl+F tìm kiếm · Ctrl+Z hoàn tác · Ctrl+Shift+Z làm lại.</p></div>
        </section>
        <section className={`${mobilePanel === 'code' ? 'hidden xl:block' : ''} min-w-0 space-y-3 rounded-2xl border border-brk-outline bg-white p-4`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Preview trực tiếp</h2><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={auto} onChange={event => setAuto(event.target.checked)} />Tự cập nhật</label></div><div className="flex flex-wrap gap-2">{[{ width: 1280, label: 'Máy tính' }, { width: 768, label: 'Tablet' }, { width: 390, label: 'Điện thoại' }].map(item => <button key={item.width} type="button" onClick={() => setDevice(item.width)} aria-pressed={device === item.width} className={button}>{item.label}</button>)}<button type="button" onClick={renderPreview} className={button}>Cập nhật</button></div>{compileError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{compileError} · Preview đang giữ bản hợp lệ gần nhất.</p>}{rendered ? <TemplatePreviewFrame html={rendered} width={device} /> : <p className="p-6 text-sm text-gray-500">Đang tạo preview…</p>}<p className="text-xs text-gray-500">Preview chỉ xem mẫu đang sửa; chưa thay đổi trang bán công khai.</p>{warnings.map(warning => <p key={warning} className="text-xs text-amber-700">{warning}</p>)}</section>
      </div>
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brk-outline bg-white p-4 shadow-lg"><span className={`text-sm ${dirty ? 'text-amber-700' : 'text-green-700'}`}>{busy ? 'Đang xử lý…' : dirty ? 'Có thay đổi chưa lưu' : editor.template.id ? 'Đã lưu mẫu' : 'Mã trang hiện tại · Chưa lưu thành mẫu'}</span><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void save(true)} className={button}>Lưu thành mẫu mới</button><button type="button" disabled={busy || !editor.template.name.trim()} onClick={() => void save()} className={`${baseButton} bg-brk-primary text-white`}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{editor.template.scope === 'shared' ? editor.template.published ? 'Công khai mẫu' : 'Lưu nháp mẫu chung' : 'Lưu mẫu'}</button>{courseSlug && <button type="button" disabled={busy || !editor.template.name.trim()} onClick={() => void save(false, true)} className={button}>Lưu và tạo bản nháp cho khóa</button>}</div></div>
    </>}
    <dialog ref={dialog} aria-label="Xem trước mẫu" onCancel={() => setPreview(null)} className="m-auto max-h-[95dvh] w-[calc(100%_-_1rem)] max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 backdrop:bg-black/50">{preview && <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{preview.copying ? 'Đang tạo bản HTML có thể sửa: ' : 'Xem trước: '}{preview.name}</h2><button type="button" onClick={() => setPreview(null)} className={button}><X size={16} />Đóng</button></div><div className="mb-3 flex flex-wrap gap-2">{[1280, 768, 390].map(width => <button type="button" key={width} onClick={() => setDevice(width)} className={button}>{width === 1280 ? 'Máy tính' : width === 768 ? 'Tablet' : 'Điện thoại'}</button>)}</div><TemplatePreviewFrame src={preview.page ? `/tools/courses/templates/preview?page=${encodeURIComponent(preview.id)}&token=${preview.token}` : previewUrl(preview.id, preview.system, preview.token)} width={device} exportToken={preview.token} onSource={copyBuiltin} />{preview.copying && <p className="mt-3 text-sm">Bản sao mở trong trình sửa khi mẫu tải xong. Nếu không phản hồi, đóng và thử lại.</p>}<div className="mt-4 flex flex-wrap gap-2"><Link href={preview.page ? `/tools/courses/templates/preview?page=${encodeURIComponent(preview.id)}` : previewUrl(preview.id, preview.system)} target="_blank" rel="noopener noreferrer" className={button}>Mở toàn màn hình ↗</Link>{courseSlug && !preview.copying && <button type="button" disabled={busy} onClick={() => void apply(preview.id, preview.name, preview.system)} className={`${baseButton} bg-brk-primary text-white`}>Dùng mẫu cho khóa này</button>}</div></>}</dialog>
  </>
  return embedded ? <div className="min-w-0 space-y-4">{content}</div> : <ManagementWorkspace active="courses">{content}</ManagementWorkspace>
}
