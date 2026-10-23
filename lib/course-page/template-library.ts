import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'
import { CrmError } from '@/lib/crm/service'
import type { CourseEditor } from './permissions'
import { compileTemplateSource, templateSourceSchema, type TemplateSource } from './template-source'
import { parse } from 'parse5'

const PREFIX = 'course-template-library:v1:'
const POLICY = PREFIX + 'policy'
const idSchema = z.string().regex(/^(?:shared|private:\d+):[0-9a-f-]{36}$/)
export const libraryPolicySchema = z.object({ maxPrivateTemplates: z.number().int().min(0).max(3), maxTemplateMB: z.number().int().min(1).max(8), maxPrivateMB: z.number().int().min(1).max(24) }).strict()
export const defaultLibraryPolicy = { maxPrivateTemplates: 1, maxTemplateMB: 2, maxPrivateMB: 4 }
export type LibraryPolicy = z.infer<typeof libraryPolicySchema>
const metaSchema = z.object({ id: idSchema, ownerId: z.number().int().min(0), scope: z.enum(['shared', 'private']), published: z.boolean(), name: z.string().trim().min(1).max(150), description: z.string().trim().max(1000), sourceType: z.enum(['html', 'zip', 'url']), bytes: z.number().int().nonnegative(), updatedAt: z.string().datetime() }).strict()
export type LibraryTemplate = z.infer<typeof metaSchema>
const metaKey = (id: string) => PREFIX + idSchema.parse(id) + ':meta'
const sourceKey = (id: string) => PREFIX + idSchema.parse(id) + ':source'
function secret() {
  const value = process.env.WI300_APPEARANCE_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!value || value.length < 16) throw new CrmError('Máy chủ chưa có khóa bảo vệ thư viện mẫu.', 503)
  return createHash('sha256').update('course-template-library-v1:' + value).digest()
}
/** Cả tên và mã nguồn mẫu riêng đều mã hóa; không lưu file riêng ở bucket công khai. */
export function sealLibrary(value: unknown, context: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secret(), iv)
  cipher.setAAD(Buffer.from(context))
  const payload = Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(value)))), cipher.final()])
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), payload: payload.toString('base64') }
}
export function openLibrary(value: unknown, context: string): unknown {
  const record = z.object({ version: z.literal(1), iv: z.string(), tag: z.string(), payload: z.string() }).parse(value)
  const decipher = createDecipheriv('aes-256-gcm', secret(), Buffer.from(record.iv, 'base64'))
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
  return JSON.parse(gunzipSync(Buffer.concat([decipher.update(Buffer.from(record.payload, 'base64')), decipher.final()]), { maxOutputLength: 10 * 1024 * 1024 }).toString('utf8'))
}
export async function readLibraryPolicy(db: PrismaClient) {
  const row = await db.systemConfig.findUnique({ where: { key: POLICY } })
  const parsed = libraryPolicySchema.safeParse(row?.value)
  return parsed.success ? parsed.data : { ...defaultLibraryPolicy }
}
export async function writeLibraryPolicy(db: PrismaClient, actor: CourseEditor, raw: unknown) {
  if (actor.role !== 'ADMIN') throw new CrmError('Chỉ admin được đổi hạn mức.', 403)
  const value = libraryPolicySchema.parse(raw)
  await db.systemConfig.upsert({ where: { key: POLICY }, create: { key: POLICY, value }, update: { value } })
  return value
}
export async function listLibrary(db: PrismaClient, actor: CourseEditor) {
  // Chỉ đọc metadata nhỏ, không tải nguồn HTML của toàn bộ thư viện.
  const rows = await db.systemConfig.findMany({ where: { OR: [{ key: { startsWith: PREFIX + 'shared:', endsWith: ':meta' } }, { key: { startsWith: PREFIX + `private:${actor.id}:`, endsWith: ':meta' } }] }, select: { key: true, value: true } })
  return rows.map(row => metaSchema.parse(openLibrary(row.value, row.key))).filter(meta => meta.scope === 'private' ? meta.ownerId === actor.id : meta.published || actor.role === 'ADMIN').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
export async function readLibraryTemplate(db: PrismaClient, actor: CourseEditor, id: string, edit = false) {
  idSchema.parse(id)
  // Quyền được kiểm tra trước khi đọc/decrypt nguồn.
  if (id.startsWith('private:') && !id.startsWith(`private:${actor.id}:`)) throw new CrmError('Không tìm thấy mẫu.', 404)
  const key = metaKey(id), row = await db.systemConfig.findUnique({ where: { key } })
  if (!row) throw new CrmError('Không tìm thấy mẫu.', 404)
  const meta = metaSchema.parse(openLibrary(row.value, key))
  if (meta.scope === 'private' ? meta.ownerId !== actor.id : (!meta.published || edit) && actor.role !== 'ADMIN') throw new CrmError('Không tìm thấy mẫu.', 404)
  const source = await db.systemConfig.findUnique({ where: { key: sourceKey(id) } })
  if (!source) throw new CrmError('Không tìm thấy mã nguồn mẫu.', 404)
  return { template: meta, source: templateSourceSchema.parse(openLibrary(source.value, sourceKey(id))) }
}
function checkUserSource(source: TemplateSource, admin: boolean) {
  if (admin) return
  for (const file of source.files) {
    if (file.kind === 'js') throw new CrmError('Mẫu cá nhân hiện hỗ trợ HTML/CSS. JavaScript tùy ý chỉ dành cho admin.')
    if (file.kind !== 'html') continue
    const walk = (node: any) => {
      if (['script', 'iframe', 'object', 'embed', 'form', 'base'].includes(node.tagName) || node.attrs?.some((attr: { name: string; value: string }) => /^on/i.test(attr.name) || /^(?:javascript|vbscript):/i.test(attr.value.trim()))) throw new CrmError('Mẫu cá nhân không được chứa script, form hoặc nội dung nhúng. Hãy dùng nút đăng ký của hệ thống.')
      for (const child of node.childNodes || []) walk(child)
      if (node.content) walk(node.content)
    }
    walk(parse(file.content))
  }
}
export async function saveLibraryTemplate(db: PrismaClient, actor: CourseEditor, input: { id?: string; expectedUpdatedAt?: string; name: string; description: string; scope: 'shared' | 'private'; published: boolean; sourceType: 'html' | 'zip' | 'url'; source: TemplateSource }) {
  if (input.scope === 'shared' && actor.role !== 'ADMIN') throw new CrmError('Chỉ admin được đưa mẫu vào kho chung.', 403)
  const source = templateSourceSchema.parse(input.source)
  checkUserSource(source, actor.role === 'ADMIN')
  compileTemplateSource(source)
  const bytes = Buffer.byteLength(JSON.stringify(source), 'utf8')
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PREFIX + actor.id}))`
    const policy = await readLibraryPolicy(tx as PrismaClient)
    if (bytes > (input.scope === 'shared' ? 8 : policy.maxTemplateMB) * 1024 * 1024) throw new CrmError('Mẫu vượt dung lượng cho phép. Hãy giảm ảnh nhúng hoặc dùng ảnh HTTPS.')
    const prior = input.id ? await readLibraryTemplate(tx as PrismaClient, actor, input.id, true) : null
    if (prior && (prior.template.updatedAt !== input.expectedUpdatedAt || prior.template.scope !== input.scope)) throw new CrmError('Mẫu đã thay đổi hoặc khác kho lưu. Tải lại hoặc lưu thành mẫu mới.', 409)
    const templates = input.scope === 'private' ? (await listLibrary(tx as PrismaClient, actor)).filter(item => item.scope === 'private' && item.id !== input.id) : []
    if (input.scope === 'private' && (templates.length >= policy.maxPrivateTemplates || templates.reduce((sum, item) => sum + item.bytes, bytes) > policy.maxPrivateMB * 1024 * 1024)) throw new CrmError('Đã đạt hạn mức mẫu cá nhân hoặc tổng dung lượng. Xóa mẫu không dùng hoặc liên hệ admin.')
    const id = prior?.template.id || (input.scope === 'shared' ? 'shared:' : `private:${actor.id}:`) + randomUUID()
    const template = metaSchema.parse({ id, ownerId: prior?.template.ownerId ?? actor.id, name: input.name, description: input.description, scope: input.scope, published: input.scope === 'shared' && input.published, sourceType: input.sourceType, bytes, updatedAt: new Date(Math.max(Date.now(), prior ? Date.parse(prior.template.updatedAt) + 1 : 0)).toISOString() })
    for (const [key, value] of [[metaKey(id), sealLibrary(template, metaKey(id))], [sourceKey(id), sealLibrary(source, sourceKey(id))]] as const) await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })
    return template
  }, { timeout: 15000 })
}
export async function deleteLibraryTemplate(db: PrismaClient, actor: CourseEditor, id: string) {
  await readLibraryTemplate(db, actor, id, true)
  // Trang bán đã dùng mẫu giữ bản HTML riêng, không trỏ vào bản mẫu đang sửa/xóa.
  await db.systemConfig.deleteMany({ where: { key: { in: [metaKey(id), sourceKey(id)] } } })
}
