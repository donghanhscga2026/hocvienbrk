import { createHmac } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { contactFields } from './validation'
import { CrmError } from './service'
import { ACCOUNT_SUPPORT_SOURCE } from './request-workflow'

export const accountSupportInput = z.object({ key: z.uuid(), name: z.string().trim().min(1).max(150), email: z.string().max(254).default(''), phone: z.string().max(40).default(''), content: z.string().trim().min(10, 'Mô tả vấn đề ít nhất 10 ký tự.').max(4000), page: z.enum(['login', 'register']), consent: z.literal(true), website: z.string().max(100).default('') }).strict()
export async function createAccountSupport(db: PrismaClient, raw: unknown, address: string) {
  const input = accountSupportInput.parse(raw)
  if (input.website) return { received: true }
  const fields = contactFields.parse({ name: input.name, email: input.email, phone: input.phone, source: ACCOUNT_SUPPORT_SOURCE, needs: '', tags: [], ownerId: null, archived: false })
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new CrmError('Hỗ trợ chưa được cấu hình.', 503)
  const hash = (value: string) => createHmac('sha256', secret).update(value).digest('hex')
  const ipHash = hash('account-support:' + new Date().toISOString().slice(0, 10) + ':' + address)
  const key = hash('account-support:' + input.key + ':' + fields.email + ':' + fields.phone)
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420305)`
    if (await tx.crmRequest.findUnique({ where: { key } })) return
    const since = new Date(Date.now() - 3600000)
    if (await tx.crmRequest.count({ where: { ipHash, createdAt: { gte: since } } }) >= 3 || await tx.crmRequest.count({ where: { createdAt: { gte: since } } }) >= 1000) throw new CrmError('Đã gửi nhiều yêu cầu. Vui lòng thử lại sau.', 429)
    // Không ghép tài khoản bằng email tự khai và không lưu mật khẩu hay mã OTP.
    await tx.crmRequest.create({ data: { key, ipHash, name: fields.name, email: fields.email, phone: fields.phone, content: 'Trang gặp lỗi: ' + (input.page === 'login' ? 'Đăng nhập' : 'Đăng ký') + '\n' + input.content, source: ACCOUNT_SUPPORT_SOURCE, category: 'SUPPORT' } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
  return { received: true }
}
