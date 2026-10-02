import { z } from 'zod'
import prisma from '@/lib/prisma'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { notificationActor } from '@/lib/app-notifications'
import { CrmError } from '@/lib/crm/service'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const actor = await notificationActor()
    const query = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), request: z.uuid().optional() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams))
    const where = { userId: actor.id, ...(query.request ? { id: query.request } : {}) }
    // Chỉ trả lời công khai; không gửi resolution/history/email/phone của CRM.
    const [requests, total] = await prisma.$transaction([
      prisma.crmRequest.findMany({ where, select: { id: true, content: true, publicReply: true, category: true, status: true, version: true, createdAt: true, updatedAt: true, lessonId: true, course: { select: { name_lop: true, id_khoa: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, skip: (query.page - 1) * 20 }),
      prisma.crmRequest.count({ where }),
    ])
    return crmResponse({ requests, total })
  } catch (error) { return crmFailure(error) }
}
export async function PATCH(request: Request) {
  try {
    const actor = await notificationActor()
    const body = z.object({ id: z.uuid(), version: z.number().int().positive() }).strict().parse(await crmBody(request, 2000))
    const row = await prisma.crmRequest.findFirst({ where: { id: body.id, version: body.version, userId: actor.id, status: 'RESOLVED' } })
    if (!row) throw new CrmError('Yêu cầu đã thay đổi hoặc không thể mở lại. Hãy tải lại.', 409)
    const history = Array.isArray(row.history) ? row.history : []
    const result = await prisma.crmRequest.updateMany({ where: { id: body.id, version: body.version, userId: actor.id, status: 'RESOLVED' }, data: { status: 'NEW', version: { increment: 1 }, history: [...history, { action: 'STUDENT_REOPENED', changedBy: actor.id, changedAt: new Date().toISOString() }] } })
    if (!result.count) throw new CrmError('Yêu cầu đã thay đổi. Hãy tải lại.', 409)
    return crmResponse({ updated: true })
  } catch (error) { return crmFailure(error) }
}
