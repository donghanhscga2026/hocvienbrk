import { createHmac } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { contactFields } from '@/lib/crm/validation'
import { CrmError } from '@/lib/crm/service'

export const PARTNER_SOURCE = 'Wi300: Đăng ký đối tác'
export const partnerInput = z.object({
  key: z.uuid(), kind: z.enum(['TEACHER', 'BUSINESS', 'BOTH']),
  phone: z.string().trim().min(1, 'Vui lòng nhập số điện thoại liên hệ.').max(40),
  organization: z.string().trim().max(150),
  expertise: z.string().trim().min(3, 'Vui lòng giới thiệu chuyên môn hoặc lĩnh vực.').max(1000),
  proposal: z.string().trim().min(10, 'Vui lòng mô tả nội dung dự kiến hợp tác.').max(2000),
  portfolio: z.union([z.literal(''), z.url().max(500).refine(value => new URL(value).protocol === 'https:', 'Đường dẫn hồ sơ phải bắt đầu bằng https://.')]),
  consent: z.literal(true, { error: 'Vui lòng đồng ý để ban điều phối liên hệ.' }),
}).strict().refine(value => value.kind === 'TEACHER' || value.organization.length > 0, { path: ['organization'], message: 'Vui lòng nhập tên doanh nghiệp.' })

export async function readPartnerRequests(db: PrismaClient, userId: number, page: number) {
  const where = { userId, source: PARTNER_SOURCE }
  const [requests, total] = await Promise.all([
    db.crmRequest.findMany({ where, select: { id: true, content: true, status: true, publicReply: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }),
    db.crmRequest.count({ where }),
  ])
  return { requests, total }
}

export async function createPartnerRequest(db: PrismaClient, raw: unknown, userId: number, address: string) {
  const input = partnerInput.parse(raw)
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) throw new CrmError('Form chưa được cấu hình.', 503)
  const hash = (value: string) => createHmac('sha256', secret).update(value).digest('hex')
  const key = hash(`wi300-partner:${userId}:${input.key}`)
  const ipHash = hash('request-rate:' + new Date().toISOString().slice(0, 10) + ':' + address)
  await db.$transaction(async tx => {
    // Share the intake lock with CRM to enforce its global request limit atomically.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420305)`
    const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
    if (!user) throw new CrmError('Vui lòng đăng nhập lại.', 401)
    const contact = contactFields.parse({ name: user.name || `Thành viên #${userId}`, email: user.email || '', phone: input.phone, source: PARTNER_SOURCE, needs: '', tags: [], ownerId: null, archived: false })
    if (await tx.crmRequest.findUnique({ where: { key } })) return
    const since = new Date(Date.now() - 3600000)
    if (await tx.crmRequest.count({ where: { userId, source: PARTNER_SOURCE, createdAt: { gte: since } } }) >= 3 || await tx.crmRequest.count({ where: { ipHash, createdAt: { gte: since } } }) >= 10 || await tx.crmRequest.count({ where: { createdAt: { gte: since } } }) >= 1000) throw new CrmError('Bạn đã gửi nhiều yêu cầu. Vui lòng chờ ban điều phối phản hồi hoặc thử lại sau.', 429)
    const kind = { TEACHER: 'Giảng viên', BUSINESS: 'Doanh nghiệp', BOTH: 'Giảng viên và doanh nghiệp' }[input.kind]
    const content = [`Đăng ký: ${kind}`, input.organization && `Doanh nghiệp: ${input.organization}`, `Chuyên môn / lĩnh vực: ${input.expertise}`, `Nội dung hợp tác: ${input.proposal}`, input.portfolio && `Hồ sơ tham khảo: ${input.portfolio}`, 'Đồng ý để ban điều phối liên hệ trực tiếp.'].filter(Boolean).join('\n')
    await tx.crmRequest.create({ data: { key, ipHash, userId, ownerId: null, category: 'CONSULTATION', source: PARTNER_SOURCE, content, name: contact.name, email: contact.email, phone: contact.phone } })
    // This is a consultation request; granting roles stays in the existing admin flow.
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
  return { received: true }
}
