'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { recentActiveCourses } from '@/lib/wi300/catalog'
import { canTeach, isContentTool, pendingCourseLabel, toolGroup, toolGroups, type PersonalTool } from '@/lib/wi300/personal-space'
import type { Wi300Course, Wi300Enrollment, Wi300TeachingCourse } from './Wi300Home'

import Wi300TeachingPanel from './Wi300TeachingPanel'
import useCoursePageSize from './useCoursePageSize'

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
type Tool = PersonalTool
type LearningStatus = 'active' | 'completed' | 'pending'
const spaceTabs = [{ id: 'home', label: 'Tổng quan' }, { id: 'learning', label: 'Học tập' }, { id: 'teaching', label: 'Giảng dạy' }, { id: 'tools', label: 'Công cụ' }, { id: 'pages', label: 'Website & nội dung' }, { id: 'account', label: 'Tài khoản' }]
const box = 'rounded-2xl border border-brk-outline bg-white p-5'
const action = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white'

// Giữ nguyên quy tắc hiển thị công cụ của hệ thống cũ.
export function canUseTool(role: string, roles: string[]) {
  return !roles.length || roles.includes(role) || (role === 'ADMIN' && roles.some(r => ['TEACHER', 'AFFILIATE', 'STUDENT'].includes(r))) || (role === 'TEACHER' && roles.some(r => ['AFFILIATE', 'STUDENT'].includes(r)))
}
function safeToolUrl(url: string) {
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return url
  try { return new URL(url).protocol === 'https:' ? url : null } catch { return null }
}

