'use client'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ChevronDown, ContactRound, Globe, GraduationCap, Handshake, LayoutGrid, Link2, Menu, Network, Settings, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'
import { managementLocation, managementNavigation } from '@/lib/wi300/management-navigation'
import type { PersonalTool } from '@/lib/wi300/personal-space'
import { ManagementFrameContext, ManagementToolsContext } from '@/components/layout/ManagementFrameContext'

const icons: Record<string, LucideIcon> = { BookOpen, ContactRound, Globe, GraduationCap, Handshake, LayoutGrid, Link2, Network, Settings, ShieldCheck, UserRound }

export default function Wi300ManagementFrame({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const path = usePathname(), params = useSearchParams(), menuId = useId()
  const role = session?.user?.role || 'guest', actor = session?.user?.id ?? null
  const [result, setResult] = useState<{ actor: string | null; role: string; tools: PersonalTool[] } | null>(null)
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0)
  const [open, setOpen] = useState(false), [expanded, setExpanded] = useState<string | null>(null)
  const currentTools = result?.actor === actor && result.role === role ? result.tools : []
  const groups = managementNavigation(role, currentTools)
  const location = managementLocation(path, new URLSearchParams(params.toString()), groups)
  const currentRoute = path + (params.toString() ? '?' + params.toString() : '')
  useEffect(() => {
    if (status !== 'authenticated') return
    const controller = new AbortController(); setFailed(false)
    fetch('/api/tools', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('tools')
      const data = await response.json()
      if (!Array.isArray(data.tools)) throw new Error('tools')
      if (!controller.signal.aborted) setResult({ actor, role, tools: data.tools })
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [actor, role, status, retry])
  useEffect(() => { setOpen(false); setExpanded(null) }, [currentRoute, actor, role])
  const activeItem = (href: string) => {
    const target = new URL(href, 'https://wi300.invalid')
    return path === target.pathname && [...target.searchParams].every(([key, value]) => params.get(key) === value)
  }
  return <ManagementFrameContext value={true}><div data-management-frame className="min-w-0 flex-1 bg-brk-background text-brk-on-surface">
    <div className="mx-auto grid w-full max-w-[1600px] min-w-0 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-brk-outline bg-white p-3 lg:border-b-0 lg:border-r lg:p-4">
        <div className="flex items-center justify-between gap-3"><Link href="/my-space" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brk-primary"><LayoutGrid size={18} />Không gian của tôi</Link><button type="button" aria-label="Mở hoặc đóng menu quản lý" aria-controls={menuId} aria-expanded={open} onClick={() => setOpen(value => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brk-outline px-3 text-sm lg:hidden"><Menu size={18} />Menu</button></div>
        <nav id={menuId} aria-label="Menu quản lý chung" className={`${open ? 'block' : 'hidden'} mt-3 space-y-1 lg:sticky lg:top-28 lg:block`} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
          {groups.map(group => { const Icon = icons[group.icon] || LayoutGrid; const active = location.groupId === group.id, show = expanded === group.id || expanded === null && active
            return <div key={group.id}><div className={`flex rounded-xl ${active ? 'bg-brk-primary text-white' : 'text-brk-on-surface hover:bg-brk-background'}`}><Link href={group.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 text-sm font-semibold"><Icon size={18} className="shrink-0" /><span>{group.label}</span></Link>{group.items.length > 0 && <button type="button" aria-label={`Các mục ${group.label}`} aria-expanded={show} aria-controls={`${menuId}-${group.id}`} onClick={() => setExpanded(show ? 'closed' : group.id)} className="flex min-h-12 min-w-11 items-center justify-center"><ChevronDown size={16} className={show ? 'rotate-180' : ''} /></button>}</div>{group.items.length > 0 && <ul id={`${menuId}-${group.id}`} hidden={!show} className="ml-5 border-l border-brk-outline py-1 pl-2">{group.items.map(item => <li key={item.href}><Link href={item.href} onClick={() => setOpen(false)} aria-current={activeItem(item.href) ? 'page' : undefined} className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm ${activeItem(item.href) ? 'bg-brk-background font-semibold text-brk-primary' : 'text-brk-muted hover:bg-brk-background'}`}>{item.label}</Link></li>)}</ul>}</div>
          })}
          {failed && <div role="status" className="rounded-xl bg-brk-background p-3 text-xs text-brk-muted">Chưa tải được các công cụ của bạn.<button type="button" onClick={() => setRetry(value => value + 1)} className="mt-1 block min-h-11 font-semibold text-brk-primary">Tải lại menu</button></div>}
        </nav>
      </aside>
      <div className="min-w-0 px-3 py-4 sm:px-5 sm:py-6 xl:px-7">
        <nav aria-label="Đường dẫn quản lý" className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brk-muted">{location.crumbs.map((crumb, index) => <span key={index} className="inline-flex min-w-0 items-center gap-2">{index > 0 && <span aria-hidden="true">/</span>}{crumb.href ? <Link href={crumb.href} className="inline-flex min-h-11 items-center break-words font-medium text-brk-primary">{crumb.label}</Link> : <span aria-current="page" className="break-words">{crumb.label}</span>}</span>)}</nav>
        {location.back && <Link href={location.back.href} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brk-outline bg-white px-4 text-sm font-semibold text-brk-primary"><ArrowLeft size={16} />{location.back.label}</Link>}
        {path.startsWith('/tools/') && !path.startsWith('/tools/courses') && path !== '/tools/crm' && <h1 data-navigation-title className="mb-5 text-2xl font-bold">{location.title}</h1>}
        <ManagementToolsContext value={{ tools: currentTools, loading: status === 'loading' || status === 'authenticated' && (!result || result.actor !== actor || result.role !== role) && !failed, failed }}><div className="min-w-0">{children}</div></ManagementToolsContext>
      </div>
    </div>
  </div></ManagementFrameContext>
}
