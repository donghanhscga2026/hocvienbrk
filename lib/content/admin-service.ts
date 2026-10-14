import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { appearanceAdmin } from '@/lib/wi300/appearance-service'
import { CrmError } from '@/lib/crm/service'
import { contentSeoSchema } from './seo'
import { contentSeoKey, readContentSeo, writeContentSeo } from './seo-storage'

const name = z.string().trim().min(1).max(300)
const postInput = z.object({ id: z.string().min(1).optional(), title: name, content: z.string().trim().min(1).max(100000),
  image: z.string().trim().max(1000).refine(value => !value || /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value), 'Ảnh phải là đường dẫn hợp lệ.').default(''),
  categoryId: z.number().int().min(0).nullable().default(null), published: z.boolean().default(true),
  seo: contentSeoSchema, version: z.string().optional(),
}).strict()
const categoryInput = z.object({ id: z.number().int().min(0).optional(), name, description: z.string().trim().max(1500).default(''),
  order: z.number().int().min(0).max(10000).default(0), seo: contentSeoSchema,
}).strict()

export async function listManagedPosts(db: PrismaClient, actor: number, page: number, query = '', categoryId?: number, published?: boolean) {
  await appearanceAdmin(db, actor)
  const where = { ...(query ? { title: { contains: query.slice(0, 300), mode: 'insensitive' as const } } : {}),
    ...(categoryId === undefined ? {} : { categoryId }), ...(published === undefined ? {} : { published }) }
  const [posts, total] = await Promise.all([db.post.findMany({ where, include: { category: true, _count: { select: { comments: true } } },
    orderBy: [{ pin: 'desc' }, { createdAt: 'desc' }], skip: page * 10, take: 10 }), db.post.count({ where })])
  return { posts: await Promise.all(posts.map(async post => ({ ...post, seo: await readContentSeo(db, 'post', post.id) }))), total, totalPages: Math.max(1, Math.ceil(total / 10)) }
}
export async function listManagedCategories(db: PrismaClient, actor: number) {
  await appearanceAdmin(db, actor)
  const rows = await db.postCategory.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }], include: { _count: { select: { posts: true } } } })
  return Promise.all(rows.map(async row => ({ ...row, seo: await readContentSeo(db, 'category', row.id) })))
}
export async function saveManagedPost(db: PrismaClient, actor: number, raw: unknown) {
  const input = postInput.parse(raw)
  return db.$transaction(async tx => {
    await appearanceAdmin(tx as PrismaClient, actor)
    if (input.id) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`post:${input.id}`}))`
      // Khóa bản ghi cũng bảo vệ trước các đường sửa bài viết cũ không dùng advisory lock.
      await tx.$executeRaw`SELECT id FROM "Post" WHERE id = ${input.id} FOR UPDATE`
    }
    const old = input.id ? await tx.post.findUnique({ where: { id: input.id } }) : null
    if (input.id && !old) throw new CrmError('Không tìm thấy bài viết.', 404)
    if (old && (!input.version || old.updatedAt.toISOString() !== input.version)) throw new CrmError('Bài viết đã thay đổi. Tải lại trước khi sửa.', 409)
    if (input.categoryId !== null && !await tx.postCategory.findUnique({ where: { id: input.categoryId } })) throw new CrmError('Danh mục không còn tồn tại.', 409)
    const data = { title: input.title, content: input.content, image: input.image || null, categoryId: input.categoryId, published: input.published }
    const post = old ? await tx.post.update({ where: { id: old.id }, data }) : await tx.post.create({ data: { ...data, authorId: actor } })
    await writeContentSeo(tx as PrismaClient, 'post', post.id, input.seo)
    return { ...post, seo: input.seo }
  })
}
export async function saveManagedCategory(db: PrismaClient, actor: number, raw: unknown) {
  const input = categoryInput.parse(raw)
  return db.$transaction(async tx => {
    await appearanceAdmin(tx as PrismaClient, actor)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'post-categories'}))`
    const data = { name: input.name, description: input.description || null, slug: input.seo.slug || null, order: input.order }
    const row = input.id === undefined ? await tx.postCategory.create({ data }) : await tx.postCategory.update({ where: { id: input.id }, data })
    await writeContentSeo(tx as PrismaClient, 'category', row.id, input.seo)
    return { ...row, seo: input.seo }
  })
}
export async function deleteManagedContent(db: PrismaClient, actor: number, kind: 'post' | 'category', id: string | number, version?: string) {
  return db.$transaction(async tx => {
    await appearanceAdmin(tx as PrismaClient, actor)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${kind === 'post' ? `post:${id}` : 'post-categories'}))`
    if (kind === 'post') {
      await tx.$executeRaw`SELECT id FROM "Post" WHERE id = ${String(id)} FOR UPDATE`
      const post = await tx.post.findUnique({ where: { id: String(id) } })
      if (!post) throw new CrmError('Bài viết không còn tồn tại.', 404)
      if (!version || post.updatedAt.toISOString() !== version) throw new CrmError('Bài viết đã thay đổi. Tải lại trước khi xóa.', 409)
      await tx.post.delete({ where: { id: String(id) } })
    } else {
      // Chuyển bài sang chưa phân loại; không xóa bài hoặc bình luận theo danh mục.
      await tx.post.updateMany({ where: { categoryId: Number(id) }, data: { categoryId: null } })
      await tx.postCategory.delete({ where: { id: Number(id) } })
    }
    await tx.systemConfig.deleteMany({ where: { key: contentSeoKey(kind, id) } })
    return { success: true }
  })
}
