import Link from 'next/link'

export default function Wi300Breadcrumb({ title, courseSlug, learning = false }: { title: string; courseSlug?: string; learning?: boolean }) {
  return <nav aria-label="Đường dẫn trang" className="shrink-0 border-b border-brk-outline bg-brk-surface text-brk-on-surface"><ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 text-xs sm:text-sm lg:px-6">
    <li><Link href="/" className="font-semibold text-brk-primary">Trang chủ</Link></li><li aria-hidden="true">/</li>
    <li><Link href="/khoa-hoc" className="text-brk-primary">Khóa học</Link></li><li aria-hidden="true">/</li>
    <li className="min-w-0 max-w-full truncate">{learning && courseSlug ? <Link href={`/khoa-hoc/${encodeURIComponent(courseSlug)}`} className="text-brk-primary">{title}</Link> : <span aria-current="page">{title}</span>}</li>
    {learning && <><li aria-hidden="true">/</li><li aria-current="page">Học tập</li></>}
  </ol></nav>
}
