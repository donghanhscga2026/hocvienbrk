import { after } from 'next/server'
import { requestPushOrigin } from '@/lib/web-push-config'
import { processWebPush } from '@/lib/web-push-worker'
import { z } from 'zod'
import { notificationActor } from '@/lib/app-notifications'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { previewLessonAnnouncement, sendLessonAnnouncement } from '@/lib/lesson-announcements'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'
const parameters = z.object({ id: z.coerce.number().int().positive(), lessonId: z.string().min(1).max(128) })
const body = z.object({ id: z.string().uuid(), title: z.string().trim().min(1, 'Nhập nội dung thông báo.').max(500) }).strict()
type Context = { params: Promise<{ id: string; lessonId: string }> }
export async function GET(request: Request, context: Context) {
  try {
    const actor = await notificationActor()
    const p = parameters.parse(await context.params)
    return crmResponse(await previewLessonAnnouncement(actor,p.id,p.lessonId,requestPushOrigin(request)))
  } catch (error) { return crmFailure(error) }
}
export async function POST(request: Request, context: Context) {
  try {
    const actor = await notificationActor()
    const p = parameters.parse(await context.params)
    const data = body.parse(await crmBody(request,4096))
    const origin = requestPushOrigin(request)
    const result = await sendLessonAnnouncement(actor,p.id,p.lessonId,data.id,data.title,origin)
    if (result.pushDeviceCount > 0) after(async () => {
      try { await processWebPush({execute:true,origin}) } catch { console.error('Web Push: hàng đợi sẽ thử lại.') }
    })
    return crmResponse(result)
  } catch (error) { return crmFailure(error) }
}
