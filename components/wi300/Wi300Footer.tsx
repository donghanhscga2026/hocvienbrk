'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useWi300Brand } from './Wi300BrandContext'
import { defaultFooter } from '@/lib/wi300/appearance'
import type { DeploymentBrand } from '@/lib/site-profile/deployment-brand'

/** Cùng component cho website công khai và preview, chỉ dùng dữ liệu đã kiểm tra. */
export default function Wi300Footer({ previewBrand }: { previewBrand?: DeploymentBrand } = {}) {
  const contextBrand = useWi300Brand()
  const brand = previewBrand || contextBrand
  if (!brand || brand.appearance?.common.showFooter === false) return null
  const footer = brand.appearance?.footer || defaultFooter
  return <footer className="shrink-0 border-t border-brk-outline bg-white text-brk-on-surface">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3 sm:px-6 lg:px-8">
      <div className="sm:col-span-2 lg:col-span-1">
        <Link href="/" className="inline-block"><Image src={footer.logoUrl || brand.logoUrl} alt={brand.name} width={2089} height={753} unoptimized className="h-auto w-60 max-w-full object-contain" /></Link>
        <p className="mt-3 text-sm text-brk-muted">{brand.tagline}</p>
        {footer.description && <p className="mt-4 max-w-md whitespace-pre-line break-words text-sm leading-6 text-brk-muted">{footer.description}</p>}
        {footer.note && <p className="mt-3 whitespace-pre-line break-words text-xs leading-6 text-brk-muted">{footer.note}</p>}
        {footer.contact && <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-brk-muted">{footer.contact}</p>}
        {footer.socials.length > 0 && <nav aria-label="Mạng xã hội" className="mt-3 flex flex-wrap gap-x-4">{footer.socials.map((item, index) => <Link key={index} href={item.url} className="inline-flex min-h-11 items-center break-words text-sm text-brk-primary">{item.label}</Link>)}</nav>}
      </div>
      {footer.groups.map((group, index) => <nav key={index} aria-label={group.title + ' ở chân trang'}><h2 className="break-words font-bold">{group.title}</h2><ul className="mt-3 text-sm text-brk-muted">{group.links.map((item, linkIndex) => <li key={linkIndex}><Link href={item.url} className="inline-flex min-h-11 items-center break-words hover:text-brk-primary">{item.label}</Link></li>)}</ul></nav>)}
    </div>
    <div className="border-t border-brk-outline"><p className="mx-auto max-w-7xl break-words px-4 py-4 text-xs text-brk-muted sm:px-6 lg:px-8">{footer.copyright || brand.name + ' · Kết nối con người. Lan tỏa giá trị.'}</p></div>
  </footer>
}
