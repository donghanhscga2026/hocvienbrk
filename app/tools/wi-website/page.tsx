import Link from 'next/link'
import { Settings, PanelsTopLeft, Newspaper, ChevronRight } from 'lucide-react'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { appearanceAdmin, readAppearance } from '@/lib/wi300/appearance-service'
import WiAppearanceEditor from '@/components/wi300/WiAppearanceEditor'
import Wi300Home from '@/components/wi300/Wi300Home'
import type { Wi300HomeClientProps } from '@/components/wi300/Wi300HomeClient'
import { getDeploymentBrand } from '@/lib/site-profile/deployment-brand'

export const metadata = { title: 'Quản trị website', robots: { index: false, follow: false } }
export default async function Page({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const brand = await getCurrentDeploymentBrand()
  if (!brand) notFound()
  const session = await auth()
  if (!session?.user) redirect('/login?callbackUrl=%2Ftools%2Fwi-website')
  try { await appearanceAdmin(prisma, Number(session.user.id)) } catch { notFound() }
  const section = (await searchParams).section
  if (!section) {
    const cards = [
      { label: 'Cấu hình chung', href: '/tools/wi-website?section=common', description: 'Nhận diện, màu sắc, SEO website và footer.', Icon: Settings },
      { label: 'Trang', href: '/tools/wi-appearance', description: 'Chỉnh nội dung, giao diện và SEO từng trang.', Icon: PanelsTopLeft },
      { label: 'Bài viết', href: '/tools/posts', description: 'Tạo và chỉnh sửa bài viết của website.', Icon: Newspaper },
    ]
    return <main className="space-y-5"><h1 className="text-3xl font-bold">Quản trị website</h1><p className="text-brk-muted">Quản lý cấu hình chung, các trang và bài viết của Wi300.</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, href, description, Icon }) => <Link key={href} href={href} className="group flex min-h-40 items-start gap-4 rounded-2xl border border-brk-outline bg-white p-5 transition-shadow hover:shadow-md"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brk-background text-brk-primary"><Icon size={24} /></span><div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-brk-on-surface">{label}</h2><p className="mt-2 text-sm leading-6 text-brk-muted">{description}</p><span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brk-primary">Mở quản lý<ChevronRight size={16} /></span></div></Link>)}</div></main>
  }
  if (!['common', 'seo', 'footer', 'menu'].includes(section)) notFound()
  const initial = await readAppearance(prisma)
  const preview = await Wi300Home({ brand, session: null, view: 'home' })
  const previewData = { ...preview.props, brand: getDeploymentBrand() || brand } as Wi300HomeClientProps
  return <WiAppearanceEditor initial={initial} previewData={previewData} previewOnly={process.env.VERCEL_ENV === 'preview'} mode="website" initialTab={section as 'common' | 'seo' | 'footer' | 'menu'} />
}
