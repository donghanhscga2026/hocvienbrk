import { cache } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, permanentRedirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { readContentSeo } from '@/lib/content/seo-storage'
import { contentUrl, contentMetadata } from '@/lib/content/seo'

type Props = { params: Promise<{ id: string; slug?: string[] }> }
const read = cache(async (id: string) => {
  const post = await prisma.post.findFirst({ where: { id, published: true }, include: { category: true, author: { select: { name: true } } } })
  return post ? { ...post, seo: await readContentSeo(prisma, 'post', id) } : null
})
export async function generateMetadata({ params }: Props) {
  const post = await read((await params).id)
  return post ? contentMetadata(post.seo, post.title, post.content, contentUrl('post', post.id, post.seo), post.image) : { title: 'Không tìm thấy bài viết', robots: { index: false } }
}
export default async function Page({ params }: Props) {
  const { id, slug } = await params, post = await read(id)
  if (!post) notFound()
  if ((slug || []).join('/') !== post.seo.slug) permanentRedirect(contentUrl('post', post.id, post.seo))
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-brk-on-surface sm:px-6"><Link href="/bai-viet" className="inline-flex min-h-11 items-center text-brk-primary">← Bài viết</Link><article className="space-y-6 rounded-2xl border border-brk-outline bg-white p-5 sm:p-8"><h1 className="break-words text-3xl font-bold sm:text-4xl">{post.title}</h1><p className="text-sm text-brk-muted">{post.author.name || 'Ban biên tập'} · {post.createdAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}{post.category && ' · ' + post.category.name}</p>{post.image && <Image unoptimized src={post.image} alt={post.title} width={1200} height={630} className="h-auto max-h-[500px] w-full rounded-xl object-contain" />}<div className="whitespace-pre-wrap break-words leading-8">{post.content}</div></article></main>
}
