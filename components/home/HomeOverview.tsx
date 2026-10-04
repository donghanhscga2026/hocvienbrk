'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Compass, Home, MessagesSquare, Route, Wrench, UserRound } from 'lucide-react'
import HomeAreaLink, { type HomeArea } from './HomeAreaLink'
import { CourseListRow } from './CourseCatalog'
import type { CatalogCourse, CatalogEnrollment } from '@/lib/course-catalog'

interface Props {
  title: string; subtitle?: string | null; heroImage?: string | null; userName?: string | null
  courses: CatalogCourse[]; activeCourses: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment>
  catalog?: ReactNode; myCourses?: ReactNode; roadmap?: ReactNode; community?: ReactNode; message?: ReactNode
  discoveryPreview?: ReactNode; communityPreview?: ReactNode
  roadmapTitle: string; isLoggedIn: boolean
}

const headingClass = 'text-xl font-semibold leading-snug text-brk-on-surface sm:text-[22px]'

export default function HomeOverview({ title, activeCourses, enrollments, catalog, myCourses, roadmap, community, message, roadmapTitle, isLoggedIn }: Props) {
  const params = useSearchParams()
  const navigation = useRef<HTMLElement>(null)
  const links = [
    ...(catalog ? [{ area: 'discover' as const, label: 'Khóa học', icon: Compass, description: 'Tìm khóa học theo danh mục, giáo viên và mức phí.' }] : []),
    { area: 'home' as const, label: 'Tổng quan', icon: Home, description: 'Các lối vào nhanh trong hệ sinh thái.' },
    ...(roadmap ? [{ area: 'path' as const, label: 'Lộ trình', icon: Route, description: 'Xác định mục tiêu và bước học tiếp theo.' }] : []),
    { area: 'learning' as const, label: 'Học tập', icon: BookOpen, description: 'Khóa đang học và khóa bạn giảng dạy.' },
    { area: 'tools' as const, label: 'Công cụ', icon: Wrench, description: 'Các tiện ích đồng hành cùng bạn.' },
    ...(community ? [{ area: 'community' as const, label: 'Cộng đồng', icon: MessagesSquare, description: 'Trao đổi và chia sẻ cùng mọi người.' }] : []),
  ]
  const requested = params.get('section')
  // Menu chính ưu tiên nội dung công khai; các mục cũ vẫn nhận đường dẫn đã chia sẻ.
  const publicLinks = links.filter(link => ['discover', 'path', 'community'].includes(link.area))
  const spaceHref = isLoggedIn ? '/my-space' : '/login?callbackUrl=%2Fmy-space'
  const defaultArea: HomeArea = catalog ? 'discover' : 'home'
  const area: HomeArea = links.find(link => link.area === requested)?.area || defaultArea
  const resumeCourse = isLoggedIn ? activeCourses.find(course => enrollments[course.id]?.status === 'ACTIVE' && !enrollments[course.id]?.hiddenFromGifts && enrollments[course.id]?.totalLessons > 0) : undefined
  const resumeEnrollment = resumeCourse ? enrollments[resumeCourse.id] : undefined

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
    <p className="mt-0 text-sm text-brk-muted">Mở các tiện ích hỗ trợ học tập và công việc.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Link href="/tools" className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 hover:border-brk-primary"><Wrench className="mt-1 h-6 w-6 shrink-0 text-brk-primary" aria-hidden /><div><h3 className="font-bold text-brk-on-surface">Khám phá công cụ</h3><p className="mt-2 text-sm text-brk-muted">Chọn công cụ phù hợp với vai trò và quyền truy cập của bạn.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở khu công cụ →</span></div></Link>
      {isLoggedIn && <Link href="/my-space" className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 hover:border-brk-primary"><Home className="mt-1 h-6 w-6 shrink-0 text-brk-primary" aria-hidden /><div><h3 className="font-bold text-brk-on-surface">Không gian của tôi</h3><p className="mt-2 text-sm text-brk-muted">Học tập, hỗ trợ và các hoạt động cá nhân trong hệ sinh thái.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở không gian của tôi →</span></div></Link>}
      {isLoggedIn ? <Link href="/account-settings" className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 hover:border-brk-primary"><UserRound className="mt-1 h-6 w-6 shrink-0 text-brk-primary" aria-hidden /><div><h3 className="font-bold text-brk-on-surface">Tài khoản của tôi</h3><p className="mt-2 text-sm text-brk-muted">Cập nhật thông tin cá nhân, bảo mật và tài khoản nhận thanh toán.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Quản lý tài khoản →</span></div></Link> : <div className="rounded-2xl border border-brk-outline bg-brk-surface p-5"><h3 className="font-bold text-brk-on-surface">Học theo nhịp của bạn</h3><p className="mt-2 text-sm text-brk-muted">Đăng nhập để theo dõi các khóa đã đăng ký và tiến độ học.</p><Link href="/login" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Đăng nhập →</Link></div>}
    </div>
  </section>

  return <>
    {area === 'discover' && (message ? <section aria-label="Thông điệp">{message}</section> : <h1 className="mx-auto max-w-7xl px-4 py-6 text-2xl font-semibold text-brk-on-surface sm:text-[28px]">{title}</h1>)}
    <nav ref={navigation} aria-label="Điều hướng hệ sinh thái" className="sticky top-14 z-40 border-y border-brk-outline bg-brk-surface shadow-sm">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-3 py-3 sm:flex sm:flex-wrap sm:px-6">
        {publicLinks.map(({ area: next, label, icon: Icon }) => <HomeAreaLink key={next} area={next} aria-current={area === next ? 'page' : undefined} className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-sm font-bold sm:gap-2 sm:px-5 ${area === next ? 'border-brk-primary bg-brk-primary text-brk-on-primary' : 'border-brk-outline text-brk-on-surface hover:border-brk-primary hover:bg-brk-background'}`}>
          <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden /><span>{label}</span>
        </HomeAreaLink>)}
        <Link href={spaceHref} className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-brk-outline px-2 py-2 text-sm font-bold text-brk-on-surface hover:border-brk-primary hover:bg-brk-background sm:gap-2 sm:px-5"><UserRound className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden /><span>Không gian của tôi</span></Link>
      </div>
    </nav>
    <div data-home-area={area} className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6">
      {area !== 'discover' && <div className={area === 'community' ? 'sr-only' : ''}>
        <h1 id="home-area-title" tabIndex={-1} className="text-2xl font-semibold leading-tight tracking-tight text-brk-on-surface outline-none sm:text-[28px]">{area === 'path' ? roadmapTitle : area === 'tools' ? 'Công cụ đồng hành' : links.find(link => link.area === area)?.label}</h1>
        <span aria-hidden className="mt-3 block h-1 w-8 rounded-full bg-brk-primary" />
      </div>}
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
      {area === 'path' && <section id="learning-path"><div className="min-w-0">{roadmap}</div></section>}
      {area === 'learning' && (myCourses || <section className="rounded-2xl border border-brk-outline bg-brk-surface p-6"><h2 className="text-xl font-bold text-brk-on-surface">Đăng nhập để xem khóa học của bạn</h2><p className="mt-2 text-sm text-brk-muted">Theo dõi tiến độ và tiếp tục các khóa đã đăng ký.</p><Link href="/login" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brk-primary px-5 font-semibold text-brk-on-primary">Đăng nhập</Link></section>)}
      {area === 'discover' && <>
        {resumeCourse && resumeEnrollment && <section id="discovery-continue-learning" aria-label="Tiếp tục học" className="flex min-w-0 flex-col gap-3 rounded-2xl border border-brk-primary/20 bg-brk-background p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brk-primary">Tiếp tục học</p>
            <h2 className="mt-1 break-words text-base font-semibold text-brk-on-surface">{resumeCourse.name_lop}</h2>
            <p className="mt-1 text-xs text-brk-muted">Đã học {resumeEnrollment.completedCount}/{resumeEnrollment.totalLessons} bài</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link href={`/courses/${encodeURIComponent(resumeCourse.id_khoa)}/learn`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-brk-on-primary">Học tiếp →</Link>
            <Link href="/my-space" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-brk-primary">Không gian của tôi</Link>
          </div>
        </section>}
        {catalog}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-brk-outline pt-3 text-sm">
          <Link href="/tools" className="inline-flex min-h-11 items-center text-brk-primary">Công cụ tiện ích công khai →</Link>
        </div>
      </>}
      {area === 'tools' && tools}
      {area === 'community' && <section id="community" aria-label="Cộng đồng" className="min-w-0">{community}</section>}
    </div>
  </>
}
