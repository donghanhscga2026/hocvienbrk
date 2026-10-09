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

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
type Props = {
  brand: DeploymentBrand; courses: Wi300Course[]; enrollments: Wi300Enrollment[];
  teachingCourses?: Wi300TeachingCourse[]; teachingError?: boolean;
  userId: number | null; userPhone: string | null; loggedIn: boolean;
  catalogError: boolean; accountError: boolean; view?: 'home' | 'catalog' | 'discover' | 'space';
}
const action = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white transition-opacity hover:opacity-90'

export default function Wi300HomeClient(props: Props) {
  return <Suspense fallback={<div className="p-8 text-center">Đang tải khóa học…</div>}><HomeContent key={props.view || 'home'} {...props} /></Suspense>
}

function HomeContent({ brand, courses, enrollments, userId, userPhone, loggedIn, catalogError, accountError, teachingCourses = [], teachingError = false, view = 'home' }: Props) {
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
  const featured = [...courses].sort((a, b) => (a.pin != null && a.pin > 0 ? a.pin : Infinity) - (b.pin != null && b.pin > 0 ? b.pin : Infinity)).slice(0, 6)
  const teachers = ['Cương Leo', 'Hoàng Thu Hà', 'Võ Thị Kim Hồng', 'Nguyễn Hải Yến', 'Nhàn Victory', 'Hương Lucy'].map(name => {
    const ownCourses = courses.filter(course => searchText(course.teacher?.name || '') === searchText(name))
    return { id: ownCourses[0]?.teacherId ?? name, name, image: ownCourses[0]?.teacher?.image, count: ownCourses.length || null }
  })
  const teacherCount = new Set(courses.map(course => course.teacherId).filter(id => id != null)).size
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
            <p className="mt-6 max-w-xl text-base leading-7 text-brk-muted sm:text-lg">{brand.name} kết nối cá nhân và doanh nghiệp với tri thức, các doanh nghiệp tiêu biểu và cơ hội hợp tác trong hệ sinh thái Wi.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/khoa-hoc" className={action}>Khám phá khóa học<ArrowRight className="h-4 w-4" /></Link><Link href="/#doanh-nghiep-tieu-bieu" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brk-outline px-5 font-semibold hover:bg-brk-background">Khám phá doanh nghiệp</Link></div>
            {!catalogError && courses.length > 0 && <p className="mt-7 text-sm text-brk-muted">{courses.length} khóa học · {teacherCount} giảng viên · Cùng phát triển trong cộng đồng doanh nghiệp số</p>}
          </div>
          <figure className="rounded-[2rem] border border-brk-outline bg-brk-background p-3 sm:p-5">
            <a href="/wi300/ecosystem-banner.webp" target="_blank" rel="noopener noreferrer" aria-label="Xem ảnh hệ sinh thái Wi đầy đủ (mở tab mới)"><Image src="/wi300/ecosystem-banner.webp" alt="Hệ sinh thái Wi: kết nối con người, lan tỏa giá trị, kiến tạo tương lai" width={1280} height={720} priority sizes="(max-width: 1023px) 100vw, 600px" className="h-auto w-full rounded-2xl" /></a>
            <figcaption className="px-2 pt-4 text-sm leading-6 text-brk-muted">300DNS là dự án của WIPA. Các dự án thuộc 300DNS được WIPA cố vấn.</figcaption>
          </figure>
        </div>
      </section>
      <section aria-label="Nội dung khám phá" className="mx-auto grid max-w-7xl gap-4 px-4 pt-8 sm:grid-cols-3 lg:px-6">
        <Link href="/khoa-hoc" className="flex min-h-28 items-center gap-4 rounded-2xl border border-brk-outline bg-white p-5 hover:border-brk-primary"><BookOpen className="h-7 w-7 shrink-0 text-brk-primary" /><div><h2 className="font-bold">Khóa học</h2><p className="mt-1 text-sm text-brk-muted">Khám phá tri thức và kỹ năng →</p></div></Link>
        {[{ title: 'Sản phẩm', icon: Package }, { title: 'Dịch vụ', icon: BriefcaseBusiness }].map(({ title, icon: Icon }) => <div key={title} className="flex min-h-28 items-center gap-4 rounded-2xl border border-brk-outline bg-white p-5"><Icon className="h-7 w-7 shrink-0 text-brk-accent" /><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-brk-muted">Sẽ được bổ sung</p></div></div>)}
      </section>
      <Wi300Businesses />
      <Wi300Teachers teachers={teachers} catalogError={catalogError} />
      <section id="khoa-hoc" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-12 lg:scroll-mt-24 lg:px-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 className="text-2xl font-bold">Khóa học tiêu biểu</h2><Link href="/khoa-hoc" className="py-3 text-sm font-semibold text-brk-primary">Xem tất cả khóa học →</Link></div>{catalogError ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">Chưa tải được khóa học. Vui lòng thử lại sau.</p> : featured.length ? <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{featured.map(card)}</div> : <p className="text-brk-muted">Các khóa học sẽ được cập nhật tại đây.</p>}</section>
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
    {view === 'discover' && <><Wi300Businesses />
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

    {view === 'home' && <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-6" aria-labelledby="wi300-partner-title"><div className="grid gap-6 rounded-3xl bg-brk-primary p-6 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-sm font-semibold text-white/80">Dành cho giảng viên và doanh nghiệp</p><h2 id="wi300-partner-title" className="mt-3 text-3xl font-bold">Trở thành đối tác {brand.name}</h2><p className="mt-4 max-w-2xl leading-7 text-white/90">Chia sẻ chuyên môn, giới thiệu giá trị của doanh nghiệp và cùng mở rộng cơ hội hợp tác trong Liên minh 300 doanh nghiệp số.</p><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Đăng ký tài khoản và hoàn thiện hồ sơ để bắt đầu kết nối.</p></div><Link href={loggedIn ? '/account-settings' : '/register'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brk-primary">{loggedIn ? 'Hoàn thiện hồ sơ tham gia' : 'Đăng ký tham gia'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></section>}
    {paymentCourse && <PaymentModal course={paymentCourse} enrollment={enrollmentMap.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onClose={closePayment} />}
  </main>
}
