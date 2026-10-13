'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { projectDefaults, publicProject, type PublicWiProject } from '@/lib/wi300/projects'

const businesses = projectDefaults.map(publicProject)
export const featuredBusinesses = businesses.map(business => business.name)

/** Thẻ ngang hai cột trên desktop; danh sách đầy đủ nằm ở trang Dự án. */
export default function Wi300Businesses({ projects = businesses, error = false }: { projects?: PublicWiProject[]; error?: boolean }) {
  const homeProjects = projects.filter(project => project.published && project.showOnHomepage !== false)
  return <section id="du-an-wi" aria-labelledby="wi300-businesses-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-10 sm:py-12 lg:scroll-mt-24 lg:px-6">
    <div className="relative mb-6 text-left sm:mb-8">
      <p className="wi300-project-action mb-3 text-xs font-semibold tracking-[0.12em] sm:text-sm">Cùng kết nối, cùng phát triển</p>
      <h2 id="wi300-businesses-title" className="text-2xl font-bold text-brk-on-surface sm:text-3xl lg:pr-32">Khám phá hệ sinh thái Wi</h2>
      <Link href="/du-an" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-primary lg:absolute lg:bottom-0 lg:right-0 lg:mt-0">Xem tất cả<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
    {error ? <p role="alert" className="rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">Chưa tải được thông tin dự án. Vui lòng tải lại trang.</p> : homeProjects.length ? <ul aria-label="Các dự án Wi" className="grid gap-4 lg:grid-cols-2 lg:gap-5">
      {homeProjects.slice(0, 8).map(project => <li key={project.slug} className="min-w-0">
        <Link href={`/du-an/${project.slug}`} className="wi300-project-card wi300-project-horizontal group grid h-full min-w-0 overflow-hidden rounded-[1.25rem] border border-brk-outline bg-white p-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary">
          {/* Họa tiết CSS nhẹ; logo nguồn giữ nguyên tỷ lệ, không cắt tròn. */}
          <div className="wi300-project-media relative flex min-w-0 items-center justify-center overflow-hidden rounded-l-[0.85rem] p-3 sm:p-4">
            <div className="relative z-10 flex h-28 w-full items-center justify-center rounded-2xl bg-white/80 p-2 sm:h-36 sm:p-3">
              {project.logo ? <Image src={project.logo} alt="" width={240} height={144} sizes="(max-width: 639px) 35vw, (max-width: 1023px) 240px, 220px" className="h-full w-full object-contain" /> : <span aria-hidden="true" className="break-words text-center text-lg font-extrabold text-brk-on-surface">{project.name}</span>}
            </div>
          </div>
          <div className="flex min-w-0 flex-col justify-center px-3 py-4 sm:px-5 sm:py-5">
            <h3 className="break-words text-lg font-bold text-brk-on-surface sm:text-xl">{project.name}</h3>
            <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-brk-muted">{project.description}</p>
            <span className="wi300-project-action mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold sm:mt-4">Khám phá dự án<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></span>
          </div>
        </Link>
      </li>)}
    </ul> : <p className="rounded-2xl border border-brk-outline bg-white p-6 text-brk-muted">Các dự án sẽ được cập nhật tại đây.</p>}
    {!error && homeProjects.length > 0 && <p className="mt-6 text-center text-sm leading-6 text-brk-muted">Khám phá những dự án phù hợp với bạn.</p>}
  </section>
}
