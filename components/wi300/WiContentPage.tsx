import Image from 'next/image'
import Link from 'next/link'
import type { ManagedPage } from '@/lib/wi300/managed-pages'

/** Nội dung văn bản được React escape; dùng chung cho trang công khai và xem trước. */
export default function WiContentPage({ page, fallbackTitle, fallbackDescription = '', fallbackBody = '', fallbackImage = '' }: { page: ManagedPage; fallbackTitle: string; fallbackDescription?: string; fallbackBody?: string; fallbackImage?: string }) {
  const image = page.imageUrl || fallbackImage, body = page.body || fallbackBody
  return <section className="space-y-6">
    {page.showHero && <header className="space-y-4"><h1 className="whitespace-pre-line break-words text-3xl font-bold sm:text-4xl">{page.title || fallbackTitle}</h1>{(page.description || fallbackDescription) && <p className="whitespace-pre-wrap break-words leading-7 text-brk-muted">{page.description || fallbackDescription}</p>}</header>}
    {page.showContent && (image || body) && <div className={`grid gap-6 rounded-2xl border border-brk-outline bg-white p-5 sm:p-8 ${page.layout === 'split' && image ? 'md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:items-center' : ''}`}>{image && <Image unoptimized src={image} width={1200} height={630} alt={page.title || fallbackTitle} className="mx-auto h-auto max-h-96 max-w-full rounded-xl object-contain" />}{body && <div className="whitespace-pre-wrap break-words leading-8 text-brk-muted">{body}</div>}</div>}
    {page.showCTA && page.ctaLabel && page.ctaUrl && <Link href={page.ctaUrl} className="inline-flex min-h-12 items-center rounded-xl bg-brk-primary px-5 font-semibold text-white">{page.ctaLabel}</Link>}
  </section>
}
