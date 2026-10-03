'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import HomeAreaLink from './HomeAreaLink'
import { LayoutGrid, List } from 'lucide-react'
import CourseCard from '@/components/course/CourseCard'
import { CourseListRow } from '@/components/home/CourseCatalog'
import { CatalogCourse, CatalogEnrollment, EMPTY_CATALOG_FILTERS, STATUS_LABELS, catalogStatus, filterCatalog } from '@/lib/course-catalog'

interface Props {
  learning: CatalogCourse[]; teaching: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment>
  userPhone: string | null; userId: number | null; profileSlug?: string | null
  canDiscover?: boolean
}

export default function PersonalCourses({ learning, teaching, enrollments, userPhone, userId, profileSlug, canDiscover = true }: Props) {
  const [tab, setTab] = useState<'learning' | 'teaching'>(learning.length || !teaching.length ? 'learning' : 'teaching')
  const [status, setStatus] = useState(() => ['active', 'pending', 'completed'].find(value => learning.some(course => catalogStatus(enrollments[course.id]) === value)) || '')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'list' | 'gallery'>('list')
  const [limit, setLimit] = useState(6)
  const tabs = useRef<HTMLDivElement>(null)
  const selectedTab = tab === 'teaching' && teaching.length ? 'teaching' : 'learning'
  const results = filterCatalog(selectedTab === 'learning' ? learning : teaching, enrollments, { ...EMPTY_CATALOG_FILTERS, query, status: selectedTab === 'learning' ? status : '' })
  const selectTab = (next: 'learning' | 'teaching') => { setTab(next); setQuery(''); setLimit(6) }
  const availableTabs = [{ value: 'learning' as const, label: 'Tôi đang học', count: learning.length }, ...(teaching.length ? [{ value: 'teaching' as const, label: 'Tôi giảng dạy', count: teaching.length }] : [])]

  return <section id="my-courses" aria-label="Không gian của tôi" className="scroll-mt-40 min-w-0 rounded-2xl border border-brk-primary/20 bg-brk-background p-4 sm:p-6">
    <h2 className="text-2xl font-bold text-brk-on-surface">Không gian của tôi</h2>
    <p className="mt-2 text-sm text-brk-muted">Các khóa bạn tham gia hoặc phụ trách trên trang này.</p>
    <div ref={tabs} role="tablist" aria-label="Vai trò của tôi" className="mt-5 flex flex-wrap gap-2">
      {availableTabs.map(({ value, label, count }, index) => <button type="button" key={value} id={`my-${value}-tab`} role="tab" aria-selected={selectedTab === value} aria-controls="my-course-panel" tabIndex={selectedTab === value ? 0 : -1} onClick={() => selectTab(value)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? availableTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + availableTabs.length) % availableTabs.length
        selectTab(availableTabs[next].value)
        tabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
      }} className={`min-h-12 rounded-xl px-4 text-sm font-semibold ${selectedTab === value ? 'bg-brk-primary text-brk-on-primary' : 'border border-brk-outline bg-brk-surface text-brk-on-surface'}`}>{label} ({count})</button>)}
    </div>
    <div id="my-course-panel" role="tabpanel" aria-labelledby={`my-${selectedTab}-tab`} className="mt-4 min-w-0">
      {selectedTab === 'learning' ? <div role="group" aria-label="Trạng thái khóa của tôi" className="mb-4 flex flex-wrap gap-2">
        {[{ value: '', label: 'Tất cả' }, ...['active', 'pending', 'completed'].map(value => ({ value, label: STATUS_LABELS[value] }))].map(({ value, label }) => <button type="button" key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setLimit(6) }} className={`min-h-11 rounded-full px-3 text-sm ${status === value ? 'bg-brk-surface font-semibold text-brk-primary ring-1 ring-brk-primary' : 'text-brk-muted'}`}>{label} ({learning.filter(course => !value || catalogStatus(enrollments[course.id]) === value).length})</button>)}
      </div> : <p className="mb-4 text-sm text-brk-muted">Số học viên đang học hiển thị trên từng khóa. <Link href="/tools/courses" className="font-semibold text-brk-primary underline">Mở quản lý để xem cả khóa chưa công khai</Link>.</p>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1"><span className="sr-only">Tìm trong khóa của tôi</span><input type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(6) }} placeholder="Tìm trong khóa của tôi…" className="min-h-12 w-full min-w-0 rounded-xl border border-brk-outline bg-brk-surface px-4 text-base text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-accent" /></label>
        <div role="group" aria-label="Kiểu hiển thị khóa của tôi" className="flex shrink-0 rounded-xl border border-brk-outline bg-brk-surface p-1">{([['list', 'Danh sách', List], ['gallery', 'Thẻ', LayoutGrid]] as const).map(([value, label, Icon]) => <button type="button" key={value} aria-label={label} aria-pressed={view === value} onClick={() => setView(value)} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${view === value ? 'bg-brk-primary text-brk-on-primary' : 'text-brk-muted'}`}><Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span></button>)}</div>
      </div>
      <p role="status" className="mb-3 text-sm text-brk-muted">{results.length} khóa học</p>
      {!results.length ? <div className="rounded-xl bg-brk-surface p-6 text-center"><p className="text-brk-on-surface">{learning.length || selectedTab === 'teaching' ? 'Chưa có khóa phù hợp trong nhóm này.' : 'Bạn chưa tham gia khóa học nào trên trang này.'}</p>{canDiscover && <HomeAreaLink area="discover" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Khám phá khóa học →</HomeAreaLink>}</div> : <div className={view === 'gallery' ? 'grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>{results.slice(0, limit).map(course => view === 'gallery' && selectedTab === 'learning' ? <div key={course.id} className="min-w-0"><CourseCard course={course} isLoggedIn enrollment={enrollments[course.id]} userPhone={userPhone} userId={userId} profileSlug={profileSlug} /></div> : <CourseListRow key={course.id} course={course} enrollment={enrollments[course.id]} management={selectedTab === 'teaching'} gallery={view === 'gallery'} />)}</div>}
      {results.length > limit && <button type="button" onClick={() => setLimit(value => value + 6)} className="mt-4 min-h-12 w-full rounded-xl border border-brk-outline bg-brk-surface font-semibold text-brk-on-surface">Xem thêm {Math.min(6, results.length - limit)} khóa của tôi</button>}
    </div>
  </section>
}
