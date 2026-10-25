'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronDown, ChevronRight, ContactRound, CreditCard, FileText, Globe, GraduationCap, Handshake, LayoutGrid, LifeBuoy, Link2, Mail, Network, Settings, ShieldCheck, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react'
import { YoutubeBrandIcon } from '@/components/icons/brands'
import { managementNavigation } from '@/lib/wi300/management-navigation'
import { type PersonalTool, type SpaceNavGroup, type SpaceShortcut } from '@/lib/wi300/personal-space'

const icons: Record<string, LucideIcon> = { Youtube: YoutubeBrandIcon, BookOpen, ContactRound, CreditCard, FileText, Globe, GraduationCap, Handshake, LayoutGrid, LifeBuoy, Link2, Mail, Network, Settings, ShieldCheck, UserRound, Users, Wallet }
function ShortcutIcon({ name }: { name?: string | null }) {
  const Icon = icons[name || ''] || LayoutGrid
  return <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
}
function ShortcutLinks({ group, close, loading, failed }: { group: SpaceNavGroup; close: () => void; loading?: boolean; failed?: boolean }) {
  return <div className="min-w-0 space-y-1">
    <Link href={group.href} onClick={close} className="mb-2 flex min-h-11 items-center justify-between gap-2 rounded-xl bg-brk-background px-3 text-sm font-bold text-brk-primary">Mở {group.label.toLowerCase()}<ChevronRight className="h-4 w-4 shrink-0" /></Link>
    {group.items.map((item: SpaceShortcut) => <Link key={item.href} href={item.href} onClick={close} className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm text-brk-on-surface hover:bg-brk-background focus-visible:outline-brk-primary"><ShortcutIcon name={item.icon} /><span className="break-words">{item.label}</span></Link>)}
    {loading && <p role="status" className="px-3 py-2 text-xs text-brk-muted">Đang tải lối tắt bổ sung…</p>}
    {failed && <p role="status" className="px-3 py-2 text-xs text-brk-muted">Chưa tải được lối tắt bổ sung. Bạn vẫn có thể mở nhóm.</p>}
    {!group.items.length && !loading && !failed && <p className="px-3 py-2 text-sm text-brk-muted">Mở nhóm để xem các chức năng dành cho bạn.</p>}
  </div>
}
const hasHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

export default function Wi300SpaceMenu({ role, actorKey, route, onOpen }: { role: string; actorKey: string | null; route: string; onOpen?: () => void }) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')
  const [top, setTop] = useState(72)
  const [loaded, setLoaded] = useState(false)
  const [result, setResult] = useState<{ actorKey: string | null; tools: PersonalTool[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const groups = managementNavigation(role, result?.actorKey === actorKey ? result.tools : [])
  const current = groups.find(g => g.id === active) || groups[0]
  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const close = () => { cancelClose(); setOpen(false) }
  const show = () => { cancelClose(); onOpen?.(); setTop((root.current?.getBoundingClientRect().bottom || 64) + 8); setOpen(true) }

  useEffect(() => { setOpen(false); setActive('home'); setLoaded(false); setResult(null); setFailed(false) }, [actorKey, role])
  useEffect(() => { setOpen(false) }, [route])
  // Chỉ tải danh sách công cụ khi mở menu lần đầu; không gọi API ở mỗi lần rê chuột.
  useEffect(() => {
    if (!open || loaded || actorKey == null) return
    const abort = new AbortController()
    setLoading(true); setFailed(false)
    void fetch('/api/tools', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('tools')
      const data = await response.json()
      if (!Array.isArray(data.tools)) throw new Error('tools')
      if (!abort.signal.aborted) { setResult({ actorKey, tools: data.tools }); setLoading(false); setLoaded(true) }
    }).catch(() => { if (!abort.signal.aborted) { setFailed(true); setLoading(false); setLoaded(true) } })
    return () => abort.abort()
  }, [open, loaded, actorKey, role])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false) }
    const resize = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize); if (closeTimer.current) clearTimeout(closeTimer.current) }
  }, [])

  return <div ref={root} className="relative" onPointerEnter={() => { if (hasHover()) show() }} onPointerLeave={() => { if (hasHover()) closeTimer.current = setTimeout(() => setOpen(false), 180) }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close() }} onKeyDown={event => {
    if (event.key === 'Escape') { close(); trigger.current?.focus() }
  }}>
    <div className={`inline-flex min-h-11 items-center rounded-xl border ${open ? 'border-brk-primary bg-brk-background' : 'border-brk-outline'} text-brk-primary`}>
      <Link href="/my-space" onClick={close} aria-current={route === '/my-space' ? 'page' : undefined} aria-label="Không gian của tôi" title="Không gian của tôi" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-l-xl px-1 text-[11px] font-semibold hover:bg-brk-background focus-visible:outline-brk-primary min-[360px]:px-2 sm:px-3 sm:text-sm"><LayoutGrid className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="hidden sm:inline">Không gian của tôi</span></Link>
      <button ref={trigger} type="button" aria-label="Mở lối tắt Không gian của tôi" aria-expanded={open} aria-controls={id} onClick={() => open ? close() : show()} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); show() } }} className="flex min-h-11 min-w-8 items-center justify-center rounded-r-xl border-l border-brk-outline hover:bg-brk-background focus-visible:outline-brk-primary"><ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} /></button>
    </div>
    {open && <nav id={id} aria-label="Lối tắt Không gian của tôi" style={{ '--space-menu-top': `${top}px` } as CSSProperties} className="fixed inset-x-3 top-[var(--space-menu-top)] z-[60] max-h-[65dvh] overflow-y-auto rounded-2xl border border-brk-outline bg-white p-2 shadow-xl lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[640px]">
      <div className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2 sm:grid-cols-[230px_minmax(0,1fr)]">
        <div className="space-y-1 border-r border-brk-outline pr-2">{groups.map(group => <button key={group.id} type="button" aria-pressed={current.id === group.id} onPointerEnter={() => { if (hasHover()) setActive(group.id) }} onFocus={() => setActive(group.id)} onClick={() => setActive(group.id)} className={`flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl px-2 py-3 text-left text-xs font-semibold sm:px-3 sm:text-sm ${current.id === group.id ? 'bg-brk-background text-brk-primary' : 'text-brk-muted hover:bg-brk-background'}`}><ShortcutIcon name={group.icon} /><span className="min-w-0 flex-1 break-words">{group.label}</span><ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" /></button>)}</div>
        <div className="min-w-0 p-1 sm:p-2"><ShortcutLinks group={current} close={close} loading={loading} failed={failed} /></div>
      </div>
    </nav>}
  </div>
}

// Sidebar có link mở nhóm và nút mở mục con riêng, dùng được cả chuột lẫn cảm ứng.
export function SpaceSidebar({ groups, active, route, onNavigate, loading, failed }: { groups: SpaceNavGroup[]; active: string | null; route: string; onNavigate: () => void; loading: boolean; failed: boolean }) {
  const root = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ top: 0, maxHeight: 520 })
  const id = useId()
  const close = () => { if (timer.current) clearTimeout(timer.current); setExpanded(null) }
  useEffect(() => { setExpanded(null) }, [route])
  // Căn theo dòng đang chọn; chỉ dịch lên khi menu sẽ vượt đáy màn hình.
  useLayoutEffect(() => {
    if (!expanded) return
    const place = () => {
      if (!window.matchMedia('(min-width: 1024px)').matches || !root.current || !panel.current) return
      const row = root.current.querySelector<HTMLElement>('[data-space-group="' + expanded + '"] > div')
      if (!row) return
      const headerBottom = document.querySelector('header.sticky')?.getBoundingClientRect().bottom || 0
      const minimum = Math.max(8, headerBottom + 8)
      const maxHeight = Math.max(120, Math.min(window.innerHeight * 0.65, window.innerHeight - minimum - 8))
      const height = Math.min(panel.current.scrollHeight, maxHeight)
      const top = Math.max(minimum, Math.min(row.getBoundingClientRect().top, window.innerHeight - height - 8)) - root.current.getBoundingClientRect().top
      setPlacement(old => old.top === top && old.maxHeight === maxHeight ? old : { top, maxHeight })
    }
    place()
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [expanded, groups, loading, failed])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setExpanded(null) }
    document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('pointerdown', outside); if (timer.current) clearTimeout(timer.current) }
  }, [])
  return <nav ref={root} aria-label="Menu không gian cá nhân" className={`relative grid grid-cols-1 gap-1 rounded-2xl border border-brk-outline bg-white p-2 sm:grid-cols-2 lg:block lg:p-3 ${expanded ? 'lg:z-30' : ''}`} onKeyDown={event => { if (event.key === 'Escape') { const button = root.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]'); close(); button?.focus() } }}>
    <p className="mb-3 hidden px-2 text-sm font-bold text-brk-muted lg:block">Không gian của tôi</p>
    {groups.map(group => <div key={group.id} data-space-group={group.id} className={`relative min-w-0 lg:static lg:mb-1 ${expanded === group.id ? 'col-span-1 sm:col-span-2' : ''}`} onPointerEnter={() => { if (hasHover()) { if (timer.current) clearTimeout(timer.current); setExpanded(group.id) } }} onPointerLeave={() => { if (hasHover()) timer.current = setTimeout(() => setExpanded(null), 180) }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close() }}>
      <div className={`flex rounded-xl ${active === group.id ? 'bg-brk-primary text-white' : 'text-brk-on-surface hover:bg-brk-background'}`}>
        <button type="button" aria-expanded={expanded === group.id} aria-controls={`${id}-${group.id}`} onClick={() => setExpanded(expanded === group.id ? null : group.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-l-xl px-2 py-2 text-left text-xs font-semibold sm:text-sm lg:hidden"><ShortcutIcon name={group.icon} /><span className="min-w-0 flex-1 truncate">{group.label}</span></button>
        <Link href={group.href} scroll={false} onNavigate={onNavigate} onClick={close} title={group.label} aria-current={active === group.id ? 'page' : undefined} className="hidden min-h-11 min-w-0 flex-1 items-center gap-2 rounded-l-xl px-2 py-2 text-xs font-semibold sm:text-sm lg:flex"><ShortcutIcon name={group.icon} /><span className="min-w-0 flex-1 truncate">{group.label}</span></Link>
        <button type="button" aria-label={`Lối tắt ${group.label}`} aria-expanded={expanded === group.id} aria-controls={`${id}-${group.id}`} onClick={() => setExpanded(expanded === group.id ? null : group.id)} onFocus={() => { if (hasHover()) setExpanded(group.id) }} className="flex min-h-11 min-w-8 shrink-0 items-center justify-center rounded-r-xl focus-visible:outline-2 focus-visible:outline-offset-2"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      {expanded === group.id && <div ref={panel} id={`${id}-${group.id}`} style={{ '--space-submenu-top': `${placement.top}px`, '--space-submenu-max-height': `${placement.maxHeight}px` } as CSSProperties} className="mt-2 max-h-[65dvh] overflow-y-auto rounded-xl border border-brk-outline bg-white p-2 text-brk-on-surface shadow-lg lg:absolute lg:left-full lg:top-[var(--space-submenu-top)] lg:max-h-[var(--space-submenu-max-height)] lg:mt-0 lg:w-72"><ShortcutLinks group={group} close={close} loading={loading} failed={failed} /></div>}
    </div>)}
  </nav>
}
