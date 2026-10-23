'use client'
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Code2, Eye, LayoutTemplate, Palette, Search, FileText } from 'lucide-react'
import { getCoursePages, getCoursePage, updateCoursePage, publishCoursePage } from '@/app/actions/course-page-actions'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import { templateWorkspaceRequest } from '@/lib/course-page/template-workspace-client'
import type { CourseEditorControls } from '@/lib/course-page/editor-controls'
import EditCoursePageForm from '@/app/tools/courses/pages/[id]/EditCoursePageForm'
import CourseTemplateWorkspace from './CourseTemplateWorkspace'
import TemplatePreviewFrame from './TemplatePreviewFrame'

type SavedPage = NonNullable<Awaited<ReturnType<typeof getCoursePage>>>
type Props = { slug: string; courseName: string; courseId?: number; canEdit: boolean; compact?: boolean; onOpen?: () => void; active?: boolean }
type Step = 1 | 2 | 3
type Pane = 'overview' | 'content' | 'design' | 'settings' | 'code'
const steps = ['Chọn giao diện', 'Chỉnh sửa trang', 'Kiểm tra & xuất bản'] as const
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary disabled:opacity-40'
const primary = button + ' !bg-brk-primary !text-white'
const card = 'rounded-2xl border border-brk-outline bg-white p-4 sm:p-6'

