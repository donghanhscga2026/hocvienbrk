'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, LayoutDashboard, Wrench, LifeBuoy, UserRound, Wallet, ArrowRight, Star, Bell, Users, Share2, Globe, Settings } from 'lucide-react'
import PersonalCourses from './PersonalCourses'
import MyRequests from '@/components/crm/MyRequests'
import { useMbwDashboard } from '@/components/mbw/MbwDashboardContext'
import type { CatalogCourse, CatalogEnrollment } from '@/lib/course-catalog'

interface Props {
  user: { id: number; name: string | null; phone: string | null; role: string }
  learning: CatalogCourse[]; teaching: CatalogCourse[]; enrollments: Record<number, CatalogEnrollment>
  continueHref: string | null; limited?: boolean
}
type Notice = { id: string; title: string; href: string; readAt: string | null }
type Tool = { id: number; slug: string; name: string; url: string; roles: string[]; isActive: boolean }
type Tab = 'home' | 'learning' | 'tools' | 'support' | 'account'
const tabs = [
  { id: 'home' as const, label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'learning' as const, label: 'Học tập', icon: BookOpen },
  { id: 'tools' as const, label: 'Công cụ của tôi', icon: Wrench },
  { id: 'support' as const, label: 'Hỗ trợ của tôi', icon: LifeBuoy },
  { id: 'account' as const, label: 'Tài khoản', icon: UserRound },
]
// Phân nhóm bằng mã công cụ, không phụ thuộc tên hiển thị do quản trị viên chỉnh sửa.
const toolCategories = [
  { id: 'training', label: 'Đào tạo & học viên', icon: BookOpen, slugs: ['courses', 'students', 'roadmap'] },
  { id: 'marketing', label: 'Khách hàng & marketing', icon: Users, slugs: ['crm', 'affiliate', 'email-mkt', 'genealogy'] },
  { id: 'content', label: 'Website & nội dung', icon: Globe, slugs: ['my-site', 'pages', 'page', 'site-profiles', 'landings', 'posts', 'youtube-tools'] },
  { id: 'payments', label: 'Thanh toán & quyền lợi', icon: Wallet, slugs: ['payments', 'bank-accounts', 'vouchers', 'brk', 'reserved-ids'] },
  { id: 'system', label: 'Hỗ trợ & hệ thống', icon: Settings, slugs: ['account-assistant', 'assistant-guide', 'ho-tro', 'settings', 'email-settings', 'backup', 'system-admin', 'tca-sync'] },
  { id: 'other', label: 'Công cụ khác', icon: Wrench, slugs: [] },
]
function toolCategory(tool: Tool) {
  // URL nội bộ là dự phòng cho các công cụ cũ có slug khác mã đường dẫn.
  const route = tool.url.startsWith('/tools/') ? tool.url.split(/[?#]/)[0].split('/')[2] : ''
  return toolCategories.find(category => category.slugs.includes(tool.slug) || category.slugs.includes(route))?.id || 'other'
}
const card = 'min-w-0 rounded-2xl border border-brk-outline bg-brk-surface p-4 sm:p-5'
const action = 'inline-flex min-h-11 items-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-brk-on-primary'

// Chỉ cho phép URL nội bộ hoặc HTTPS, kể cả URL cấu hình trong database.
function safeHref(value: string) {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value
  try { return new URL(value).protocol === 'https:' ? value : null } catch { return null }
}
export default function PersonalSpace({ user, learning, teaching, enrollments, continueHref, limited }: Props) {
  const params = useSearchParams()
  const tab: Tab = tabs.find(item => item.id === params.get('tab'))?.id || 'home'
  const mobileMenu = useRef<HTMLDetailsElement>(null)
  const { open: openWallet } = useMbwDashboard()
  const [notices, setNotices] = useState<Notice[]>([])
  const [unread, setUnread] = useState(0)
  const [noticeError, setNoticeError] = useState('')
  const [noticeLoading, setNoticeLoading] = useState(true)
  const [tools, setTools] = useState<Tool[]>([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const [toolsError, setToolsError] = useState('')
  const [favorites, setFavorites] = useState<number[]>([])
  const favoriteKey = 'mfc-personal-tools-' + user.id
  // Tải thông báo một lần khi mở không gian, không tạo thêm vòng polling.
  useEffect(() => {
    const abort = new AbortController()
    void fetch('/api/notifications?page=1', { signal: abort.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Không tải được thông báo.')
      return response.json()
    }).then(data => { setNotices(data.notifications); setUnread(data.unread) }).catch(error => {
      if (!abort.signal.aborted) setNoticeError(error instanceof Error ? error.message : 'Không tải được thông báo.')
    }).finally(() => { if (!abort.signal.aborted) setNoticeLoading(false) })
    return () => abort.abort()
  }, [user.id])
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(favoriteKey) || '[]')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setFavorites(saved.filter((id): id is number => Number.isInteger(id)))
    } catch { /* Lưu yêu thích không bắt buộc để sử dụng công cụ. */ }
  }, [favoriteKey])
  useEffect(() => {
    if (tab !== 'tools') return
    const abort = new AbortController()
    const load = async () => {
      setToolsLoading(true); setToolsError('')
      try {
        const response = await fetch('/api/tools', { signal: abort.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Không tải được công cụ.')
        const data = await response.json()
        const allowed = new Set([user.role])
        if (user.role === 'ADMIN') ['TEACHER', 'AFFILIATE', 'STUDENT'].forEach(role => allowed.add(role))
        if (user.role === 'TEACHER') ['AFFILIATE', 'STUDENT'].forEach(role => allowed.add(role))
        if (!abort.signal.aborted) setTools(data.tools.filter((tool: Tool) => tool.isActive && safeHref(tool.url) && (!tool.roles.length || tool.roles.some(role => allowed.has(role)))))
      } catch (error) { if (!abort.signal.aborted) setToolsError(error instanceof Error ? error.message : 'Không tải được công cụ.') }
      finally { if (!abort.signal.aborted) setToolsLoading(false) }
    }
    void load()
    return () => abort.abort()
  }, [tab, user.role])
  const toggleFavorite = (id: number) => {
    const next = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id]
    setFavorites(next)
    try { localStorage.setItem(favoriteKey, JSON.stringify(next)) } catch { /* Không chặn thao tác nếu trình duyệt khóa lưu trữ. */ }
  }
  // Công cụ yêu thích nằm ở đầu trang; nhóm chức năng vẫn giữ đủ công cụ.
  const favoriteTools = tools.filter(tool => favorites.includes(tool.id))
  const toolGroups = [
    { id: 'favorites', label: 'Yêu thích', icon: Star, tools: favoriteTools },
    ...toolCategories.map(category => ({ ...category, tools: tools.filter(tool => toolCategory(tool) === category.id) })),
  ].filter(group => group.tools.length > 0)
  const active = learning.filter(course => enrollments[course.id]?.status === 'ACTIVE')
  const pending = learning.filter(course => enrollments[course.id]?.status === 'PENDING')
  const canTeach = ['ADMIN', 'TEACHER'].includes(user.role)
  const canAffiliate = ['ADMIN', 'TEACHER', 'AFFILIATE'].includes(user.role)
  const canCrm = canTeach || user.role === 'INSTRUCTOR'
  const href = (next: Tab) => next === 'home' ? '/my-space' : '/my-space?tab=' + next
  const menu = tabs.map(({ id, label, icon: Icon }) => <a key={id} href={href(id)} aria-current={tab === id ? 'page' : undefined} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.history.pushState(null, '', href(id))
    if (mobileMenu.current) mobileMenu.current.open = false
    requestAnimationFrame(() => document.getElementById('personal-space-title')?.focus({ preventScroll: true }))
  }} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium ${tab === id ? 'bg-brk-primary text-brk-on-primary' : 'text-brk-on-surface hover:bg-brk-background'}`}><Icon className="h-5 w-5 shrink-0" aria-hidden />{label}</a>)
  return <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
    <Link href="/" className="mb-4 inline-flex min-h-11 items-center text-sm text-brk-primary">← Khám phá hệ sinh thái</Link>
    <div className="grid min-w-0 gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden md:block"><nav aria-label="Menu không gian cá nhân" className={card}><p className="mb-3 text-sm font-semibold text-brk-muted">Không gian của tôi</p>{menu}<button type="button" onClick={openWallet} className="mt-3 flex min-h-12 w-full items-center gap-3 border-t border-brk-outline px-3 text-sm text-brk-on-surface"><Wallet className="h-5 w-5" aria-hidden />Ví & quyền lợi</button></nav></aside>
      <div className="min-w-0 space-y-5">
        <details ref={mobileMenu} className={`md:hidden ${card}`}><summary className="cursor-pointer text-sm font-semibold text-brk-on-surface">Các mục của tôi · {tabs.find(item => item.id === tab)?.label}</summary><nav aria-label="Menu cá nhân trên điện thoại" className="mt-3">{menu}</nav></details>
        <h1 id="personal-space-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-brk-on-surface outline-none sm:text-[28px]">{tab === 'home' ? 'Chào ' + (user.name || 'bạn') + '!' : tabs.find(item => item.id === tab)?.label}</h1>
        {limited && <p className="text-sm text-brk-muted">Đang hiển thị tối đa 200 khóa gần đây trong mỗi nhóm.</p>}
        {tab === 'home' && <>
          <p className="text-sm text-brk-muted">Việc của bạn, khóa học của bạn và các lối vào trong hệ sinh thái.</p>
          <section aria-label="Việc cần chú ý" className={card}><h2 className="text-lg font-semibold text-brk-on-surface">Việc cần chú ý</h2>
            {noticeLoading ? <p role="status" className="mt-3 text-sm">Đang tải thông báo…</p> : noticeError ? <p role="alert" className="mt-3 text-sm">{noticeError}</p> : <>
              <p className="mt-2 text-sm text-brk-muted">{unread ? unread + ' thông báo chưa đọc' : 'Bạn không có thông báo chưa đọc.'}</p>
              <div className="mt-3 space-y-2">{notices.filter(item => !item.readAt).slice(0, 3).map(item => safeHref(item.href) && <Link key={item.id} href={item.href} className="flex min-h-11 items-center gap-3 rounded-xl bg-brk-background p-3 text-sm text-brk-on-surface"><Bell className="h-4 w-4 shrink-0 text-brk-primary" aria-hidden />{item.title}<ArrowRight className="ml-auto h-4 w-4 shrink-0" aria-hidden /></Link>)}</div>
            </>}
            {!!pending.length && <Link href={href('learning')} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brk-primary">{pending.length} khóa chờ kích hoạt →</Link>}
          </section>
          <section aria-label="Tiếp tục học" className={card}><h2 className="text-lg font-semibold text-brk-on-surface">Tiếp tục học</h2>
            {active.length && continueHref ? <><p className="mt-2 text-brk-on-surface">{active[0].name_lop}</p><p className="mt-1 text-sm text-brk-muted">Đã hoàn thành {enrollments[active[0].id]?.completedCount || 0}/{enrollments[active[0].id]?.totalLessons || 0} bài</p><Link href={continueHref} className={`mt-4 ${action}`}>Tiếp tục bài học <ArrowRight className="h-4 w-4" aria-hidden /></Link></> : <p className="mt-3 text-sm text-brk-muted">Bạn chưa có khóa đang học. Mở Khám phá để chọn khóa phù hợp.</p>}
          </section>
          <section aria-label="Lối vào của tôi" className="grid gap-3 sm:grid-cols-2">
            {[{ label: 'Học tập', detail: active.length + ' khóa đang học', url: href('learning'), icon: BookOpen }, { label: 'Hỗ trợ của tôi', detail: 'Theo dõi yêu cầu và phản hồi', url: href('support'), icon: LifeBuoy }, { label: 'Công cụ của tôi', detail: 'Công cụ được phép và yêu thích', url: href('tools'), icon: Wrench }, { label: 'Tài khoản của tôi', detail: 'Hồ sơ, bảo mật và cài đặt', url: '/account-settings', icon: UserRound }].map(({ label, detail, url, icon: Icon }) => <Link key={label} href={url} className={card}><Icon aria-hidden className="mb-3 h-5 w-5 text-brk-primary" /><h2 className="font-semibold text-brk-on-surface">{label} →</h2><p className="mt-1 text-sm text-brk-muted">{detail}</p></Link>)}
            <button type="button" onClick={openWallet} className={`${card} text-left`}><Wallet aria-hidden className="mb-3 h-5 w-5 text-brk-primary" /><h2 className="font-semibold text-brk-on-surface">Ví & quyền lợi →</h2><p className="mt-1 text-sm text-brk-muted">Số dư, voucher và quyền lợi của bạn</p></button>
          </section>
          {(canCrm || canAffiliate) && <section aria-label="Khu làm việc" className={card}><h2 className="text-lg font-semibold text-brk-on-surface">Khu làm việc</h2><div className="mt-3 flex flex-wrap gap-3">{canCrm && <Link href="/tools/crm" className={action}><Users className="h-4 w-4" aria-hidden />CRM & chăm sóc</Link>}{canTeach && <Link href="/tools/courses" className={action}>Quản lý khóa học</Link>}{canAffiliate && <Link href="/tools/affiliate" className={action}><Share2 className="h-4 w-4" aria-hidden />Affiliate</Link>}</div></section>}
          {!noticeLoading && !noticeError && <section aria-label="Hoạt động gần đây" className={card}><h2 className="text-lg font-semibold text-brk-on-surface">Hoạt động gần đây</h2><p className="mt-1 text-sm text-brk-muted">Các thông báo liên quan đến bạn trong hệ thống.</p><div className="mt-3 space-y-2">{notices.length ? notices.slice(0, 5).map(item => safeHref(item.href) && <Link key={item.id} href={item.href} className="block min-h-11 rounded-lg p-2 text-sm text-brk-on-surface hover:bg-brk-background">{item.title} →</Link>) : <p className="text-sm text-brk-muted">Chưa có hoạt động để hiển thị.</p>}</div></section>}
        </>}
        {tab === 'learning' && <PersonalCourses learning={learning} teaching={teaching} enrollments={enrollments} userPhone={user.phone} userId={user.id} />}
        {tab === 'support' && <div className={card}><p className="mb-3 text-sm text-brk-muted">Gửi yêu cầu mới từ nút “Hỏi giáo viên” trong khóa học. Các yêu cầu của bạn được theo dõi ở đây.</p><MyRequests /></div>}
        {tab === 'tools' && <div className="space-y-5">
          <p className="text-sm text-brk-muted">Các công cụ bạn có quyền dùng, sắp xếp theo chức năng. Đánh dấu sao để truy cập nhanh ở mục Yêu thích.</p>
          {toolsLoading ? <p role="status" className={card}>Đang tải công cụ…</p> : toolsError ? <p role="alert" className={card}>{toolsError}</p> : tools.length ? toolGroups.map(({ id, label, icon: Icon, tools: groupTools }) => (
            <section key={id} aria-labelledby={`tool-group-${id}`} className={card}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brk-background text-brk-primary"><Icon className="h-5 w-5" aria-hidden /></span>
                <h2 id={`tool-group-${id}`} className="min-w-0 flex-1 text-lg font-semibold text-brk-on-surface">{label}</h2>
                <span aria-label={`${groupTools.length} công cụ`} className="shrink-0 rounded-full bg-brk-background px-2.5 py-1 text-xs font-semibold text-brk-muted">{groupTools.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {groupTools.map(tool => <article key={tool.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-brk-outline p-3 transition-colors hover:bg-brk-background">
                  <Link href={safeHref(tool.url)!} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-brk-on-surface"><span className="min-w-0 flex-1 break-words">{tool.name}</span><ArrowRight className="h-4 w-4 shrink-0 text-brk-primary" aria-hidden /></Link>
                  <button type="button" aria-label={`${favorites.includes(tool.id) ? 'Bỏ yêu thích' : 'Yêu thích'} ${tool.name}`} aria-pressed={favorites.includes(tool.id)} onClick={() => toggleFavorite(tool.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brk-primary hover:bg-brk-background"><Star aria-hidden className={`h-5 w-5 ${favorites.includes(tool.id) ? 'fill-current' : ''}`} /></button>
                </article>)}
              </div>
            </section>
          )) : <p className={`${card} text-sm text-brk-muted`}>Chưa có công cụ phù hợp với quyền của bạn.</p>}
          <p className="text-xs text-brk-muted">Công cụ yêu thích được lưu trên trình duyệt này.</p>
          <Link href="/tools" className="inline-flex min-h-11 items-center text-sm text-brk-primary">Khám phá thêm công cụ →</Link>
        </div>}
        {tab === 'account' && <section className={card}><h2 className="text-lg font-semibold text-brk-on-surface">Tài khoản của tôi</h2><p className="mt-2 text-sm text-brk-muted">Cập nhật hồ sơ, mật khẩu và tài khoản nhận thanh toán.</p><Link href="/account-settings" className={`mt-4 ${action}`}>Quản lý tài khoản</Link></section>}
      </div>
    </div>
  </div>
}
