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
export async function readContentSeo(db: PrismaClient, kind: 'post' | 'category', id: string | number): Promise<ContentSeo> {
  const key = contentSeoKey(kind, id), row = await db.systemConfig.findUnique({ where: { key }, select: { value: true } })
  if (!row) return { ...emptyContentSeo }
  const record = envelope.parse(row.value), cipher = createDecipheriv('aes-256-gcm', secret(), Buffer.from(record.iv, 'base64'))
  cipher.setAAD(Buffer.from(key)); cipher.setAuthTag(Buffer.from(record.tag, 'base64'))
  return contentSeoSchema.parse(JSON.parse(Buffer.concat([cipher.update(Buffer.from(record.payload, 'base64')), cipher.final()]).toString('utf8')))
}
export async function writeContentSeo(db: PrismaClient, kind: 'post' | 'category', id: string | number, seo: ContentSeo) {
  const key = contentSeoKey(kind, id), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret(), iv)
  cipher.setAAD(Buffer.from(key))
  const payload = Buffer.concat([cipher.update(JSON.stringify(contentSeoSchema.parse(seo)), 'utf8'), cipher.final()])
  const value = { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), payload: payload.toString('base64') }
  await db.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
}
