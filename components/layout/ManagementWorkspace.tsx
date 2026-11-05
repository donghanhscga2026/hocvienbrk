'use client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useManagementFrame } from './ManagementFrameContext'
import { Home, BookOpen, Users, Settings, ChevronDown } from 'lucide-react'

// Sidebar độc lập chỉ render khi không có khung quản lý wi300, nên không gắn
// link tới các route chỉ tồn tại ở wi300 (/my-space, /du-an/quan-ly) — trên
// wi300 các mục đó nằm trong Wi300ManagementFrame.
const links = [
  { key: 'home', href: '/', label: 'Không gian của tôi', icon: Home },
  { key: 'courses', href: '/tools/courses', label: 'Quản lý khóa học', icon: BookOpen },
  { key: 'crm', href: '/tools/crm', label: 'CRM', icon: Users },
  { key: 'settings', href: '/tools', label: 'Công cụ quản lý', icon: Settings },
]
export default function ManagementWorkspace({ children, active, appearance = 'default' }: { children: ReactNode; active: 'courses' | 'projects'; appearance?: 'default' | 'forest' }) {
  const shared = useManagementFrame()
  const [mobileOpen, setMobileOpen] = useState(false)
  if (shared) return <div data-management-workspace className="min-w-0 space-y-5 pb-12">{children}</div>
  const activeLabel = links.find(item => item.key === active)?.label || 'Không gian quản lý'
  return <div data-management-workspace className="min-h-screen bg-[linear-gradient(120deg,var(--color-background,#FAE0C7),#f8faf7)] text-brk-on-surface">
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[208px_minmax(0,1fr)]">
      <aside className={`border-b border-brk-outline px-3 py-3 lg:border-b-0 lg:border-r lg:py-6 ${appearance === 'forest' ? 'bg-brk-primary text-white' : ''}`}>{appearance === 'forest' ? <p className="mb-5 hidden px-3 text-2xl font-bold text-white lg:block">Wi300</p> : <p className="mb-5 hidden px-3 text-sm font-semibold text-brk-muted lg:block">Không gian quản lý</p>}<button type="button" aria-expanded={mobileOpen} aria-controls="management-workspace-menu" onClick={() => setMobileOpen(value => !value)} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold lg:hidden ${appearance === 'forest' ? 'text-white hover:bg-white/10' : 'text-brk-on-surface hover:bg-white/70'}`}><span>{activeLabel}</span><ChevronDown size={19} aria-hidden="true" className={mobileOpen ? 'rotate-180 transition-transform' : 'transition-transform'} /></button><nav id="management-workspace-menu" aria-label="Khu vực quản lý" className={`${mobileOpen ? 'mt-2 flex flex-col' : 'hidden'} gap-2 lg:sticky lg:top-28 lg:flex lg:flex-col`}>{links.map(item => { const Icon = item.icon; return <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${active === item.key ? appearance === 'forest' ? 'bg-white/15 text-white' : 'bg-brk-primary text-white' : appearance === 'forest' ? 'text-white/80 hover:bg-white/10' : 'text-brk-muted hover:bg-white/70'}`}><Icon size={19} /><span>{item.label}</span></Link> })}</nav></aside>
      <main className="min-w-0 space-y-5 p-4 pb-24 sm:p-6 xl:p-7">{children}</main>
    </div>
  </div>
}
