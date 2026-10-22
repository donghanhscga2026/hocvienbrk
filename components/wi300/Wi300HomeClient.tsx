'use client'

import { defaultAppearance, gridColumns, type WiAppearance } from '@/lib/wi300/appearance'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, Search, Sparkles, BriefcaseBusiness, Package, UsersRound, Sprout, Handshake } from 'lucide-react'
import CourseCard from '@/components/course/CourseCard'
import type { CourseProjectBadge } from '@/components/course/CourseProjectBadges'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { categoryName, filterCourses, sortCourses, type CourseSort } from '@/lib/wi300/catalog'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import type { Wi300Course, Wi300Enrollment, Wi300TeachingCourse } from './Wi300Home'
import Wi300PersonalSpace from './Wi300PersonalSpace'
import Wi300Businesses from './Wi300Businesses'
import Wi300Teachers from './Wi300Teachers'
import WiKnowledgeArt from './WiKnowledgeArt'
import WiCourseHero from './WiCourseHero'
import type { PublicWiProject } from '@/lib/wi300/projects'

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
export type Wi300HomeClientProps = {
  appearance?: WiAppearance;
  catalogHeroRendered?: boolean;
  projects?: PublicWiProject[]; projectsError?: boolean;
  brand: DeploymentBrand; courses: Wi300Course[]; enrollments: Wi300Enrollment[];
  teachingCourses?: Wi300TeachingCourse[]; teachingError?: boolean;
  userId: number | null; userPhone: string | null; loggedIn: boolean;
  catalogError: boolean; accountError: boolean; view?: 'home' | 'catalog' | 'discover' | 'space' | 'teachers';
}

type Props = Wi300HomeClientProps

export default function Wi300HomeClient(props: Props) {
  return <Suspense fallback={<div className="p-8 text-center">Đang tải khóa học…</div>}><HomeRoute {...props} /></Suspense>
}

// Khi chọn giảng viên trên cùng trang, áp dụng từ khóa mới và đặt lại bộ lọc.
function HomeRoute(props: Props) {
  const searchParams = useSearchParams()
  return <HomeContent key={(props.view || 'home') + ':' + (searchParams.get('q') || '') + ':' + (searchParams.get('teacher') || '')} {...props} />
}

