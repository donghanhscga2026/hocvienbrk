'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { BookOpen, BriefcaseBusiness, ChevronDown, GraduationCap, Home, LayoutGrid, LogOut, Package, Settings, Wallet, LifeBuoy, MessageCircle, Handshake, Users } from 'lucide-react'
import { useWi300Brand } from './Wi300BrandContext'
import { signOutPushCleanup } from '@/lib/web-push-client'
import { canTeach } from '@/lib/wi300/personal-space'
import NotificationBell from '@/components/notifications/NotificationBell'
import Wi300SpaceMenu from './Wi300SpaceMenu'
import { InstallAppButton } from '@/components/pwa/PwaInstallProvider'
import { useMbwDashboard } from '@/components/mbw/MbwDashboardContext'
import { websiteLinkVisible } from '@/lib/wi300/managed-pages'

const ShareModal = dynamic(() => import('@/components/share/ShareModal'), { ssr: false })
const WalletPopup = dynamic(() => import('@/components/mbw/MbwDashboardPopup'), { ssr: false })

export default function Wi300Header() {
  const brand = useWi300Brand()
  const { data: session } = useSession()
  const path = usePathname()
  const [showShare, setShowShare] = useState(false)
  const { open: openWallet, isOpen: walletOpen } = useMbwDashboard()
  const userId = session?.user?.id != null ? String(session.user.id) : null
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
  const menuIcons: Record<string, typeof Home> = { '/': Home, '/khoa-hoc': BookOpen, '/san-pham': Package, '/dich-vu': BriefcaseBusiness }
  const links = (brand.appearance?.headerMenu || [
    { label: 'Trang chủ', url: '/', visible: true },
    { label: 'Khóa học', url: '/khoa-hoc', visible: true },
    { label: 'Sản phẩm', url: '/san-pham', visible: true },
    { label: 'Dịch vụ', url: '/dich-vu', visible: true },
  ]).filter(item => item.visible).map(item => ({ href: item.url, label: item.label, icon: menuIcons[item.url.split('?')[0]] || LayoutGrid }))
  const accountLink = 'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-brk-background focus-visible:outline-brk-primary'
  return <><header className={`${brand.appearance?.common.stickyHeader !== false ? "sticky top-0" : "relative"} z-50 shrink-0 border-b border-brk-outline bg-white/95 backdrop-blur-xl`}>
    <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2 sm:px-4 lg:flex lg:justify-between lg:px-6">
      <Link href="/" aria-label={`${brand.name} — Trang chủ`} className="flex shrink-0 items-center gap-2">
        <Image src={brand.logoUrl} alt={`${brand.name} — Liên minh 300 doanh nghiệp số, WIPA cố vấn`} width={2089} height={753} priority unoptimized className="h-auto w-24 object-contain min-[360px]:w-32 sm:w-44" />
      </Link>
      <nav aria-label="Điều hướng chính" className="col-span-2 row-start-2 flex w-full justify-between gap-1 lg:justify-start py-1 lg:w-auto">
        {links.filter(item => websiteLinkVisible(item.href, brand.appearance)).map(({ href, label, icon: Icon }) => {
          const selected = path === href || (href === '/khoa-hoc' && path.startsWith(href + '/'))
          return <Link key={href} href={href} target={href.startsWith('https://') ? '_blank' : undefined} rel={href.startsWith('https://') ? 'noopener noreferrer' : undefined} aria-current={selected ? 'page' : undefined} className={`inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] font-semibold sm:px-2.5 sm:text-sm lg:flex-none ${selected ? 'bg-brk-background text-brk-primary' : 'text-brk-muted hover:bg-brk-background hover:text-brk-primary'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</Link>
        })}
      </nav>
      <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-2">
        <Wi300SpaceMenu role={session?.user?.role || 'guest'} actorKey={userId} route={path} onOpen={closeAccount} />
        {/* Cụm hành động nhanh cạnh avatar; không gọi API chia sẻ cho tới khi mở. */}
        {userId != null && <><button type="button" aria-label="Chia sẻ link affiliate" title="Chia sẻ link affiliate" onClick={() => setShowShare(true)} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl hover:bg-brk-background"><Image src="/Share_Link_3d.png" alt="" width={32} height={32} /></button><NotificationBell /></>}
        {session?.user ? <details ref={accountRef} className="relative" onKeyDown={event => {
          if (event.key === 'Escape') { closeAccount(); accountRef.current?.querySelector('summary')?.focus() }
        }}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-1 text-xs font-semibold hover:bg-brk-background focus-visible:outline-brk-primary sm:px-2 sm:text-sm [&::-webkit-details-marker]:hidden" aria-label="Menu tài khoản">{session.user.image ? <Image src={session.user.image} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-full border-2 border-brk-primary object-cover" /> : <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brk-primary text-white">{(session.user.name || 'Tài khoản').trim().split(/\s+/).map(word => word[0]).slice(-2).join('')}</span>}<span className="hidden max-w-24 truncate xl:block">{session.user.name || 'Tài khoản'}</span><ChevronDown className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" /></summary>
          <div className="absolute right-0 top-full mt-2 max-h-[70dvh] w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-brk-outline bg-white p-2 shadow-lg">
            <p className="truncate border-b border-brk-outline px-3 py-2 text-sm font-semibold">{session.user.name || 'Tài khoản'}</p>
            <Link href="/my-space?tab=learning" onClick={closeAccount} className={accountLink}><BookOpen className="h-4 w-4" aria-hidden="true" />Học tập của tôi</Link>
            <Link href="/my-requests" onClick={closeAccount} className={accountLink}><MessageCircle className="h-4 w-4" aria-hidden="true" />Yêu cầu của tôi</Link>
            <button type="button" onClick={() => { closeAccount(); openWallet() }} className={`${accountLink} w-full text-left`}><Wallet className="h-4 w-4" aria-hidden="true" />Ví Wi</button>
            <Link href="/support" onClick={closeAccount} className={accountLink}><LifeBuoy className="h-4 w-4" aria-hidden="true" />Hỗ trợ & phản hồi</Link>
            {canTeach(session.user.role) && <div className="mt-1 border-t border-brk-outline pt-1"><Link href="/my-space?tab=teaching" onClick={closeAccount} className={accountLink}><GraduationCap className="h-4 w-4" aria-hidden="true" />Giảng dạy</Link><Link href="/tools/crm" onClick={closeAccount} className={accountLink}><Users className="h-4 w-4" aria-hidden="true" />CRM · Chăm sóc</Link></div>}
            <details className="mt-1 border-t border-brk-outline pt-1"><summary className={`${accountLink} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}><LayoutGrid className="h-4 w-4" aria-hidden="true" />Tiện ích<ChevronDown className="ml-auto h-4 w-4" /></summary><div className="pl-2"><Link href="/my-space?tab=affiliate" onClick={closeAccount} className={accountLink}><Users className="h-4 w-4" aria-hidden="true" />Giới thiệu & hoa hồng</Link><Link href="/doi-tac" onClick={closeAccount} className={accountLink}><Handshake className="h-4 w-4" aria-hidden="true" />Đăng ký đối tác</Link>{session.user.role === 'ADMIN' && <Link href="/my-space?tab=admin" onClick={closeAccount} className={accountLink}><Settings className="h-4 w-4" aria-hidden="true" />Quản trị hệ thống</Link>}<InstallAppButton appName={brand.name} className="w-full hover:bg-brk-background" onBeforeOpen={closeAccount} /></div></details>
            <Link href="/account-settings" onClick={closeAccount} className={accountLink}><Settings className="h-4 w-4" aria-hidden="true" />Cài đặt tài khoản</Link>
            <button type="button" className={`${accountLink} w-full border-t border-brk-outline text-left`} onClick={async () => { closeAccount(); await signOutPushCleanup(); await signOut({ callbackUrl: '/' }) }}><LogOut className="h-4 w-4" aria-hidden="true" />Đăng xuất</button>
          </div>
        </details> : <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-brk-primary px-3 text-xs font-semibold text-white sm:text-sm">Tài khoản</Link>}
      </div>
    </div>
  </header>
    {showShare && <ShareModal isOpen onClose={() => setShowShare(false)} course={{ id_khoa: '', name_lop: brand.name }} affiliateCode={userId} shareType="header" siteName={brand.name} />}
    {walletOpen && <WalletPopup title="Ví Wi" />}
  </>
}
