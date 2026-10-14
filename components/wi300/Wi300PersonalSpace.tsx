'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Wi300CourseCover from './Wi300CourseCover'
import { ExternalAppsCatalog } from './Wi300ExternalApps'
import { Youtube, DollarSign, Settings, Users, CreditCard, BookOpen, FileText, Gem, Map as MapIcon, Mail, Layout, Globe, Wallet, Tag, LayoutGrid, GraduationCap, UserRound, ShieldCheck, ContactRound, Link2, DatabaseBackup, LifeBuoy, Network, type LucideIcon } from 'lucide-react'
import { recentActiveCourses } from '@/lib/wi300/catalog'
import { canTeach, isContentTool, wi300ToolName, pendingCourseLabel, toolGroup, toolGroups, type PersonalTool } from '@/lib/wi300/personal-space'
import type { Wi300Course, Wi300Enrollment, Wi300TeachingCourse } from './Wi300Home'

import Wi300TeachingPanel from './Wi300TeachingPanel'
import useCoursePageSize from './useCoursePageSize'
import { useManagementFrame, useManagementTools } from '@/components/layout/ManagementFrameContext'
import { SpaceSidebar } from './Wi300SpaceMenu'
import { canUseTool, safeToolUrl, spaceNavigation } from '@/lib/wi300/personal-space'
export { canUseTool } from '@/lib/wi300/personal-space'

const PaymentModal = dynamic(() => import('@/components/course/PaymentModal'), { ssr: false })
type Tool = PersonalTool
type LearningStatus = 'active' | 'completed' | 'pending'
const box = 'rounded-2xl border border-brk-outline bg-white p-4 sm:p-5'
const action = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white'

