'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { BookOpen, Compass, Home, Info, LayoutGrid, LogOut } from 'lucide-react'
import { useWi300Brand } from './Wi300BrandContext'
import { signOutPushCleanup } from '@/lib/web-push-client'

export default function Wi300Header() {
  const brand = useWi300Brand()
  const { data: session } = useSession()
  const path = usePathname()
  if (!brand) return null
  const links = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/kham-pha', label: 'Khám phá', icon: Compass },
    { href: '/khoa-hoc', label: 'Khóa học', icon: BookOpen },
    { href: '/gioi-thieu', label: 'Giới thiệu', icon: Info },
    { href: '/my-space', label: 'Không gian của tôi', icon: LayoutGrid },
  ]
  return <header className="sticky top-0 z-50 border-b border-brk-outline bg-white/95 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 px-4 py-2 lg:px-6">
      <Link href="/" aria-label={`${brand.name} — Trang chủ`} className="flex items-center gap-2">
        <Image src={brand.iconUrl} alt="WIPA" width={1280} height={1280} priority unoptimized className="h-11 w-11 object-contain" />
        <div><span className="text-xl font-extrabold tracking-tight text-brk-primary">{brand.name}</span><span className="hidden text-[10px] text-brk-muted xl:block">{brand.tagline}</span></div>
      </Link>
      <nav aria-label="Điều hướng chính" className="order-3 flex w-full gap-1 overflow-x-auto py-1 lg:order-none lg:w-auto">
        {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold sm:text-sm ${path === href ? 'bg-brk-background text-brk-primary' : 'text-brk-muted hover:bg-brk-background hover:text-brk-primary'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</Link>)}
      </nav>
      {session?.user ? <div className="flex shrink-0 items-center gap-1">
        <Link href="/account-settings" className="max-w-28 truncate px-2 py-3 text-sm font-semibold" title="Cài đặt tài khoản">{session.user.name || 'Tài khoản'}</Link>
        <button type="button" aria-label="Đăng xuất" className="flex h-11 w-11 items-center justify-center rounded-xl text-brk-muted hover:bg-brk-background" onClick={async () => { await signOutPushCleanup(); await signOut({ callbackUrl: '/' }) }}><LogOut className="h-4 w-4" /></button>
      </div> : <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white">Đăng nhập</Link>}
    </div>
  </header>
}
