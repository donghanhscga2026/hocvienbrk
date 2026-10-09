'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import CourseCard from '@/components/course/CourseCard'
import { recentActiveCourses } from '@/lib/wi300/catalog'
import type { Wi300Course, Wi300Enrollment } from './Wi300Home'

type Tool = { id: number; name: string; url: string; roles: string[]; isActive: boolean }
const tabs = [{ id: 'home', label: 'Tổng quan' }, { id: 'learning', label: 'Học tập' }, { id: 'tools', label: 'Công cụ' }, { id: 'pages', label: 'Website & nội dung' }, { id: 'account', label: 'Tài khoản' }]
const box = 'rounded-2xl border border-brk-outline bg-white p-5'
export function canUseTool(role: string, roles: string[]) {
  return !roles.length || roles.includes(role) || (role === 'ADMIN' && roles.some(r => ['TEACHER', 'AFFILIATE', 'STUDENT'].includes(r))) || (role === 'TEACHER' && roles.some(r => ['AFFILIATE', 'STUDENT'].includes(r)))
}
function safeToolUrl(url: string) {
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return url
  try { return new URL(url).protocol === 'https:' ? url : null } catch { return null }
}

export default function Wi300PersonalSpace({ courses, enrollments, userId, userPhone, accountError }: { courses: Wi300Course[]; enrollments: Wi300Enrollment[]; userId: number | null; userPhone: string | null; accountError: boolean }) {
  const { data: session } = useSession()
  const params = useSearchParams()
  const tab = tabs.some(item => item.id === params.get('tab')) ? params.get('tab')! : 'home'
  const role = session?.user?.role || 'guest'
  const [tools, setTools] = useState<Tool[]>([])
  const [toolsError, setToolsError] = useState(false)
  const [toolsLoading, setToolsLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/tools', { signal: controller.signal })
        if (!response.ok) throw new Error('tools')
        const data = await response.json()
        if (!Array.isArray(data.tools)) throw new Error('tools')
        setTools(data.tools.filter((tool: Tool) => tool.isActive && Array.isArray(tool.roles) && canUseTool(role, tool.roles) && typeof tool.url === 'string' && safeToolUrl(tool.url)))
      } catch { if (!controller.signal.aborted) setToolsError(true) }
      finally { if (!controller.signal.aborted) setToolsLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [role])
  const map = new Map(enrollments.map(row => [row.courseId, row]))
  const learning = courses.filter(course => { const row = map.get(course.id); return row && !row.hiddenFromGifts })
  const active = recentActiveCourses(courses, enrollments, enrollments.length)
  const completed = learning.filter(course => { const row = map.get(course.id)!; return row.status === 'COMPLETED' || (row.status === 'ACTIVE' && row.totalLessons > 0 && row.completedCount >= row.totalLessons) })
  const pending = learning.filter(course => map.get(course.id)?.status === 'PENDING')
  const recent = active[0]
  const pages = tools.filter(tool => /\/tools\/(pages|landings|posts|my-site|site-profiles)(\/|$|\?)/.test(tool.url))
  const otherTools = tools.filter(tool => !pages.includes(tool))
  const toolList = (items: Tool[]) => toolsLoading ? <p role="status" className={box}>Đang tải công cụ…</p> : toolsError ? <p role="alert" className={box}>Chưa tải được công cụ. Vui lòng tải lại trang.</p> : items.length ? <div className="grid gap-3 sm:grid-cols-2">{items.map(tool => <Link key={tool.id} href={safeToolUrl(tool.url)!} className={box}><span className="font-semibold">{tool.name}</span><span className="ml-2 text-brk-primary">→</span></Link>)}</div> : <p className={box}>Chưa có công cụ trong nhóm này phù hợp với quyền tài khoản của bạn.</p>
  return <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6"><div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
    <aside><nav aria-label="Menu không gian cá nhân" className={`${box} flex gap-2 overflow-x-auto md:block`}><p className="mb-3 hidden text-sm font-bold text-brk-muted md:block">Không gian của tôi</p>{tabs.map(item => <Link key={item.id} href={`/my-space${item.id === 'home' ? '' : `?tab=${item.id}`}`} scroll={false} aria-current={tab === item.id ? 'page' : undefined} className={`block min-h-11 shrink-0 rounded-xl px-3 py-3 text-sm font-semibold ${tab === item.id ? 'bg-brk-primary text-white' : 'hover:bg-brk-background'}`}>{item.label}</Link>)}</nav></aside>
    <div className="min-w-0 space-y-5"><h1 className="text-3xl font-bold">{tab === 'home' ? `Chào ${session?.user?.name || 'bạn'}!` : tabs.find(item => item.id === tab)?.label}</h1>
      {accountError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">Chưa tải được dữ liệu học tập. Vui lòng thử tải lại trang.</p>}
      {tab === 'home' && <><p className="text-brk-muted">Học tập, công cụ và nội dung của bạn trong một không gian.</p><section className={box}><h2 className="text-xl font-bold">Tiếp tục học</h2>{recent ? <><p className="mt-3">{recent.name_lop}</p><Link href={`/courses/${encodeURIComponent(recent.id_khoa)}/learn${map.get(recent.id)?.lastLessonId ? `?lesson=${encodeURIComponent(map.get(recent.id)!.lastLessonId!)}` : ''}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brk-primary px-4 font-semibold text-white">Tiếp tục bài học →</Link></> : <p className="mt-3 text-brk-muted">Bạn chưa có khóa đang học. <Link href="/khoa-hoc" className="text-brk-primary">Khám phá khóa học →</Link></p>}</section><div className="grid gap-3 sm:grid-cols-2">{tabs.slice(1).map(item => <Link key={item.id} href={`/my-space?tab=${item.id}`} className={box}><h2 className="font-bold">{item.label} →</h2>{item.id === 'learning' && <p className="mt-2 text-sm text-brk-muted">{active.length} đang học · {completed.length} hoàn thành · {pending.length} chờ kích hoạt</p>}</Link>)}</div></>}
      {tab === 'learning' && <>{[{ title: 'Đang học', items: active }, { title: 'Đã hoàn thành', items: completed }, { title: 'Chờ kích hoạt', items: pending }].map(group => <section key={group.title}><h2 className="mb-4 text-xl font-bold">{group.title} <span className="text-sm font-normal text-brk-muted">({group.items.length})</span></h2>{group.items.length ? <div className="grid items-start gap-4 xl:grid-cols-2">{group.items.map(course => <CourseCard key={course.id} course={course} enrollment={map.get(course.id)} isLoggedIn userId={userId} userPhone={userPhone} showSharing={false} />)}</div> : <p className={`${box} text-sm text-brk-muted`}>Chưa có khóa học trong nhóm này.</p>}</section>)}{['ADMIN', 'TEACHER'].includes(role) && <Link href="/tools/courses" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Quản lý khóa học tôi giảng dạy →</Link>}</>}
      {tab === 'tools' && <><p className="text-brk-muted">Công cụ được hiển thị theo quyền tài khoản của bạn.</p>{toolList(otherTools)}</>}
      {tab === 'pages' && <><p className="text-brk-muted">Quản lý website, trang giới thiệu, landing page và bài viết.</p>{toolList(pages)}</>}
      {tab === 'account' && <section className={box}><h2 className="text-xl font-bold">Hồ sơ & bảo mật</h2><p className="mt-3 text-brk-muted">Cập nhật thông tin cá nhân, mật khẩu và tài khoản nhận thanh toán.</p><Link href="/account-settings" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brk-primary">Cài đặt tài khoản →</Link><div className="mt-5 border-t border-brk-outline pt-5"><h2 className="font-bold">Hỗ trợ</h2><Link href="/tools/ho-tro" className="inline-flex min-h-11 items-center text-brk-primary">Yêu cầu hỗ trợ & theo dõi phản hồi →</Link></div></section>}
    </div>
  </div></div>
}
