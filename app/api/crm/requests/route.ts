import { z } from 'zod'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { createRequest, readRequests, requestSource, updateRequest } from '@/lib/crm/requests'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const params = new URL(request.url).searchParams
    if (params.has('sourceId')) return crmResponse(await requestSource(prisma, actor, z.uuid().parse(params.get('sourceId'))))
    const q = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED']).optional(), request: z.uuid().optional(), contactId: z.coerce.number().int().positive().optional() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams))
    return crmResponse(await readRequests(prisma, actor, q.page, q.status, q.contactId, q.request))
  } catch (e) { return crmFailure(e) }
}
export async function POST(request: Request) {
  try {
    const raw = await crmBody(request, 20000)
    const session = await auth()
    const userId = session?.user?.id == null ? null : Number(session.user.id)
    const result = await createRequest(prisma, raw, userId != null && Number.isInteger(userId) && userId >= 0 ? userId : null, request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown')
    return crmResponse(result, 201)
  } catch (e) { return crmFailure(e) }
}
export async function PATCH(request: Request) {
  try { const raw = await crmBody(request, 20000); return crmResponse(await updateRequest(prisma, await getCrmActor(), raw)) }
  catch (e) { return crmFailure(e) }
}
