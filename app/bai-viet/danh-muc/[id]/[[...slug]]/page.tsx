import { cache } from 'react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { readContentSeo } from '@/lib/content/seo-storage'
import { contentUrl, contentMetadata } from '@/lib/content/seo'
import PublicPosts from '@/components/content/PublicPosts'
type Props = { params: Promise<{ id: string; slug?: string[] }>; searchParams: Promise<{ page?: string }> }
const read = cache(async (id: string) => {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) return null
  const group = await prisma.postCategory.findUnique({ where: { id: Number(id) } })
  return group ? { ...group, seo: await readContentSeo(prisma, 'category', group.id) } : null
})
export async function generateMetadata({ params }: Props) {
  const group = await read((await params).id)
  return group ? contentMetadata(group.seo, group.name, group.description || '', contentUrl('category', group.id, group.seo)) : { title: 'Không tìm thấy danh mục', robots: { index: false } }
}
export default async function Page({ params, searchParams }: Props) {
  const { id, slug } = await params, group = await read(id)
  if (!group) notFound()
  const rawPage = Number((await searchParams).page || 0), page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? Math.min(rawPage, 100000) : 0
  if ((slug || []).join('/') !== group.seo.slug) permanentRedirect(contentUrl('category', group.id, group.seo) + (page ? '?page=' + page : ''))
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-10 text-brk-on-surface sm:px-6"><Link href="/bai-viet" className="inline-flex min-h-11 items-center text-brk-primary">← Bài viết</Link><h1 className="text-3xl font-bold">{group.name}</h1>{group.description && <p className="whitespace-pre-wrap break-words text-brk-muted">{group.description}</p>}<PublicPosts categoryId={group.id} page={page} /></main>
}
