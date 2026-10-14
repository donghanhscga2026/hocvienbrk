import Link from 'next/link'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { appearanceAdmin, readAppearance } from '@/lib/wi300/appearance-service'
import { spaceNavigation } from '@/lib/wi300/personal-space'
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
  if (!section) return <main className="space-y-5"><h1 className="text-3xl font-bold">Quản trị website</h1><p className="text-brk-muted">Cấu hình nhận diện, SEO, các trang, bài viết và chân trang của Wi300.</p><div className="grid gap-4 sm:grid-cols-2">{spaceNavigation('ADMIN', []).find(group => group.id === 'website-admin')!.items.map(item => <Link key={item.href} href={item.href} className="flex min-h-24 items-center rounded-2xl border border-brk-outline bg-white p-5 font-semibold text-brk-primary">{item.label} →</Link>)}</div></main>
  if (!['common', 'seo', 'footer'].includes(section)) notFound()
  const initial = await readAppearance(prisma)
  const preview = await Wi300Home({ brand, session: null, view: 'home' })
  const previewData = { ...preview.props, brand: getDeploymentBrand() || brand } as Wi300HomeClientProps
  return <WiAppearanceEditor initial={initial} previewData={previewData} previewOnly={process.env.VERCEL_ENV === 'preview'} mode="website" initialTab={section as 'common' | 'seo' | 'footer'} />
}
