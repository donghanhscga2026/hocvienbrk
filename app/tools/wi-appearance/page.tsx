import { auth } from '@/auth'
import Link from 'next/link'
import { FileText, Pencil } from 'lucide-react'
import { WEBSITE_PAGES, type WebsitePage } from '@/lib/wi300/website-config'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { appearanceAdmin, readAppearance } from '@/lib/wi300/appearance-service'
import WiAppearanceEditor from '@/components/wi300/WiAppearanceEditor'
import Wi300Home from '@/components/wi300/Wi300Home'
import type { Wi300HomeClientProps } from '@/components/wi300/Wi300HomeClient'
import { getDeploymentBrand } from '@/lib/site-profile/deployment-brand'

export const metadata = { title: 'Trang', robots: { index: false, follow: false } }
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Ftools%2Fwi-appearance')
  try { await appearanceAdmin(prisma, Number(session.user.id)) } catch { notFound() }
  const initial = await readAppearance(prisma)
  const page = (await searchParams).page
  if (!page) return <main className="space-y-5"><div><h1 className="text-3xl font-bold">Trang</h1><p className="mt-2 text-sm text-brk-muted">Chỉnh nội dung, giao diện và SEO của từng trang trên website.</p></div><section aria-label="Danh sách trang" className="divide-y divide-brk-outline overflow-hidden rounded-2xl border border-brk-outline bg-white">{WEBSITE_PAGES.map(item => {
    const seo = initial.draft.pageSeo[item.id]
    const customized = !!(seo.title || seo.description || seo.imageUrl || seo.keywords || !seo.inheritRobots)
    const draft = JSON.stringify([initial.draft[item.id], seo]) !== JSON.stringify([initial.published[item.id], initial.published.pageSeo[item.id]])
    return <article key={item.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brk-background text-brk-primary"><FileText size={23} /></span><div className="min-w-0 flex-1"><h2 className="font-bold">{item.label}</h2><Link href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-8 items-center text-sm text-brk-muted">{item.url} ↗</Link><p className="text-xs text-brk-muted">{draft ? 'Có bản nháp chưa áp dụng' : 'Đang dùng bản đã áp dụng'} · {customized ? 'SEO tùy chỉnh' : 'Kế thừa SEO website'}</p></div><Link aria-label={'Chỉnh sửa ' + item.label} href={'/tools/wi-appearance?page=' + item.id} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-brk-outline px-4 text-sm font-semibold text-brk-primary"><Pencil size={16} />Chỉnh sửa</Link></article>
  })}</section></main>
  if (!WEBSITE_PAGES.some(item => item.id === page)) notFound()
  // Chỉ tải danh mục công khai cho preview, không gửi tiến độ/thanh toán của admin.
  const preview = await Wi300Home({ brand, session: null, view: 'home' })
  const previewData = { ...preview.props, brand: getDeploymentBrand() || brand } as Wi300HomeClientProps
  return <WiAppearanceEditor initial={initial} previewData={previewData} previewOnly={process.env.VERCEL_ENV === 'preview'} mode="pages" initialTab={page as WebsitePage} pageOnly={page as WebsitePage} />
}
