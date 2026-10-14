import Link from 'next/link'
import prisma from '@/lib/prisma'
import { contentUrl } from '@/lib/content/seo'
import { readContentSeo } from '@/lib/content/seo-storage'
export default async function PublicPosts({ categoryId, page = 0 }: { categoryId?: number; page?: number }) {
  const where = { published: true, ...(categoryId === undefined ? {} : { categoryId }) }
  const [posts, total] = await Promise.all([prisma.post.findMany({ where, orderBy: [{ pin: 'desc' }, { createdAt: 'desc' }], take: 12, skip: page * 12 }), prisma.post.count({ where })])
  const items = await Promise.all(posts.map(async post => ({ ...post, url: contentUrl('post', post.id, await readContentSeo(prisma, 'post', post.id)) })))
  return <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(post => <article key={post.id} className="min-w-0 rounded-2xl border border-brk-outline bg-white p-5"><h2 className="break-words text-xl font-bold"><Link href={post.url}>{post.title}</Link></h2><p className="mt-3 line-clamp-4 break-words text-sm leading-6 text-brk-muted">{post.content}</p><Link href={post.url} className="mt-3 inline-flex min-h-11 items-center text-brk-primary">Đọc bài viết →</Link></article>)}</div>{!total && <p>Chưa có bài viết trong mục này.</p>}<nav aria-label="Phân trang bài viết" className="mt-6 flex flex-wrap justify-between gap-3">{page > 0 && <Link href={'?page=' + (page - 1)} className="inline-flex min-h-11 items-center">← Trang trước</Link>}{(page + 1) * 12 < total && <Link href={'?page=' + (page + 1)} className="inline-flex min-h-11 items-center">Trang sau →</Link>}</nav></>
}