function HomeContent({ brand, courses, enrollments, userId, userPhone, loggedIn, catalogError, accountError, teachingCourses = [], teachingError = false, view = 'home', projects, projectsError = false, appearance = defaultAppearance, catalogHeroRendered = false }: Props) {
  const page = appearance.courses
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState('')
  const [fee, setFee] = useState('all')
  const [sort, setSort] = useState<CourseSort>('recommended')
  const [limit, setLimit] = useState(9)
  const [dismissedPayment, setDismissedPayment] = useState<string | null>(null)
  const paymentId = searchParams.get('paymentCourseId')
  const paymentCourse = loggedIn && paymentId !== dismissedPayment ? courses.find(course => String(course.id) === paymentId) : undefined
  const enrollmentMap = new Map(enrollments.map(enrollment => [enrollment.courseId, enrollment]))
  // Gom liên kết một lần, không gọi API hoặc quét toàn bộ dự án cho từng card.
  const courseProjects = useMemo(() => {
    const byCourse = new Map<number, CourseProjectBadge[]>()
    if (projectsError) return byCourse
    for (const project of projects || []) {
      if (!project.published) continue
      const badge = { slug: project.slug, name: project.name, logo: project.logo }
      for (const courseId of project.courseIds) {
        const badges = byCourse.get(courseId) || []
        badges.push(badge)
        byCourse.set(courseId, badges)
      }
    }
    return byCourse
  }, [projects, projectsError])
  const categories = Array.from(new Set(courses.map(categoryName)))
  const filtered = sortCourses(filterCourses(courses.filter(course => !searchParams.get('teacher') || String(course.teacherId) === searchParams.get('teacher')), query, page.showCategories ? category : '', page.showFee ? fee : 'all'), sort)
  // Lấy giảng viên từ danh mục hiện có, gom theo mã tài khoản thay vì danh sách tên.
  const teacherMap = new Map<number, { id: number; name: string; image: string | null; count: number; fields: string[] }>()
  for (const course of courses) {
    const name = course.teacher?.name?.trim()
    if (course.teacherId == null || !name) continue
    const current = teacherMap.get(course.teacherId)
    if (current) {
      current.count += 1
      if (!current.fields.includes(categoryName(course))) current.fields.push(categoryName(course))
      current.image ||= course.teacher?.image?.trim() || null
    } else {
      teacherMap.set(course.teacherId, { id: course.teacherId, name, image: course.teacher?.image?.trim() || null, count: 1, fields: [categoryName(course)] })
    }
  }
  const teachers = [...teacherMap.values()]
  const paymentCourseId = paymentCourse?.id
  const paymentEnrollmentStatus = paymentCourseId != null ? enrollmentMap.get(paymentCourseId)?.status : undefined

  useEffect(() => {
    if (paymentCourseId == null || paymentEnrollmentStatus === 'ACTIVE') return
    let cancelled = false
    // [Tối ưu Vercel] Kiểm tra mỗi 20 giây thay vì 10 giây: giảm một nửa số lần gọi server action khi chờ kích hoạt.
    const interval = window.setInterval(async () => {
      try {
        const result = await checkEnrollmentStatusAction(paymentCourseId)
        if (!cancelled && result.status === 'ACTIVE') window.location.reload()
      } catch { /* Thử lại ở lần kiểm tra sau, giữ nguyên thông tin thanh toán. */ }
    }, 20_000)
    const timeout = window.setTimeout(() => window.clearInterval(interval), 20 * 60_000)
    return () => { cancelled = true; window.clearInterval(interval); window.clearTimeout(timeout) }
  }, [paymentCourseId, paymentEnrollmentStatus])

  const closePayment = () => {
    setDismissedPayment(paymentId)
    const url = new URL(window.location.href)
    url.searchParams.delete('paymentCourseId')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
  const clearFilters = () => { setQuery(''); setCategory(''); setFee('all'); setSort('recommended'); setLimit(9) }
  const card = (course: Wi300Course, index: number) => <CourseCard key={course.id} course={course} projectBadges={courseProjects.get(course.id)} isLoggedIn={loggedIn} enrollment={enrollmentMap.get(course.id)} userId={userId} userPhone={userPhone} priority={index < 3} showSharing shareSiteName={brand.name} />

  // Render theo thứ tự thật để bàn phím và trình đọc màn hình cùng thứ tự hiển thị.
  const homeSections = {
    hero: <section key="hero" aria-labelledby="wi300-hero-title" className="wi300-hero relative overflow-hidden border-b border-brk-outline">
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:py-16">
          <div className="min-w-0">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brk-outline bg-brk-background px-3 py-2 text-xs font-semibold text-brk-primary"><Sparkles className="h-4 w-4" aria-hidden="true" />{brand.tagline}</p>
            <h1 id="wi300-hero-title" className="wi300-hero-title break-words mt-5 max-w-2xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.4rem] xl:text-6xl">{appearance.home.title.split("\n").map((line, i) => <span key={i} className="block">{line}</span>)}</h1>
            <div aria-hidden="true" className="mt-5 h-1.5 w-16 rounded-full bg-brk-accent" />
            <p className="mt-6 max-w-xl text-base leading-7 text-brk-muted sm:text-lg">{appearance.home.description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={appearance.home.primaryUrl} className="wi300-hero-primary inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-5 py-3 font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-accent">{appearance.home.primaryLabel}<ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
              <Link href={appearance.home.secondaryUrl} className="wi300-hero-secondary inline-flex min-h-12 items-center justify-center rounded-xl border px-5 py-3 font-semibold hover:bg-brk-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary">{appearance.home.secondaryLabel}</Link>
            </div>
            {/* Ba thông điệp có icon riêng, tự xuống hàng khi màn hình hẹp. */}
            <ul aria-label="Giá trị hệ sinh thái Wi" className="mt-6 grid gap-3 sm:grid-cols-3">
              {[{ label: 'Kết nối con người', icon: UsersRound }, { label: 'Lan tỏa tri thức', icon: BookOpen }, { label: 'Kiến tạo tương lai', icon: Sprout }].map(({ label, icon: Icon }) => <li key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-brk-outline bg-brk-surface/80 px-3 py-3">
                <span className="wi300-hero-title flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brk-background"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="text-sm font-semibold leading-5 text-brk-on-surface">{label}</span>
              </li>)}
            </ul>
          </div>
          <figure className="min-w-0">
            {/* Mặt nạ ẩn nền poster, giữ nguyên chữ và biểu tượng từ ảnh gốc. */}
            <a href={appearance.home.imageUrl || "/wi300/ecosystem-banner.webp"} target="_blank" rel="noopener noreferrer" className={`${appearance.home.imageUrl ? "" : "wi300-ecosystem-art"} mx-auto block w-full max-w-[36rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary`} aria-label="Xem ảnh hệ sinh thái Wi đầy đủ (mở tab mới)">
              <Image src={appearance.home.imageUrl || "/wi300/ecosystem-banner.webp"} alt="WI.CAN kết nối Wi.Grow, Wi.Mentor, Wi.Tech, Wi.Art, Wi.Finance, Wi.Marketing, Wi.Yoga, Wi.Book và Wi.Wellness" width={1280} height={720} priority sizes="(max-width: 639px) 210vw, (max-width: 1023px) 1200px, 1150px" unoptimized={!!appearance.home.imageUrl} className={appearance.home.imageUrl ? "h-auto w-full object-contain" : "wi300-ecosystem-source"} />
            </a>
            <figcaption className="wi300-hero-title mx-auto mt-5 max-w-md text-center text-xl font-extrabold uppercase tracking-[0.1em] sm:text-2xl">Hệ sinh thái Wi</figcaption>
          </figure>
        </div>
      </section>,
    discovery: <section key="discovery" id="ban-dang-tim-gi" aria-labelledby="wi300-discovery-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 pt-10 sm:pt-12 lg:scroll-mt-24 lg:px-6">
        <h2 id="wi300-discovery-title" className="text-2xl font-bold sm:text-3xl">Bạn đang tìm gì?</h2>
        <div aria-label="Nội dung khám phá" className="mt-6 grid gap-4 sm:grid-cols-3">
          {[{ href: '/khoa-hoc', title: 'Khóa học', description: 'Khám phá tri thức và kỹ năng', icon: BookOpen }, { href: '/san-pham', title: 'Sản phẩm', description: 'Tìm sản phẩm phù hợp với bạn', icon: Package }, { href: '/dich-vu', title: 'Dịch vụ', description: 'Kết nối giải pháp và người hỗ trợ', icon: BriefcaseBusiness }].map(({ href, title, description, icon: Icon }, index) => <Link key={href} href={href} data-tone={index} className="wi300-discovery-card flex min-h-48 flex-col rounded-3xl border border-brk-outline bg-white p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary sm:p-6">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brk-primary/10 text-brk-primary"><Icon className="h-6 w-6" aria-hidden="true" /></span><h3 className="text-lg font-bold">{title}</h3></div>
            <p className="mt-3 text-sm leading-6 text-brk-muted">{description}</p><span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-sm font-semibold text-brk-primary">Xem {title.toLocaleLowerCase('vi')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>)}
        </div>
      </section>,
    projects: <Wi300Businesses key="projects" projects={projects} error={projectsError} limit={appearance.home.projectLimit} />,
    start: <section key="start" className="mx-auto max-w-7xl px-4 pb-12 lg:px-6" aria-labelledby="wi300-start-title">
      <h2 id="wi300-start-title" className="text-2xl font-bold sm:text-3xl">Bắt đầu cùng Wi</h2>
      <p className="mt-2 text-sm leading-6 text-brk-muted">Chọn cách đồng hành phù hợp với bạn.</p>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="wi300-solution-card flex flex-col rounded-3xl border border-brk-outline bg-white p-6 sm:p-8">
          <span className="wi300-project-action flex h-14 w-14 items-center justify-center rounded-2xl bg-brk-primary/10"><BookOpen className="h-7 w-7" aria-hidden="true" /></span><h3 className="mt-4 text-2xl font-bold">Bạn đang tìm giải pháp phù hợp?</h3>
          <p className="mt-4 leading-7 text-brk-muted">Khám phá khóa học, sản phẩm và dịch vụ phù hợp với nhu cầu của bạn từ các dự án trong hệ sinh thái Wi.</p>
          {/* Ba lối vào rõ ràng, nút rộng dễ bấm trên điện thoại. */}
          <nav aria-label="Tìm giải pháp phù hợp" className="mt-auto grid gap-3 pt-6">{[{ href: '/khoa-hoc', label: 'Khóa học', icon: BookOpen }, { href: '/san-pham', label: 'Sản phẩm', icon: Package }, { href: '/dich-vu', label: 'Dịch vụ', icon: BriefcaseBusiness }].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="wi300-solution-link flex min-h-14 items-center gap-3 rounded-xl border border-brk-outline bg-brk-surface px-4 py-3 text-sm font-semibold transition-colors hover:bg-brk-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary"><Icon className="wi300-project-action h-6 w-6 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 text-brk-on-surface">{label}</span><ArrowRight className="h-5 w-5 shrink-0 text-brk-accent" aria-hidden="true" /></Link>)}</nav>
        </div>
        <div aria-labelledby="wi300-partner-title" className="wi300-partner-card flex flex-col rounded-3xl bg-brk-primary p-6 text-white sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/10"><Handshake className="h-7 w-7" aria-hidden="true" /></span>
          <p className="mt-4 text-sm font-semibold text-white/80">Dành cho giảng viên và doanh nghiệp</p>
          <h3 id="wi300-partner-title" className="mt-3 text-2xl font-bold">Trở thành đối tác {brand.name}</h3>
          <p className="mt-4 leading-7 text-white/90">Chia sẻ chuyên môn, giới thiệu giá trị của doanh nghiệp và cùng mở rộng cơ hội hợp tác trong Liên minh 300 doanh nghiệp số.</p>
          <p className="mt-3 text-sm leading-6 text-white/80">Gửi yêu cầu tham gia. Ban điều phối sẽ xem hồ sơ và trao đổi trực tiếp trước khi cấp quyền.</p>
          <div className="mt-auto pt-6"><Link href="/doi-tac" className="wi300-hero-primary inline-flex min-h-14 items-center justify-center gap-3 rounded-xl px-6 py-3 font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Gửi yêu cầu tham gia<ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" /></Link></div>
        </div>
      </div>
    </section>,
  }
  return <main className={`overflow-x-clip bg-brk-background text-brk-on-surface ${view === "home" ? "flex flex-col [&>section]:w-full" : ""}`}>
    {view === 'home' && !appearance.home.sections.hero && <h1 className="sr-only">{brand.name}</h1>}
    {view === 'home' && appearance.home.order.map(section => appearance.home.sections[section] ? homeSections[section] : null)}
    {view === 'discover' && <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-6">
      <h1 className="text-3xl font-bold">Khám phá hệ sinh thái {brand.name}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-brk-muted">Kết nối doanh nghiệp, giảng viên và tìm nội dung phù hợp với bạn.</p>
      <Image src="/wi300/ecosystem-banner.webp" alt="Hệ sinh thái Wi: kết nối con người, lan tỏa giá trị, kiến tạo tương lai" width={1280} height={720} sizes="(max-width: 1280px) 100vw, 1232px" className="mt-6 h-auto w-full rounded-2xl border border-brk-outline" />
      <nav aria-label="Nội dung khám phá" className="mt-5 flex flex-wrap gap-2">
        {[{ href: '#khoa-hoc', label: 'Khóa học', icon: BookOpen }, { href: '#san-pham', label: 'Sản phẩm', icon: Package }, { href: '#dich-vu', label: 'Dịch vụ', icon: BriefcaseBusiness }].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary hover:border-brk-primary"><Icon className="h-5 w-5" aria-hidden="true" />{label}</Link>)}
      </nav>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">{[{ id: 'san-pham', title: 'Sản phẩm', icon: Package }, { id: 'dich-vu', title: 'Dịch vụ', icon: BriefcaseBusiness }].map(({ id, title, icon: Icon }) => <section id={id} key={id} className="scroll-mt-44 rounded-2xl border border-brk-outline p-5 lg:scroll-mt-24"><Icon className="mb-3 text-brk-accent" /><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm text-brk-muted">Sẽ được bổ sung trong giai đoạn tiếp theo.</p></section>)}</div>
    </section>}
    {view === 'discover' && <><Wi300Businesses projects={projects} error={projectsError} />
      <Wi300Teachers appearance={appearance} teachers={teachers} catalogError={catalogError} />
    </>}
    {view === 'catalog' && !catalogHeroRendered && <WiCourseHero settings={page} />}
    {view === 'space' && <Wi300PersonalSpace teachingCourses={teachingCourses} teachingError={teachingError} courses={courses} enrollments={enrollments} userId={userId} userPhone={userPhone} accountError={accountError || catalogError} />}
    {(view === 'catalog' || view === 'discover') && <section id="khoa-hoc" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-12 lg:scroll-mt-24 lg:px-6">
      {view === 'catalog' && !page.showHero ? <><h1 className="text-3xl font-bold">{page.title}</h1><p className="mt-2 text-sm leading-6 text-brk-muted">{page.description}</p></> : <h2 className="text-2xl font-bold sm:text-3xl">{view === 'catalog' ? 'Danh sách khóa học' : 'Khám phá khóa học'}</h2>}{view === 'discover' && <p className="mt-2 text-sm leading-6 text-brk-muted">{page.description}</p>}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row"><label hidden={!page.showSearch} className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-brk-outline bg-white px-4"><Search className="h-5 w-5 shrink-0 text-brk-muted" /><span className="sr-only">Tìm khóa học hoặc giảng viên</span><input value={query} onChange={event => { setQuery(event.target.value); setLimit(9) }} placeholder="Tìm khóa học, giảng viên…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" type="search" /></label><label className="sr-only" htmlFor="wi300-fee">Lọc theo học phí</label><select hidden={!page.showFee} id="wi300-fee" value={fee} onChange={event => { setFee(event.target.value); setLimit(9) }} className="min-h-12 rounded-xl border border-brk-outline bg-white px-4 text-sm"><option value="all">Tất cả học phí</option><option value="free">Miễn phí</option><option value="paid">Có phí</option></select><label className="sr-only" htmlFor="wi300-sort">Sắp xếp khóa học</label><select id="wi300-sort" value={sort} onChange={event => { setSort(event.target.value as CourseSort); setLimit(9) }} className="min-h-12 rounded-xl border border-brk-outline bg-white px-4 text-sm"><option value="recommended">Đề xuất</option><option value="newest">Mới nhất</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select></div>
      <div hidden={!page.showCategories} role="group" aria-label="Danh mục khóa học" className="mt-4 flex flex-wrap gap-2">{['', ...categories].map(name => <button key={name} type="button" aria-pressed={category === name} onClick={() => { setCategory(name); setLimit(9) }} className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${category === name ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white text-brk-muted hover:border-brk-primary'}`}>{name || 'Tất cả'}</button>)}</div>
      <p role="status" className="my-5 text-sm text-brk-muted">{catalogError ? 'Danh mục tạm thời chưa tải được.' : `${filtered.length} khóa học${category ? ` · ${category}` : ''}`}</p>
      {catalogError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><p>Chưa thể tải khóa học. Vui lòng thử lại sau.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 font-semibold underline">Tải lại trang</button></div> : filtered.length ? <><div className={`grid items-start gap-5 ${gridColumns[page.columns]}`}>{filtered.slice(0, limit).map(card)}</div>{limit < filtered.length && <div className="mt-8 text-center"><button type="button" onClick={() => setLimit(value => value + 9)} className="min-h-12 rounded-xl border border-brk-outline bg-white px-6 font-semibold text-brk-primary">Xem thêm khóa học</button></div>}</> : <div className="rounded-2xl border border-brk-outline bg-white p-8 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-brk-muted" /><p className="text-brk-muted">{courses.length ? 'Chưa tìm thấy khóa học phù hợp với bộ lọc.' : 'Các khóa học sẽ được cập nhật tại đây.'}</p>{courses.length > 0 && <button type="button" onClick={clearFilters} className="mt-3 min-h-11 font-semibold text-brk-primary">Xóa bộ lọc</button>}</div>}
    </section>}

    {view === 'teachers' && <div><Wi300Teachers appearance={appearance} teachers={teachers} catalogError={catalogError} directory /></div>}
    {view === 'catalog' && page.showTeachers && <Wi300Teachers appearance={appearance} teachers={teachers} catalogError={catalogError} />}
    {/* CTA cuối danh mục: dẫn tới form đối tác hiện có, không thay đổi luồng học. */}
    {((view === 'catalog' && page.showCTA) || (view === 'teachers' && appearance.teachers.showCTA)) && <section aria-labelledby="wi300-course-partner-title" className="mx-auto max-w-7xl px-4 pb-12 lg:px-6">
      <div className="wi300-teacher-cta wi300-partner-card flex flex-col gap-6 rounded-3xl p-6 text-white sm:p-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-5"><div className="hidden w-64 shrink-0 lg:block"><WiKnowledgeArt /></div>
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 flex-col lg:hidden items-center justify-center rounded-2xl border border-white/25 bg-white/10"><Sparkles className="h-4 w-4" /><BookOpen className="mt-1 h-8 w-8" /></span>
          <div className="min-w-0"><h2 id="wi300-course-partner-title" className="break-words text-xl font-bold leading-snug sm:text-2xl">{(view === "teachers" ? appearance.teachers : page).cta.title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/90">{(view === "teachers" ? appearance.teachers : page).cta.description}</p></div>
        </div>
        <Link href={(view === "teachers" ? appearance.teachers : page).cta.url} className="wi300-teacher-register inline-flex min-h-14 shrink-0 items-center justify-center gap-3 rounded-xl bg-brk-surface px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{(view === "teachers" ? appearance.teachers : page).cta.label}<ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
      </div>
    </section>}

    {paymentCourse && <PaymentModal course={paymentCourse} enrollment={enrollmentMap.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onClose={closePayment} />}
  </main>
}
