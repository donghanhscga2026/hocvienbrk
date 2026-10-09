'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { BookOpen, ChevronDown, Compass, GraduationCap, Home, LayoutGrid, LogOut, Settings } from 'lucide-react'
import { useWi300Brand } from './Wi300BrandContext'
import { signOutPushCleanup } from '@/lib/web-push-client'
import { canTeach } from '@/lib/wi300/personal-space'

export default function Wi300Header() {
  const brand = useWi300Brand()
  const { data: session } = useSession()
  const path = usePathname()
  const accountRef = useRef<HTMLDetailsElement>(null)
  const closeAccount = () => { if (accountRef.current) accountRef.current.open = false }

  // Dropdown native hỗ trợ bàn phím; đóng khi chuyển trang hoặc bấm bên ngoài.
  useEffect(() => { closeAccount() }, [path, session?.user?.id])
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) closeAccount()
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  if (!brand) return null
  const links = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/kham-pha', label: 'Khám phá', icon: Compass },
    { href: '/khoa-hoc', label: 'Khóa học', icon: BookOpen },
  ]
  const accountLink = 'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-brk-background focus-visible:outline-brk-primary'
  return <header className="sticky top-0 z-50 shrink-0 border-b border-brk-outline bg-white/95 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 px-4 py-2 lg:px-6">
      <Link href="/" aria-label={`${brand.name} — Trang chủ`} className="flex shrink-0 items-center gap-2">
        <Image src={brand.iconUrl} alt="WIPA" width={1280} height={1280} priority unoptimized className="hidden h-11 w-11 object-contain sm:block" />
        <div><span className="text-lg font-extrabold tracking-tight text-brk-primary sm:text-xl">{brand.name}</span><span className="hidden text-[10px] text-brk-muted xl:block">{brand.tagline}</span></div>
      </Link>
      <nav aria-label="Điều hướng chính" className="order-3 flex w-full gap-1 overflow-x-auto py-1 lg:order-none lg:w-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const selected = path === href || (href === '/khoa-hoc' && path.startsWith('/khoa-hoc/'))
          return <Link key={href} href={href} aria-current={selected ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold sm:text-sm ${selected ? 'bg-brk-background text-brk-primary' : 'text-brk-muted hover:bg-brk-background hover:text-brk-primary'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</Link>
        })}
      </nav>
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Link href="/my-space" aria-current={path === '/my-space' ? 'page' : undefined} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-brk-outline px-2 text-[11px] font-semibold text-brk-primary hover:bg-brk-background sm:px-3 sm:text-sm"><LayoutGrid className="hidden h-4 w-4 sm:block" aria-hidden="true" />Không gian khóa học</Link>
        {session?.user ? <details ref={accountRef} className="relative" onKeyDown={event => {
          if (event.key === 'Escape') { closeAccount(); accountRef.current?.querySelector('summary')?.focus() }
        }}>
          <summary className="flex min-h-11 max-w-20 cursor-pointer list-none items-center gap-1 rounded-xl px-2 text-xs font-semibold hover:bg-brk-background focus-visible:outline-brk-primary sm:max-w-40 sm:text-sm [&::-webkit-details-marker]:hidden" aria-label="Menu tài khoản"><span className="truncate">{session.user.name || 'Tài khoản'}</span><ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" /></summary>
          <div className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-brk-outline bg-white p-2 shadow-lg">
            <Link href="/my-space?tab=learning" onClick={closeAccount} className={accountLink}><BookOpen className="h-4 w-4" aria-hidden="true" />Học tập</Link>
            {canTeach(session.user.role) && <Link href="/my-space?tab=teaching" onClick={closeAccount} className={accountLink}><GraduationCap className="h-4 w-4" aria-hidden="true" />Giảng dạy</Link>}
            <Link href="/account-settings" onClick={closeAccount} className={accountLink}><Settings className="h-4 w-4" aria-hidden="true" />Cài đặt</Link>
            <button type="button" className={`${accountLink} w-full border-t border-brk-outline text-left`} onClick={async () => { closeAccount(); await signOutPushCleanup(); await signOut({ callbackUrl: '/' }) }}><LogOut className="h-4 w-4" aria-hidden="true" />Đăng xuất</button>
          </div>
        </details> : <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-brk-primary px-3 text-xs font-semibold text-white sm:text-sm">Tài khoản</Link>}
      </div>
    </div>
  </header>
}
