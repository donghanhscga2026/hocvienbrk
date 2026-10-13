'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, Search, Sparkles, BriefcaseBusiness, Package } from 'lucide-react'
import CourseCard from '@/components/course/CourseCard'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { categoryName, filterCourses, searchText, sortCourses, type CourseSort } from '@/lib/wi300/catalog'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import type { Wi300Course, Wi300Enrollment, Wi300TeachingCourse } from './Wi300Home'
import Wi300PersonalSpace from './Wi300PersonalSpace'
import Wi300Businesses from './Wi300Businesses'
import Wi300Teachers from './Wi300Teachers'
import type { PublicWiProject } from '@/lib/wi300/projects'

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
type Props = {
  projects?: PublicWiProject[]; projectsError?: boolean;
  brand: DeploymentBrand; courses: Wi300Course[]; enrollments: Wi300Enrollment[];
  teachingCourses?: Wi300TeachingCourse[]; teachingError?: boolean;
  userId: number | null; userPhone: string | null; loggedIn: boolean;
  catalogError: boolean; accountError: boolean; view?: 'home' | 'catalog' | 'discover' | 'space';
}
const action = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white transition-opacity hover:opacity-90'

export default function Wi300HomeClient(props: Props) {
  return <Suspense fallback={<div className="p-8 text-center">Đang tải khóa học…</div>}><HomeRoute {...props} /></Suspense>
}

// Khi chọn giảng viên trên cùng trang, áp dụng từ khóa mới và đặt lại bộ lọc.
function HomeRoute(props: Props) {
  const searchParams = useSearchParams()
  return <HomeContent key={(props.view || 'home') + ':' + (searchParams.get('q') || '')} {...props} />
}

