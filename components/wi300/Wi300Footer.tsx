'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useWi300Brand } from './Wi300BrandContext'

/** Footer dùng chung cho WI300, nằm trong luồng trang và không che nội dung. */
export default function Wi300Footer() {
  const brand = useWi300Brand()
  if (!brand) return null
  return <footer className="shrink-0 border-t border-brk-outline bg-white text-brk-on-surface">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[2fr_1fr_1fr] lg:px-8">
      <div className="sm:col-span-2 lg:col-span-1">
        <Link href="/" className="inline-block"><Image src={brand.logoUrl} alt={`${brand.name} — 300 doanh nghiệp số, WIPA cố vấn`} width={2089} height={753} unoptimized className="h-auto w-60 max-w-full object-contain" /></Link><p className="mt-3 text-sm text-brk-muted">{brand.tagline}</p>
        <p className="mt-4 max-w-md text-sm leading-6 text-brk-muted">Kết nối cá nhân và doanh nghiệp với tri thức, các giá trị và cơ hội hợp tác trong hệ sinh thái Wi.</p>
        <p className="mt-3 text-xs leading-6 text-brk-muted">300DNS là dự án của WIPA. Các dự án thuộc 300DNS được WIPA cố vấn.</p>
      </div>
      <nav aria-label="Khám phá ở chân trang"><h2 className="font-bold">Khám phá</h2><ul className="mt-3 text-sm text-brk-muted">{[{ href: '/khoa-hoc', label: 'Khóa học' }, { href: '/#doanh-nghiep-tieu-bieu', label: 'Doanh nghiệp tiêu biểu' }, { href: '/gioi-thieu', label: 'Giới thiệu WI300' }].map(item => <li key={item.href}><Link href={item.href} className="inline-flex min-h-11 items-center hover:text-brk-primary">{item.label}</Link></li>)}</ul></nav>
      <nav aria-label="Tài khoản ở chân trang"><h2 className="font-bold">Không gian của bạn</h2><ul className="mt-3 text-sm text-brk-muted">{[{ href: '/my-space', label: 'Không gian của tôi' }, { href: '/my-space?tab=learning', label: 'Học tập của tôi' }, { href: '/account-settings', label: 'Tài khoản' }].map(item => <li key={item.href}><Link href={item.href} className="inline-flex min-h-11 items-center hover:text-brk-primary">{item.label}</Link></li>)}</ul></nav>
    </div>
    <div className="border-t border-brk-outline"><p className="mx-auto max-w-7xl px-4 py-4 text-xs text-brk-muted sm:px-6 lg:px-8">{brand.name} · Kết nối con người. Lan tỏa giá trị.</p></div>
  </footer>
}
