import type { ReactNode } from 'react'
import Link from 'next/link'
import { Home, BookOpen, FolderKanban, Users, Settings } from 'lucide-react'

const links = [
  { key: 'home', href: '/my-space', label: 'Không gian của tôi', icon: Home },
  { key: 'courses', href: '/tools/courses', label: 'Quản lý khóa học', icon: BookOpen },
  { key: 'projects', href: '/du-an/quan-ly', label: 'Dự án', icon: FolderKanban },
  { key: 'crm', href: '/tools/crm', label: 'CRM', icon: Users },
  { key: 'settings', href: '/tools', label: 'Công cụ quản lý', icon: Settings },
]
export default function ManagementWorkspace({ children, active, appearance = 'default' }: { children: ReactNode; active: 'courses' | 'projects'; appearance?: 'default' | 'forest' }) {
  return <div data-management-workspace className="min-h-screen bg-[linear-gradient(120deg,var(--color-background,#f3f7df),#f8faf7)] text-brk-on-surface">
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[208px_minmax(0,1fr)]">
      <aside className={`border-b border-brk-outline px-3 py-3 lg:border-b-0 lg:border-r lg:py-6 ${appearance === 'forest' ? 'bg-[#184f43] text-white' : ''}`}>{appearance === 'forest' ? <p className="mb-5 hidden px-3 text-2xl font-bold text-white lg:block">Wi300</p> : <p className="mb-5 hidden px-3 text-sm font-semibold text-brk-muted lg:block">Không gian quản lý</p>}<nav aria-label="Khu vực quản lý" className="flex gap-2 overflow-x-auto lg:sticky lg:top-28 lg:flex-col">{links.map(item => { const Icon = item.icon; return <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${active === item.key ? appearance === 'forest' ? 'bg-white/15 text-white' : 'bg-brk-primary text-white' : appearance === 'forest' ? 'text-white/80 hover:bg-white/10' : 'text-brk-muted hover:bg-white/70'}`}><Icon size={19} /><span>{item.label}</span></Link> })}</nav></aside>
      <main className="min-w-0 space-y-5 p-4 pb-24 sm:p-6 xl:p-7">{children}</main>
    </div>
  </div>
}
