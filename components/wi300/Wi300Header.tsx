'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { BookOpen, Home, Info, LayoutGrid, LogOut } from 'lucide-react'
import { useWi300Brand } from './Wi300BrandContext'
import { signOutPushCleanup } from '@/lib/web-push-client'

/** Menu ngắn, luôn nhìn thấy trên điện thoại; dùng các đường dẫn hiện có. */
export default function Wi300Header() {
  const brand = useWi300Brand()
  const { data: session } = useSession()
  const path = usePathname()
  if (!brand) return null
  const links = [
    { href: '/', label: 'Trang chủ', icon: Home },
    { href: '/#khoa-hoc', label: 'Khóa học', icon: BookOpen },
    { href: '/#gioi-thieu', label: 'Giới thiệu', icon: Info },
    { href: '/tools', label: 'Không gian của tôi', icon: LayoutGrid },
  ]
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 py-2 lg:px-6">
        <Link href="/" aria-label={`${brand.name} — Trang chủ`} className="flex min-w-0 items-center gap-2">
          <Image src={brand.wordmarkUrl} alt="Wi.Tech" width={180} height={60} priority className="h-12 w-36 object-contain sm:w-44" />
          <span className="hidden border-l border-slate-200 pl-3 text-xs font-semibold text-slate-500 xl:block">{brand.name}</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="order-3 flex w-full gap-1 overflow-x-auto py-1 lg:order-none lg:w-auto lg:gap-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${path === href ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        {session?.user ? (
          <div className="flex shrink-0 items-center gap-1">
            <Link href="/account-settings" className="max-w-28 truncate rounded-xl px-2 py-3 text-sm font-semibold text-slate-700" title="Cài đặt tài khoản">{session.user.name || 'Tài khoản'}</Link>
            <button type="button" aria-label="Đăng xuất" title="Đăng xuất" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={async () => { await signOutPushCleanup(); await signOut({ callbackUrl: '/' }) }}><LogOut className="h-4 w-4" /></button>
          </div>
        ) : <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Đăng nhập</Link>}
      </div>
    </header>
  )
}
