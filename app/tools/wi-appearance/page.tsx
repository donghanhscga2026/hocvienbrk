import { auth } from '@/auth'
import WiPagesManager from '@/components/wi300/WiPagesManager'
import { SYSTEM_WEBSITE_PAGES } from '@/lib/wi300/managed-pages'
import { systemPageContent } from '@/lib/wi300/managed-page-runtime'
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
  if (!page || page === 'new' || SYSTEM_WEBSITE_PAGES.some(item => item.id === page && !WEBSITE_PAGES.some(original => original.id === page)) || initial.draft.customPages.some(item => item.id === page)) return <WiPagesManager initial={initial} initialPage={page} defaults={Object.fromEntries(SYSTEM_WEBSITE_PAGES.map(item => [item.id, systemPageContent(brand, item.id)]))} previewOnly={process.env.VERCEL_ENV === 'preview'} />
  if (!WEBSITE_PAGES.some(item => item.id === page)) notFound()
  // Chỉ tải danh mục công khai cho preview, không gửi tiến độ/thanh toán của admin.
  const preview = await Wi300Home({ brand, session: null, view: 'home' })
  const previewData = { ...preview.props, brand: getDeploymentBrand() || brand } as Wi300HomeClientProps
  return <WiAppearanceEditor initial={initial} previewData={previewData} previewOnly={process.env.VERCEL_ENV === 'preview'} mode="pages" initialTab={page as WebsitePage} pageOnly={page as WebsitePage} />
}
