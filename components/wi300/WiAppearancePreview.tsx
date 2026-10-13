'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Wi300HomeClient, { type Wi300HomeClientProps } from './Wi300HomeClient'
import WiProjectDirectory from './WiProjectDirectory'
import { appearanceStyle, type WiAppearance } from '@/lib/wi300/appearance'

const documentHTML = '<!doctype html><html lang="vi" data-website-theme="light" data-site-variant="wi300"><head></head><body><div id="preview"></div></body></html>'

/** Iframe tạo viewport thật cho media query; portal dùng chính các component công khai. */
export default function WiAppearancePreview({ settings, tab, data, width }: { settings: WiAppearance; tab: string; data: Wi300HomeClientProps; width: number }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [available, setAvailable] = useState(800)
  useEffect(() => {
    const node = container.current
    if (!node) return
    const update = () => setAvailable(node.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const doc = frame.current?.contentDocument
    if (!doc || !target) return
    for (const [key, value] of Object.entries(appearanceStyle(settings))) doc.documentElement.style.setProperty(key, String(value))
  }, [settings, target])
  const scale = Math.min(1, available / width)
  const brand = { ...data.brand, logoUrl: settings.common.logoUrl || data.brand.logoUrl, iconUrl: settings.common.iconUrl || data.brand.iconUrl, appearance: settings }
  return <div ref={container} className="min-w-0 overflow-hidden rounded-2xl border border-brk-outline bg-brk-background">
    <div style={{ width: width * scale, height: 900 * scale }} className="mx-auto">
      <iframe ref={frame} title="Xem trước giao diện website" sandbox="allow-same-origin" srcDoc={documentHTML} onLoad={() => {
        const doc = frame.current?.contentDocument
        if (!doc) return
        for (const node of document.querySelectorAll('style, link[rel="stylesheet"]')) doc.head.appendChild(node.cloneNode(true))
        doc.body.setAttribute('class', document.body.className)
        setTarget(doc.getElementById('preview'))
      }} style={{ width, height: 900, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0 }} />
    </div>
    {target && createPortal(<div inert>
      <header className={`${settings.common.stickyHeader ? "sticky top-0 z-20" : ""} border-b border-brk-outline bg-white px-6 py-4`}><div className="mx-auto flex max-w-7xl items-center justify-between gap-6"><Image unoptimized width={160} height={48} src={brand.logoUrl} alt={brand.name} className="h-12 w-40 object-contain" /><span className="hidden text-sm text-brk-muted sm:block">Trang chủ · Khóa học · Sản phẩm · Dịch vụ</span></div></header>
      {tab === 'projects' ? <WiProjectDirectory projects={data.projects || []} settings={settings.projects} /> : <Wi300HomeClient {...data} brand={brand} appearance={settings} view={tab === 'courses' ? 'catalog' : tab === 'teachers' ? 'teachers' : 'home'} />}
      {settings.common.showFooter && <footer className="border-t border-brk-outline bg-white px-6 py-8 text-center text-sm text-brk-muted">{brand.name} · Kết nối con người. Lan tỏa giá trị.</footer>}
    </div>, target)}
  </div>
}
