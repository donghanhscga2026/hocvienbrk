import { z } from 'zod'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { notificationActor, readNotifications, markNotifications } from '@/lib/app-notifications'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const query = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict().parse(Object.fromEntries(new URL(request.url).searchParams))
    return crmResponse(await readNotifications(await notificationActor(), query.page))
  } catch (error) { return crmFailure(error) }
}
export async function PATCH(request: Request) {
  try {
    const body = z.union([z.object({ all: z.literal(true) }).strict(), z.object({ ids: z.array(z.uuid()).min(1).max(50) }).strict()]).parse(await crmBody(request, 5000))
    return crmResponse(await markNotifications(await notificationActor(), 'all' in body ? null : body.ids))
  } catch (error) { return crmFailure(error) }
}