export default function CourseSalesPagePanel({ slug, courseName, courseId, canEdit, compact = false, onOpen, active = true }: Props) {
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [page, setPage] = useState<SavedPage | null>(null), [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false), [editorBusy, setEditorBusy] = useState(false), [codeBusy, setCodeBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [step, setStep] = useState<Step | null>(null), [pane, setPane] = useState<Pane>('overview')
  const [source, setSource] = useState<'preset' | 'code'>('preset'), [preset, setPreset] = useState<string>(COURSE_TEMPLATE_LIBRARY[0].key)
  const [formRevision, setFormRevision] = useState(0), [codeSession, setCodeSession] = useState(0), [codeOpened, setCodeOpened] = useState(false)
  const [formOpened, setFormOpened] = useState(false)
  const [contentDirty, setContentDirty] = useState(false), [codeDirty, setCodeDirty] = useState(false)
  const [device, setDevice] = useState(1280), [checks, setChecks] = useState<Record<string, boolean>>({})
  const [presetPreview, setPresetPreview] = useState(false)
  const form = useRef<CourseEditorControls | null>(null), code = useRef<CourseEditorControls | null>(null)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dirty = contentDirty || codeDirty, locked = busy || editorBusy || codeBusy
  const codePage = page?.sections.some(section => section.variant === 'zip-source-v1') === true
  const name = codePage ? 'Code riêng' : COURSE_TEMPLATE_LIBRARY.find(item => item.key === (page?.seo as { templateKey?: string } | null)?.templateKey)?.name || (page ? 'Giao diện đã tùy chỉnh' : 'Chưa chọn giao diện')
  const fetchPage = useCallback(async () => {
    const pages = await getCoursePages(), found = pages.find(item => item.slug === slug)
    const full = found && canEdit ? await getCoursePage(found.id) : null
    if (found && canEdit && !full) throw new Error('Không tải được nội dung trang bán. Hãy thử lại trước khi chỉnh sửa.')
    return full || (found ? { ...found, sections: [] } as SavedPage : null)
  }, [slug, canEdit])
  useEffect(() => {
    if (compact && !active) return
    let cancelled = false
    setReady(false); setError('')
    fetchPage().then(saved => {
      if (cancelled) return
      setPage(saved); setReady(true)
      const hasCode = saved?.sections.some(section => section.variant === 'zip-source-v1') === true
      setStep(saved ? 2 : 1); setSource(hasCode ? 'code' : 'preset'); setPane(hasCode ? 'code' : 'overview')
      setCodeOpened(hasCode); setFormOpened(false); setContentDirty(false); setCodeDirty(false); setChecks({})
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Không tải được trang bán khóa học.') })
    return () => { cancelled = true }
  }, [fetchPage, compact, active, loadAttempt])
  useEffect(() => { if (presetPreview) dialog.current?.showModal(); else dialog.current?.close() }, [presetPreview])

  useEffect(() => {
    if (!ready) return
    stepHeading.current?.focus({ preventScroll: true })
    stepHeading.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }, [step, ready])

  async function toggle() {
    if (!page || !canEdit || locked) return
    setBusy(true); setError('')
    try {
      const result = await updateCoursePage(page.id, { useTemplate: !page.useTemplate })
      if (!result.success) throw new Error(result.error)
      setPage({ ...page, useTemplate: !page.useTemplate })
    } catch (error) { setError(error instanceof Error ? error.message : 'Không đổi được giao diện.') }
    finally { setBusy(false) }
  }
  // Chuyển bước không tự công khai. Lưu thất bại phải giữ nguyên màn hình và mã đang sửa.
  async function saveCurrent() {
    if (!canEdit || locked) return false
    if (!dirty && page) return true
    setBusy(true); setError(''); setNotice('')
    try {
      const controller = codeDirty || pane === 'code' && !page ? code.current : form.current
      if (!controller || !await controller.save()) {
        setError('Chưa lưu được bản nháp. Kiểm tra thông báo trong phần đang sửa rồi thử lại.')
        return false
      }
      const saved = await fetchPage()
      if (!saved) throw new Error('Chưa tìm thấy bản nháp vừa lưu. Hãy tải lại trước khi xuất bản.')
      setPage(saved); setContentDirty(false); setCodeDirty(false); setChecks({})
      setFormRevision(value => value + 1)
      if (contentDirty && codeOpened) setCodeSession(value => value + 1)
      setNotice('Đã lưu bản nháp. Trang công khai chưa thay đổi.')
      return true
    } catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được bản nháp.'); return false }
    finally { setBusy(false) }
  }
  function choosePane(next: Pane) {
    if (locked) return
    setError('')
    if (next === 'code' && contentDirty || next !== 'code' && next !== 'overview' && codeDirty) {
      setError('Hãy lưu bản nháp trước khi chuyển giữa sửa nội dung và sửa code.'); return
    }
    setPane(next)
    if (['content', 'design', 'settings'].includes(next)) setFormOpened(true)
    if (next === 'code') setCodeOpened(true)
  }
  async function goStep(next: Step) {
    if (locked || !canEdit || !ready) return
    setError(''); setNotice('')
    if (next === 1 && dirty) { setError('Hãy lưu bản nháp trước khi đổi giao diện.'); return }
    if (next === 3) {
      if (!page && !codeOpened) { setError('Chọn giao diện và lưu bản nháp trước khi kiểm tra.'); return }
      if (!await saveCurrent()) return
    }
    if (next === 2 && !page && !codeOpened) { setError('Hãy chọn giao diện ở bước 1 để tiếp tục.'); return }
    setStep(next)
  }
  async function startEditing() {
    if (locked || !canEdit || !ready) return
    if (dirty) { setError('Lưu bản nháp đang sửa trước khi thay giao diện.'); return }
    setError(''); setNotice('')
    if (source === 'code') {
      setCodeOpened(true); setCodeSession(value => value + 1); setPane('code'); setStep(2); return
    }
    const selected = COURSE_TEMPLATE_LIBRARY.find(item => item.key === preset)
    if (!selected) return
    if (page && !window.confirm('Thay giao diện trong bản nháp bằng mẫu “' + selected.name + '”? Nội dung nháp hiện tại sẽ được thay. Trang công khai được giữ tới khi xuất bản.')) return
    setBusy(true)
    try {
      await templateWorkspaceRequest('/api/course-templates', { action: 'apply', id: selected.key, system: true, slug, name: courseName })
      const saved = await fetchPage()
      if (!saved) throw new Error('Chưa đọc được bản nháp. Hãy thử tải lại.')
      setPage(saved); setCodeOpened(false); setCodeBusy(false); setCodeDirty(false); setContentDirty(false)
      setFormRevision(value => value + 1); setFormOpened(false); setPane('overview'); setStep(2); setChecks({})
      setNotice('Đã chọn giao diện. Tiếp theo, chỉnh nội dung cho khóa học của bạn.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không chọn được giao diện.') }
    finally { setBusy(false) }
  }
  async function publish() {
    if (!page || !canEdit || locked || dirty || step !== 3) return
    if (!window.confirm('Xuất bản bản nháp hiện tại lên trang công khai?')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await publishCoursePage(page.id)
      if (!result.success) throw new Error(result.error)
      setPage({ ...page, status: 'published', useTemplate: true })
      setNotice('Đã xuất bản trang thành công. Bạn có thể mở trang công khai để xem.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Không xuất bản được trang. Bản nháp vẫn được giữ.') }
    finally { setBusy(false) }
  }
  const preview = page && canEdit ? <TemplatePreviewFrame src={'/tools/courses/templates/preview?page=' + encodeURIComponent(page.id)} thumbnail title={'Giao diện đang lưu: ' + name} /> : <p className="rounded-xl bg-brk-background p-4 text-sm text-brk-muted">{ready ? 'Chưa có giao diện xem trước.' : 'Đang tải giao diện…'}</p>
  if (compact) return <section className="space-y-3 rounded-2xl border border-brk-outline bg-white p-4">
    <h2 className="font-bold">Trang bán khóa học</h2>{preview}<p className="text-sm font-semibold">{name}</p>
    <p className="text-xs text-brk-muted">{page?.status === 'published' && page.useTemplate ? 'Trang đang công khai' : page ? 'Đang có bản nháp' : 'Chưa thiết lập trang bán'}</p>
    {page && <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={page.useTemplate} disabled={!canEdit || locked || !ready} onChange={() => void toggle()} />Dùng mẫu khi đã xuất bản</label>}
    <button type="button" onClick={onOpen} className={button}>{page ? 'Chỉnh sửa trang bán' : 'Thiết lập trang bán'}</button>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </section>

  return <section aria-label="Thiết lập trang bán khóa học" className="min-w-0 space-y-4">
    <header className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-xs text-brk-muted">{courseName}</p><h2 className="text-xl font-bold text-brk-primary">Trang bán khóa học</h2></div>
        <span className="rounded-full bg-brk-background px-3 py-1 text-xs">{page?.status === 'published' && page.useTemplate ? 'Trang đang công khai' : page ? 'Bản nháp' : ready ? 'Chưa thiết lập' : 'Đang tải…'}</span>
      </div>
      {canEdit && <nav aria-label="Các bước thiết lập trang bán" className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">{steps.map((label, index) => {
        const value = index + 1 as Step
        return <button type="button" key={label} aria-current={step === value ? 'step' : undefined} disabled={!ready || locked} onClick={() => void goStep(value)} className={'flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-center text-xs sm:flex-row sm:text-sm ' + (step === value ? 'bg-brk-background font-bold text-brk-primary' : 'text-brk-muted')}>
          <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' + (step === value ? 'bg-brk-primary text-white' : 'bg-gray-100')}>{step !== null && value < step ? <Check size={16} /> : value}</span>{label}
        </button>
      })}</nav>}
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {!ready && (error ? <button type="button" onClick={() => setLoadAttempt(value => value + 1)} className={button}>Tải lại trang bán</button> : <p role="status" className="p-5 text-sm">Đang tải trang bán…</p>)}
    {!canEdit && ready && <div className={card}>{preview}<p className="mt-3 text-sm text-brk-muted">Bạn chưa có quyền chỉnh trang bán của khóa học này.</p></div>}

    {ready && canEdit && step === 1 && <div className={card}>
      <h3 ref={stepHeading} tabIndex={-1} className="scroll-mt-20 text-lg font-bold outline-none">Bắt đầu bằng cách chọn giao diện</h3>
      <p className="mt-2 text-sm text-brk-muted">{page ? 'Đổi giao diện sẽ thay nội dung bản nháp. Trang công khai chỉ đổi khi xuất bản.' : 'Chọn cách phù hợp để tạo trang bán cho khóa học.'}</p>
      <fieldset disabled={locked} className="mt-5 grid gap-4 md:grid-cols-2"><legend className="sr-only">Cách tạo giao diện</legend>
        <label className={'cursor-pointer rounded-xl border p-5 ' + (source === 'preset' ? 'border-brk-primary bg-brk-background' : 'border-brk-outline')}>
          <span className="flex items-center gap-3"><input type="radio" name={'sales-source-' + slug} value="preset" checked={source === 'preset'} onChange={() => setSource('preset')} /><LayoutTemplate size={24} /><strong>Dùng mẫu có sẵn</strong></span>
          <span className="mt-3 block text-sm text-brk-muted">Thay nội dung, hình ảnh và màu sắc. Không cần biết code.</span>
        </label>
        <label className={'cursor-pointer rounded-xl border p-5 ' + (source === 'code' ? 'border-brk-primary bg-brk-background' : 'border-brk-outline')}>
          <span className="flex items-center gap-3"><input type="radio" name={'sales-source-' + slug} value="code" checked={source === 'code'} onChange={() => setSource('code')} /><Code2 size={24} /><strong>Dùng code riêng</strong></span>
          <span className="mt-3 block text-sm text-brk-muted">Dán HTML, CSS và JavaScript cho riêng khóa học này.</span>
        </label>
      </fieldset>
      {source === 'preset' && <div className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 space-y-2 text-sm font-semibold"><span>Chọn mẫu</span><select aria-label="Chọn mẫu giao diện" value={preset} disabled={locked} onChange={event => setPreset(event.target.value)} className="min-h-11 w-full rounded-xl border border-brk-outline bg-white px-3">{COURSE_TEMPLATE_LIBRARY.map(item => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label><button type="button" disabled={locked} onClick={() => setPresetPreview(true)} className={button}><Eye size={16} />Xem trước mẫu</button></div>}
    </div>}

    {ready && canEdit && step === 2 && <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 ref={stepHeading} tabIndex={-1} className="scroll-mt-20 text-lg font-bold outline-none">Hoàn thiện trang của bạn</h3><p className="mt-1 text-sm text-brk-muted">Giao diện hiện tại: {name}</p></div>{pane !== 'overview' && <button type="button" disabled={locked} onClick={() => choosePane('overview')} className={button}><ArrowLeft size={16} />Các mục chỉnh sửa</button>}</div>
      {pane === 'settings' && page && <button type="button" disabled={locked} onClick={() => void form.current?.history?.()} className="mt-3 min-h-11 text-sm text-brk-primary">Lịch sử bản đã lưu</button>}
      {pane === 'overview' && <div className="mt-5 space-y-3">
        {(codePage ? [{ pane: 'code' as Pane, title: 'Sửa code', detail: 'Sửa HTML, CSS và JavaScript của trang.', Icon: Code2 }] : [{ pane: 'content' as Pane, title: 'Nội dung', detail: 'Sửa tiêu đề, mô tả, hình ảnh và các phần trên trang.', Icon: FileText }, { pane: 'design' as Pane, title: 'Màu sắc & bố cục', detail: 'Đổi màu giao diện; sắp xếp các phần tại mục Nội dung.', Icon: Palette }]).concat([{ pane: 'settings', title: 'Thông tin & SEO', detail: 'Tên trang, mô tả tìm kiếm và cài đặt đăng ký.', Icon: Search }]).map(item => <button type="button" disabled={locked} key={item.pane} aria-label={"Mở " + item.title} onClick={() => choosePane(item.pane)} className="flex min-h-20 w-full items-center gap-4 rounded-xl border border-brk-outline p-4 text-left disabled:opacity-40"><item.Icon size={23} className="shrink-0 text-brk-primary" /><span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-brk-muted">{item.detail}</span></span><span className="text-sm text-brk-primary">Mở →</span></button>)}
        {!codePage && <button type="button" disabled={locked} onClick={() => choosePane('code')} className="min-h-11 text-sm text-brk-primary">Tùy chỉnh bằng code riêng</button>}
      </div>}
    </div>}

    {/* Giữ bộ chỉnh sửa đang mở khi chuyển mục để không mất dữ liệu chưa lưu. */}
    {ready && canEdit && page && formOpened && <div hidden={step !== 2 || !['content', 'design', 'settings'].includes(pane)}>
      <EditCoursePageForm key={page.id + ':' + formRevision} initialPage={page as ComponentProps<typeof EditCoursePageForm>['initialPage']} embedded workflow disabled={busy} controls={form} onDirtyChange={setContentDirty} onBusyChange={setEditorBusy} panel={pane === 'design' ? 'theme' : pane === 'settings' ? 'info' : 'sections'} />
    </div>}
    {ready && canEdit && codeOpened && <div hidden={step !== 2 || pane !== 'code'}>
      <CourseTemplateWorkspace key={slug + ':' + codeSession} embedded workflow disabled={busy} controls={code} context={{ slug, name: courseName, courseId }} startCode startPageId={page?.id} onDirtyChange={setCodeDirty} onBusyChange={setCodeBusy} />
    </div>}

    {ready && canEdit && step === 3 && page && <div className={card}>
      <h3 ref={stepHeading} tabIndex={-1} className="scroll-mt-20 text-lg font-bold outline-none">Kiểm tra trước khi công khai</h3>
      <p className="mt-2 text-sm text-brk-muted">Bạn đang xem bản nháp đã lưu. Chỉ cập nhật website khi bấm Xuất bản.</p>
      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="min-w-0 space-y-3"><div className="flex flex-wrap gap-2">{[{ width: 1280, label: 'Máy tính' }, { width: 768, label: 'Tablet' }, { width: 390, label: 'Điện thoại' }].map(item => <button type="button" key={item.width} aria-pressed={device === item.width} onClick={() => setDevice(item.width)} className={button}>{item.label}</button>)}</div><TemplatePreviewFrame key={formRevision} src={'/tools/courses/templates/preview?page=' + encodeURIComponent(page.id)} width={device} /></div>
        <div className="space-y-4"><p className="rounded-xl bg-brk-background p-3 text-sm"><Check size={16} className="mr-2 inline" />Bản nháp đã được lưu</p><h4 className="font-semibold">Gợi ý tự kiểm tra</h4>{['Nội dung và hình ảnh', 'Giao diện điện thoại', 'Nút đăng ký khóa học', 'Thông tin SEO'].map(label => <label key={label} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={checks[label] || false} onChange={event => setChecks(current => ({ ...current, [label]: event.target.checked }))} />{label}</label>)}<p className="text-xs leading-5 text-brk-muted">Các dấu tích do bạn tự đánh giá, không phải kết quả kiểm tra tự động.</p><button type="button" disabled={locked} onClick={() => { setStep(2); choosePane('settings') }} className={button}>Sửa thông tin & SEO</button><Link href={'/tools/courses/templates/preview?page=' + encodeURIComponent(page.id)} target="_blank" rel="noopener noreferrer" className={button}>Xem trước toàn màn hình ↗</Link></div>
      </div>
    </div>}

    {ready && canEdit && <footer className="sticky bottom-0 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brk-outline bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">{step !== 1 ? <button type="button" disabled={locked} onClick={() => void goStep(step === 3 ? 2 : 1)} className={button}><ArrowLeft size={16} />{step === 3 ? 'Quay lại chỉnh sửa' : 'Quay lại'}</button> : page && <button type="button" disabled={locked} onClick={() => void goStep(2)} className={button}>Giữ giao diện hiện tại</button>}<span role="status" className="text-xs text-brk-muted">{locked ? 'Đang xử lý…' : dirty ? 'Có thay đổi chưa lưu' : 'Bước ' + step + ' / 3'}</span></div>
      <div className="flex flex-wrap gap-2">{step === 2 && <><button type="button" disabled={locked || !dirty} onClick={() => void saveCurrent()} className={button}>Lưu nháp</button><button type="button" disabled={locked} onClick={() => void goStep(3)} className={primary}>{dirty ? 'Lưu & tiếp tục kiểm tra' : 'Tiếp tục kiểm tra'}<ArrowRight size={16} /></button></>}{step === 1 && <button type="button" disabled={locked} onClick={() => void startEditing()} className={primary}>{source === 'preset' ? 'Chọn mẫu & tiếp tục' : 'Tiếp tục dán code'}<ArrowRight size={16} /></button>}{step === 3 && <button type="button" disabled={locked || dirty || !page} onClick={() => void publish()} className={primary}>Xuất bản trang</button>}</div>
    </footer>}
    {ready && page?.status === 'published' && page.useTemplate && <Link href={'/khoa-hoc/' + encodeURIComponent(slug)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-brk-primary">Xem trang công khai ↗</Link>}
    <dialog ref={dialog} aria-label="Xem trước mẫu có sẵn" onCancel={() => setPresetPreview(false)} className="m-auto max-h-[95dvh] w-[calc(100%_-_1rem)] max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 backdrop:bg-black/50">{presetPreview && <><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold">Xem trước mẫu</h3><button type="button" onClick={() => setPresetPreview(false)} className={button}>Đóng</button></div><TemplatePreviewFrame src={'/tools/courses/templates/preview?system=' + encodeURIComponent(preset)} /></>}</dialog>
  </section>
}
