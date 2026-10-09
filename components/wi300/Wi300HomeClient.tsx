'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, Search, Sparkles, BriefcaseBusiness, Package } from 'lucide-react'
import CourseCard from '@/components/course/CourseCard'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { categoryName, filterCourses, recentActiveCourses, sortCourses, type CourseSort } from '@/lib/wi300/catalog'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import type { Wi300Course, Wi300Enrollment } from './Wi300Home'
import Wi300PersonalSpace from './Wi300PersonalSpace'
import Wi300Businesses, { featuredBusinesses } from './Wi300Businesses'

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
type Props = {
  brand: DeploymentBrand; courses: Wi300Course[]; enrollments: Wi300Enrollment[];
  userId: number | null; userPhone: string | null; loggedIn: boolean;
  catalogError: boolean; accountError: boolean; view?: 'home' | 'catalog' | 'discover' | 'space';
}
const action = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brk-primary px-5 font-semibold text-white transition-opacity hover:opacity-90'

export default function Wi300HomeClient(props: Props) {
  return <Suspense fallback={<div className="p-8 text-center">Đang tải khóa học…</div>}><HomeContent {...props} /></Suspense>
}

function HomeContent({ brand, courses, enrollments, userId, userPhone, loggedIn, catalogError, accountError, view = 'home' }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [fee, setFee] = useState('all')
  const [sort, setSort] = useState<CourseSort>('recommended')
  const [limit, setLimit] = useState(9)
  const [dismissedPayment, setDismissedPayment] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentCourseId')
  const paymentCourse = loggedIn && paymentId !== dismissedPayment ? courses.find(course => String(course.id) === paymentId) : undefined
  const enrollmentMap = new Map(enrollments.map(enrollment => [enrollment.courseId, enrollment]))
  const categories = Array.from(new Set(courses.map(categoryName)))
  const filtered = sortCourses(filterCourses(courses, query, category, fee), sort)
  const featured = courses.filter(course => course.pin != null && course.pin > 0).slice(0, 3)
  const myCourses = recentActiveCourses(courses, enrollments)
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
  const card = (course: Wi300Course, index: number) => <CourseCard key={course.id} course={course} isLoggedIn={loggedIn} enrollment={enrollmentMap.get(course.id)} userId={userId} userPhone={userPhone} priority={index < 3} showSharing={false} />

  return <main className="min-h-screen overflow-x-clip bg-brk-background text-brk-on-surface">
    {view === 'home' && <>
      <section className="relative overflow-hidden border-b border-brk-outline bg-white">
        <div aria-hidden="true" className="absolute -right-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-amber-50" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:px-6 lg:py-20">
          <div><p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brk-outline bg-brk-background px-3 py-2 text-xs font-semibold text-brk-primary"><Sparkles className="h-4 w-4" />{brand.tagline}</p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">Kết nối con người.<br /><span className="text-brk-primary">Lan tỏa giá trị.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-brk-muted sm:text-lg">{brand.name} kết nối cá nhân và doanh nghiệp với tri thức, các doanh nghiệp tiêu biểu và cơ hội hợp tác trong hệ sinh thái Wi.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/khoa-hoc" className={action}>Khám phá khóa học<ArrowRight className="h-4 w-4" /></Link><Link href="/#doanh-nghiep-tieu-bieu" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brk-outline px-5 font-semibold hover:bg-brk-background">Khám phá doanh nghiệp</Link></div>
            {!catalogError && courses.length > 0 && <p className="mt-7 text-sm text-brk-muted">{courses.length} khóa học · {teacherCount} giảng viên · Cùng phát triển trong cộng đồng doanh nghiệp số</p>}
          </div>
          <div className="relative rounded-[2rem] border border-brk-outline bg-brk-background p-5 sm:p-8">
            <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"><Image src={brand.logoUrl} alt="WIPA" width={500} height={500} unoptimized className="h-28 w-28 shrink-0 object-contain" /><div><p className="text-2xl font-extrabold text-brk-primary">{brand.name}</p><p className="mt-1 text-sm leading-6 text-brk-muted">Một cộng đồng.<br />Nhiều cơ hội cùng phát triển.</p></div></div>
            <p className="mt-6 text-sm font-semibold text-brk-muted">Doanh nghiệp tiêu biểu trong hệ sinh thái Wi</p>
            <div className="mt-3 flex flex-wrap gap-2">{featuredBusinesses.map(name => <span key={name} className="rounded-xl border border-brk-outline bg-white px-3 py-2 text-sm font-bold text-brk-primary">{name}</span>)}</div>
            <p className="mt-6 border-t border-brk-outline pt-5 text-sm leading-6 text-brk-muted">300DNS là dự án của WIPA. Các dự án thuộc 300DNS được WIPA cố vấn.</p>
          </div>
        </div>
      </section>
      {loggedIn && <section id="khoa-hoc-cua-toi" className="mx-auto max-w-7xl px-4 pt-10 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-2xl font-bold">Khóa học của tôi</h2><p className="mt-2 text-sm text-brk-muted">3 khóa đang học gần đây, để bạn tiếp tục ngay.</p></div><Link href="/my-space?tab=learning" className="py-3 text-sm font-semibold text-brk-primary">Xem tất cả →</Link></div>
        {accountError ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Chưa tải được thông tin học tập. Vui lòng tải lại trang.</p> : myCourses.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{myCourses.map(course => {
          const enrollment = enrollmentMap.get(course.id)!
          const percent = enrollment.totalLessons ? Math.min(100, Math.round(enrollment.completedCount / enrollment.totalLessons * 100)) : 0
          const lesson = enrollment.lastLessonId ? `?lesson=${encodeURIComponent(enrollment.lastLessonId)}` : ''
          return <Link key={course.id} href={`/courses/${encodeURIComponent(course.id_khoa)}/learn${lesson}`} className="rounded-2xl border border-brk-outline bg-white p-5 transition-shadow hover:shadow-md"><span className="text-xs font-semibold text-brk-primary">Đang học</span><h3 className="mt-2 font-bold">{course.name_lop}</h3><div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="mt-4 h-1.5 overflow-hidden rounded-full bg-brk-background"><div className="h-full rounded-full bg-brk-primary" style={{ width: `${percent}%` }} /></div><p className="mt-3 flex items-center justify-between text-xs text-brk-muted"><span>{enrollment.completedCount}/{enrollment.totalLessons} bài học</span><span className="font-semibold text-brk-primary">Vào học →</span></p></Link>
        })}</div> : <p className="mt-4 rounded-2xl border border-brk-outline bg-white p-5 text-sm text-brk-muted">Bạn chưa có khóa đang học. Khám phá khóa học bên dưới để bắt đầu.</p>}
      </section>}
      <Wi300Businesses />
      {featured.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 className="text-2xl font-bold">Khóa học nổi bật</h2><Link href="/khoa-hoc" className="py-3 text-sm font-semibold text-brk-primary">Xem tất cả →</Link></div><div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{featured.map(card)}</div></section>}
    </>}
    {view === 'discover' && <section className="mx-auto max-w-7xl px-4 pt-10 lg:px-6"><h1 className="text-3xl font-bold">Khám phá hệ sinh thái {brand.name}</h1><p className="mt-3 max-w-2xl leading-7 text-brk-muted">Tri thức, sản phẩm và dịch vụ từ cộng đồng doanh nghiệp số. Hiện bạn có thể khám phá và tham gia các khóa học.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><Link href="/khoa-hoc" className="rounded-2xl border border-brk-outline bg-white p-6"><BookOpen className="mb-4 text-brk-primary" /><h2 className="font-bold">Khóa học</h2><p className="mt-2 text-sm text-brk-muted">Khám phá ngay →</p></Link>{[{ title: 'Sản phẩm', icon: Package }, { title: 'Dịch vụ', icon: BriefcaseBusiness }].map(({ title, icon: Icon }) => <div key={title} className="rounded-2xl border border-brk-outline p-6"><Icon className="mb-4 text-brk-accent" /><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm text-brk-muted">Sẽ được bổ sung trong giai đoạn tiếp theo.</p></div>)}</div></section>}
    {view === 'discover' && <Wi300Businesses />}
    {view === 'space' ? <Wi300PersonalSpace courses={courses} enrollments={enrollments} userId={userId} userPhone={userPhone} accountError={accountError || catalogError} /> : <section id="khoa-hoc" className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
      {view === 'catalog' ? <h1 className="text-3xl font-bold">Khám phá khóa học</h1> : <h2 className="text-2xl font-bold sm:text-3xl">Khám phá khóa học</h2>}<p className="mt-2 text-sm leading-6 text-brk-muted">Tìm kiến thức và kỹ năng cho bước tiến tiếp theo.</p>
      <div className="mt-6 flex flex-col gap-3 lg:flex-row"><label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-brk-outline bg-white px-4"><Search className="h-5 w-5 shrink-0 text-brk-muted" /><span className="sr-only">Tìm khóa học hoặc giảng viên</span><input value={query} onChange={event => { setQuery(event.target.value); setLimit(9) }} placeholder="Tìm khóa học, giảng viên…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" type="search" /></label><label className="sr-only" htmlFor="wi300-fee">Lọc theo học phí</label><select id="wi300-fee" value={fee} onChange={event => { setFee(event.target.value); setLimit(9) }} className="min-h-12 rounded-xl border border-brk-outline bg-white px-4 text-sm"><option value="all">Tất cả học phí</option><option value="free">Miễn phí</option><option value="paid">Có phí</option></select><label className="sr-only" htmlFor="wi300-sort">Sắp xếp khóa học</label><select id="wi300-sort" value={sort} onChange={event => { setSort(event.target.value as CourseSort); setLimit(9) }} className="min-h-12 rounded-xl border border-brk-outline bg-white px-4 text-sm"><option value="recommended">Đề xuất</option><option value="newest">Mới nhất</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select></div>
      <div role="group" aria-label="Danh mục khóa học" className="mt-4 flex flex-wrap gap-2">{['', ...categories].map(name => <button key={name} type="button" aria-pressed={category === name} onClick={() => { setCategory(name); setLimit(9) }} className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${category === name ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white text-brk-muted hover:border-brk-primary'}`}>{name || 'Tất cả'}</button>)}</div>
      <p role="status" className="my-5 text-sm text-brk-muted">{catalogError ? 'Danh mục tạm thời chưa tải được.' : `${filtered.length} khóa học${category ? ` · ${category}` : ''}`}</p>
      {catalogError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><p>Chưa thể tải khóa học. Vui lòng thử lại sau.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 font-semibold underline">Tải lại trang</button></div> : filtered.length ? <><div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0, limit).map(card)}</div>{limit < filtered.length && <div className="mt-8 text-center"><button type="button" onClick={() => setLimit(value => value + 9)} className="min-h-12 rounded-xl border border-brk-outline bg-white px-6 font-semibold text-brk-primary">Xem thêm khóa học</button></div>}</> : <div className="rounded-2xl border border-brk-outline bg-white p-8 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-brk-muted" /><p className="text-brk-muted">{courses.length ? 'Chưa tìm thấy khóa học phù hợp với bộ lọc.' : 'Các khóa học sẽ được cập nhật tại đây.'}</p>{courses.length > 0 && <button type="button" onClick={clearFilters} className="mt-3 min-h-11 font-semibold text-brk-primary">Xóa bộ lọc</button>}</div>}
    </section>}
    <footer className="border-t border-brk-outline bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-6"><div><p className="font-bold text-brk-primary">{brand.name}</p><p className="mt-2 text-xs text-brk-muted">{brand.tagline}</p></div><nav aria-label="Điều hướng chân trang" className="flex flex-wrap gap-5 text-sm text-brk-muted"><Link href="/khoa-hoc" className="py-3">Khóa học</Link><Link href="/gioi-thieu" className="py-3">Giới thiệu</Link><Link href="/my-space" className="py-3">Không gian của tôi</Link></nav></div></footer>
    {paymentCourse && <PaymentModal course={paymentCourse} enrollment={enrollmentMap.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onClose={closePayment} />}
  </main>
}
