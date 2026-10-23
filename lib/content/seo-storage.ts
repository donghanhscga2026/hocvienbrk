import type { PrismaClient } from '@prisma/client'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { contentSeoSchema, emptyContentSeo, type ContentSeo } from './seo'
import { CrmError } from '@/lib/crm/service'

// SEO dùng bảng cấu hình hiện có: không cần migration, không lộ bản nháp qua Data API.
export function contentSeoKey(kind: 'post' | 'category', id: string | number) {
  const scope = process.env.SITE_PROFILE_KEY?.trim() || process.env.SITE_VARIANT?.trim() || 'default'
  const branch = process.env.VERCEL_ENV === 'preview' ? ':preview:' + encodeURIComponent(process.env.VERCEL_GIT_COMMIT_REF || 'preview') : ''
  return `content:seo:v1:${encodeURIComponent(scope)}${branch}:${kind}:${id}`
}
function secret() {
  const value = process.env.WI300_APPEARANCE_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!value || value.length < 16) throw new CrmError('Máy chủ chưa có khóa bảo vệ nội dung.', 503)
  return createHash('sha256').update('content-seo-v1:' + value).digest()
}
const envelope = z.object({ iv: z.string(), tag: z.string(), payload: z.string() }).strict()
const privatePostSchema = z.object({ title: z.string().max(300), content: z.string().max(100000), image: z.string().max(1000).nullable() }).strict()
export type PrivatePost = z.infer<typeof privatePostSchema>
const contentRecordSchema = z.object({ seo: contentSeoSchema, draft: privatePostSchema.nullable().default(null) }).strict()
type ContentRecord = z.infer<typeof contentRecordSchema>
function decode(value: unknown, key: string): ContentRecord {
  const record = envelope.parse(value), cipher = createDecipheriv('aes-256-gcm', secret(), Buffer.from(record.iv, 'base64'))
  cipher.setAAD(Buffer.from(key)); cipher.setAuthTag(Buffer.from(record.tag, 'base64'))
  const raw = JSON.parse(Buffer.concat([cipher.update(Buffer.from(record.payload, 'base64')), cipher.final()]).toString('utf8'))
  // Đọc được bản SEO cũ chỉ chứa các trường SEO, trước khi có nội dung nháp.
  return raw && 'seo' in raw ? contentRecordSchema.parse(raw) : { seo: contentSeoSchema.parse(raw), draft: null }
}
export async function readContentRecord(db: PrismaClient, kind: 'post' | 'category', id: string | number): Promise<ContentRecord> {
  const key = contentSeoKey(kind, id), row = await db.systemConfig.findUnique({ where: { key }, select: { value: true } })
  return row ? decode(row.value, key) : { seo: { ...emptyContentSeo }, draft: null }
}
export async function readContentRecords(db: PrismaClient, kind: 'post' | 'category', ids: (string | number)[]) {
  if (!ids.length) return new Map<string, ContentRecord>()
  const keys = ids.map(id => contentSeoKey(kind, id))
  const rows = await db.systemConfig.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } })
  const records = new Map(rows.map(row => [row.key, decode(row.value, row.key)]))
  return new Map(ids.map(id => [String(id), records.get(contentSeoKey(kind, id)) || { seo: { ...emptyContentSeo }, draft: null }]))
}
export async function readContentSeo(db: PrismaClient, kind: 'post' | 'category', id: string | number): Promise<ContentSeo> {
  return (await readContentRecord(db, kind, id)).seo
}
export async function writeContentSeo(db: PrismaClient, kind: 'post' | 'category', id: string | number, seo: ContentSeo, draft: PrivatePost | null = null) {
  const key = contentSeoKey(kind, id), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret(), iv)
  cipher.setAAD(Buffer.from(key))
  const payload = Buffer.concat([cipher.update(JSON.stringify(contentRecordSchema.parse({ seo, draft })), 'utf8'), cipher.final()])
  const value = { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), payload: payload.toString('base64') }
  await db.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
}
