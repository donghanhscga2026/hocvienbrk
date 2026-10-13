'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

type Teacher = { id: number | string; name: string; count: number | null; image?: string | null }

/** Giữ ảnh nguồn, mỗi giảng viên một thẻ; danh sách đầy đủ không giới hạn tám. */
export default function Wi300Teachers({ teachers, catalogError, directory = false }: { teachers: Teacher[]; catalogError: boolean; directory?: boolean }) {
  const unique = new Map(teachers.filter(teacher => teacher.image?.trim()).map(teacher => [teacher.id, teacher]))
  const visibleTeachers = directory ? [...unique.values()] : [...unique.values()].slice(0, 8)
  if (!directory && !visibleTeachers.length) return null
  const columns = visibleTeachers.length === 1 ? 'max-w-sm' : visibleTeachers.length === 2 ? 'max-w-4xl sm:grid-cols-2' : visibleTeachers.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  return <section id="giang-vien" aria-labelledby="wi300-teachers-title" className="mx-auto max-w-7xl scroll-mt-44 px-4 pb-8 lg:scroll-mt-24 lg:px-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {directory ? <h1 id="wi300-teachers-title" className="text-3xl font-bold">Đội ngũ giảng viên</h1> : <h2 id="wi300-teachers-title" className="text-2xl font-bold">Đội ngũ giảng viên</h2>}
        <p className="mt-2 text-sm leading-6 text-brk-muted">Gặp gỡ những người chia sẻ tri thức trong hệ sinh thái Wi.</p>
      </div>
      {!directory && <Link href="/giang-vien" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-accent">Xem tất cả giảng viên<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
    </div>
    {catalogError ? <p role="alert" className="mt-6 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Chưa tải được danh sách giảng viên. Vui lòng tải lại trang.</p> : visibleTeachers.length ? <ul aria-label="Đội ngũ giảng viên" className={`mx-auto mt-6 grid gap-5 ${columns}`}>
      {visibleTeachers.map(teacher => <li key={teacher.id} className="min-w-0">
        <Link href={`/khoa-hoc?q=${encodeURIComponent(teacher.name)}`} className="wi300-teacher-card flex h-full flex-col items-center rounded-3xl border border-brk-outline bg-brk-surface p-5 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary sm:p-6">
          <div className="wi300-teacher-portrait relative mb-1">
            <div className="relative z-10 h-40 w-40 overflow-hidden rounded-full border-4 border-white shadow-md sm:h-44 sm:w-44">
              <Image src={teacher.image!} alt={teacher.name} width={176} height={176} sizes="176px" unoptimized className="h-full w-full object-cover" />
            </div>
          </div>
          <h3 className="wi300-project-action mt-5 break-words text-xl font-bold">{teacher.name}</h3>
          <p className="mb-5 mt-3 rounded-full bg-brk-background px-4 py-2 text-sm text-brk-muted">{teacher.count != null ? `${teacher.count} khóa học` : 'Giảng viên trong hệ sinh thái Wi'}</p>
          <span className="wi300-teacher-link mt-auto inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold">Xem khóa học<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
        </Link>
      </li>)}
    </ul> : <p className="mt-6 rounded-2xl border border-brk-outline bg-brk-surface p-6 text-brk-muted">Các giảng viên sẽ được cập nhật tại đây.</p>}
  </section>
}
