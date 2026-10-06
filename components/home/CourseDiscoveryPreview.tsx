'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import CourseDiscoveryCard from '@/components/course/CourseDiscoveryCard'
import HomeAreaLink from './HomeAreaLink'
import { catalogCategory, type CatalogCourse, type CatalogEnrollment } from '@/lib/course-catalog'

const subscribeWidth = (callback: () => void) => {
  const queries = [window.matchMedia('(min-width:640px)'), window.matchMedia('(min-width:1024px)')]
  queries.forEach(query => query.addEventListener('change', callback))
  return () => queries.forEach(query => query.removeEventListener('change', callback))
}
const getLimit = () => window.innerWidth >= 1024 ? 6 : window.innerWidth >= 640 ? 4 : 2

// Mỗi lần chỉ hiển thị một danh mục để trang chủ không kéo dài.
// Giới hạn hai hàng; nút xem toàn bộ mở khu Khám phá với đúng danh mục.
export default function CourseDiscoveryPreview({ courses, enrollments }: { courses: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment> }) {
  const limit = useSyncExternalStore(subscribeWidth, getLimit, () => 6)
  const [category, setCategory] = useState('')
  const tabs = useRef<HTMLDivElement>(null)
  const categories = [...new Set(courses.map(catalogCategory))].sort((a, b) => a.localeCompare(b, 'vi'))
  const values = ['', ...categories]
  const selected = categories.includes(category) ? category : ''
  const items = selected ? courses.filter(course => catalogCategory(course) === selected) : courses
  return <section id="course-preview" aria-label="Khám phá theo danh mục" className="min-w-0">
    <div className="mb-5">
      <h2 className="text-2xl font-bold text-brk-on-surface">Khám phá theo danh mục</h2>
      <p className="mt-2 text-sm text-brk-muted">Chọn một chủ đề để xem các khóa học phù hợp.</p>
    </div>
    <div className="mb-5 min-w-0 overflow-x-auto border-b border-brk-outline">
      <div ref={tabs} role="tablist" aria-label="Danh mục trên trang chủ" className="flex min-w-max gap-2">
        {values.map((value, index) => <button type="button" role="tab" key={value} id={`home-category-${index}`} aria-selected={selected === value} aria-controls="home-category-panel" tabIndex={selected === value ? 0 : -1} onClick={() => setCategory(value)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + values.length) % values.length
          setCategory(values[next])
          tabs.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
        }} className={`flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${selected === value ? 'border-brk-primary text-brk-primary' : 'border-transparent text-brk-muted hover:text-brk-on-surface'}`}>
          {value || 'Tất cả'}<span aria-hidden className="rounded-full bg-brk-background px-2 py-0.5 text-xs">{value ? courses.filter(course => catalogCategory(course) === value).length : courses.length}</span>
        </button>)}
      </div>
    </div>
    <div id="home-category-panel" role="tabpanel" aria-labelledby={`home-category-${values.indexOf(selected)}`} tabIndex={0} className="min-w-0">
      <p role="status" aria-live="polite" className="mb-4 text-sm text-brk-muted">{items.length} khóa học · Đang hiển thị {Math.min(items.length, limit)}</p>
      {!items.length ? <div className="rounded-2xl border border-brk-outline bg-brk-surface p-6 text-sm text-brk-muted">Bạn có thể mở Khám phá để xem tất cả khóa học trên trang này.</div>
        : <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0, limit).map(course => <CourseDiscoveryCard key={course.id} course={course} enrollment={enrollments[course.id]} />)}</div>}
      <HomeAreaLink area="discover" category={selected || undefined} aria-label={selected ? `Xem toàn bộ danh mục ${selected}` : 'Xem toàn bộ khóa học'} className="mt-5 flex min-h-12 items-center justify-center rounded-xl border border-brk-outline bg-brk-surface px-4 text-sm font-semibold text-brk-primary hover:bg-brk-background">
        {selected ? `Xem toàn bộ danh mục ${selected}` : 'Xem toàn bộ khóa học'} →
      </HomeAreaLink>
    </div>
  </section>
}
