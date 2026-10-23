import Link from 'next/link'
import type { ReactNode } from 'react'

export default function Wi300Breadcrumb({ title, courseSlug, learning = false, projectLabels }: { title: string; courseSlug?: string; learning?: boolean; projectLabels?: ReactNode }) {
  const trail = <>
    <li><Link href="/" className="font-semibold text-brk-primary">Trang chủ</Link></li><li aria-hidden="true">/</li>
    <li><Link href="/khoa-hoc" className="text-brk-primary">Khóa học</Link></li><li aria-hidden="true">/</li>
    <li className="min-w-0 max-w-full truncate">{learning && courseSlug ? <Link href={`/khoa-hoc/${encodeURIComponent(courseSlug)}`} className="text-brk-primary">{title}</Link> : <span aria-current="page">{title}</span>}</li>
    {learning && <><li aria-hidden="true">/</li><li aria-current="page">Học tập</li></>}
  </>
  return <nav aria-label="Đường dẫn trang" className="shrink-0 border-b border-brk-outline bg-brk-surface text-brk-on-surface">
    {projectLabels ? <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1 text-xs sm:text-sm lg:px-6">
      <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-2">{trail}</ol>
      <div className="min-w-0 max-w-full">{projectLabels}</div>
    </div> : <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 text-xs sm:text-sm lg:px-6">{trail}</ol>}
  </nav>
}
