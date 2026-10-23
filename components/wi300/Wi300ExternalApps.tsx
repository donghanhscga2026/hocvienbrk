'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Expand, Image, ScanLine, Sparkles } from 'lucide-react'
import { externalApps, externalAppHref, type ExternalApp } from '@/lib/wi300/external-apps'

function AppIcon({ app }: { app: ExternalApp }) {
  const Icon = app.icon === 'Image' ? Image : ScanLine
  return <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brk-primary text-white"><Icon size={28} aria-hidden="true" /></span>
}

/** Chỉ tải app khi người dùng chọn công cụ, không tải iframe ở danh mục. */
export function ExternalAppsCatalog() {
  return <section aria-labelledby="external-apps-heading" className="rounded-2xl border border-brk-outline bg-white p-4 sm:p-5">
    <div className="mb-4"><h2 id="external-apps-heading" className="text-lg font-bold">Ứng dụng của Wi</h2><p className="mt-1 text-sm text-brk-muted">Chọn công cụ để bắt đầu sử dụng.</p></div>
    <Link href="/tools/landing-ai" className="mb-4 flex min-h-24 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><Sparkles size={28} className="shrink-0" aria-hidden="true" /><span className="min-w-0"><span className="block font-bold">Wi Landing AI <span className="text-xs font-normal">· Bản thử</span></span><span className="mt-1 block text-sm">Duyệt dàn ý, tạo trang mẫu và chỉnh sửa landing page.</span></span><ArrowUpRight size={18} className="ml-auto shrink-0" aria-hidden="true" /></Link>
    <div className="grid gap-3 sm:grid-cols-2">{externalApps.map(app => <Link key={app.slug} href={externalAppHref(app.slug)} className="flex min-w-0 items-start gap-3 rounded-2xl border border-brk-outline p-4 hover:border-brk-primary hover:bg-brk-background focus-visible:outline-brk-primary">
      <AppIcon app={app} /><span className="min-w-0 flex-1"><span className="block font-bold">{app.name}</span><span className="mt-1 block text-sm leading-6 text-brk-muted">{app.description}</span><span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brk-primary">Sử dụng<ArrowUpRight size={16} aria-hidden="true" /></span></span>
    </Link>)}</div>
  </section>
}

/** URL chỉ lấy từ danh mục cố định; không nhận URL tùy ý hoặc gửi phiên WI300. */
export function ExternalAppViewer({ app }: { app: ExternalApp }) {
  const [embedded, setEmbedded] = useState(app.mode === 'embed')
  const [wide, setWide] = useState(false)
  const externalLink = <a href={app.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brk-primary px-4 text-sm font-semibold text-white">Mở riêng<ArrowUpRight size={16} aria-hidden="true" /></a>
  return <section aria-label={app.name} className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/my-space?tab=tools" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brk-primary"><ArrowLeft size={16} aria-hidden="true" />Công cụ & tiện ích</Link>
      <div className="flex flex-wrap gap-2">
        {embedded && <button type="button" aria-pressed={wide} onClick={() => setWide(value => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brk-outline bg-white px-3 text-sm"><Expand size={16} aria-hidden="true" />{wide ? 'Thu gọn khung' : 'Mở rộng khung'}</button>}
        {externalLink}
      </div>
    </div>
    <p className="text-sm leading-6 text-brk-muted">{app.description}</p>
    {!embedded ? <div className="rounded-2xl border border-brk-outline bg-white p-5 sm:p-8">
      <AppIcon app={app} /><p className="mt-4 max-w-2xl text-sm leading-6 text-brk-muted">Bạn có thể mở {app.name} ở tab riêng. Nếu muốn sử dụng tại đây, hãy thử mở trong khung WI300.</p>
      <button type="button" onClick={() => setEmbedded(true)} className="mt-4 min-h-11 rounded-xl border border-brk-primary px-4 text-sm font-semibold text-brk-primary">Thử mở trong WI300</button>
    </div> : <>
      {/* Không thể đọc trạng thái app khác tên miền; luôn có lối mở riêng. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm text-brk-muted"><span>Nếu khung trống hoặc thao tác không được, chọn “Mở riêng”.</span><button type="button" onClick={() => { setEmbedded(false); setWide(false) }} className="min-h-11 px-2 font-semibold text-brk-primary">Đóng khung</button></div>
      <div className={'overflow-hidden rounded-2xl border border-brk-outline bg-white ' + (wide ? 'fixed inset-2 z-[70] flex flex-col shadow-2xl sm:inset-4' : '')}>
        {wide && <div className="flex shrink-0 items-center justify-between gap-3 border-b border-brk-outline px-4"><span className="font-bold">{app.name}</span><button type="button" onClick={() => setWide(false)} className="min-h-11 px-2 font-semibold text-brk-primary">Thu gọn khung</button></div>}
        <iframe title={app.name} src={app.url} referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox" allow="clipboard-read; clipboard-write; fullscreen" className={'block w-full border-0 ' + (wide ? 'min-h-0 flex-1' : 'h-[75dvh] min-h-[420px] sm:min-h-[560px]')} />
      </div>
    </>}
  </section>
}
