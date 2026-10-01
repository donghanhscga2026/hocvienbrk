import { createHmac } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { contactFields } from './validation'
import { identityConflict } from './phase-two'
import { CrmError } from './service'

export const intakeInput = z.object({
  slug: z.string().trim().min(1).max(150), name: z.string().trim().min(1).max(150),
  email: z.string().max(254), phone: z.string().max(40), consent: z.literal(true),
  message: z.string().trim().max(4000).default(''),
  website: z.string().max(100).default(''),
  utmSource: z.string().trim().max(100).default(''), utmCampaign: z.string().trim().max(100).default(''),
  referral: z.string().trim().max(100).default(''),
}).strict()
export async function captureLead(db: PrismaClient, raw: unknown, address: string) {
  const input = intakeInput.parse(raw)
  // Honeypot submissions receive the same generic response without writing anything.
  if (input.website) return { received: true }
  const keySecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!keySecret) throw new CrmError('Form chưa được cấu hình.', 503)
  const hash = (value: string) => createHmac('sha256', keySecret).update(value).digest('hex')
  const data = contactFields.parse({ name: input.name, email: input.email, phone: input.phone, source: ('Landing page: ' + input.slug).slice(0, 100), needs: '', tags: [], ownerId: null, archived: false })
  const key = hash('intake:' + input.slug + ':' + (data.email || '') + ':' + (data.phone || '') + (input.message ? ':message:' + input.message : ''))
  const ipHash = hash('rate:' + new Date().toISOString().slice(0, 10) + ':' + address)
  await db.$transaction(async tx => {
    // One transaction-level lock bounds global + per-address volume across instances.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420302)`
    const landing = await tx.landingPage.findFirst({ where: { slug: input.slug, isActive: true } })
    const config = landing?.config
    if (!landing || !config || typeof config !== 'object' || Array.isArray(config) || config.crmCapture !== true) throw new CrmError('Form chưa mở đăng ký.', 404)
    const since = new Date(Date.now() - 3600000)
    const [local, global] = await Promise.all([
      tx.crmSubmission.count({ where: { ipHash, createdAt: { gte: since } } }),
      tx.crmSubmission.count({ where: { createdAt: { gte: since } } }),
    ])
    if (local >= 10 || global >= 1000) throw new CrmError('Có quá nhiều yêu cầu. Vui lòng thử lại sau.', 429)
    if (await tx.crmSubmission.findUnique({ where: { key } })) return
    const found = await tx.crmContact.findMany({ where: { OR: [
      ...(data.email ? [{ email: { equals: data.email, mode: 'insensitive' as const } }] : []), ...(data.phone ? [{ phone: data.phone }] : []),
    ] } })
    const conflict = found.length > 1 || !!(found[0] && (identityConflict(found[0], data) || found[0].archived))
    const contact = conflict ? null : found[0] || await tx.crmContact.create({ data: { ...data, createdBy: -1 } })
    // Public inputs never link login accounts, transfer ownership or overwrite identities.
    const submission = await tx.crmSubmission.create({ data: { key, ipHash, landingId: landing.id, contactId: contact?.id, status: conflict ? 'CONFLICT' : 'RECEIVED', data: { name: data.name, email: data.email || '', phone: data.phone || '', utmSource: input.utmSource, utmCampaign: input.utmCampaign, referral: input.referral, message: input.message, consent: true } } })
    if (input.message) await tx.crmRequest.create({ data: { key: hash('landing-request:' + key), ipHash, contactId: contact?.id, category: 'CONSULTATION', content: input.message, name: data.name, email: data.email, phone: data.phone, source: ('Landing page: ' + input.slug).slice(0, 200) } })
    if (contact) await tx.crmActivity.create({ data: { contactId: contact.id, type: 'FORM', authorId: -1, authorName: 'Form website', content: 'Đăng ký tại ' + landing.title + ' (yêu cầu #' + submission.id + '). Nguồn UTM: ' + input.utmSource + '; chiến dịch: ' + input.utmCampaign + '; mã giới thiệu tự khai: ' + input.referral } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
  // Do not expose existence, customer identifiers or conflict status to anonymous callers.
  return { received: true }
}
