'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCoursePages, updateCoursePage } from '@/app/actions/course-page-actions'
import { getStoredCoursePageTemplateOptions } from '@/app/actions/course-page-template-actions'
import { COURSE_TEMPLATE_LIBRARY } from '@/lib/course-page/templates'
import TemplatePreviewFrame from './TemplatePreviewFrame'

type Page = { id: string; slug: string; useTemplate: boolean; status: string; seo: unknown }
export default function CourseSalesPagePanel({ slug, courseName, courseId, canEdit }: { slug: string; courseName: string; courseId?: number; canEdit: boolean }) {
  const [page, setPage] = useState<Page | null>(null), [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    setReady(false); setError('')
    Promise.all([getCoursePages(), canEdit ? getStoredCoursePageTemplateOptions() : Promise.resolve({ success: true, templates: [] })]).then(([pages, result]) => {
      if (cancelled) return
      if (!result.success) throw new Error('Không tải được thư viện mẫu.')
      setPage(pages.find(item => item.slug === slug) as Page || null); setTemplates(result.templates || []); setReady(true)
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Không tải được trang bán khóa học.') })
    return () => { cancelled = true }
  }, [slug, canEdit])
  async function toggle() {
    if (!page || !canEdit || busy) return
    setBusy(true); setError('')
    try { const result = await updateCoursePage(page.id, { useTemplate: !page.useTemplate }); if (!result.success) throw new Error(result.error); setPage({ ...page, useTemplate: !page.useTemplate }) }
    catch (error) { setError(error instanceof Error ? error.message : 'Không đổi được giao diện.') }
    finally { setBusy(false) }
  }
  const seo = page?.seo as { templateKey?: string; storedTemplateId?: string } | null
  const name = templates.find(item => item.id === seo?.storedTemplateId)?.name || COURSE_TEMPLATE_LIBRARY.find(item => item.key === seo?.templateKey)?.name || (page ? 'Mẫu đã tùy chỉnh của khóa học' : 'Chưa chọn mẫu')
  const query = new URLSearchParams({ course: slug, name: courseName }); if (courseId) query.set('courseId', String(courseId))
  const library = `/tools/courses/templates?${query}`
  const button = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary'
  return <section className="space-y-5 rounded-2xl border border-brk-outline bg-white p-4 sm:p-6">
    <div><h2 className="text-xl font-bold">Trang bán khóa học</h2><p className="mt-2 text-sm text-gray-500">{courseName} · /khoa-hoc/{slug}</p></div>
    <p className="text-sm leading-6 text-gray-600">Xem mẫu trước khi chọn. Mở thư viện để nhập HTML/ZIP/URL, sửa code và preview trực tiếp; lưu mẫu trước khi dùng cho khóa học.</p>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-xl border border-brk-outline">{page && canEdit ? <TemplatePreviewFrame src={`/tools/courses/templates/preview?page=${encodeURIComponent(page.id)}`} thumbnail title={`Mẫu đang lưu: ${name}`} /> : <div className="flex min-h-52 items-center justify-center bg-brk-background p-6 text-sm text-gray-500">{ready ? 'Chọn mẫu để xem giao diện tại đây' : 'Đang tải giao diện…'}</div>}</div>
      <div className="space-y-4"><div><p className="text-xs text-gray-500">Mẫu đang lưu cho khóa học</p><h3 className="mt-1 font-bold">{name}</h3></div><p className="text-sm">Giao diện công khai: <strong>{page?.useTemplate && page.status === 'published' ? 'Đang dùng trang mẫu' : 'Trang khóa học mặc định'}</strong></p>{page && <p className="text-xs text-gray-500">Trang mẫu: {page.status === 'published' ? 'Đã xuất bản' : page.status === 'archived' ? 'Đã lưu trữ' : 'Bản nháp'}. Preview hiển thị bản nội dung đang lưu.</p>}
        {page && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={page.useTemplate} disabled={!canEdit || busy || !ready} onChange={() => void toggle()} className="h-5 w-5 accent-green-700" />Dùng trang mẫu khi đã xuất bản</label>}
        {canEdit && <div className="flex flex-wrap gap-2"><Link href={library} className={`${button} bg-brk-primary text-white`}>{page ? 'Đổi mẫu / Xem thư viện' : 'Chọn mẫu'}</Link><Link href={`${library}&mode=import`} className={button}>Nhập mẫu ngoài / Sửa code</Link>{page && <Link href={`/tools/courses/pages/${page.id}`} className={button}>Chỉnh nội dung của khóa</Link>}</div>}
      </div>
    </div>
    <Link href={`/khoa-hoc/${encodeURIComponent(slug)}`} target="_blank" rel="noopener noreferrer" className={button}>Xem trang công khai ↗</Link>
    {!canEdit && <p className="text-sm text-gray-500">Thay mẫu và chỉnh trang bán hiện dành cho quản trị viên.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>
}
