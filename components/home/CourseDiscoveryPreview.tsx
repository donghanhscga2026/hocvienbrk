'use client'

import { useSyncExternalStore } from 'react'
import CourseDiscoveryCard from '@/components/course/CourseDiscoveryCard'
import HomeAreaLink from './HomeAreaLink'
import { catalogCategory, type CatalogCourse, type CatalogEnrollment } from '@/lib/course-catalog'

const subscribeWidth = (callback: () => void) => {
  const queries = [window.matchMedia('(min-width:640px)'), window.matchMedia('(min-width:1024px)')]
  queries.forEach(query => query.addEventListener('change', callback))
  return () => queries.forEach(query => query.removeEventListener('change', callback))
}
const getLimit = () => window.innerWidth >= 1024 ? 6 : window.innerWidth >= 640 ? 4 : 2

// Trang chủ chỉ gợi ý tối đa hai hàng cho mỗi danh mục.
// Chuyển sang Khám phá để dùng tìm kiếm, bộ lọc và xem toàn bộ.
export default function CourseDiscoveryPreview({ courses, enrollments }: { courses: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment> }) {
  const limit = useSyncExternalStore(subscribeWidth, getLimit, () => 6)
  const categories = [...new Set(courses.map(catalogCategory))].sort((a, b) => a.localeCompare(b, 'vi'))
  return <section id="course-preview" aria-label="Khám phá theo danh mục" className="min-w-0">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold text-brk-on-surface">Khám phá theo danh mục</h2><p className="mt-2 text-sm text-brk-muted">Chọn chủ đề bạn muốn tìm hiểu thêm.</p></div>
      <HomeAreaLink area="discover" className="inline-flex min-h-11 items-center rounded-xl border border-brk-outline px-4 text-sm font-semibold text-brk-primary">Xem toàn bộ khóa học →</HomeAreaLink>
    </div>
    {!courses.length && <div className="rounded-2xl border border-brk-outline bg-brk-surface p-6 text-sm text-brk-muted">Bạn có thể mở Khám phá để xem tất cả khóa học trên trang này.</div>}
    <div className="space-y-8">{categories.map(category => {
      const items = courses.filter(course => catalogCategory(course) === category)
      return <section key={category} aria-label={`Khóa học danh mục ${category}`} className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-xl font-bold text-brk-on-surface">{category}</h3><p className="mt-1 text-sm text-brk-muted">{items.length} khóa học</p></div>
          <HomeAreaLink area="discover" category={category} aria-label={`Xem toàn bộ danh mục ${category}`} className="inline-flex min-h-11 items-center rounded-xl bg-brk-surface px-4 text-sm font-semibold text-brk-primary">Xem toàn bộ →</HomeAreaLink>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0, limit).map(course => <CourseDiscoveryCard key={course.id} course={course} enrollment={enrollments[course.id]} />)}</div>
      </section>
    })}</div>
  </section>
}
