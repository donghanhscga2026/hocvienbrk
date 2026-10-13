import type { PrismaClient } from '@prisma/client'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { appearanceSchema, defaultAppearance } from './appearance'
import { CrmError } from '@/lib/crm/service'

export function appearanceKey(scope = process.env.SITE_PROFILE_KEY?.trim() || 'default', env: Record<string, string | undefined> = process.env) {
  const base = `wi300:appearance:v1:${encodeURIComponent(scope)}`
  return env.VERCEL_ENV === 'preview' ? `${base}:preview:${encodeURIComponent(env.VERCEL_GIT_COMMIT_REF || 'preview')}` : base
}
const stateSchema = z.object({ revision: z.number().int().min(0), published: appearanceSchema, draft: appearanceSchema, previous: appearanceSchema.nullable() }).strict()
export type AppearanceState = z.infer<typeof stateSchema>
const encryptedSchema = z.object({ version: z.literal(1), iv: z.string(), tag: z.string(), payload: z.string() }).strict()
function encryptionKey() {
  const secret = process.env.WI300_APPEARANCE_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 16) throw new CrmError('Máy chủ chưa có khóa bảo vệ cấu hình giao diện.', 503)
  return createHash('sha256').update(`wi300-appearance-v1:${secret}`).digest()
}
function decode(value: unknown, key: string): AppearanceState {
  const record = encryptedSchema.parse(value)
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(record.iv, 'base64'))
  decipher.setAAD(Buffer.from(key))
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
  const json = Buffer.concat([decipher.update(Buffer.from(record.payload, 'base64')), decipher.final()]).toString('utf8')
  return stateSchema.parse(JSON.parse(json))
}
function encode(state: AppearanceState, key: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(Buffer.from(key))
  const payload = Buffer.concat([cipher.update(JSON.stringify(state), 'utf8'), cipher.final()])
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), payload: payload.toString('base64') }
}
export async function readAppearance(db: PrismaClient, key = appearanceKey()): Promise<AppearanceState> {
  const row = await db.systemConfig.findUnique({ where: { key }, select: { value: true } })
  if (row) return decode(row.value, key)
  // Preview bắt đầu từ giao diện đang chạy, nhưng mọi ghi đều vào khóa riêng của nhánh.
  if (key.includes(':preview:')) {
    const live = await db.systemConfig.findUnique({ where: { key: key.split(':preview:')[0] }, select: { value: true } })
    if (live) {
      const { published } = decode(live.value, key.split(':preview:')[0])
      return { revision: 0, published, draft: structuredClone(published), previous: null }
    }
  }
  return { revision: 0, published: structuredClone(defaultAppearance), draft: structuredClone(defaultAppearance), previous: null }
}
export async function appearanceAdmin(db: PrismaClient, id: number) {
  if (!Number.isSafeInteger(id) || id < 0) throw new CrmError('Vui lòng đăng nhập.', 401)
  const actor = await db.user.findUnique({ where: { id }, select: { role: true } })
  if (!actor) throw new CrmError('Vui lòng đăng nhập lại.', 401)
  if (actor.role !== 'ADMIN') throw new CrmError('Chỉ admin được chỉnh giao diện.', 403)
}
export async function saveAppearance(db: PrismaClient, id: number, raw: unknown, key = appearanceKey()): Promise<AppearanceState> {
  const input = z.object({ action: z.enum(['draft', 'publish', 'restore']), revision: z.number().int().min(0), settings: appearanceSchema.optional() }).strict().parse(raw)
  if (input.action !== 'restore' && !input.settings) throw new CrmError('Thiếu cài đặt giao diện.')
  return db.$transaction(async tx => {
    // Serialize cả bản nháp và publish, kiểm tra quyền mới nhất trong transaction.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
    await appearanceAdmin(tx as PrismaClient, id)
    const current = await readAppearance(tx as PrismaClient, key)
    if (input.revision !== current.revision) throw new CrmError('Cài đặt đã được người khác sửa. Tải lại trước khi lưu.', 409)
    if (input.action === 'restore' && !current.previous) throw new CrmError('Chưa có bản trước để khôi phục.')
    const settings = input.action === 'restore' ? current.previous! : input.settings!
    const value = { revision: current.revision + 1, draft: settings, published: input.action === 'publish' ? settings : current.published, previous: input.action === 'publish' ? current.published : current.previous }
    // Bảng SystemConfig có thể có quyền Data API rộng; không lưu draft bằng plaintext.
    const encrypted = encode(value, key)
    await tx.systemConfig.upsert({ where: { key }, create: { key, value: encrypted }, update: { value: encrypted } })
    return value
  }, { timeout: 15000 })
}
