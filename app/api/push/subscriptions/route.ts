import { z } from 'zod'
import { notificationActor } from '@/lib/app-notifications'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { requestPushOrigin } from '@/lib/web-push-config'
import { pushDeviceStatus, registerPushDevice, removePushDevice, subscriptionBody } from '@/lib/web-push-subscriptions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const id = z.string().regex(/^[a-f0-9]{64}$/)
export async function GET(request: Request) {
  try {
    const actor = await notificationActor()
    const value = new URL(request.url).searchParams.get('id')
    return crmResponse(await pushDeviceStatus(actor.id,requestPushOrigin(request),value ? id.parse(value) : null))
  } catch (error) { return crmFailure(error) }
}
export async function POST(request: Request) {
  try {
    const actor = await notificationActor()
    const data = subscriptionBody.parse(await crmBody(request,8192))
    return crmResponse(await registerPushDevice(actor.id,requestPushOrigin(request),data))
  } catch (error) { return crmFailure(error) }
}
export async function DELETE(request: Request) {
  try {
    const actor = await notificationActor()
    const data = z.object({ id }).strict().parse(await crmBody(request,512))
    return crmResponse(await removePushDevice(actor.id,requestPushOrigin(request),data.id))
  } catch (error) { return crmFailure(error) }
}
