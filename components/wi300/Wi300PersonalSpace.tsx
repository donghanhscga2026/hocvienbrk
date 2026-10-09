'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Search } from 'lucide-react'
import { recentActiveCourses } from '@/lib/wi300/catalog'
import { filterPersonalTools, isContentTool, pendingCourseLabel, toolGroup, toolGroups, type PersonalTool } from '@/lib/wi300/personal-space'
import type { Wi300Course, Wi300Enrollment } from './Wi300Home'

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
type Tool = PersonalTool
type LearningStatus = 'active' | 'completed' | 'pending'
const tabs = [{ id: 'home', label: 'Tổng quan' }, { id: 'learning', label: 'Học tập' }, { id: 'tools', label: 'Công cụ' }, { id: 'pages', label: 'Website & nội dung' }, { id: 'account', label: 'Tài khoản' }]
const box = 'rounded-2xl border border-brk-outline bg-white p-5'
const action = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white'
const pageSize = 6

// Giữ nguyên quy tắc hiển thị công cụ của hệ thống cũ.
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
  const router = useRouter()
  const tab = tabs.some(item => item.id === params.get('tab')) ? params.get('tab')! : 'home'
  const role = session?.user?.role || 'guest'
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [tools, setTools] = useState<Tool[]>([])
  const [toolsError, setToolsError] = useState(false)
  const [toolsLoading, setToolsLoading] = useState(true)
  const [learningStatus, setLearningStatus] = useState<LearningStatus>('active')
  const [learningPage, setLearningPage] = useState(1)
  const [toolQuery, setToolQuery] = useState('')
  const [selectedToolGroup, setSelectedToolGroup] = useState('')
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
  const recent = active[0]
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
  const currentToolGroup = availableGroups.some(group => group.id === selectedToolGroup) ? selectedToolGroup : ''
  const filteredTools = filterPersonalTools(otherTools, toolQuery, currentToolGroup)

  const toolList = (items: Tool[], grouped = false) => toolsLoading ? <p role="status" className={box}>Đang tải công cụ…</p> : toolsError ? <p role="alert" className={box}>Chưa tải được công cụ. Vui lòng tải lại trang.</p> : items.length ? <div className="grid gap-3 sm:grid-cols-2">{items.map(tool => {
    const group = toolGroups.find(item => item.id === toolGroup(tool))!
    return <Link key={tool.id} href={safeToolUrl(tool.url)!} className={`${box} transition-shadow hover:shadow-sm`}>
      {grouped && <p className="mb-2 text-xs font-semibold text-brk-primary">{group.label}</p>}
      <span className="font-semibold">{tool.name}</span><span className="ml-2 text-brk-primary">→</span>
      {grouped && <p className="mt-2 text-sm leading-6 text-brk-muted">{group.description}</p>}
    </Link>
  })}</div> : <p className={box}>{grouped && otherTools.length ? 'Không tìm thấy công cụ phù hợp. Hãy đổi nhóm hoặc từ khóa.' : 'Chưa có công cụ trong nhóm này phù hợp với quyền tài khoản của bạn.'}</p>

  const courseCard = (course: Wi300Course) => {
    const row = map.get(course.id)!
    const percent = row.totalLessons ? Math.min(100, Math.round(row.completedCount / row.totalLessons * 100)) : 0
    const courseHref = `/khoa-hoc/${encodeURIComponent(course.id_khoa)}`
    const learnHref = `/courses/${encodeURIComponent(course.id_khoa)}/learn${row.lastLessonId ? `?lesson=${encodeURIComponent(row.lastLessonId)}` : ''}`
    return <article key={course.id} className={`${box} flex flex-col gap-3`}>
      <p className="text-xs font-semibold text-brk-primary">{learningStatus === 'pending' ? pendingCourseLabel(row.payment) : currentLearning.title}</p>
      <h3 className="text-base font-bold leading-6"><Link href={courseHref}>{course.name_lop}</Link></h3>
      {learningStatus !== 'pending' && <div><div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-brk-background"><div className="h-full rounded-full bg-brk-primary" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-brk-muted">{row.completedCount}/{row.totalLessons} bài học · {percent}%</p></div>}
      <div className="mt-auto pt-1">{learningStatus === 'pending' && row.payment && !['REJECTED', 'CANCELLED', 'VERIFIED'].includes(row.payment.status) ? <button type="button" onClick={() => setPaymentCourseId(course.id)} className={action}>{row.payment.proofImage ? 'Xem thanh toán' : 'Thanh toán'}</button> : <Link href={row.status === 'ACTIVE' ? learnHref : courseHref} className={action}>{learningStatus === 'active' ? 'Tiếp tục học' : learningStatus === 'completed' && row.status === 'ACTIVE' ? 'Xem lại bài học' : 'Xem chi tiết'}</Link>}</div>
    </article>
  }

  return <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6"><div className="grid gap-6 md:grid-cols-[210px_minmax(0,1fr)]">
    <aside className="md:sticky md:top-24 md:self-start"><nav aria-label="Menu không gian cá nhân" className={`${box} flex gap-2 overflow-x-auto md:block`}><p className="mb-3 hidden text-sm font-bold text-brk-muted md:block">Không gian của tôi</p>{tabs.map(item => <Link key={item.id} href={`/my-space${item.id === 'home' ? '' : `?tab=${item.id}`}`} scroll={false} onNavigate={() => titleRef.current?.scrollIntoView({ block: 'start' })} aria-current={tab === item.id ? 'page' : undefined} className={`block min-h-11 shrink-0 rounded-xl px-3 py-3 text-sm font-semibold ${tab === item.id ? 'bg-brk-primary text-white' : 'hover:bg-brk-background'}`}>{item.label}</Link>)}</nav></aside>
    <div className="min-w-0 space-y-5"><h1 ref={titleRef} className="scroll-mt-40 text-3xl font-bold lg:scroll-mt-24">{tab === 'home' ? `Chào ${session?.user?.name || 'bạn'}!` : tabs.find(item => item.id === tab)?.label}</h1>
      {accountError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">Chưa tải được dữ liệu học tập. Vui lòng thử tải lại trang.</p>}
      {tab === 'home' && <><p className="text-brk-muted">Học tập, công cụ và nội dung của bạn trong một không gian.</p><section className={box}><h2 className="text-xl font-bold">Tiếp tục học</h2>{recent ? <><p className="mt-3">{recent.name_lop}</p><Link href={`/courses/${encodeURIComponent(recent.id_khoa)}/learn${map.get(recent.id)?.lastLessonId ? `?lesson=${encodeURIComponent(map.get(recent.id)!.lastLessonId!)}` : ''}`} className={`mt-4 ${action}`}>Tiếp tục bài học →</Link></> : <p className="mt-3 text-brk-muted">Bạn chưa có khóa đang học. <Link href="/khoa-hoc" className="text-brk-primary">Khám phá khóa học →</Link></p>}</section><div className="grid gap-3 sm:grid-cols-2">{tabs.slice(1).map(item => <Link key={item.id} href={`/my-space?tab=${item.id}`} className={box}><h2 className="font-bold">{item.label} →</h2>{item.id === 'learning' && <p className="mt-2 text-sm text-brk-muted">{active.length} đang học · {completed.length} hoàn thành · {pending.length} chờ xử lý</p>}</Link>)}</div></>}
      {tab === 'learning' && <>
        <div role="tablist" aria-label="Trạng thái học tập" className="flex gap-2 overflow-x-auto pb-1">{learningGroups.map((group, index) => <button key={group.id} id={`learning-tab-${group.id}`} type="button" role="tab" aria-selected={learningStatus === group.id} aria-controls="learning-panel" tabIndex={learningStatus === group.id ? 0 : -1} onClick={() => { setLearningStatus(group.id); setLearningPage(1) }} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % learningGroups.length : event.key === 'ArrowLeft' ? (index + learningGroups.length - 1) % learningGroups.length : event.key === 'Home' ? 0 : event.key === 'End' ? learningGroups.length - 1 : -1
          if (next < 0) return
          event.preventDefault(); setLearningStatus(learningGroups[next].id); setLearningPage(1); document.getElementById(`learning-tab-${learningGroups[next].id}`)?.focus()
        }} className={`min-h-12 shrink-0 rounded-xl border px-4 text-sm font-semibold ${learningStatus === group.id ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white hover:bg-brk-background'}`}>{group.title} ({group.items.length})</button>)}</div>
        <section id="learning-panel" role="tabpanel" aria-labelledby={`learning-tab-${learningStatus}`} tabIndex={0} className="space-y-4"><h2 className="sr-only">{currentLearning.title}</h2>{visibleCourses.length ? <div className="grid items-stretch gap-4 sm:grid-cols-2">{visibleCourses.map(courseCard)}</div> : <p className={`${box} text-sm text-brk-muted`}>Chưa có khóa học trong nhóm này.</p>}
          {totalPages > 1 && <nav aria-label="Phân trang khóa học" className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setLearningPage(currentPage - 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">← Trang trước</button><p role="status" className="text-sm text-brk-muted">Trang {currentPage}/{totalPages}</p><button type="button" disabled={currentPage === totalPages} onClick={() => setLearningPage(currentPage + 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">Trang sau →</button></nav>}
        </section>
        {['ADMIN', 'TEACHER'].includes(role) && <Link href="/tools/courses" className="inline-flex min-h-11 items-center font-semibold text-brk-primary">Quản lý khóa học tôi giảng dạy →</Link>}
      </>}
      {tab === 'tools' && <><p className="text-brk-muted">Tìm công cụ theo mục đích sử dụng. Danh sách hiển thị theo quyền tài khoản của bạn.</p><div className="flex flex-col gap-3 sm:flex-row"><label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-brk-outline bg-white px-4"><Search aria-hidden className="h-5 w-5 shrink-0 text-brk-muted" /><span className="sr-only">Tìm công cụ</span><input type="search" value={toolQuery} onChange={event => setToolQuery(event.target.value)} placeholder="Tìm công cụ hoặc mục đích…" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label><label className="sr-only" htmlFor="wi300-tool-group">Nhóm công cụ</label><select id="wi300-tool-group" value={currentToolGroup} onChange={event => setSelectedToolGroup(event.target.value)} className="min-h-12 max-w-full rounded-xl border border-brk-outline bg-white px-3 text-sm sm:max-w-64"><option value="">Tất cả nhóm ({otherTools.length})</option>{availableGroups.map(group => <option key={group.id} value={group.id}>{group.label} ({otherTools.filter(tool => toolGroup(tool) === group.id).length})</option>)}</select></div>{!toolsLoading && !toolsError && <p role="status" className="text-sm text-brk-muted">{filteredTools.length} công cụ{currentToolGroup ? ` · ${availableGroups.find(group => group.id === currentToolGroup)?.label}` : ''}</p>}{toolList(filteredTools, true)}</>}
      {tab === 'pages' && <><p className="text-brk-muted">Quản lý website, trang giới thiệu, landing page và bài viết.</p>{toolList(pages)}</>}
      {tab === 'account' && <section className={box}><h2 className="text-xl font-bold">Hồ sơ & bảo mật</h2><p className="mt-3 text-brk-muted">Cập nhật thông tin cá nhân, mật khẩu và tài khoản nhận thanh toán.</p><Link href="/account-settings" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brk-primary">Cài đặt tài khoản →</Link><div className="mt-5 border-t border-brk-outline pt-5"><h2 className="font-bold">Hỗ trợ</h2><Link href="/tools/ho-tro" className="inline-flex min-h-11 items-center text-brk-primary">Yêu cầu hỗ trợ & theo dõi phản hồi →</Link></div></section>}
    </div>
  </div>{paymentCourse && <PaymentModal course={paymentCourse} enrollment={map.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onUploadProof={() => router.refresh()} onClose={() => { setPaymentCourseId(null); router.refresh() }} />}</div>
}
