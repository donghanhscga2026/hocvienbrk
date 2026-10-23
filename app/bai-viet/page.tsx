import Link from 'next/link'
import prisma from '@/lib/prisma'
import PublicPosts from '@/components/content/PublicPosts'
import { contentUrl } from '@/lib/content/seo'
import { readContentSeo } from '@/lib/content/seo-storage'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'
import { systemPageContent, systemPageMetadata, systemPageHidden } from '@/lib/wi300/managed-page-runtime'
import WiContentPage from '@/components/wi300/WiContentPage'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'
export async function generateMetadata() { const brand = await getCurrentDeploymentBrand(); return brand ? systemPageMetadata(brand, 'articles') : { title: 'Bài viết' } }
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const brand = await getCurrentDeploymentBrand()
  if (brand && systemPageHidden(brand, 'articles')) notFound()
  const groups = await prisma.postCategory.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] })
  const categories = await Promise.all(groups.map(async group => ({ ...group, url: contentUrl('category', group.id, await readContentSeo(prisma, 'category', group.id)) })))
  const rawPage = Number((await searchParams).page || 0), page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? Math.min(rawPage, 100000) : 0
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 text-brk-on-surface sm:px-6">{brand ? <WiContentPage page={systemPageContent(brand, 'articles')} fallbackTitle="Bài viết" /> : <h1 className="text-3xl font-bold">Bài viết</h1>}<nav aria-label="Danh mục bài viết" className="flex flex-wrap gap-2">{categories.map(group => <Link key={group.id} href={group.url} className="inline-flex min-h-11 items-center rounded-xl border border-brk-outline bg-white px-4">{group.name}</Link>)}</nav>{(!brand || systemPageContent(brand, 'articles').showList) && <PublicPosts page={page} />}</main>
}
