import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { notificationActor } from '@/lib/app-notifications'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { requireDomainCourse, requireDomainModule } from '@/lib/website/domain-context'
import { changeQuote, confirmQuotePayment, getQuote, quoteRequest, saveQuote } from '@/lib/offerings/quotes'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['SAVE', 'SEND']), version: z.number().int().nonnegative(), draft: z.unknown() }).strict(),
  z.object({ action: z.literal('ACCEPT'), version: z.number().int().positive(), consent: z.literal(true) }).strict(),
  z.object({ action: z.literal('WITHDRAW'), version: z.number().int().positive() }).strict(),
  z.object({ action: z.literal('REPORT'), version: z.number().int().positive(), index: z.number().int().min(0).max(5) }).strict(),
  z.object({ action: z.literal('CONFIRM'), index: z.number().int().min(0).max(5), receipt: z.string().trim().min(6).max(120), consent: z.literal(true) }).strict(),
])
type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, context: Context) {
  try {
    await requireDomainModule('crm')
    const id = z.uuid().parse((await context.params).id)
    const staff = new URL(request.url).searchParams.get('staff') === '1'
    const actor = staff ? await getCrmActor() : await notificationActor()
    const row = await quoteRequest(prisma, id, actor, staff)
    await requireDomainCourse(row.courseId!)
    return crmResponse(await getQuote(prisma, id, actor, staff))
  } catch (error) { return crmFailure(error) }
}
export async function POST(request: Request, context: Context) {
  try {
    await requireDomainModule('crm')
    const input = schema.parse(await crmBody(request, 24000))
    const id = z.uuid().parse((await context.params).id)
    const staff = ['SAVE', 'SEND', 'WITHDRAW', 'CONFIRM'].includes(input.action)
    const actor = staff ? await getCrmActor() : await notificationActor()
    const row = await quoteRequest(prisma, id, actor, staff)
    await requireDomainCourse(row.courseId!)
    if (input.action === 'SAVE' || input.action === 'SEND') return crmResponse(await saveQuote(prisma, await getCrmActor(), id, input.version, input.draft, input.action === 'SEND'))
    if (input.action === 'CONFIRM') return crmResponse(await confirmQuotePayment(prisma, { requestId: id, index: input.index, actor: await getCrmActor(), receipt: input.receipt }))
    if (input.action === 'ACCEPT' || input.action === 'WITHDRAW' || input.action === 'REPORT') return crmResponse(await changeQuote(prisma, actor, id, input.version, input.action, staff, input.action === 'REPORT' ? input.index : 0))
    return crmResponse({ error: 'Thao tác không hợp lệ.' }, 400)
  } catch (error) { return crmFailure(error) }
}
