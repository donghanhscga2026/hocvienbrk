'use client'
import { useEffect, useState, type ComponentProps } from 'react'
import Link from 'next/link'
import { getCoursePages, getCoursePage, updateCoursePage } from '@/app/actions/course-page-actions'
import { getStoredCoursePageTemplateOptions } from '@/app/actions/course-page-template-actions'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import EditCoursePageForm from '@/app/tools/courses/pages/[id]/EditCoursePageForm'
import CourseTemplateWorkspace from './CourseTemplateWorkspace'
import TemplatePreviewFrame from './TemplatePreviewFrame'

type SavedPage = NonNullable<Awaited<ReturnType<typeof getCoursePage>>>
type Props = { slug: string; courseName: string; courseId?: number; canEdit: boolean; compact?: boolean; onOpen?: () => void; active?: boolean }
export default function CourseSalesPagePanel({ slug, courseName, courseId, canEdit, compact = false, onOpen, active = true }: Props) {
  const [page, setPage] = useState<SavedPage | null>(null), [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [revision, setRevision] = useState(0), [pane, setPane] = useState<'content' | 'code' | 'templates'>('content')
  const [workspace, setWorkspace] = useState<'code' | 'templates' | null>(null)
  const [contentDirty, setContentDirty] = useState(false), [codeDirty, setCodeDirty] = useState(false)
  useEffect(() => {
    if (compact && !active) return
    let cancelled = false
    Promise.all([getCoursePages(), canEdit ? getStoredCoursePageTemplateOptions() : Promise.resolve({ success: true, templates: [] })]).then(async ([pages, result]) => {
      if (!result.success) throw new Error('Không tải được thư viện mẫu.')
      const found = pages.find(item => item.slug === slug)
      const full = found && canEdit ? await getCoursePage(found.id) : null
      if (found && canEdit && !full) throw new Error('Không tải được nội dung trang bán. Hãy tải lại trước khi chỉnh sửa.')
      if (cancelled) return
      setPage(full || (found ? { ...found, sections: [] } as SavedPage : null)); setTemplates(result.templates || []); setReady(true)
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Không tải được trang bán khóa học.') })
    return () => { cancelled = true }
  }, [slug, canEdit, revision, compact, active])
  async function toggle() {
    if (!page || !canEdit || busy) return
    setBusy(true); setError('')
    try { const result = await updateCoursePage(page.id, { useTemplate: !page.useTemplate }); if (!result.success) throw new Error(result.error); setPage({ ...page, useTemplate: !page.useTemplate }) }
    catch (error) { setError(error instanceof Error ? error.message : 'Không đổi được giao diện.') }
    finally { setBusy(false) }
  }
  function choose(next: 'content' | 'code' | 'templates') {
    setError('')
    if (next === 'code' && contentDirty) { setError('Lưu bản nháp nội dung trước khi mở mã của trang hiện tại.'); return }
    if (next !== 'content' && workspace && next !== workspace && codeDirty && !window.confirm('Mã đang sửa chưa lưu. Bỏ bản đang sửa để mở khu vực khác?')) return
    if (next !== 'content') { setWorkspace(next); if (next !== workspace) setCodeDirty(false) }
    setPane(next)
  }
  const seo = page?.seo as { templateKey?: string; storedTemplateId?: string } | null
  const name = templates.find(item => item.id === seo?.storedTemplateId)?.name || COURSE_TEMPLATE_LIBRARY.find(item => item.key === seo?.templateKey)?.name || (page ? 'Mẫu đã tùy chỉnh của khóa học' : 'Chưa chọn mẫu')
  const button = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-brk-outline bg-white px-3 text-sm font-semibold text-brk-primary'
  const preview = page && canEdit ? <TemplatePreviewFrame src={`/tools/courses/templates/preview?page=${encodeURIComponent(page.id)}`} thumbnail title={`Mẫu đang lưu: ${name}`} /> : <p className="rounded-xl bg-brk-background p-4 text-sm text-brk-muted">{ready ? 'Chưa có mẫu xem trước.' : 'Đang tải giao diện…'}</p>
  if (compact) return <section className="space-y-3 rounded-2xl border border-brk-outline bg-white p-4"><h2 className="font-bold">Trang bán khóa học</h2>{preview}<p className="text-sm font-semibold">{name}</p><p className="text-xs text-brk-muted">{page?.status === 'published' && page.useTemplate ? 'Đang sử dụng trang mẫu' : 'Đang sử dụng trang mặc định'}</p>{page && <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={page.useTemplate} disabled={!canEdit || busy || !ready} onChange={() => void toggle()} />Dùng mẫu khi đã xuất bản</label>}<button type="button" onClick={onOpen} className={button}>Chỉnh sửa / Đổi mẫu →</button>{page && canEdit && <Link href={`/tools/courses/templates/preview?page=${page.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs text-brk-primary">Xem trước toàn màn hình ↗</Link>}{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</section>
  return <section className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brk-outline bg-white p-4"><div><h2 className="font-bold">Trang bán khóa học</h2><p className="mt-1 text-xs text-brk-muted">{courseName} · {name}</p></div><div className="flex flex-wrap gap-2">{canEdit && <><button type="button" aria-pressed={pane === 'content'} onClick={() => choose('content')} className={button}>Sửa nội dung & Cài đặt</button><button type="button" aria-pressed={pane === 'code'} disabled={!page || !ready} onClick={() => choose('code')} className={button}>Sửa code</button><button type="button" aria-pressed={pane === 'templates'} onClick={() => choose('templates')} className={button}>{page ? 'Đổi mẫu' : 'Chọn mẫu'}</button></>}<Link href={`/khoa-hoc/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" className={button}>Xem trang công khai ↗</Link></div></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!ready && !error && <p role="status" className="p-5 text-sm">Đang tải trang bán…</p>}
    {ready && canEdit && page && <div hidden={pane !== 'content'}><EditCoursePageForm key={page.id + ':' + revision} initialPage={page as ComponentProps<typeof EditCoursePageForm>['initialPage']} embedded onDirtyChange={setContentDirty} onEditCode={() => choose('code')} onSaved={() => { setReady(false); setRevision(value => value + 1) }} /></div>}
    {ready && canEdit && !page && pane === 'content' && <div className="rounded-xl bg-white p-5"><p className="text-sm text-brk-muted">Khóa học đang dùng trang mặc định. Chọn mẫu để bắt đầu chỉnh nội dung hoặc mã.</p><button type="button" onClick={() => choose('templates')} className={button}>Chọn mẫu</button></div>}
    {canEdit && workspace && <div hidden={pane === 'content'}><CourseTemplateWorkspace key={workspace + ':' + revision} embedded context={{ slug, name: courseName, courseId }} startPageId={workspace === 'code' ? page?.id : undefined} onDirtyChange={setCodeDirty} onApplied={() => { setReady(false); setContentDirty(false); setCodeDirty(false); setRevision(value => value + 1); setWorkspace(null); setPane('content') }} /></div>}
    {!canEdit && <div className="rounded-xl border border-brk-outline bg-white p-5">{preview}<p className="mt-3 text-sm text-brk-muted">Chỉnh trang bán hiện dành cho quản trị viên.</p></div>}
  </section>
}