function HomeContent({ brand, courses, enrollments, userId, userPhone, loggedIn, catalogError, accountError, teachingCourses = [], teachingError = false, view = 'home', projects, projectsError = false }: Props) {
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
  const categories = Array.from(new Set(courses.map(categoryName)))
  const filtered = sortCourses(filterCourses(courses, query, category, fee), sort)
  const teachers = ['Cương Leo', 'Hoàng Thu Hà', 'Võ Thị Kim Hồng', 'Nguyễn Hải Yến', 'Nhàn Victory', 'Hương Lucy'].map(name => {
    const ownCourses = courses.filter(course => searchText(course.teacher?.name || '') === searchText(name))
    return { id: ownCourses[0]?.teacherId ?? name, name, image: ownCourses[0]?.teacher?.image, count: ownCourses.length || null }
  })
  const paymentCourseId = paymentCourse?.id
  const paymentEnrollmentStatus = paymentCourseId != null ? enrollmentMap.get(paymentCourseId)?.status : undefined

  useEffect(() => {
    if (paymentCourseId == null || paymentEnrollmentStatus === 'ACTIVE') return
    let cancelled = false
    const interval = window.setInterval(async () => {
      try {
        const result = await checkEnrollmentStatusAction(paymentCourseId)
        if (!cancelled && result.status === 'ACTIVE') window.location.reload()
      } catch { /* Thử lại ở lần kiểm tra sau, giữ nguyên thông tin thanh toán. */ }
    }, 10_000)
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
  const card = (course: Wi300Course, index: number) => <CourseCard key={course.id} course={course} isLoggedIn={loggedIn} enrollment={enrollmentMap.get(course.id)} userId={userId} userPhone={userPhone} priority={index < 3} showSharing shareSiteName={brand.name} />

  return <main className="overflow-x-clip bg-brk-background text-brk-on-surface">
    {view === 'home' && <>
      <section className="relative overflow-hidden border-b border-brk-outline bg-white">
        <div aria-hidden="true" className="absolute -right-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-brk-primary/5" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:px-6 lg:py-20">
          <div><p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brk-outline bg-brk-background px-3 py-2 text-xs font-semibold text-brk-primary"><Sparkles className="h-4 w-4" />{brand.tagline}</p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">Kết nối con người.<br /><span className="text-brk-primary">Lan tỏa giá trị.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-brk-muted sm:text-lg">{brand.name} kết nối cá nhân và doanh nghiệp với tri thức, sản phẩm, dịch vụ và cơ hội hợp tác trong hệ sinh thái Wi.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/#du-an-wi" className={action}>Khám phá dự án<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link href="/khoa-hoc" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brk-outline px-5 font-semibold hover:bg-brk-background">Xem khóa học</Link></div>
          </div>
          <figure className="rounded-[2rem] border border-brk-outline bg-brk-background p-3 sm:p-5">
            <a href="/wi300/ecosystem-banner.webp" target="_blank" rel="noopener noreferrer" aria-label="Xem ảnh hệ sinh thái Wi đầy đủ (mở tab mới)"><Image src="/wi300/ecosystem-banner.webp" alt="Hệ sinh thái Wi: kết nối con người, lan tỏa giá trị, kiến tạo tương lai" width={1280} height={720} priority sizes="(max-width: 1023px) 100vw, 600px" className="h-auto w-full rounded-2xl" /></a>
            <figcaption className="px-2 pt-4 text-sm leading-6 text-brk-muted">300DNS là dự án của WIPA. Các dự án thuộc 300DNS được WIPA cố vấn.</figcaption>
          </figure>
        </div>
      </section>
      {/* Ba lối vào độc lập cho khóa học, sản phẩm và dịch vụ. */}
      <section id="ban-dang-tim-gi" aria-labelledby="wi300-discovery-title" className="mx-auto max-w-7xl scroll-mt-40 px-4 pt-10 sm:pt-12 lg:scroll-mt-24 lg:px-6">
        <h2 id="wi300-discovery-title" className="text-2xl font-bold sm:text-3xl">Bạn đang tìm gì?</h2>
        <div aria-label="Nội dung khám phá" className="mt-6 grid gap-4 sm:grid-cols-3">
          {[{ href: '/khoa-hoc', title: 'Khóa học', description: 'Khám phá tri thức và kỹ năng', icon: BookOpen }, { href: '/san-pham', title: 'Sản phẩm', description: 'Tìm sản phẩm phù hợp với bạn', icon: Package }, { href: '/dich-vu', title: 'Dịch vụ', description: 'Kết nối giải pháp và người hỗ trợ', icon: BriefcaseBusiness }].map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="flex min-h-40 flex-col rounded-2xl border border-brk-outline bg-white p-5 transition-shadow hover:border-brk-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brk-primary sm:p-6">
            <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brk-primary/10 text-brk-primary"><Icon className="h-6 w-6" aria-hidden="true" /></span><h3 className="text-lg font-bold">{title}</h3></div>
            <p className="mt-3 text-sm leading-6 text-brk-muted">{description}</p><span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-3 text-sm font-semibold text-brk-primary">Xem {title.toLocaleLowerCase('vi')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>)}
        </div>
      </section>
      <Wi300Businesses projects={projects} error={projectsError} />
    </>}
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
      <Wi300Teachers teachers={teachers} catalogError={catalogError} />
    </>}
    {view === 'space' && <Wi300PersonalSpace teachingCourses={teachingCourses} teachingError={teachingError} courses={courses} enrollments={enrollments} userId={userId} userPhone={userPhone} accountError={accountError || catalogError} />}
    {(view === 'catalog' || view === 'discover') && <section id="khoa-hoc" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-12 lg:scroll-mt-24 lg:px-6">
      {view === 'catalog' ? <h1 className="text-3xl font-bold">Khóa học</h1> : <h2 className="text-2xl font-bold sm:text-3xl">Khám phá khóa học</h2>}<p className="mt-2 text-sm leading-6 text-brk-muted">Tìm kiến thức và kỹ năng cho bước tiến tiếp theo.</p>
      <div className="mt-6 flex flex-col gap-3 lg:flex-row"><label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-brk-outline bg-white px-4"><Search className="h-5 w-5 shrink-0 text-brk-muted" /><span className="sr-only">Tìm khóa học hoặc giảng viên</span><input value={query} onChange={event => { setQuery(event.target.value); setLimit(9) }} placeholder="Tìm khóa học, giảng viên…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" type="search" /></label><label className="sr-only" htmlFor="wi300-fee">Lọc theo học phí</label><select id="wi300-fee" value={fee} onChange={event => { setFee(event.target.value); setLimit(9) }} className="min-h-12 rounded-xl border border-brk-outline bg-white px-4 text-sm"><option value="all">Tất cả học phí</option><option value="free">Miễn phí</option><option value="paid">Có phí</option></select><label className="sr-only" htmlFor="wi300-sort">Sắp xếp khóa học</label><select id="wi300-sort" value={sort} onChange={event => { setSort(event.target.value as CourseSort); setLimit(9) }} className="min-h-12 rounded-xl border border-brk-outline bg-white px-4 text-sm"><option value="recommended">Đề xuất</option><option value="newest">Mới nhất</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select></div>
      <div role="group" aria-label="Danh mục khóa học" className="mt-4 flex flex-wrap gap-2">{['', ...categories].map(name => <button key={name} type="button" aria-pressed={category === name} onClick={() => { setCategory(name); setLimit(9) }} className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${category === name ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white text-brk-muted hover:border-brk-primary'}`}>{name || 'Tất cả'}</button>)}</div>
      <p role="status" className="my-5 text-sm text-brk-muted">{catalogError ? 'Danh mục tạm thời chưa tải được.' : `${filtered.length} khóa học${category ? ` · ${category}` : ''}`}</p>
      {catalogError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><p>Chưa thể tải khóa học. Vui lòng thử lại sau.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 font-semibold underline">Tải lại trang</button></div> : filtered.length ? <><div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0, limit).map(card)}</div>{limit < filtered.length && <div className="mt-8 text-center"><button type="button" onClick={() => setLimit(value => value + 9)} className="min-h-12 rounded-xl border border-brk-outline bg-white px-6 font-semibold text-brk-primary">Xem thêm khóa học</button></div>}</> : <div className="rounded-2xl border border-brk-outline bg-white p-8 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-brk-muted" /><p className="text-brk-muted">{courses.length ? 'Chưa tìm thấy khóa học phù hợp với bộ lọc.' : 'Các khóa học sẽ được cập nhật tại đây.'}</p>{courses.length > 0 && <button type="button" onClick={clearFilters} className="mt-3 min-h-11 font-semibold text-brk-primary">Xóa bộ lọc</button>}</div>}
    </section>}

    {view === 'catalog' && <Wi300Teachers teachers={teachers} catalogError={catalogError} />}
    {/* CTA cuối danh mục: dẫn tới form đối tác hiện có, không thay đổi luồng học. */}
    {view === 'catalog' && <section aria-labelledby="wi300-course-partner-title" className="mx-auto max-w-7xl px-4 pb-12 lg:px-6">
      <div className="flex flex-col gap-6 rounded-3xl border border-brk-primary/15 bg-brk-primary/5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4"><span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brk-primary/10 text-brk-primary"><BookOpen className="h-7 w-7" /></span><div><h2 id="wi300-course-partner-title" className="text-xl font-bold sm:text-2xl">Bạn muốn chia sẻ chuyên môn?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-brk-muted">Đồng hành cùng Wi để lan tỏa kiến thức và tạo giá trị cho cộng đồng.</p></div></div>
        <Link href="/doi-tac" className={action + ' shrink-0'}>Đăng ký làm đối tác<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </section>}
    {view === 'home' && <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-6" aria-labelledby="wi300-start-title">
      <h2 id="wi300-start-title" className="text-2xl font-bold sm:text-3xl">Bắt đầu cùng Wi</h2>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col rounded-3xl border border-brk-outline bg-white p-6 sm:p-8">
          <Sparkles className="h-8 w-8 text-brk-primary" aria-hidden="true" /><h3 className="mt-4 text-2xl font-bold">Bạn đang tìm giải pháp phù hợp?</h3>
          <p className="mt-4 leading-7 text-brk-muted">Khám phá khóa học, sản phẩm và dịch vụ phù hợp với nhu cầu của bạn từ các dự án trong hệ sinh thái Wi.</p>
          <nav aria-label="Tìm giải pháp phù hợp" className="mt-auto flex flex-wrap gap-3 pt-6">{[{ href: '/khoa-hoc', label: 'Khóa học' }, { href: '/san-pham', label: 'Sản phẩm' }, { href: '/dich-vu', label: 'Dịch vụ' }].map(({ href, label }) => <Link key={href} href={href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brk-outline px-4 text-sm font-semibold text-brk-primary hover:bg-brk-background">{label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>)}</nav>
        </div>
        <div aria-labelledby="wi300-partner-title" className="flex flex-col rounded-3xl bg-brk-primary p-6 text-white sm:p-8"><p className="text-sm font-semibold text-white/80">Dành cho giảng viên và doanh nghiệp</p><h3 id="wi300-partner-title" className="mt-3 text-2xl font-bold">Trở thành đối tác {brand.name}</h3><p className="mt-4 leading-7 text-white/90">Chia sẻ chuyên môn, giới thiệu giá trị của doanh nghiệp và cùng mở rộng cơ hội hợp tác trong Liên minh 300 doanh nghiệp số.</p><p className="mt-3 text-sm leading-6 text-white/80">Gửi yêu cầu tham gia. Ban điều phối sẽ xem hồ sơ và trao đổi trực tiếp trước khi cấp quyền.</p><div className="mt-auto pt-6"><Link href="/doi-tac" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brk-primary">Gửi yêu cầu tham gia<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></div>
      </div>
    </section>}
    {paymentCourse && <PaymentModal course={paymentCourse} enrollment={enrollmentMap.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onClose={closePayment} />}
  </main>
}
