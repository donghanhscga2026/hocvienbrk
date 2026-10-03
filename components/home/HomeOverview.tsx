'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Compass, Home, MessagesSquare, Route, Wrench } from 'lucide-react'
import HomeAreaLink, { type HomeArea } from './HomeAreaLink'
import { CourseListRow } from './CourseCatalog'
import type { CatalogCourse, CatalogEnrollment } from '@/lib/course-catalog'

interface Props {
  title: string; subtitle?: string | null; heroImage?: string | null; userName?: string | null
  courses: CatalogCourse[]; activeCourses: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment>
  catalog?: ReactNode; myCourses?: ReactNode; roadmap?: ReactNode; community?: ReactNode; message?: ReactNode
  discoveryPreview?: ReactNode; communityPreview?: ReactNode
  roadmapTitle: string; onOpenMembership: () => void; isLoggedIn: boolean
}

const headingClass = 'border-l-4 border-brk-primary pl-4 text-2xl font-extrabold tracking-tight text-brk-on-surface sm:text-3xl'

export default function HomeOverview({ title, activeCourses, enrollments, catalog, myCourses, roadmap, community, message, roadmapTitle, onOpenMembership, isLoggedIn }: Props) {
  const params = useSearchParams()
  const navigation = useRef<HTMLElement>(null)
  const links = [
    { area: 'home' as const, label: 'Tổng quan', icon: Home, description: 'Thông điệp và các lối vào nhanh.' },
    ...(roadmap ? [{ area: 'path' as const, label: 'Lộ trình', icon: Route, description: 'Xác định mục tiêu và bước học tiếp theo.' }] : []),
    { area: 'learning' as const, label: 'Học tập', icon: BookOpen, description: 'Khóa đang học và khóa bạn giảng dạy.' },
    ...(catalog ? [{ area: 'discover' as const, label: 'Khám phá', icon: Compass, description: 'Tìm khóa học theo danh mục, giáo viên và mức phí.' }] : []),
    { area: 'tools' as const, label: 'Công cụ', icon: Wrench, description: 'Các tiện ích đồng hành cùng bạn.' },
    ...(community ? [{ area: 'community' as const, label: 'Cộng đồng', icon: MessagesSquare, description: 'Trao đổi và chia sẻ cùng mọi người.' }] : []),
  ]
  const requested = params.get('section')
  const area: HomeArea = links.find(link => link.area === requested)?.area || 'home'

  useEffect(() => {
    const header = document.querySelector('header')
    const update = () => { if (navigation.current) navigation.current.style.top = (header?.getBoundingClientRect().height || 0) + 'px' }
    const observer = new ResizeObserver(update)
    if (header) observer.observe(header)
    window.addEventListener('resize', update)
    update()
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  const tools = <section id="ecosystem" aria-label="Công cụ trong hệ sinh thái" className="min-w-0">
    <h2 className={headingClass}>Công cụ đồng hành</h2><p className="mt-3 text-sm text-brk-muted">Mở các tiện ích hỗ trợ học tập và công việc.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Link href="/tools" className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 hover:border-brk-primary"><Wrench className="mt-1 h-6 w-6 shrink-0 text-brk-primary" aria-hidden /><div><h3 className="font-bold text-brk-on-surface">Khám phá công cụ</h3><p className="mt-2 text-sm text-brk-muted">Chọn công cụ phù hợp với vai trò và quyền truy cập của bạn.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở khu công cụ →</span></div></Link>
      {isLoggedIn ? <button type="button" onClick={onOpenMembership} className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 text-left hover:border-brk-primary"><Compass className="mt-1 h-6 w-6 shrink-0 text-brk-primary" aria-hidden /><div><h3 className="font-bold text-brk-on-surface">Bảng thành viên</h3><p className="mt-2 text-sm text-brk-muted">Thông tin và hoạt động của tài khoản.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở bảng thành viên →</span></div></button> : <div className="rounded-2xl border border-brk-outline bg-brk-surface p-5"><h3 className="font-bold text-brk-on-surface">Học theo nhịp của bạn</h3><p className="mt-2 text-sm text-brk-muted">Đăng nhập để theo dõi các khóa đã đăng ký và tiến độ học.</p><Link href="/login" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Đăng nhập →</Link></div>}
    </div>
  </section>

  return <>
    {area === 'home' && (message ? <section aria-label="Thông điệp">{message}</section> : <h1 className="mx-auto max-w-7xl px-4 py-6 text-3xl font-extrabold text-brk-on-surface">{title}</h1>)}
    <nav ref={navigation} aria-label="Điều hướng hệ sinh thái" className="sticky top-14 z-40 border-y border-brk-outline bg-brk-surface shadow-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-3 py-3 sm:flex sm:flex-wrap sm:px-6">
        {links.map(({ area: next, label, icon: Icon }) => <HomeAreaLink key={next} area={next} aria-current={area === next ? 'page' : undefined} className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-sm font-bold sm:gap-2 sm:px-5 ${area === next ? 'border-brk-primary bg-brk-primary text-brk-on-primary' : 'border-brk-outline text-brk-on-surface hover:border-brk-primary hover:bg-brk-background'}`}>
          <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden /><span>{label}</span>
        </HomeAreaLink>)}
      </div>
    </nav>
    <div data-home-area={area} className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6">
      <h1 id="home-area-title" tabIndex={-1} className={`${headingClass} outline-none`}>{links.find(link => link.area === area)?.label}</h1>
      {area === 'home' && <>
        <section id="home-shortcuts" aria-label="Lối vào nhanh" className="min-w-0">
          <p className="mb-5 text-sm text-brk-muted">Chọn khu vực bạn cần để bắt đầu.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.filter(link => link.area !== 'home').map(({ area: next, label, description, icon: Icon }) => <HomeAreaLink key={next} area={next} id={next === 'discover' ? 'khoa-hoc' : undefined} className="flex min-w-0 items-start gap-3 rounded-2xl border border-brk-outline bg-brk-surface p-4 hover:border-brk-primary">
              <Icon aria-hidden className="mt-1 h-6 w-6 shrink-0 text-brk-primary" /><div className="min-w-0"><h2 className="text-lg font-bold text-brk-on-surface">{label} →</h2><p className="mt-1 text-sm text-brk-muted">{description}</p></div>
            </HomeAreaLink>)}
          </div>
        </section>
        {isLoggedIn && <section id="continue-learning" aria-label="Tiếp tục học" className="min-w-0 rounded-2xl border border-brk-primary/20 bg-brk-background p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className={headingClass}>Tiếp tục học</h2><HomeAreaLink area="learning" className="inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Mở khu Học tập →</HomeAreaLink></div>
          {activeCourses.filter(course => !enrollments[course.id]?.hiddenFromGifts).length ? <div className="space-y-3">{activeCourses.filter(course => !enrollments[course.id]?.hiddenFromGifts).slice(0, 1).map(course => <CourseListRow key={course.id} course={course} enrollment={enrollments[course.id]} />)}</div> : <p className="text-sm text-brk-muted">Bạn chưa có khóa đang học trên trang này. Mở Học tập để xem các khóa đã đăng ký và khóa bạn phụ trách.</p>}
        </section>}
      </>}
      {area === 'path' && <section id="learning-path"><h2 className={`mb-5 ${headingClass}`}>{roadmapTitle}</h2><div className="min-w-0">{roadmap}</div></section>}
      {area === 'learning' && (myCourses || <section className="rounded-2xl border border-brk-outline bg-brk-surface p-6"><h2 className="text-xl font-bold text-brk-on-surface">Đăng nhập để xem khóa học của bạn</h2><p className="mt-2 text-sm text-brk-muted">Theo dõi tiến độ và tiếp tục các khóa đã đăng ký.</p><Link href="/login" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Đăng nhập</Link></section>)}
      {area === 'discover' && catalog}
      {area === 'tools' && tools}
      {area === 'community' && <section id="community" aria-label="Cộng đồng" className="min-w-0">{community}</section>}
    </div>
  </>
}
