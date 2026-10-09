'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Wi300Header from './Wi300Header'

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
  return <>{!courseOwnsShell && <Wi300Header />}{children}</>
}
