'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Wi300TeachingCourse } from './Wi300Home'
import useCoursePageSize from './useCoursePageSize'

export default function Wi300TeachingPanel({ courses, error, preview = false }: { courses: Wi300TeachingCourse[]; error: boolean; preview?: boolean }) {
  const [status, setStatus] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = useCoursePageSize()
  const filtered = preview ? courses : courses.filter(course => course.status === status)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = preview ? filtered.slice(0, 3) : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const linkClass = 'inline-flex min-h-11 items-center py-2 text-sm font-semibold text-brk-primary'

  return <div className="space-y-4">
    {!preview && <><p className="text-sm leading-6 text-brk-muted">Các khóa học do bạn quản lý. Mở màn quản lý để sửa nội dung và xem học viên.</p>
      <div role="group" aria-label="Trạng thái giảng dạy" className="flex flex-wrap gap-2">
        {[{ value: true, label: 'Đang mở' }, { value: false, label: 'Đã ẩn' }].map(item => <button key={String(item.value)} type="button" aria-pressed={status === item.value} onClick={() => { setStatus(item.value); setPage(1) }} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${status === item.value ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white'}`}>{item.label} ({courses.filter(course => course.status === item.value).length})</button>)}
      </div></>}
    {error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Chưa tải được khóa giảng dạy. Vui lòng tải lại trang.</p> : visible.length ? <ul className="space-y-3">
      {visible.map(course => <li key={course.id} className="rounded-xl border border-brk-outline bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-bold">{course.name_lop}</h3><span className="text-xs font-semibold text-brk-muted">{course.status ? 'Đang mở' : 'Đã ẩn'}</span></div>
        <p className="mt-2 text-sm text-brk-muted">{course._count.lessons} bài học · {course._count.enrollments} học viên đang tham gia</p>
        <Link href={`/tools/courses/new?id=${course.id}`} className={linkClass}>Nội dung & cấu hình →</Link>
      </li>)}
    </ul> : <p className="rounded-xl border border-brk-outline bg-white p-4 text-sm text-brk-muted">{preview ? 'Bạn chưa có khóa giảng dạy.' : status ? 'Bạn chưa có khóa đang mở.' : 'Bạn chưa có khóa đã ẩn.'}</p>}
    {!preview && totalPages > 1 && <nav aria-label="Phân trang khóa giảng dạy" className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">← Trang trước</button>
      <p role="status" className="text-sm text-brk-muted">Trang {currentPage}/{totalPages}</p>
      <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">Trang sau →</button>
    </nav>}
    <Link href={preview ? '/my-space?tab=teaching' : '/tools/courses'} className={linkClass}>{preview ? 'Xem tất cả khóa giảng dạy →' : 'Mở quản lý khóa học →'}</Link>
  </div>
}
