'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Compass, Wrench } from 'lucide-react'
import type { CatalogCourse, CatalogEnrollment } from '@/lib/course-catalog'

interface Props {
  title: string; subtitle?: string | null; heroImage?: string | null; userName?: string | null
  courses: CatalogCourse[]; activeCourses: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment>
  catalog?: ReactNode; myCourses?: ReactNode; roadmap?: ReactNode; community?: ReactNode; message?: ReactNode
  roadmapTitle: string; onOpenMembership: () => void; isLoggedIn: boolean
}

export default function HomeOverview({ title, activeCourses, enrollments, catalog, myCourses, roadmap, community, message, roadmapTitle, onOpenMembership, isLoggedIn }: Props) {
  return <>
    {message ? <section aria-label="Thông điệp">{message}</section> : <h1 className="mx-auto max-w-7xl px-4 py-6 text-3xl font-bold text-brk-on-surface">{title}</h1>}
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 pb-16 sm:space-y-10 sm:px-6">
    {roadmap && <section id="learning-path" className="scroll-mt-24"><h2 className="mb-4 text-2xl font-bold text-brk-on-surface">{roadmapTitle}</h2><div className="min-w-0">{roadmap}</div></section>}
    <section id="ecosystem" aria-label="Công cụ trong hệ sinh thái" className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-brk-on-surface">Công cụ đồng hành</h2><p className="mt-2 text-sm text-brk-muted">Đi đến các công cụ và tiện ích đang có trong hệ thống.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/tools" className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 hover:border-brk-primary"><Wrench className="mt-1 h-6 w-6 shrink-0 text-brk-primary" /><div><h3 className="font-bold text-brk-on-surface">Khám phá công cụ</h3><p className="mt-2 text-sm text-brk-muted">Chọn công cụ phù hợp với vai trò và quyền truy cập của bạn.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở khu công cụ →</span></div></Link>
        {isLoggedIn ? <button type="button" onClick={onOpenMembership} className="flex min-w-0 items-start gap-4 rounded-2xl border border-brk-outline bg-brk-surface p-5 text-left hover:border-brk-primary"><Compass className="mt-1 h-6 w-6 shrink-0 text-brk-primary" /><div><h3 className="font-bold text-brk-on-surface">Không gian thành viên</h3><p className="mt-2 text-sm text-brk-muted">Mở bảng thông tin và các hoạt động của tài khoản.</p><span className="mt-3 inline-block text-sm font-semibold text-brk-primary">Mở không gian của tôi →</span></div></button> : <div className="rounded-2xl bg-brk-background p-5"><h3 className="font-bold text-brk-on-surface">Học theo nhịp của bạn</h3><p className="mt-2 text-sm text-brk-muted">Sau khi đăng nhập, các khóa đang học và tiến độ sẽ xuất hiện ngay trên trang chủ.</p></div>}
      </div>
    </section>


    {myCourses && <section id="my-courses" aria-label="Tiếp tục học" className="scroll-mt-24 space-y-4">
      <div><h2 className="text-2xl font-bold text-brk-on-surface">{activeCourses.length ? 'Tiếp tục học' : 'Khóa học của tôi'}</h2><p className="mt-1 text-sm text-brk-muted">{activeCourses.length ? 'Chọn khóa đang học và tiếp tục hành trình của bạn.' : 'Xem lại các khóa học bạn đã hoàn thành.'}</p></div>
      <div className="grid min-w-0 gap-4 md:grid-cols-3">{activeCourses.slice(0, 3).map(course => {
        const enrollment = enrollments[course.id]
        const total = enrollment?.totalLessons || course._count?.lessons || 0
        const completed = Math.min(total, Math.max(0, enrollment?.completedCount || 0))
        const percent = total ? Math.round(completed / total * 100) : 0
        return <article key={course.id} className="min-w-0 rounded-2xl border border-brk-outline bg-brk-surface p-5">
          <BookOpen className="mb-3 h-5 w-5 text-brk-primary" /><h3 className="break-words font-bold text-brk-on-surface">{course.name_lop}</h3>
          <p className="mt-1 break-words text-sm text-brk-muted">{course.teacher?.name || 'Khóa học của bạn'}</p>
          <p className="mt-4 text-sm text-brk-muted">Đã học {completed}/{total} bài · {percent}%</p>
          <div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-brk-background"><div className="h-full bg-brk-accent" style={{ width: `${percent}%` }} /></div>
          <Link href={`/courses/${encodeURIComponent(course.id_khoa)}/learn`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-brk-on-primary">Tiếp tục học<ArrowRight className="h-4 w-4" /></Link>
        </article>
      })}</div>
      <details className="rounded-2xl border border-brk-outline bg-brk-surface p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold text-brk-on-surface">Xem tất cả khóa học của tôi</summary><div className="mt-5">{myCourses}</div></details>
    </section>}


    {catalog}
    {community && <section aria-label="Cộng đồng" className="min-w-0 border-t border-brk-outline pt-6">{community}</section>}
    </div>
  </>
}