// Dùng lại tên icon và mã màu mà màn công cụ gốc lưu trong database.
const toolIcons: Record<string, LucideIcon> = { Youtube, DollarSign, Settings, Users, CreditCard, BookOpen, FileText, Gem, Map: MapIcon, Mail, Layout, Globe, Wallet, Tag, LayoutGrid, GraduationCap, UserRound, ShieldCheck, ContactRound, Link2, DatabaseBackup, LifeBuoy, Network }
const toolColors: Record<string, string> = {
  bgRed600: 'bg-red-600', bgRed700: 'bg-red-700', bgGray500: 'bg-gray-500',
  bgEmerald500: 'bg-emerald-500', bgIndigo500: 'bg-indigo-500', bgGreen500: 'bg-green-500',
  bgCyan500: 'bg-cyan-500', bgOrange500: 'bg-orange-500', bgBlue500: 'bg-blue-500',
  bgPurple500: 'bg-purple-500', bgTeal500: 'bg-teal-500', bgPink500: 'bg-pink-500',
  bgRed400: 'bg-red-400', bgViolet500: 'bg-violet-500', bgAmber500: 'bg-amber-500',
}
const toolDefaults: Record<string, { icon: LucideIcon; color: string }> = {
  courses: { icon: BookOpen, color: 'bg-emerald-500' }, students: { icon: Users, color: 'bg-blue-500' },
  roadmap: { icon: MapIcon, color: 'bg-cyan-500' }, 'my-learning': { icon: BookOpen, color: 'bg-emerald-500' },
  crm: { icon: ContactRound, color: 'bg-teal-500' }, 'email-mkt': { icon: Mail, color: 'bg-pink-500' },
  pages: { icon: Globe, color: 'bg-indigo-500' }, page: { icon: Globe, color: 'bg-indigo-500' },
  'my-site': { icon: Globe, color: 'bg-indigo-500' }, 'site-profiles': { icon: Globe, color: 'bg-indigo-500' },
  landings: { icon: Layout, color: 'bg-violet-500' }, posts: { icon: FileText, color: 'bg-blue-500' },
  affiliate: { icon: Link2, color: 'bg-orange-500' }, genealogy: { icon: Network, color: 'bg-purple-500' },
  payments: { icon: CreditCard, color: 'bg-emerald-500' }, 'bank-accounts': { icon: Wallet, color: 'bg-blue-500' },
  brk: { icon: Wallet, color: 'bg-amber-500' }, vouchers: { icon: Tag, color: 'bg-pink-500' },
  'youtube-tools': { icon: Youtube, color: 'bg-red-600' }, settings: { icon: Settings, color: 'bg-gray-500' },
  backup: { icon: DatabaseBackup, color: 'bg-blue-500' }, 'ho-tro': { icon: LifeBuoy, color: 'bg-teal-500' },
  learning: { icon: BookOpen, color: 'bg-emerald-500' }, teaching: { icon: GraduationCap, color: 'bg-emerald-500' }, tools: { icon: LayoutGrid, color: 'bg-cyan-500' },
  account: { icon: UserRound, color: 'bg-indigo-500' }, admin: { icon: ShieldCheck, color: 'bg-gray-500' },
}
function ToolBadge({ tool }: { tool: Pick<Tool, 'slug' | 'url' | 'icon' | 'description'> }) {
  const route = tool.url.startsWith('/tools/') ? tool.url.split(/[?#]/)[0].split('/')[2] : ''
  const fallback = toolDefaults[route] || toolDefaults[tool.slug || ''] || { icon: LayoutGrid, color: 'bg-teal-500' }
  const Icon = toolIcons[tool.icon || ''] || fallback.icon
  const color = toolColors[tool.description?.split('|')[0]?.trim() || ''] || fallback.color
  return <span aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${color}`}><Icon className="h-7 w-7" strokeWidth={1.8} /></span>
}
const toolTile = 'flex min-h-32 min-w-0 flex-col items-center justify-start gap-3 rounded-2xl border border-brk-outline bg-white p-4 text-center transition-shadow hover:border-brk-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brk-primary'

export default function Wi300PersonalSpace({ courses, enrollments, userId, userPhone, accountError, teachingCourses = [], teachingError = false }: { teachingCourses?: Wi300TeachingCourse[]; teachingError?: boolean; courses: Wi300Course[]; enrollments: Wi300Enrollment[]; userId: number | null; userPhone: string | null; accountError: boolean }) {
  const shared = useManagementFrame()
  const sharedTools = useManagementTools()
  const { data: session } = useSession()
  const params = useSearchParams()
  const router = useRouter()
  const role = session?.user?.role || 'guest'
  const [localTools, setTools] = useState<Tool[]>([])
  const tools = sharedTools?.tools ?? localTools
  const teachingAllowed = canTeach(role)
  // Thẻ tổng quan, sidebar và header cùng nhận một nguồn phân nhóm.
  const tabs = spaceNavigation(role, tools)
  // Giữ đường dẫn Website & nội dung cũ cho bookmark đã lưu.
  const requestedTab = params.get('tab')
  const tab = requestedTab === 'pages' ? 'business' : tabs.some(item => item.id === requestedTab) ? requestedTab! : 'home'
  // Các bookmark cũ vẫn mở đúng tab con trong Tổng quan.
  const overview = teachingAllowed && params.get('view') === 'teaching' ? 'teaching' : 'learning'
  const overviewTabs = [{ id: 'learning', label: 'Học tập' }, ...(teachingAllowed ? [{ id: 'teaching', label: 'Giảng dạy' }] : [])]
  const pageSize = useCoursePageSize()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [localToolsError, setToolsError] = useState(false)
  const [localToolsLoading, setToolsLoading] = useState(true)
  const toolsError = sharedTools?.failed ?? localToolsError
  const toolsLoading = sharedTools?.loading ?? localToolsLoading
  const hasSharedTools = sharedTools !== null
  const requestedStatus = params.get('status')
  const [learningStatus, setLearningStatus] = useState<LearningStatus>(requestedStatus === 'completed' || requestedStatus === 'pending' ? requestedStatus : 'active')
  const [learningPage, setLearningPage] = useState(1)
  const [paymentCourseId, setPaymentCourseId] = useState<number | null>(null)
  // Lối tắt menu mở thẳng nhóm khóa học, không cần bấm thêm tab trạng thái.
  useEffect(() => { setLearningStatus(requestedStatus === 'completed' || requestedStatus === 'pending' ? requestedStatus : 'active'); setLearningPage(1) }, [requestedStatus])

  useEffect(() => {
    if (hasSharedTools) return
    const controller = new AbortController()
    setToolsLoading(true)
    setToolsError(false)
    setTools([])
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
  }, [role, session?.user?.id, hasSharedTools])

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
  const workspaceTools = (workspace: string): Tool[] => (tabs.find(group => group.id === workspace)?.items || []).map((item, index) => {
    const tool = permittedTools.find(tool => tool.url === item.href)
    return tool ? { ...tool, name: item.label } : { id: -100 - index, name: item.label, url: item.href, icon: item.icon, roles: [], isActive: true }
  })
  const pages = workspaceTools('pages')
  const otherTools = workspaceTools('tools')
  const accountTools = workspaceTools('account')
  const availableGroups = toolGroups.filter(group => otherTools.some(tool => toolGroup(tool) === group.id))

  const affiliateTools = [{ id: -1, slug: 'affiliate', name: 'Link giới thiệu & hoa hồng', url: '/tools/affiliate', roles: [], isActive: true }, ...workspaceTools('affiliate').filter(tool => tool.url.split(/[?#]/)[0].replace(/\/$/, '') !== '/tools/affiliate')]

  const toolGrid = (items: Tool[], grouped = false) => items.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{items.map(tool => {
    const group = isContentTool(tool) ? { label: 'Website & nội dung' } : toolGroups.find(item => item.id === toolGroup(tool))!
    return <Link key={tool.id} href={safeToolUrl(tool.url)!} className={toolTile}>
      <ToolBadge tool={tool} />
      <span className="w-full break-words text-sm font-semibold leading-5">{wi300ToolName(tool)}</span>
      {grouped && <span className="mt-auto text-xs leading-5 text-brk-muted">{group.label}</span>}
    </Link>
  })}</div> : <p className={box}>{grouped && otherTools.length ? 'Không tìm thấy công cụ phù hợp. Hãy đổi nhóm hoặc từ khóa.' : 'Chưa có công cụ trong nhóm này phù hợp với quyền tài khoản của bạn.'}</p>

  const toolList = (items: Tool[], grouped = false) => toolsLoading ? <p role="status" className={box}>Đang tải công cụ…</p> : toolsError ? <p role="alert" className={box}>Chưa tải được công cụ. Vui lòng tải lại trang.</p> : toolGrid(items, grouped)

  const courseCard = (course: Wi300Course, status: LearningStatus = learningStatus) => {
    const row = map.get(course.id)!
    const percent = row.totalLessons ? Math.min(100, Math.round(row.completedCount / row.totalLessons * 100)) : 0
    const courseHref = `/khoa-hoc/${encodeURIComponent(course.id_khoa)}`
    const learnHref = `/courses/${encodeURIComponent(course.id_khoa)}/learn${row.lastLessonId ? `?lesson=${encodeURIComponent(row.lastLessonId)}` : ''}`
    return <article key={course.id} className="flex w-full min-w-0 max-w-sm flex-col overflow-hidden rounded-2xl border border-brk-outline bg-white">
      <Link href={courseHref} aria-label={`Xem khóa học ${course.name_lop}`}><Wi300CourseCover src={course.link_anh_bia} /></Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
      <p className="text-xs font-semibold text-brk-primary">{status === 'pending' ? pendingCourseLabel(row.payment) : status === 'completed' ? 'Đã hoàn thành' : 'Đang học'}</p>
      <h3 className="min-h-12 break-words text-base font-bold leading-6"><Link title={course.name_lop} className="line-clamp-2" href={courseHref}>{course.name_lop}</Link></h3>
      {status !== 'pending' && <div><div role="progressbar" aria-label={`Tiến độ ${course.name_lop}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-brk-background"><div className="h-full rounded-full bg-brk-primary" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-xs text-brk-muted">{row.completedCount}/{row.totalLessons} bài học · {percent}%</p></div>}
      <div className="mt-auto pt-1">{status === 'pending' && row.payment && !['REJECTED', 'CANCELLED', 'VERIFIED'].includes(row.payment.status) ? <button type="button" onClick={() => setPaymentCourseId(course.id)} className={action}>{row.payment.proofImage ? 'Xem thanh toán' : 'Thanh toán'}</button> : <Link href={row.status === 'ACTIVE' ? learnHref : courseHref} className={action}>{status === 'active' ? 'Tiếp tục học' : status === 'completed' && row.status === 'ACTIVE' ? 'Xem lại bài học' : 'Xem chi tiết'}</Link>}</div>
      </div>
    </article>
  }

  return <div className={shared ? "min-w-0" : "mx-auto w-full max-w-7xl px-3 py-5 sm:px-4 sm:py-8 lg:px-6"}><div className={shared ? "min-w-0" : "grid min-w-0 gap-5 lg:grid-cols-[290px_minmax(0,1fr)]"}>
    {!shared && <aside className="relative z-30 min-w-0 lg:sticky lg:top-24 lg:self-start"><SpaceSidebar groups={spaceNavigation(role, permittedTools)} active={tab} route={params.toString()} onNavigate={() => titleRef.current?.scrollIntoView({ block: 'start' })} loading={toolsLoading} failed={toolsError} /></aside>}
    <div className="relative z-0 min-w-0 space-y-5"><h1 ref={titleRef} className="scroll-mt-44 break-words text-2xl font-bold sm:text-3xl lg:scroll-mt-24">{tab === 'home' ? 'Tổng quan' : tab === 'pages' ? 'Nội dung & website' : tabs.find(item => item.id === tab)?.label}</h1>
      {tab === 'business' && toolList(workspaceTools('business'))}
      {tab === 'website-admin' && role === 'ADMIN' && toolList(workspaceTools('website-admin'))}
      {accountError && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-amber-900">Chưa tải được dữ liệu học tập. Vui lòng thử tải lại trang.</p>}
      {tab === 'home' && <>
        <p className="text-sm leading-6 text-brk-muted">Chào {session?.user?.name || 'bạn'}! Theo dõi khóa học và công việc của bạn tại đây.</p>
        <div role="tablist" aria-label="Học tập và giảng dạy" className="flex gap-2 border-b border-brk-outline pb-3">{overviewTabs.map((item, index) => <Link key={item.id} id={`overview-tab-${item.id}`} href={`/my-space?view=${item.id}`} scroll={false} role="tab" aria-selected={overview === item.id} aria-controls="overview-panel" tabIndex={overview === item.id ? 0 : -1} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % overviewTabs.length : event.key === 'ArrowLeft' ? (index + overviewTabs.length - 1) % overviewTabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? overviewTabs.length - 1 : -1
          if (next < 0) return
          event.preventDefault(); router.push(`/my-space?view=${overviewTabs[next].id}`, { scroll: false }); document.getElementById(`overview-tab-${overviewTabs[next].id}`)?.focus()
        }} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold sm:flex-none ${overview === item.id ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white hover:bg-brk-background'}`}>{item.id === 'learning' ? <BookOpen aria-hidden="true" className="h-4 w-4" /> : <GraduationCap aria-hidden="true" className="h-4 w-4" />}{item.label}</Link>)}</div>
      </>}
      <div id="overview-panel" role={tab === 'home' ? 'tabpanel' : undefined} aria-labelledby={tab === 'home' ? `overview-tab-${overview}` : undefined} tabIndex={tab === 'home' ? 0 : undefined} className="min-w-0 space-y-5">
      {tab === 'home' && overview === 'teaching' && teachingAllowed && <><div className={box}><h2 className="font-bold">{teachingCourses.length} khóa giảng dạy</h2><p className="mt-2 text-sm text-brk-muted">{teachingCourses.reduce((sum, course) => sum + course._count.enrollments, 0)} lượt đăng ký học</p></div><Wi300TeachingPanel courses={teachingCourses} error={teachingError} preview /></>}
      {tab === 'teaching' && teachingAllowed && <><Wi300TeachingPanel courses={teachingCourses} error={teachingError} /><section className="space-y-3"><h2 className="text-xl font-bold">Quản lý giảng dạy</h2><p className="text-sm text-brk-muted">Khóa học, bài học và học viên theo quyền tài khoản.</p>{toolList(workspaceTools('teaching'), true)}</section></>}
      {tab === 'affiliate' && <><p className="text-sm leading-6 text-brk-muted">Quản lý link giới thiệu, hoa hồng và mạng lưới của bạn.</p>{toolsLoading && <p role="status" className="text-sm text-brk-muted">Đang tải công cụ bổ sung…</p>}{toolsError && <p role="alert" className="text-sm text-brk-muted">Chưa tải được công cụ bổ sung. Vui lòng tải lại trang.</p>}{toolGrid(affiliateTools)}</>}
      {tab === 'admin' && ['ADMIN', 'DEVELOPER'].includes(role) && <><p className="text-brk-muted">Các công cụ quản trị được cấp cho tài khoản của bạn.</p>{toolList(workspaceTools('admin'), true)}</>}
      {tab === 'home' && overview === 'learning' && <><div className="grid grid-cols-3 gap-2">{learningGroups.map(group => <div key={group.id} className={box}><p className="text-xl font-bold">{group.items.length}</p><p className="text-xs text-brk-muted">{group.title}</p></div>)}</div>{active.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{active.slice(0, 3).map(course => courseCard(course, 'active'))}</div> : <p className={box}>Bạn chưa có khóa đang học.</p>}<Link className="inline-flex min-h-11 items-center font-semibold text-brk-primary" href="/my-space?tab=learning">Xem tất cả khóa học →</Link></>}
      {tab === 'learning' && <>
        <div role="tablist" aria-label="Trạng thái học tập" className="flex flex-wrap gap-2 pb-1">{learningGroups.map((group, index) => <button key={group.id} id={`learning-tab-${group.id}`} type="button" role="tab" aria-selected={learningStatus === group.id} aria-controls="learning-panel" tabIndex={learningStatus === group.id ? 0 : -1} onClick={() => { setLearningStatus(group.id); setLearningPage(1) }} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % learningGroups.length : event.key === 'ArrowLeft' ? (index + learningGroups.length - 1) % learningGroups.length : event.key === 'Home' ? 0 : event.key === 'End' ? learningGroups.length - 1 : -1
          if (next < 0) return
          event.preventDefault(); setLearningStatus(learningGroups[next].id); setLearningPage(1); document.getElementById(`learning-tab-${learningGroups[next].id}`)?.focus()
        }} className={`min-h-11 rounded-xl border px-3 text-xs font-semibold sm:px-4 sm:text-sm ${learningStatus === group.id ? 'border-brk-primary bg-brk-primary text-white' : 'border-brk-outline bg-white hover:bg-brk-background'}`}>{group.title} ({group.items.length})</button>)}</div>
        <section id="learning-panel" role="tabpanel" aria-labelledby={`learning-tab-${learningStatus}`} tabIndex={0} className="space-y-4"><h2 className="sr-only">{currentLearning.title}</h2>{visibleCourses.length ? <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleCourses.map(course => courseCard(course))}</div> : <p className={`${box} text-sm text-brk-muted`}>Chưa có khóa học trong nhóm này.</p>}
          {totalPages > 1 && <nav aria-label="Phân trang khóa học" className="flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setLearningPage(currentPage - 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">← Trang trước</button><p role="status" className="text-sm text-brk-muted">Trang {currentPage}/{totalPages}</p><button type="button" disabled={currentPage === totalPages} onClick={() => setLearningPage(currentPage + 1)} className="min-h-11 rounded-xl border border-brk-outline bg-white px-4 text-sm disabled:opacity-40">Trang sau →</button></nav>}
        </section>
      </>}
      {tab === 'learning' && <section className="space-y-3"><h2 className="text-xl font-bold">Lộ trình & công cụ học tập</h2>{toolList(workspaceTools('learning'))}</section>}
      {tab === 'tools' && <><ExternalAppsCatalog /><p className="text-brk-muted">Các công cụ được chia theo mục đích sử dụng và quyền tài khoản của bạn.</p>
        {/* Chỉ hiển thị nhóm có công cụ được phép dùng, giữ nguyên phân quyền. */}
        {toolsLoading || toolsError || !otherTools.length ? toolList(otherTools) : availableGroups.map(group => {
          const items = otherTools.filter(tool => toolGroup(tool) === group.id)
          return <section key={group.id} aria-labelledby={`tool-group-${group.id}`} className="rounded-2xl border border-brk-outline bg-brk-background p-4 sm:p-5">
            <div className="mb-4"><h2 id={`tool-group-${group.id}`} className="text-lg font-bold">{group.label} <span className="text-sm font-normal text-brk-muted">({items.length})</span></h2><p className="mt-1 text-sm text-brk-muted">{group.description}</p></div>
            {toolList(items)}
          </section>
        })}
      </>}
      </div>
      {tab === 'home' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{tabs.filter(item => item.id !== 'home').map(item => <Link key={item.id} href={item.href} className={toolTile}><ToolBadge tool={{ slug: item.id, url: item.href }} /><h2 className="text-sm font-semibold leading-5">{item.label}</h2></Link>)}</div>}
      {tab === 'home' && !teachingAllowed && <section className={box}><h2 className="text-lg font-bold">Bạn muốn chia sẻ chuyên môn?</h2><p className="mt-2 text-sm leading-6 text-brk-muted">Gửi hồ sơ đăng ký giảng viên. Khu quản lý giảng dạy sẽ xuất hiện khi tài khoản được cấp quyền.</p><Link href="/doi-tac" className="mt-3 inline-flex min-h-11 items-center font-semibold text-brk-primary">Đăng ký làm giảng viên →</Link></section>}
      {tab === 'account' && <section className="space-y-3"><h2 className="text-xl font-bold">Tài khoản & tài chính</h2>{toolList(accountTools)}</section>}
      {tab === 'pages' && <><p className="text-brk-muted">Quản lý website, trang giới thiệu, landing page và bài viết.</p>{toolList(pages)}</>}

    </div>
  </div>{paymentCourse && <PaymentModal course={paymentCourse} enrollment={map.get(paymentCourse.id)} userId={userId} userPhone={userPhone} onUploadProof={() => router.refresh()} onClose={() => { setPaymentCourseId(null); router.refresh() }} />}</div>
}
