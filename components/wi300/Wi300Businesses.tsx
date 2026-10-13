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
      <h2 id="wi300-businesses-title" className="text-2xl font-bold text-brk-on-surface sm:text-3xl">Các dự án trong hệ sinh thái Wi</h2>
      <Link href="/du-an" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-primary">Xem tất cả<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-brk-muted">Tìm hiểu từng dự án và khám phá các khóa học, sản phẩm, dịch vụ liên quan.</p>
    {error ? <p role="alert" className="mt-6 rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">Chưa tải được thông tin dự án. Vui lòng tải lại trang.</p> : projects.length ? <ul aria-label="Các dự án Wi" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.slice(0, 9).map(project => <li key={project.slug} className="min-w-0">
        <Link href={`/du-an/${project.slug}`} className="group flex h-full flex-col rounded-2xl border border-brk-outline bg-white p-5 transition-shadow hover:border-brk-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brk-outline bg-brk-background">
              {project.logo ? <Image src={project.logo} alt="" width={80} height={80} sizes="80px" className={`h-full w-full rounded-full ${project.name === 'Wi.Mentor' ? 'object-cover' : project.name === 'WiArt' ? 'bg-[#f1f2ed] object-contain' : 'bg-white object-contain p-2'}`} /> : <span aria-hidden="true" className="px-2 text-center text-sm font-extrabold text-brk-primary">{project.name}</span>}
            </div>
            <h3 className="min-w-0 break-words text-lg font-bold text-brk-on-surface">{project.name}</h3>
          </div>
          <p className="mt-4 line-clamp-3 break-words text-sm leading-6 text-brk-muted">{project.description}</p>
          <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-4 text-sm font-semibold text-brk-primary">Xem dự án<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
        </Link>
      </li>)}
    </ul> : <p className="mt-6 rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">Các dự án sẽ được cập nhật tại đây.</p>}
  </section>
}
