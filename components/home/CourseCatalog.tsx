'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LayoutGrid, List, Search, X, BookOpen, ArrowRight } from 'lucide-react'
import CourseDiscoveryCard from '@/components/course/CourseDiscoveryCard'
import CourseInstructor from '@/components/course/CourseInstructor'
import { isValidImageUrl } from '@/lib/image-validation'
import {
  CatalogCourse, CatalogEnrollment, CatalogFilters, EMPTY_CATALOG_FILTERS,
  FEE_LABELS, PRICE_LABELS, STATUS_LABELS, catalogCategory, catalogFee, catalogStatus, filterCatalog,
} from '@/lib/course-catalog'

interface Props {
  title: string; courses: CatalogCourse[]; enrollmentsMap: Record<number, CatalogEnrollment>
  isLoggedIn: boolean; userPhone: string | null; userId: number | null; profileSlug?: string | null
  featuredIds?: number[]; latestIds?: number[]
  discoveryCourses?: CatalogCourse[]
  initialCategory?: string; initialExpanded?: boolean
}
const fieldClass = 'mt-2 w-full min-w-0 rounded-xl border border-brk-outline bg-brk-surface px-3 py-3 text-sm text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-accent'
const viewKey = 'mfc-course-catalog-view'
const subscribeWidth = (callback: () => void) => {
  const media = [window.matchMedia('(min-width: 640px)'), window.matchMedia('(min-width: 1024px)')]
  media.forEach(query => query.addEventListener('change', callback))
  return () => media.forEach(query => query.removeEventListener('change', callback))
}
const previewSize = () => window.innerWidth >= 1024 ? 6 : window.innerWidth >= 640 ? 4 : 2