export default function Wi300PersonalSpace({ courses, enrollments, userId, userPhone, accountError, teachingCourses = [], teachingError = false }: { teachingCourses?: Wi300TeachingCourse[]; teachingError?: boolean; courses: Wi300Course[]; enrollments: Wi300Enrollment[]; userId: number | null; userPhone: string | null; accountError: boolean }) {
  const { data: session } = useSession()
  const params = useSearchParams()
  const router = useRouter()
  const role = session?.user?.role || 'guest'
  const teachingAllowed = canTeach(role)
  const tabs = spaceTabs.filter(item => item.id !== 'teaching' || teachingAllowed)
  const tab = tabs.some(item => item.id === params.get('tab')) ? params.get('tab')! : 'home'
  const pageSize = useCoursePageSize()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [toolsError, setToolsError] = useState(false)
  const [toolsLoading, setToolsLoading] = useState(true)
  const [learningStatus, setLearningStatus] = useState<LearningStatus>('active')
  const [learningPage, setLearningPage] = useState(1)
  const [paymentCourseId, setPaymentCourseId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/tools', { signal: controller.signal })
        if (!response.ok) throw new Error('tools')
        const data = await response.json()
        if (!Array.isArray(data.tools)) throw new Error('tools')
        if (!controller.signal.aborted) setTools(data.tools.filter((tool: Tool) => tool.isActive && Array.isArray(tool.roles) && canUseTool(role, tool.roles) && typeof tool.url === 'string' && safeToolUrl(tool.url)))
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
  const learningGroups = [{ id: 'active' as const, title: 'Đang học', items: active }, { id: 'completed' as const, title: 'Đã hoàn thành', items: completed }, { id: 'pending' as const, title: 'Chờ xử lý', items: pending }]
  const currentLearning = learningGroups.find(group => group.id === learningStatus)!
  const totalPages = Math.max(1, Math.ceil(currentLearning.items.length / pageSize))
  const currentPage = Math.min(learningPage, totalPages)
  const visibleCourses = currentLearning.items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const paymentCourse = courses.find(course => course.id === paymentCourseId)

  // Lọc lại theo role hiện tại ngay khi render để tránh hiện danh sách của role cũ.
  const permittedTools = tools.filter(tool => canUseTool(role, tool.roles))
  const pages = permittedTools.filter(isContentTool)
  const otherTools = permittedTools.filter(tool => !isContentTool(tool))
  const availableGroups = toolGroups.filter(group => otherTools.some(tool => toolGroup(tool) === group.id))

  const toolList = (items: Tool[], grouped = false) => toolsLoading ? <p role="status" className={box}>Đang tải công cụ…</p> : toolsError ? <p role="alert" className={box}>Chưa tải được công cụ. Vui lòng tải lại trang.</p> : items.length ? <div className="grid gap-3 sm:grid-cols-2">{items.map(tool => {
    const group = toolGroups.find(item => item.id === toolGroup(tool))!
    return <Link key={tool.id} href={safeToolUrl(tool.url)!} className={`${box} transition-shadow hover:shadow-sm`}>
      {grouped && <p className="mb-2 text-xs font-semibold text-brk-primary">{group.label}</p>}
      <span className="font-semibold">{tool.name}</span><span className="ml-2 text-brk-primary">→</span>
      {grouped && <p className="mt-2 text-sm leading-6 text-brk-muted">{group.description}</p>}
    </Link>
  })}</div> : <p className={box}>{grouped && otherTools.length ? 'Không tìm thấy công cụ phù hợp. Hãy đổi nhóm hoặc từ khóa.' : 'Chưa có công cụ trong nhóm này phù hợp với quyền tài khoản của bạn.'}</p>

  const courseCard = (course: Wi300Course, status: LearningStatus = learningStatus) => {
    const row = map.get(course.id)!
    const percent = row.totalLessons ? Math.min(100, Math.round(row.completedCount / row.totalLessons * 100)) : 0
    const courseHref = `/khoa-hoc/${encodeURIComponent(course.id_khoa)}`
    const learnHref = `/courses/${encodeURIComponent(course.id_khoa)}/learn${row.lastLessonId ? `?lesson=${encodeURIComponent(row.lastLessonId)}` : ''}`
    return <article key={course.id} className={`${box} flex flex-col gap-3`}>
      <p className="text-xs font-semibold text-brk-primary">{status === 'pending' ? pendingCourseLabel(row.payment) : status === 'completed' ? 'Đã hoàn thành' : 'Đang học'}</p>
      <h3 className="text-base font-bold leading-6"><Link href={courseHref}>{course.name_lop}</Link></h3>
      {status !== 'pending' && <div><div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-brk-background"><div className="h-full rounded-full bg-brk-primary" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-brk-muted">{row.completedCount}/{row.totalLessons} bài học · {percent}%</p></div>}
      <div className="mt-auto pt-1">{status === 'pending' && row.payment && !['REJECTED', 'CANCELLED', 'VERIFIED'].includes(row.payment.status) ? <button type="button" onClick={() => setPaymentCourseId(course.id)} className={action}>{row.payment.proofImage ? 'Xem thanh toán' : 'Thanh toán'}</button> : <Link href={row.status === 'ACTIVE' ? learnHref : courseHref} className={action}>{status === 'active' ? 'Tiếp tục học' : status === 'completed' && row.status === 'ACTIVE' ? 'Xem lại bài học' : 'Xem chi tiết'}</Link>}</div>
    </article>
  }

  return <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6"><div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
    <aside className="md:sticky md:top-40 md:self-start lg:top-24"><nav aria-label="Menu không gian cá nhân" className={`${box} flex gap-2 overflow-x-auto md:block`}><p className="mb-3 hidden text-sm font-bold text-brk-muted md:block">Không gian của tôi</p>{tabs.map(item => <Link key={item.id} href={`/my-space${item.id === 'home' ? '' : `?tab=${item.id}`}`} scroll={false} onNavigate={() => titleRef.current?.scrollIntoView({ block: 'start' })} aria-current={tab === item.id ? 'page' : undefined} className={`block min-h-11 shrink-0 rounded-xl px-3 py-3 text-sm font-semibold ${tab === item.id ? 'bg-brk-primary text-white' : 'hover:bg-brk-background'}`}>{item.label}</Link>)}</nav></aside>
    <div className="min-w-0 space-y-5"><h1 ref={titleRef} className="scroll-mt-40 text-3xl font-bold lg:scroll-mt-24">{tab === 'home' ? `Chào ${session?.user?.name || 'bạn'}!` : tabs.find(item => item.id === tab)?.label}</h1>
      {accountError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">Chưa tải được dữ liệu học tập. Vui lòng thử tải lại trang.</p>}
      {tab === 'home' && <><p className="text-brk-muted">Học tập, giảng dạy, công cụ và nội dung của bạn trong một không gian.</p>
        <div className={`grid items-start gap-5 ${teachingAllowed ? 'xl:grid-cols-2' : ''}`}>
          <section className={`${box} space-y-4`} aria-labelledby="space-learning-title">
            <div><h2 id="space-learning-title" className="text-xl font-bold">Học tập</h2><p className="mt-2 text-sm text-brk-muted">{active.length} đang học · {completed.length} hoàn thành · {pending.length} chờ xử lý</p></div>
            {active.length ? <div className="space-y-3">{active.slice(0, 3).map(course => courseCard(course, 'active'))}</div> : <p className="text-sm text-brk-muted">Bạn chưa có khóa đang học. <Link href="/khoa-hoc" className="text-brk-primary">Tìm khóa học →</Link></p>}
            <Link href="/my-space?tab=learning" className="inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">Xem tất cả khóa học của tôi →</Link>
          </section>
          {teachingAllowed && <section className={`${box} space-y-4`} aria-labelledby="space-teaching-title"><h2 id="space-teaching-title" className="text-xl font-bold">Giảng dạy</h2><Wi300TeachingPanel courses={teachingCourses} error={teachingError} preview /></section>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">{tabs.filter(item => ['tools', 'pages', 'account'].includes(item.id)).map(item => <Link key={item.id} href={`/my-space?tab=${item.id}`} className={box}><h2 className="font-bold">{item.label} →</h2></Link>)}</div>
      </>}
      {tab === 'teaching' && teachingAllowed && <Wi300TeachingPanel courses={teachingCourses} error={teachingError} />}
      {tab === 'learning' && <>
        <div role="tablist" aria-label="Trạng thái học tập" className="flex gap-2 overflow-x-auto pb-1">{learningGroups.map((group, index) => <button key={group.id} id={`learning-tab-${group.id}`} type="button" role="tab" aria-selected={learningStatus === group.id} aria-controls="learning-panel" tabIndex={learningStatus === group.id ? 0 : -1} onClick={() => { setLearningStatus(group.id); setLearningPage(1) }} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % learningGroups.length : event.key === 'ArrowLeft' ? (index + learningGroups.length - 1) % learningGroups.length : event.key === 'Home' ? 0 : event.key === 'End' ? learningGroups.length - 1 : -1
          if (next < 0) return
          event.preventDefault(); setLearningStatus(learningGroups[next].id); setLearningPage(1); document.getElementById(`learning-tab-${learningGroups[next].id}`)?.focus()
        }} className={`min-h-12 shrink-0 rounded-xl border px-4 text-sm font-semibold ${learningStatus === group.id ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white hover:bg-brk-background'}`}>{group.title} ({group.items.length})</button>)}</div>
        <section id="learning-panel" role="tabpanel" aria-labelledby={`learning-tab-${learningStatus}`} tabIndex={0} className="space-y-4"><h2 className="sr-only">{currentLearning.title}</h2>{visibleCourses.length ? <div className="grid items-stretch gap-4 sm:grid-cols-2">{visibleCourses.map(course => courseCard(course))}</div> : <p className={`${box} text-sm text-brk-muted`}>Chưa có khóa học trong nhóm này.</p>}
          {totalPages > 1 && <nav aria-label="Phân trang khóa học" className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setLearningPage(currentPage - 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">← Trang trước</button><p role="status" className="text-sm text-brk-muted">Trang {currentPage}/{totalPages}</p><button type="button" disabled={currentPage === totalPages} onClick={() => setLearningPage(currentPage + 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">Trang sau →</button></nav>}
        </section>
      </>}
      {tab === 'tools' && <><p className="text-brk-muted">Các công cụ được chia theo mục đích sử dụng và quyền tài khoản của bạn.</p>
        {/* Chỉ hiển thị nhóm có công cụ được phép dùng, giữ nguyên phân quyền. */}
        {toolsLoading || toolsError || !otherTools.length ? toolList(otherTools) : availableGroups.map(group => {
          const items = otherTools.filter(tool => toolGroup(tool) === group.id)
          return <section key={group.id} aria-labelledby={`tool-group-${group.id}`} className="rounded-2xl border border-brk-outline bg-brk-background p-4 sm:p-5">
            <div className="mb-4"><h2 id={`tool-group-${group.id}`} className="text-lg font-bold">{group.label} <span className="text-sm font-normal text-brk-muted">({items.length})</span></h2><p className="mt-1 text-sm text-brk-muted">{group.description}</p></div>
            {toolList(items)}
          </section>
        })}
      </>}
      {tab === 'pages' && <><p className="text-brk-muted">Quản lý website, trang giới thiệu, landing page và bài viết.</p>{toolList(pages)}</>}
      {tab === 'account' && <section className={box}><h2 className="text-xl font-bold">Hồ sơ & bảo mật</h2><p className="mt-3 text-brk-muted">Cập nhật thông tin cá nhân, mật khẩu và tài khoản nhận thanh toán.</p><Link href="/account-settings" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brk-primary">Cài đặt tài khoản →</Link><div className="mt-5 border-t border-brk-outline pt-5"><h2 className="font-bold">Hỗ trợ</h2><Link href="/tools/ho-tro" className="inline-flex min-h-11 items-center text-brk-primary">Yêu cầu hỗ trợ & theo dõi phản hồi →</Link></div></section>}
    </div>
  </div>{paymentCourse && <PaymentModal course={paymentCourse} enrollment={map.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onUploadProof={() => router.refresh()} onClose={() => { setPaymentCourseId(null); router.refresh() }} />}</div>
}
