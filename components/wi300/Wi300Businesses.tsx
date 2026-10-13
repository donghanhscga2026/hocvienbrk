'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { projectDefaults, publicProject, type PublicWiProject } from '@/lib/wi300/projects'

const businesses = projectDefaults.map(publicProject)
export const featuredBusinesses = businesses.map(business => business.name)

/** Tối đa ba hàng trên desktop; danh sách đầy đủ nằm ở trang Dự án. */
export default function Wi300Businesses({ projects = businesses, error = false }: { projects?: PublicWiProject[]; error?: boolean }) {
  return <section id="du-an-wi" aria-labelledby="wi300-businesses-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-10 sm:py-12 lg:scroll-mt-24 lg:px-6">
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <h2 id="wi300-businesses-title" className="text-2xl font-bold text-brk-on-surface sm:text-3xl">Khám phá hệ sinh thái Wi</h2>
      <Link href="/du-an" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-primary">Xem tất cả<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-brk-muted">Tìm hiểu từng dự án và khám phá các khóa học, sản phẩm, dịch vụ liên quan.</p>
    {error ? <p role="alert" className="mt-6 rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">Chưa tải được thông tin dự án. Vui lòng tải lại trang.</p> : projects.length ? <ul aria-label="Các dự án Wi" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.slice(0, 9).map(project => <li key={project.slug} className="min-w-0">
        <Link href={`/du-an/${project.slug}`} className="wi300-project-card group flex h-full min-w-0 flex-col rounded-[1.25rem] border border-brk-outline bg-white p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary sm:p-6">
          {/* Giữ nguyên tỷ lệ logo, bỏ cắt tròn để logo ngang dễ đọc. */}
          <div className="relative flex h-36 w-full items-center justify-center">
            {project.logo ? <Image src={project.logo} alt="" width={320} height={144} sizes="(max-width: 639px) calc(100vw - 80px), (max-width: 1023px) 40vw, 330px" className="h-full w-full object-contain" /> : <span aria-hidden="true" className="text-2xl font-extrabold text-brk-on-surface">{project.name}</span>}
          </div>
          <div className="mt-5 border-t border-brk-outline pt-4">
            <h3 className="break-words text-xl font-bold text-brk-on-surface">{project.name}</h3>
            <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-brk-muted">{project.description}</p>
          </div>
          <span className="wi300-project-action mt-auto inline-flex min-h-11 items-center gap-2 pt-4 text-sm font-semibold">Khám phá dự án<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
        </Link>
      </li>)}
    </ul> : <p className="mt-6 rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">Các dự án sẽ được cập nhật tại đây.</p>}
  </section>
}
