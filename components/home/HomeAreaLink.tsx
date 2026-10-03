'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import type { AnchorHTMLAttributes } from 'react'

export type HomeArea = 'home' | 'learning' | 'discover' | 'tools' | 'community'

// Giữ trang nhân hiệu và các tham số affiliate khi chuyển khu vực.
// History API tích hợp với Next.js: nút Back và tải lại vẫn mở đúng khu vực.
export default function HomeAreaLink({ area, category, children, onClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { area: HomeArea; category?: string }) {
  const pathname = usePathname()
  const params = new URLSearchParams(useSearchParams().toString())
  if (area === 'home') params.delete('section')
  else params.set('section', area)
  if (area === 'discover' && category) params.set('category', category)
  else params.delete('category')
  const query = params.toString()
  const href = pathname + (query ? '?' + query : '')
  return <a {...props} href={href} onClick={event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target === '_blank') return
    event.preventDefault()
    if (window.location.pathname + window.location.search !== href) window.history.pushState(null, '', href)
    window.scrollTo({ top: 0, behavior: 'auto' })
    requestAnimationFrame(() => document.getElementById('home-area-title')?.focus({ preventScroll: true }))
  }}>{children}</a>
}
