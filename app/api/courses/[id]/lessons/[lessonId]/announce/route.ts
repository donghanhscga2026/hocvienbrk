import { z } from 'zod'
import { notificationActor } from '@/lib/app-notifications'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { previewLessonAnnouncement, sendLessonAnnouncement } from '@/lib/lesson-announcements'

export const dynamic = 'force-dynamic'
const parameters = z.object({ id: z.coerce.number().int().positive(), lessonId: z.string().min(1).max(128) })
const body = z.object({ id: z.string().uuid(), title: z.string().trim().min(1, 'Nhập nội dung thông báo.').max(500) }).strict()
type Context = { params: Promise<{ id: string; lessonId: string }> }
export async function GET(_request: Request, context: Context) {
  try {
    const actor = await notificationActor()
    const p = parameters.parse(await context.params)
    return crmResponse(await previewLessonAnnouncement(actor,p.id,p.lessonId))
  } catch (error) { return crmFailure(error) }
}
export async function POST(request: Request, context: Context) {
  try {
    const actor = await notificationActor()
    const p = parameters.parse(await context.params)
    const data = body.parse(await crmBody(request,4096))
    return crmResponse(await sendLessonAnnouncement(actor,p.id,p.lessonId,data.id,data.title))
  } catch (error) { return crmFailure(error) }
}
