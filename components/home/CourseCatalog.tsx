'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LayoutGrid, List, Search, SlidersHorizontal, X, BookOpen, ArrowRight } from 'lucide-react'
import CourseCard from '@/components/course/CourseCard'
import { isValidImageUrl } from '@/lib/image-validation'
import {
  CatalogCourse, CatalogEnrollment, CatalogFilters, EMPTY_CATALOG_FILTERS,
  FEE_LABELS, PRICE_LABELS, STATUS_LABELS, catalogCategory, catalogFee, catalogStatus, filterCatalog,
} from '@/lib/course-catalog'

interface Props {
  title: string; courses: CatalogCourse[]; enrollmentsMap: Record<number, CatalogEnrollment>
  isLoggedIn: boolean; userPhone: string | null; userId: number | null; profileSlug?: string | null
}
const fieldClass = 'mt-2 w-full min-w-0 rounded-xl border border-brk-outline bg-brk-surface px-3 py-3 text-sm text-brk-on-surface focus:outline-none focus:ring-2 focus:ring-brk-accent'
const viewKey = 'mfc-course-catalog-view'

export default function CourseCatalog({ title, courses, enrollmentsMap, isLoggedIn, userPhone, userId, profileSlug }: Props) {
  const [filters, setFilters] = useState<CatalogFilters>({ ...EMPTY_CATALOG_FILTERS })
  const [view, setView] = useState<'list' | 'gallery'>('list')
  const [limit, setLimit] = useState(12)
  const dialog = useRef<HTMLDialogElement>(null)
  const deferredQuery = useDeferredValue(filters.query)

  useEffect(() => {
    // Đọc lựa chọn trong trình duyệt sau hydration; lần đầu luôn là danh sách.
    try {
      const saved = window.localStorage.getItem(viewKey)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'gallery') setView('gallery')
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
  const clear = () => { setFilters({ ...EMPTY_CATALOG_FILTERS, sort: filters.sort }); setLimit(12) }
  const categories = useMemo(() => [...new Set(courses.map(catalogCategory))].sort((a, b) => a.localeCompare(b, 'vi')), [courses])
  const teachers = useMemo(() => [...new Map(courses.flatMap(course => course.teacher
    ? [[String(course.teacher.id), course.teacher.name || 'Giáo viên'] as const] : [])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'vi')), [courses])
  const feeTypes = useMemo(() => [...new Set(courses.map(catalogFee))], [courses])
  const results = useMemo(() => filterCatalog(courses, enrollmentsMap, { ...filters, query: deferredQuery }), [courses, enrollmentsMap, filters, deferredQuery])
  const activeFilters = [
    { key: 'query' as const, value: filters.query, label: `Tìm: ${filters.query}` },
    { key: 'category' as const, value: filters.category, label: `Danh mục: ${filters.category}` },
    { key: 'teacher' as const, value: filters.teacher, label: `Giáo viên: ${teachers.find(([id]) => id === filters.teacher)?.[1] || ''}` },
    { key: 'fee' as const, value: filters.fee, label: FEE_LABELS[filters.fee] },
    { key: 'price' as const, value: filters.price, label: PRICE_LABELS[filters.price] },
    { key: 'status' as const, value: filters.status, label: STATUS_LABELS[filters.status] },
  ].filter(item => item.value)

  // Sidebar và hộp lọc mobile dùng cùng dữ liệu, không tải danh sách giáo viên toàn hệ thống.
  const filterFields = () => (
    <div className="space-y-5">
      <label className="block text-sm font-semibold">Danh mục
        <select aria-label="Danh mục" value={filters.category} onChange={event => update('category', event.target.value)} className={fieldClass}>
          <option value="">Tất cả danh mục</option>{categories.map(category => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Giáo viên
        <select aria-label="Giáo viên" value={filters.teacher} onChange={event => update('teacher', event.target.value)} className={fieldClass}>
          <option value="">Tất cả giáo viên</option>{teachers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Loại phí
        <select aria-label="Loại phí" value={filters.fee} onChange={event => update('fee', event.target.value)} className={fieldClass}>
          <option value="">Tất cả loại phí</option>{feeTypes.map(fee => <option key={fee} value={fee}>{FEE_LABELS[fee]}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Khoảng phí niêm yết
        <select aria-label="Khoảng phí niêm yết" value={filters.price} onChange={event => update('price', event.target.value)} className={fieldClass}>
          <option value="">Tất cả mức phí</option>{Object.entries(PRICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span className="mt-2 block text-xs font-normal text-brk-muted">Chưa tính ưu đãi hoặc số dư ví.</span>
      </label>
      {isLoggedIn && <label className="block text-sm font-semibold">Trạng thái của tôi
        <select aria-label="Trạng thái của tôi" value={filters.status} onChange={event => update('status', event.target.value)} className={fieldClass}>
          <option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>}
      <button type="button" onClick={clear} className="min-h-11 w-full rounded-xl border border-brk-outline text-sm font-semibold hover:bg-brk-background">Xóa bộ lọc</button>
    </div>
  )

  return (
    <div id="catalog" className="scroll-mt-24 rounded-3xl border border-brk-outline bg-brk-surface p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-brk-on-surface sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-brk-muted">Tìm khóa học theo chủ đề, giáo viên hoặc mức phí.</p>
      </div>
      <label className="relative mb-5 block">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brk-muted" />
        <span className="sr-only">Tìm khóa học</span>
        <input type="search" value={filters.query} onChange={event => update('query', event.target.value)} placeholder="Tên khóa học, mã khóa hoặc giáo viên…" className="min-h-12 w-full rounded-2xl border border-brk-outline bg-brk-background py-3 pl-12 pr-4 text-base text-brk-on-surface outline-none focus:ring-2 focus:ring-brk-accent" />
      </label>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside aria-label="Bộ lọc khóa học" className="hidden self-start rounded-2xl bg-brk-background p-4 text-brk-on-surface lg:sticky lg:top-24 lg:block">
          <h3 className="mb-5 flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4" />Bộ lọc</h3>{filterFields()}
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => dialog.current?.showModal()} className="flex min-h-11 items-center gap-2 rounded-xl border border-brk-outline px-3 text-sm font-semibold text-brk-on-surface lg:hidden"><SlidersHorizontal className="h-4 w-4" />Lọc{activeFilters.length > 0 && ` (${activeFilters.length})`}</button>
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
          <p role="status" aria-live="polite" className="mb-4 text-sm text-brk-muted">{results.length} khóa học{activeFilters.length > 0 ? ` phù hợp · trên ${courses.length} khóa` : ''}</p>
          {activeFilters.length > 0 && <div className="mb-5 flex flex-wrap gap-2">
            {activeFilters.map(item => <button type="button" key={item.key} aria-label={`Bỏ lọc ${item.label}`} onClick={() => update(item.key, '')} className="flex min-w-0 max-w-full items-center gap-2 rounded-full bg-brk-background px-3 py-2 text-xs text-brk-on-surface"><span className="min-w-0 break-words">{item.label}</span><X className="h-3.5 w-3.5 shrink-0" /></button>)}
            <button type="button" onClick={clear} className="px-2 py-2 text-xs font-semibold text-brk-primary underline">Xóa tất cả</button>
          </div>}
          {results.length === 0 ? <div className="rounded-2xl bg-brk-background px-5 py-12 text-center text-brk-on-surface"><Search className="mx-auto mb-3 h-7 w-7 text-brk-muted" /><h3 className="font-semibold">Không có khóa học phù hợp</h3><p className="mt-2 text-sm text-brk-muted">Thử tên khác hoặc bỏ bớt điều kiện lọc.</p><button type="button" onClick={clear} className="mt-5 min-h-11 rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Xem tất cả khóa học</button></div>
            : <div className={view === 'gallery' ? 'grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
              {results.slice(0, limit).map(course => view === 'gallery' ? <div key={course.id} className="min-w-0">
                <p className="mb-2 truncate text-xs text-brk-muted">{course.teacher?.name || 'Giáo viên chưa cập nhật'} · {catalogCategory(course)}</p>
                <CourseCard course={course} isLoggedIn={isLoggedIn} enrollment={enrollmentsMap[course.id] || null} userPhone={userPhone} userId={userId} profileSlug={profileSlug} />
              </div> : <CourseListRow key={course.id} course={course} enrollment={enrollmentsMap[course.id]} />)}
            </div>}
          {results.length > limit && <button type="button" onClick={() => setLimit(value => value + 12)} className="mt-6 min-h-12 w-full rounded-xl border border-brk-outline font-semibold text-brk-on-surface hover:bg-brk-background">Xem thêm {Math.min(12, results.length - limit)} khóa học</button>}
        </div>
      </div>
      {/* Dialog gốc có quản lý focus, Escape và backdrop; không chiếm cột trên mobile. */}
      <dialog ref={dialog} aria-labelledby="catalog-filter-title" className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-brk-surface p-5 text-brk-on-surface backdrop:bg-black/50 sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-3xl">
        <div className="mb-6 flex items-center justify-between"><h3 id="catalog-filter-title" className="text-xl font-bold">Lọc khóa học</h3><button type="button" aria-label="Đóng bộ lọc" onClick={() => dialog.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-full bg-brk-background"><X className="h-5 w-5" /></button></div>
        {filterFields()}
        <button type="button" onClick={() => dialog.current?.close()} className="mt-6 min-h-12 w-full rounded-xl bg-brk-primary font-semibold text-brk-on-primary">Xem {results.length} kết quả</button>
      </dialog>
    </div>
  )
}

function CourseListRow({ course, enrollment }: { course: CatalogCourse; enrollment?: CatalogEnrollment }) {
  const status = catalogStatus(enrollment)
  const detail = `/khoa-hoc/${encodeURIComponent(course.id_khoa)}`
  const total = enrollment?.totalLessons || course._count?.lessons || 0
  const completed = Math.min(total, Math.max(0, enrollment?.completedCount || 0))
  const progress = total ? Math.round(completed / total * 100) : 0
  const price = Math.max(0, Number(course.phi_coc) || 0)
  return <article className="flex min-w-0 flex-wrap items-start gap-3 rounded-2xl border border-brk-outline p-3 sm:items-center sm:gap-4 sm:p-4">
    <Link href={detail} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-brk-background sm:h-24 sm:w-36"><Image src={isValidImageUrl(course.link_anh_bia) ? course.link_anh_bia! : '/og-image.png'} alt={course.name_lop} fill sizes="(max-width:640px) 96px,144px" className="object-cover" /></Link>
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-xs text-brk-muted">{catalogCategory(course)}</p>
      <h3 className="break-words font-bold leading-snug text-brk-on-surface"><Link href={detail} className="hover:underline">{course.name_lop}</Link></h3>
      <p className="mt-1 break-words text-sm text-brk-muted">{course.teacher?.name || 'Giáo viên chưa cập nhật'}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brk-muted"><span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{course._count?.lessons || 0} bài</span>{status !== 'new' && <span className="font-semibold text-brk-primary">{STATUS_LABELS[status]}</span>}</div>
      {enrollment && (status === 'active' || status === 'completed') && <div className="mt-2"><p className="text-xs text-brk-muted">Đã học {completed}/{total} bài · {progress}%</p><div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="mt-1 h-1.5 max-w-64 overflow-hidden rounded-full bg-brk-background"><div className="h-full rounded-full bg-brk-accent" style={{width:`${progress}%`}} /></div></div>}
    </div>
    <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-brk-outline pt-3 sm:w-auto sm:max-w-48 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
      <div><p className="text-sm font-bold text-brk-on-surface sm:text-right">{price === 0 ? 'Không yêu cầu phí' : `${price.toLocaleString('vi-VN')}đ`}</p>{price > 0 && <p className="text-xs text-brk-muted sm:text-right">{FEE_LABELS[catalogFee(course)]}</p>}</div>
      <Link href={status === 'active' ? `/courses/${encodeURIComponent(course.id_khoa)}/learn` : detail} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-brk-on-primary">{status === 'active' ? 'Tiếp tục học' : 'Xem khóa học'}<ArrowRight className="h-4 w-4" /></Link>
    </div>
  </article>
}
