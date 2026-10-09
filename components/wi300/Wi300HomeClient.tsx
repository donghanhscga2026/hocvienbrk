'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, Search, Sparkles, Users, GraduationCap } from 'lucide-react'
import CourseCard from '@/components/course/CourseCard'
import { checkEnrollmentStatusAction } from '@/app/actions/course-actions'
import { categoryName, filterCourses } from '@/lib/wi300/catalog'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'
import type { Wi300Course, Wi300Enrollment } from './Wi300Home'

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
type Props = {
  brand: DeploymentBrand; courses: Wi300Course[]; enrollments: Wi300Enrollment[];
  userId: number | null; userPhone: string | null; loggedIn: boolean;
  catalogError: boolean; accountError: boolean;
}

export default function Wi300HomeClient(props: Props) {
  return <Suspense fallback={<div className="p-8 text-center">Đang tải khóa học…</div>}><HomeContent {...props} /></Suspense>
}

function HomeContent({ brand, courses, enrollments, userId, userPhone, loggedIn, catalogError, accountError }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [fee, setFee] = useState('all')
  const [limit, setLimit] = useState(9)
  const [dismissedPayment, setDismissedPayment] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentCourseId')
  const paymentCourse = loggedIn && paymentId !== dismissedPayment ? courses.find(course => String(course.id) === paymentId) : undefined
  const enrollmentMap = new Map(enrollments.map(enrollment => [enrollment.courseId, enrollment]))
  const categories = Array.from(new Set(courses.map(categoryName)))
  const filtered = filterCourses(courses, query, category, fee)
  const featured = courses.filter(course => course.pin != null && course.pin > 0).slice(0, 3)
  const myCourses = courses.filter(course => ['ACTIVE', 'COMPLETED'].includes(enrollmentMap.get(course.id)?.status || ''))
  const teacherCount = new Set(courses.map(course => course.teacherId).filter(id => id != null)).size
  const paymentCourseId = paymentCourse?.id
  const paymentEnrollmentStatus = paymentCourseId != null ? enrollmentMap.get(paymentCourseId)?.status : undefined

  // Giữ luồng quay về trang chủ để thanh toán sau đăng nhập của hệ thống hiện có.
  useEffect(() => {
    if (paymentCourseId == null || paymentEnrollmentStatus === 'ACTIVE') return
    let cancelled = false
    const interval = window.setInterval(async () => {
      try {
        const result = await checkEnrollmentStatusAction(paymentCourseId)
        if (!cancelled && result.status === 'ACTIVE') window.location.reload()
      } catch { /* Lần kiểm tra sau sẽ thử lại; không thay đổi trạng thái thanh toán. */ }
    }, 10_000)
    const timeout = window.setTimeout(() => window.clearInterval(interval), 20 * 60_000)
    return () => { cancelled = true; window.clearInterval(interval); window.clearTimeout(timeout) }
    // Chỉ phụ thuộc khóa học và trạng thái cần theo dõi, không phụ thuộc Map được tạo khi render.
  }, [paymentCourseId, paymentEnrollmentStatus])

  const closePayment = () => {
    setDismissedPayment(paymentId)
    const url = new URL(window.location.href)
    url.searchParams.delete('paymentCourseId')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }
  const clearFilters = () => { setQuery(''); setCategory(''); setFee('all'); setLimit(9) }
  const card = (course: Wi300Course, index: number) => <CourseCard key={course.id} course={course} isLoggedIn={loggedIn} enrollment={enrollmentMap.get(course.id)} userId={userId} userPhone={userPhone} priority={index < 3} showSharing={false} />

  return (
    <main className="min-h-screen overflow-x-clip bg-brk-background text-brk-on-surface">
      <section className="relative overflow-hidden border-b border-blue-100 bg-white">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-violet-100/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:px-6 lg:py-20">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"><Sparkles className="h-4 w-4" />{brand.tagline}</p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">Khai phóng tri thức.<br /><span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Kiến tạo tương lai.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">{brand.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#khoa-hoc" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700">Khám phá khóa học<ArrowRight className="h-4 w-4" /></a>
              <a href={loggedIn ? '#khoa-hoc-cua-toi' : '#gioi-thieu'} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-5 font-semibold text-slate-700 hover:bg-slate-50">{loggedIn ? 'Khóa học của tôi' : 'Tìm hiểu về WI300'}</a>
            </div>
            {!catalogError && courses.length > 0 && <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4 text-blue-600" /><strong className="text-slate-900">{courses.length}</strong> khóa học</span><span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-violet-600" /><strong className="text-slate-900">{teacherCount}</strong> giảng viên</span></div>}
          </div>
          <div className="relative rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 sm:p-8">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100"><Image src={brand.logoUrl} alt="Wi.Tech — Khai phóng tri thức. Kiến tạo tương lai." width={1280} height={640} className="h-auto w-full" /></div>
            <div className="mt-5 grid gap-3">
              {[{ icon: GraduationCap, title: 'Học tập để phát triển', text: 'Khám phá khóa học phù hợp với mục tiêu của bạn.' }, { icon: Users, title: 'Kết nối để cùng tiến', text: 'Đồng hành cùng chuyên gia và cộng đồng doanh nghiệp số.' }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3 rounded-2xl border border-white bg-white/80 p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span><div><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div></div>)}
            </div>
          </div>
        </div>
      </section>

      {loggedIn && <section id="khoa-hoc-cua-toi" className="mx-auto max-w-7xl scroll-mt-36 px-4 pt-10 lg:px-6">
        <h2 className="text-2xl font-bold">Khóa học của tôi</h2><p className="mt-2 text-sm text-brk-muted">Tiếp tục hành trình học tập của bạn.</p>
        {accountError ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Chưa tải được thông tin học tập. Vui lòng tải lại trang.</p> : myCourses.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{myCourses.map(course => {
          const enrollment = enrollmentMap.get(course.id)!
          const percent = enrollment.totalLessons ? Math.min(100, Math.round(enrollment.completedCount / enrollment.totalLessons * 100)) : 0
          return <Link key={course.id} href={`/courses/${course.id_khoa}/learn`} className="rounded-2xl border border-brk-outline bg-white p-5 transition-shadow hover:shadow-md"><span className="text-xs font-semibold text-blue-600">{enrollment.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang học'}</span><h3 className="mt-2 font-bold">{course.name_lop}</h3><div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div><p className="mt-3 flex items-center justify-between text-xs text-brk-muted"><span>{enrollment.completedCount}/{enrollment.totalLessons} bài học</span><span className="font-semibold text-blue-600">Vào học →</span></p></Link>
        })}</div> : <p className="mt-4 rounded-2xl border border-brk-outline bg-white p-5 text-sm text-brk-muted">Bạn chưa có khóa học đang tham gia. Khám phá danh sách bên dưới để bắt đầu.</p>}
      </section>}

      {featured.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-12 lg:px-6"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs font-bold tracking-wider text-violet-600">Đề xuất khám phá</p><h2 className="text-2xl font-bold sm:text-3xl">Khóa học nổi bật</h2></div><a href="#khoa-hoc" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-600">Xem tất cả<ArrowRight className="h-4 w-4" /></a></div><div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{featured.map(card)}</div></section>}

      <section id="khoa-hoc" className="mx-auto max-w-7xl scroll-mt-36 px-4 py-12 lg:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Khám phá khóa học</h2><p className="mt-2 text-sm leading-6 text-brk-muted">Tìm kiến thức và kỹ năng cho bước tiến tiếp theo.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-brk-outline bg-white px-4"><Search className="h-5 w-5 shrink-0 text-slate-400" /><span className="sr-only">Tìm khóa học hoặc giảng viên</span><input value={query} onChange={event => { setQuery(event.target.value); setLimit(9) }} placeholder="Tìm khóa học, giảng viên…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" type="search" /></label>
          <label className="sr-only" htmlFor="wi300-fee">Lọc theo học phí</label><select id="wi300-fee" value={fee} onChange={event => { setFee(event.target.value); setLimit(9) }} className="min-h-12 rounded-xl border border-brk-outline bg-white px-4 text-sm"><option value="all">Tất cả học phí</option><option value="free">Miễn phí</option><option value="paid">Có phí</option></select>
        </div>
        <div role="group" aria-label="Danh mục khóa học" className="mt-4 flex flex-wrap gap-2">{['', ...categories].map(name => <button key={name} type="button" aria-pressed={category === name} onClick={() => { setCategory(name); setLimit(9) }} className={`min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors ${category === name ? 'border-blue-600 bg-blue-600 text-white' : 'border-brk-outline bg-white text-slate-600 hover:border-blue-400'}`}>{name || 'Tất cả'}</button>)}</div>
        <p role="status" className="my-5 text-sm text-brk-muted">{catalogError ? 'Danh mục tạm thời chưa tải được.' : `${filtered.length} khóa học${category ? ` · ${category}` : ''}`}</p>
        {catalogError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><p>Chưa thể tải khóa học. Vui lòng thử lại sau.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 min-h-11 font-semibold underline">Tải lại trang</button></div> : filtered.length ? <><div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0, limit).map(card)}</div>{limit < filtered.length && <div className="mt-8 text-center"><button type="button" onClick={() => setLimit(value => value + 9)} className="min-h-12 rounded-xl border border-blue-200 bg-white px-6 font-semibold text-blue-600 hover:bg-blue-50">Xem thêm khóa học</button></div>}</> : <div className="rounded-2xl border border-brk-outline bg-white p-8 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="text-brk-muted">{courses.length ? 'Chưa tìm thấy khóa học phù hợp với bộ lọc.' : 'Các khóa học sẽ được cập nhật tại đây.'}</p>{courses.length > 0 && <button type="button" onClick={clearFilters} className="mt-3 min-h-11 font-semibold text-blue-600">Xóa bộ lọc</button>}</div>}
      </section>

      <section id="gioi-thieu" className="scroll-mt-36 border-y border-blue-100 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-2 lg:px-6"><div><p className="text-sm font-semibold text-blue-600">Về {brand.name}</p><h2 className="mt-3 text-3xl font-bold leading-tight">Tri thức kết nối.<br />Doanh nghiệp cùng phát triển.</h2></div><div className="space-y-4 text-base leading-7 text-slate-600"><p>{brand.name} là không gian học tập và kết nối của {brand.tagline}. Chúng tôi hướng đến việc chia sẻ tri thức, nâng cao năng lực và tạo cơ hội đồng hành giữa chuyên gia, người học và doanh nghiệp.</p><p>Bắt đầu từ các khóa học, cùng xây dựng nền tảng cho hành trình phát triển trong thời đại số.</p><a href="#khoa-hoc" className="inline-flex min-h-11 items-center gap-2 font-semibold text-blue-600">Bắt đầu khám phá<ArrowRight className="h-4 w-4" /></a></div></div></section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-6"><div><Image src={brand.wordmarkUrl} alt="Wi.Tech" width={160} height={53} className="h-auto w-36" /><p className="mt-2 text-xs text-brk-muted">{brand.name} · {brand.tagline}</p></div><nav aria-label="Điều hướng chân trang" className="flex flex-wrap gap-5 text-sm text-slate-600"><a href="#khoa-hoc" className="py-3 hover:text-blue-600">Khóa học</a><a href="#gioi-thieu" className="py-3 hover:text-blue-600">Giới thiệu</a><Link href="/tools" className="py-3 hover:text-blue-600">Không gian của tôi</Link></nav></footer>
      {paymentCourse && <PaymentModal course={paymentCourse} enrollment={enrollmentMap.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onClose={closePayment} />}
    </main>
  )
}
