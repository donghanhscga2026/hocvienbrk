'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Wi300Header from './Wi300Header'
import Link from 'next/link'
import { defaultPageTitle } from '@/lib/wi300/default-pages'

/** Trang khóa học sở hữu menu; các trang khác dùng menu chung của WI300. */
export default function Wi300Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const previousPath = useRef(pathname)
  const restoringHistory = useRef(false)
  useEffect(() => {
    const onPopState = () => { restoringHistory.current = window.location.pathname !== previousPath.current }
    const onClick = (event: MouseEvent) => {
      if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && (event.target as Element)?.closest?.('a[href]')) restoringHistory.current = false
    }
    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onClick, true)
    return () => { window.removeEventListener('popstate', onPopState); document.removeEventListener('click', onClick, true) }
  }, [])
  useLayoutEffect(() => {
    if (previousPath.current === pathname) return
    if (!restoringHistory.current && !window.location.hash && !new URLSearchParams(window.location.search).has('notificationLesson')) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    previousPath.current = pathname
    restoringHistory.current = false
  }, [pathname])
  const courseOwnsShell = /^\/khoa-hoc\/[^/]+\/?$/.test(pathname) || /^\/courses\/[^/]+\/learn\/?$/.test(pathname)
  const title = defaultPageTitle(pathname)
  // Chỉ căn khung trang hệ thống mặc định; trang khóa học/template sở hữu bố cục riêng.
  return <>{!courseOwnsShell && <Wi300Header />}{title ? <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <nav aria-label="Đường dẫn trang" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-brk-muted">
      <Link href="/" className="text-brk-primary">Trang chủ</Link><span aria-hidden>/</span>
      <Link href="/my-space" className="text-brk-primary">Không gian của tôi</Link><span aria-hidden>/</span>
      {pathname.startsWith('/tools/') && <><Link href="/my-space?tab=tools" className="text-brk-primary">Công cụ</Link><span aria-hidden>/</span></>}
      <span aria-current="page">{title}</span>
    </nav>
    {pathname.startsWith('/tools/') && <h1 className="mb-6 text-2xl font-bold text-brk-on-surface">{title}</h1>}
    {children}
  </div> : children}</>
}
