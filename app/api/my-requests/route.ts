import { z } from 'zod'
import prisma from '@/lib/prisma'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { notificationActor } from '@/lib/app-notifications'
import { publicRequestThread, requestTopic } from '@/lib/crm/request-workflow'
import { CrmError } from '@/lib/crm/service'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const actor = await notificationActor()
    const query = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), request: z.uuid().optional() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams))
    const where = { userId: actor.id, ...(query.request ? { id: query.request } : {}) }
    // Chỉ trả lời công khai; không gửi resolution/history/email/phone của CRM.
    const [requests, total] = await prisma.$transaction([
      prisma.crmRequest.findMany({ where, select: { id: true, source: true, history: true, content: true, publicReply: true, category: true, status: true, version: true, createdAt: true, updatedAt: true, lessonId: true, course: { select: { name_lop: true, id_khoa: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, skip: (query.page - 1) * 20 }),
      prisma.crmRequest.count({ where }),
    ])
    return crmResponse({ requests: requests.map(({ history, ...row }) => ({ ...row, topic: requestTopic(row), thread: publicRequestThread(history) })), total })
  } catch (error) { return crmFailure(error) }
}
export async function PATCH(request: Request) {
  try {
    const actor = await notificationActor()
    const body = z.object({ id: z.uuid(), version: z.number().int().positive(), content: z.string().trim().min(1).max(4000).optional() }).strict().parse(await crmBody(request, 16000))
    const row = await prisma.crmRequest.findFirst({ where: { id: body.id, version: body.version, userId: actor.id, ...(!body.content ? { status: 'RESOLVED' } : {}) } })
    if (!row) throw new CrmError('Yêu cầu đã thay đổi hoặc không thể mở lại. Hãy tải lại.', 409)
    const history = Array.isArray(row.history) ? row.history : []
    if (body.content && publicRequestThread(history).filter(event => event.action === 'CUSTOMER_REPLY' && Date.now() - new Date(event.changedAt).getTime() < 3600000).length >= 10) throw new CrmError('Đã gửi nhiều phản hồi. Vui lòng thử lại sau.', 429)
    await prisma.$transaction(async tx => {
    const result = await tx.crmRequest.updateMany({ where: { id: body.id, version: body.version, userId: actor.id, ...(!body.content ? { status: 'RESOLVED' } : {}) }, data: { status: 'NEW', version: { increment: 1 }, history: [...history, { action: body.content ? 'CUSTOMER_REPLY' : 'STUDENT_REOPENED', ...(body.content ? { content: body.content } : {}), changedBy: actor.id, changedAt: new Date().toISOString() }] } })
      if (!result.count) throw new CrmError('Yêu cầu đã thay đổi. Hãy tải lại.', 409)
      if (body.content && row.status === 'NEW') {
        const owners = row.ownerId == null ? await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } }) : await tx.user.findMany({ where: { id: row.ownerId, role: { in: ['ADMIN', 'TEACHER', 'INSTRUCTOR'] } }, select: { id: true } })
        for (const owner of owners) await tx.appNotification.create({ data: { eventKey: 'request-customer-reply:' + row.id + ':' + (row.version + 1) + ':' + owner.id, recipientId: owner.id, kind: 'REQUEST_INCOMING', title: 'Khách đã bổ sung thông tin cho yêu cầu', courseId: row.courseId, requestId: row.id } })
      }
    })
    return crmResponse({ updated: true })
  } catch (error) { return crmFailure(error) }
}
