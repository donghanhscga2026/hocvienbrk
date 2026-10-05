import { createHmac } from 'node:crypto'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { crmBody, crmResponse } from '@/lib/crm/http'
import { websiteFailure } from '@/lib/website/http'
import { CrmError } from '@/lib/crm/service'
import { intakeInput } from '@/lib/crm/intake'
import { contactFields } from '@/lib/crm/validation'
import { parseDocument, walkNodes } from '@/lib/website/document'
import { canUseCrm } from '@/lib/crm/shared'
import { activeDomain } from '@/lib/website/domains'
import { requestHostname, isPlatformHost } from '@/lib/website/domain-shared'

const schema = intakeInput.extend({ page: z.string().max(80), node: z.string().max(80) })
export async function POST(request: Request) {
  try {
    const input = schema.parse(await crmBody(request, 14000))
    const hostname=requestHostname(request.headers.get('host') || '')
    if(!isPlatformHost(hostname)) { const domain=await activeDomain(hostname); if(!domain?.crm || domain.profile.slug!==input.slug) throw new CrmError('Form không thuộc website này.',403) }
    if(input.website) return crmResponse({ received: true })
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
    if(!secret) throw new CrmError('Form chưa được cấu hình.',503)
    const hash = (s: string) => createHmac('sha256',secret).update(s).digest('hex')
    const day = new Date().toISOString().slice(0,10)
    const ipHash = hash('website-rate:' + day + ':' + (request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'))
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420303)`
      const profile = await tx.siteProfile.findUnique({ where: { slug: input.slug }, include: { website: true, user: { select: { role: true } } } })
      const published = profile?.website?.published
      if(!profile?.isActive || profile.userId == null || !published || !profile.user || !canUseCrm(profile.user.role)) throw new CrmError('Form chưa mở.',404)
      const page = parseDocument(published).pages.find(p => p.slug === input.page)
      if(!page || !walkNodes(page.nodes).some(n => n.id === input.node && n.kind === 'form')) throw new CrmError('Form chưa mở.',404)
      const since = new Date(Date.now()-3600000)
      const [local, global] = await Promise.all([tx.crmRequest.count({ where: { ipHash, createdAt: { gte: since } } }), tx.crmRequest.count({ where: { source: { startsWith: 'Website:' }, createdAt: { gte: since } } })])
      if(local >= 10 || global >= 1000) throw new CrmError('Có quá nhiều yêu cầu. Vui lòng thử lại sau.',429)
      const fields = contactFields.parse({ name: input.name, email: input.email, phone: input.phone, source: ('Website:' + input.slug).slice(0,100), needs: '', tags: [], ownerId: profile.userId, archived: false })
      const key = hash('website-lead:' + day + ':' + profile.id + ':' + fields.email + ':' + fields.phone + ':' + input.message)
      if(await tx.crmRequest.findUnique({ where: { key } })) return
      const found = await tx.crmContact.findMany({ where: { OR: [...(fields.email ? [{ email: { equals: fields.email, mode: 'insensitive' as const } }] : []), ...(fields.phone ? [{ phone: fields.phone }] : [])] } })
      // Never link another owner's contact or overwrite a conflicting identity.
      const same = found.length === 1 && found[0].ownerId === profile.userId && !found[0].archived && (!fields.email || found[0].email === fields.email) && (!fields.phone || found[0].phone === fields.phone)
      const contact = same ? found[0] : found.length ? null : await tx.crmContact.create({ data: { ...fields, createdBy: profile.userId } })
      await tx.crmRequest.create({ data: { key, ipHash, ownerId: profile.userId, contactId: contact?.id, category: 'CONSULTATION', name: fields.name, email: fields.email, phone: fields.phone, content: input.message || 'Đăng ký tư vấn từ website', source: ('Website:' + input.slug + '/' + input.page).slice(0,200) } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 })
    return crmResponse({ received: true })
  } catch(e) { return websiteFailure(e) }
}
