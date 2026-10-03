'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Compass, Wrench } from 'lucide-react'
import type { CatalogCourse, CatalogEnrollment } from '@/lib/course-catalog'

interface Props {
  title: string; subtitle?: string | null; heroImage?: string | null; userName?: string | null
  courses: CatalogCourse[]; activeCourses: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment>
  catalog?: ReactNode; myCourses?: ReactNode; roadmap?: ReactNode; community?: ReactNode; message?: ReactNode
  roadmapTitle: string; onOpenMembership: () => void; isLoggedIn: boolean
}

export default function HomeOverview({ title, catalog, myCourses, roadmap, community, message, roadmapTitle, onOpenMembership, isLoggedIn }: Props) {
  const links = useMemo(() => [
    ...(roadmap ? [{ id: 'learning-path', label: 'Lộ trình' }] : []),
    { id: 'ecosystem', label: 'Công cụ' },
    ...(myCourses ? [{ id: 'my-courses', label: 'Không gian của tôi' }] : []),
    ...(catalog ? [{ id: 'catalog', label: 'Khám phá khóa học' }] : []),
    ...(community ? [{ id: 'community', label: 'Cộng đồng' }] : []),
  ], [roadmap, myCourses, catalog, community])
  const [active, setActive] = useState(links[0].id)
  const navigation = useRef<HTMLElement>(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      const header = document.querySelector('header')
      const top = header?.getBoundingClientRect().height || 0
      if (navigation.current) navigation.current.style.top = `${top}px`
      const offset = top + (navigation.current?.getBoundingClientRect().height || 0) + 16
      let current = links[0].id
      for (const link of links) {
        const section = document.getElementById(link.id)
        if (!section) continue
        section.style.scrollMarginTop = `${offset}px`
        if (section.getBoundingClientRect().top <= offset + 8) current = link.id
      }
      setActive(current)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const observer = new ResizeObserver(schedule)
    const header = document.querySelector('header')
    if (header) observer.observe(header)
    if (navigation.current) observer.observe(navigation.current)
    schedule()
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); observer.disconnect(); cancelAnimationFrame(frame) }
  }, [links])
  return <>
    {message ? <section aria-label="Thông điệp">{message}</section> : <h1 className="mx-auto max-w-7xl px-4 py-6 text-3xl font-bold text-brk-on-surface">{title}</h1>}
    <nav ref={navigation} aria-label="Lối tắt trang chủ" className="sticky top-14 z-40 border-y border-brk-outline bg-brk-surface shadow-sm">
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6"><div className="flex min-w-max gap-2 py-2">{links.map(link => <a key={link.id} href={`#${link.id}`} aria-current={active === link.id ? 'location' : undefined} className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold ${active === link.id ? 'bg-brk-primary text-brk-on-primary' : 'text-brk-muted hover:bg-brk-background'}`}>{link.label}</a>)}</div></div>
    </nav>
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 pb-16 sm:space-y-10 sm:px-6">
    {roadmap && <section id="learning-path" className="scroll-mt-24"><h2 className="mb-4 text-2xl font-bold text-brk-on-surface">{roadmapTitle}</h2><div className="min-w-0">{roadmap}</div></section>}
    <section id="ecosystem" aria-label="Công cụ trong hệ sinh thái" className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-brk-on-surface">Công cụ đồng hành</h2><p className="mt-2 text-sm text-brk-muted">Đi đến các công cụ và tiện ích đang có trong hệ thống.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/tools" className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 hover:border-brk-primary"><Wrench className="mt-1 h-6 w-6 shrink-0 text-brk-primary" /><div><h3 className="font-bold text-brk-on-surface">Khám phá công cụ</h3><p className="mt-2 text-sm text-brk-muted">Chọn công cụ phù hợp với vai trò và quyền truy cập của bạn.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở khu công cụ →</span></div></Link>
        {isLoggedIn ? <button type="button" onClick={onOpenMembership} className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 text-left hover:border-brk-primary"><Compass className="mt-1 h-6 w-6 shrink-0 text-brk-primary" /><div><h3 className="font-bold text-brk-on-surface">Bảng thành viên</h3><p className="mt-2 text-sm text-brk-muted">Mở bảng thông tin và các hoạt động của tài khoản.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở bảng thành viên →</span></div></button> : <div className="rounded-2xl bg-brk-background p-5"><h3 className="font-bold text-brk-on-surface">Học theo nhịp của bạn</h3><p className="mt-2 text-sm text-brk-muted">Sau khi đăng nhập, các khóa đang học và tiến độ sẽ xuất hiện ngay trên trang chủ.</p></div>}
      </div>
    </section>


    {myCourses}

    {catalog}
    {community && <section id="community" aria-label="Cộng đồng" className="min-w-0 border-t border-brk-outline pt-6">{community}</section>}
    </div>
  </>
}