export default function CourseCatalog({ title, courses, enrollmentsMap, isLoggedIn, featuredIds = [], latestIds = [], discoveryCourses, initialCategory = '', initialExpanded = false }: Props) {
  const [scope, setScope] = useState<'discover' | 'all'>('discover')
  const sourceCourses = scope === 'discover' && discoveryCourses ? discoveryCourses : courses
  const categoryTabs = useRef<HTMLDivElement>(null)
  const [group, setGroup] = useState<'all' | 'featured' | 'latest'>('all')
  const [filters, setFilters] = useState<CatalogFilters>({ ...EMPTY_CATALOG_FILTERS, category: initialCategory })
  const [view, setView] = useState<'list' | 'gallery'>('gallery')
  const [limit, setLimit] = useState(12)
  const [expanded, setExpanded] = useState(initialExpanded)
  const overview = useRef<{ filters: CatalogFilters; scroll: number } | null>(null)
  const categoryLimit = useSyncExternalStore(subscribeWidth, previewSize, () => 6)
  const deferredQuery = useDeferredValue(filters.query)

  useEffect(() => {
    // Giữ lựa chọn hiển thị của người dùng sau hydration.
    try {
      const saved = window.localStorage.getItem(viewKey)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'gallery' || saved === 'list') setView(saved)
    } catch { /* Trình duyệt chặn lưu trữ: vẫn đổi view bình thường. */ }
  }, [])
  const changeView = (next: 'list' | 'gallery') => {
    setView(next)
    try { window.localStorage.setItem(viewKey, next) } catch { /* Lưu lựa chọn không bắt buộc. */ }
  }
  const update = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    setFilters(previous => ({ ...previous, [key]: value }))
    setLimit(12)
  }
  const clear = () => { setFilters({ ...EMPTY_CATALOG_FILTERS, sort: filters.sort }); setGroup('all'); setLimit(12) }
  const categories = useMemo(() => [...new Set(courses.map(catalogCategory))].sort((a, b) => a.localeCompare(b, 'vi')), [courses])
  const teachers = useMemo(() => [...new Map(courses.flatMap(course => course.teacher
    ? [[String(course.teacher.id), course.teacher.name || 'Giáo viên'] as const] : [])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'vi')), [courses])
  const feeTypes = useMemo(() => [...new Set(courses.map(catalogFee))], [courses])
  const results = useMemo(() => filterCatalog(sourceCourses.filter(course => group === 'all' || (group === 'featured' ? featuredIds : latestIds).includes(course.id)), enrollmentsMap, { ...filters, query: deferredQuery }), [sourceCourses, enrollmentsMap, filters, deferredQuery, group, featuredIds, latestIds])
  const categoryGroups = categories.map(name => ({ name, courses: results.filter(course => catalogCategory(course) === name) })).filter(section => section.courses.length > 0)
  const openAll = (category: string) => {
    overview.current = { filters: { ...filters }, scroll: window.scrollY }
    update('category', category)
    setExpanded(true)
    requestAnimationFrame(() => document.getElementById('catalog-results')?.scrollIntoView({ block: 'start' }))
  }
  const returnToOverview = () => {
    if (overview.current) setFilters(overview.current.filters)
    setExpanded(false)
    const scroll = overview.current?.scroll
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (scroll !== undefined) window.scrollTo({ top: scroll })
      document.getElementById('catalog-overview-toggle')?.focus({ preventScroll: true })
    }))
  }
  const renderCourses = (items: CatalogCourse[]) => <div className={view === 'gallery' ? 'grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
    {items.map(course => view === 'gallery' ? <div key={course.id} className="min-w-0">
      <CourseDiscoveryCard course={course} enrollment={enrollmentsMap[course.id]} />
    </div> : <CourseListRow key={course.id} course={course} enrollment={enrollmentsMap[course.id]} />)}
  </div>
  const activeFilters = [
    { key: 'query' as const, value: filters.query, label: `Tìm: ${filters.query}` },
    { key: 'category' as const, value: filters.category, label: `Danh mục: ${filters.category}` },
    { key: 'teacher' as const, value: filters.teacher, label: `Giáo viên: ${teachers.find(([id]) => id === filters.teacher)?.[1] || ''}` },
    { key: 'fee' as const, value: filters.fee, label: FEE_LABELS[filters.fee] },
    { key: 'price' as const, value: filters.price, label: PRICE_LABELS[filters.price] },
    { key: 'status' as const, value: filters.status, label: STATUS_LABELS[filters.status] },
  ].filter(item => item.value)

  // Một hàng bộ lọc dùng cùng dữ liệu; cuộn ngang trong khung trên điện thoại.
  const filterFields = () => (
    <div className="flex min-w-max items-start gap-3">
      <label className="block w-44 shrink-0 text-sm font-semibold">Giáo viên
        <select aria-label="Giáo viên" value={filters.teacher} onChange={event => update('teacher', event.target.value)} className={fieldClass}>
          <option value="">Tất cả giáo viên</option>{teachers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <label className="block w-44 shrink-0 text-sm font-semibold">Loại phí
        <select aria-label="Loại phí" value={filters.fee} onChange={event => update('fee', event.target.value)} className={fieldClass}>
          <option value="">Tất cả loại phí</option>{feeTypes.map(fee => <option key={fee} value={fee}>{FEE_LABELS[fee]}</option>)}
        </select>
      </label>
      <label className="block w-44 shrink-0 text-sm font-semibold">Khoảng phí niêm yết
        <select aria-label="Khoảng phí niêm yết" value={filters.price} onChange={event => update('price', event.target.value)} className={fieldClass}>
          <option value="">Tất cả mức phí</option>{Object.entries(PRICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="mt-2 block text-xs font-normal text-brk-muted">Chưa tính ưu đãi hoặc số dư ví.</span>
      </label>
      {isLoggedIn && <label className="block w-44 shrink-0 text-sm font-semibold">Trạng thái của tôi
        <select aria-label="Trạng thái của tôi" value={filters.status} onChange={event => update('status', event.target.value)} className={fieldClass}>
          <option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>}
      <button type="button" onClick={clear} className="mt-7 min-h-12 shrink-0 rounded-xl border border-brk-outline px-4 text-sm font-semibold hover:bg-brk-background">Xóa bộ lọc</button>
    </div>
  )

  return (
    <div id="catalog" className="scroll-mt-24 rounded-3xl border border-brk-outline bg-brk-surface p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-brk-on-surface sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-brk-muted">Tìm khóa học theo chủ đề, giáo viên hoặc mức phí.</p>
      </div>
      {discoveryCourses && <div role="group" aria-label="Phạm vi khám phá" className="mb-4 flex flex-wrap gap-2">
        {([['discover', `Khóa học khác (${discoveryCourses.length})`], ['all', `Tất cả khóa học (${courses.length})`]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={scope === value} onClick={() => { setScope(value); clear() }} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${scope === value ? 'bg-brk-primary text-brk-on-primary' : 'border border-brk-outline text-brk-on-surface'}`}>{label}</button>)}
      </div>}
      <div className="mb-5 min-w-0 overflow-x-auto border-b border-brk-outline">
        <div ref={categoryTabs} role="tablist" aria-label="Danh mục khóa học" className="flex min-w-max gap-2">
          {['', ...categories].map((category, index) => <button type="button" role="tab" key={category} id={`catalog-category-${index}`} aria-selected={filters.category === category} aria-controls="catalog-results" tabIndex={filters.category === category ? 0 : -1} onClick={() => update('category', category)} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const values = ['', ...categories]
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + values.length) % values.length
            update('category', values[next])
            categoryTabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
          }} className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold ${filters.category === category ? 'border-brk-primary text-brk-primary' : 'border-transparent text-brk-muted hover:text-brk-on-surface'}`}>{category || 'Tất cả danh mục'}</button>)}
        </div>
      </div>
      <label className="mb-5 block w-full text-sm font-semibold text-brk-on-surface sm:max-w-xs">Hiển thị
        <select aria-label="Hiển thị khóa học" value={filters.price === 'free' && group === 'all' ? 'free' : group} onChange={event => {
          const next = event.target.value
          if (next === 'free') { setGroup('all'); update('price', 'free') }
          else { setGroup(next as 'all' | 'featured' | 'latest'); if (filters.price === 'free') update('price', ''); else setLimit(12) }
        }} className={fieldClass}>
          <option value="all">Tất cả</option>
          {featuredIds.length > 0 && <option value="featured">Nổi bật</option>}
          {latestIds.length > 0 && <option value="latest">Mới cập nhật</option>}
          <option value="free">Không yêu cầu phí</option>
        </select>
      </label>
      <label className="relative mb-5 block">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brk-muted" />
        <span className="sr-only">Tìm khóa học</span>
        <input type="search" value={filters.query} onChange={event => update('query', event.target.value)} placeholder="Tên khóa học, mã khóa hoặc giáo viên…" className="min-h-12 w-full rounded-2xl border border-brk-outline bg-brk-background py-3 pl-12 pr-4 text-base text-brk-on-surface outline-none focus:ring-2 focus:ring-brk-accent" />
      </label>
      <section aria-label="Bộ lọc khóa học" className="mb-5 min-w-0 max-w-full overflow-x-auto rounded-xl bg-brk-background p-3 text-brk-on-surface">
        {filterFields()}
      </section>
      <div id="catalog-results" role="tabpanel" aria-labelledby={`catalog-category-${Math.max(0, ['', ...categories].indexOf(filters.category))}`} className="min-w-0 scroll-mt-32">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="min-w-0 flex-1 sm:flex-none"><span className="sr-only">Sắp xếp khóa học</span>
              <select aria-label="Sắp xếp khóa học" value={filters.sort} onChange={event => update('sort', event.target.value as CatalogFilters['sort'])} className="min-h-11 w-full rounded-xl border border-brk-outline bg-brk-surface px-3 text-sm text-brk-on-surface">
                <option value="updated">Mới cập nhật</option><option value="name">Tên A–Z</option><option value="price-asc">Phí thấp đến cao</option><option value="price-desc">Phí cao đến thấp</option>
              </select>
            </label>
            <div role="group" aria-label="Kiểu hiển thị khóa học" className="flex shrink-0 rounded-xl border border-brk-outline p-1 sm:ml-auto">
              {([['list', 'Danh sách', List], ['gallery', 'Thẻ', LayoutGrid]] as const).map(([value, label, Icon]) => (
                <button key={value} type="button" aria-label={label} aria-pressed={view === value} onClick={() => changeView(value)} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${view === value ? 'bg-brk-primary text-brk-on-primary' : 'text-brk-muted hover:bg-brk-background'}`}><Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span></button>
              ))}
            </div>
          </div>
          <button id="catalog-overview-toggle" type="button" onClick={() => expanded ? returnToOverview() : openAll(filters.category)} className="mb-4 min-h-11 rounded-xl border border-brk-outline px-4 text-sm font-semibold text-brk-primary">
            {expanded ? '← Quay lại các danh mục' : 'Xem toàn bộ khóa học'}
          </button>
          <p role="status" aria-live="polite" className="mb-4 text-sm text-brk-muted">{results.length} khóa học{activeFilters.length > 0 || group !== 'all' ? ` phù hợp · trên ${sourceCourses.length} khóa` : ''}</p>
          {activeFilters.length > 0 && <div className="mb-5 flex flex-wrap gap-2">
            {activeFilters.map(item => <button type="button" key={item.key} aria-label={`Bỏ lọc ${item.label}`} onClick={() => update(item.key, '')} className="flex min-w-0 max-w-full items-center gap-2 rounded-full bg-brk-background px-3 py-2 text-xs text-brk-on-surface"><span className="min-w-0 break-words">{item.label}</span><X className="h-3.5 w-3.5 shrink-0" /></button>)}
            <button type="button" onClick={clear} className="px-2 py-2 text-xs font-semibold text-brk-primary underline">Xóa tất cả</button>
          </div>}
          {results.length === 0 ? <div className="rounded-2xl bg-brk-background px-5 py-12 text-center text-brk-on-surface"><Search className="mx-auto mb-3 h-7 w-7 text-brk-muted" /><h3 className="font-semibold">Không có khóa học phù hợp</h3><p className="mt-2 text-sm text-brk-muted">Thử tên khác hoặc bỏ bớt điều kiện lọc.</p><button type="button" onClick={() => { setScope('all'); clear() }} className="mt-5 min-h-11 rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Xem tất cả khóa học</button></div>
            : expanded ? renderCourses(results.slice(0, limit))
              : <div className="space-y-8">
                {categoryGroups.map(section => {
                  const shown = section.courses.slice(0, view === 'gallery' ? categoryLimit : 2)
                  return <section key={section.name} aria-label={`Khóa học danh mục ${section.name}`} className="min-w-0">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div><h3 className="text-xl font-bold text-brk-on-surface">{section.name}</h3><p className="mt-1 text-sm text-brk-muted">{section.courses.length} khóa học · Đang hiển thị {shown.length}</p></div>
                      <button type="button" aria-label={`Xem toàn bộ danh mục ${section.name}`} onClick={() => openAll(section.name)} className="min-h-11 rounded-xl bg-brk-background px-4 text-sm font-semibold text-brk-primary">Xem toàn bộ <ArrowRight className="ml-1 inline h-4 w-4" /></button>
                    </div>
                    {renderCourses(shown)}
                  </section>
                })}
              </div>}
          {expanded && results.length > limit && <button type="button" onClick={() => setLimit(value => value + 12)} className="mt-6 min-h-12 w-full rounded-xl border border-brk-outline font-semibold text-brk-on-surface hover:bg-brk-background">Xem thêm {Math.min(12, results.length - limit)} khóa học</button>}
        </div>
      </div>

    </div>
  )
}

export function CourseListRow({ course, enrollment, management = false, gallery = false }: { course: CatalogCourse; enrollment?: CatalogEnrollment; management?: boolean; gallery?: boolean }) {
  const status = catalogStatus(enrollment)
  const detail = `/khoa-hoc/${encodeURIComponent(course.id_khoa)}`
  const total = enrollment?.totalLessons || course._count?.lessons || 0
  const completed = Math.min(total, Math.max(0, enrollment?.completedCount || 0))
  const progress = total ? Math.round(completed / total * 100) : 0
  const price = Math.max(0, Number(course.phi_coc) || 0)
  return <article className={`flex min-w-0 flex-wrap items-start gap-3 rounded-2xl border border-brk-outline bg-brk-surface p-3 sm:gap-4 sm:p-4 ${gallery ? 'h-full flex-col' : 'sm:items-center'}`}>
    <Link href={detail} className={`relative shrink-0 overflow-hidden rounded-xl bg-brk-background ${gallery ? 'h-36 w-full' : 'h-20 w-24 sm:h-24 sm:w-36'}`}><Image src={isValidImageUrl(course.link_anh_bia) ? course.link_anh_bia! : '/og-image.png'} alt={course.name_lop} fill sizes={gallery ? '(max-width:640px) 100vw,33vw' : '(max-width:640px) 96px,144px'} className="object-cover" /></Link>
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-xs text-brk-muted">{catalogCategory(course)}</p>
      <h3 className="break-words font-bold leading-snug text-brk-on-surface"><Link href={detail} className="hover:underline">{course.name_lop}</Link></h3>
      <CourseInstructor name={course.teacher?.name} />
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brk-muted"><span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{course._count?.lessons || 0} bài</span>{management ? <span>{course.activeStudentCount ?? course._count?.enrollments ?? 0} học viên đang học</span> : status !== 'new' && <span className="font-semibold text-brk-primary">{STATUS_LABELS[status]}</span>}</div>
      {!management && enrollment && (status === 'active' || status === 'completed') && <div className="mt-2"><p className="text-xs text-brk-muted">Đã học {completed}/{total} bài · {progress}%</p><div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1.5 max-w-64 overflow-hidden rounded-full bg-brk-background"><div className="h-full rounded-full bg-brk-accent" style={{width:`${progress}%`}} /></div></div>}
    </div>
    <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-brk-outline pt-3 sm:w-auto sm:max-w-48 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
      <div><p className="text-sm font-bold text-brk-on-surface sm:text-right">{price === 0 ? 'Không yêu cầu phí' : `${price.toLocaleString('vi-VN')}đ`}</p>{price > 0 && <p className="text-xs text-brk-muted sm:text-right">{FEE_LABELS[catalogFee(course)]}</p>}</div>
      <Link href={management ? `/tools/courses/new?id=${course.id}` : status === 'active' ? `/courses/${encodeURIComponent(course.id_khoa)}/learn` : detail} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-brk-on-primary">{management ? 'Quản lý khóa học' : status === 'active' ? 'Tiếp tục học' : 'Xem khóa học'}<ArrowRight className="h-4 w-4" /></Link>
    </div>
  </article>
}
