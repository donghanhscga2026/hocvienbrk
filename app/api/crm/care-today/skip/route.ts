import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { careScopeCourseIds } from '@/lib/care/queue'
import { careSkipKey, vnDateString } from '@/lib/care/rules'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  userId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  ruleId: z.enum(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']),
}).strict()

/** Bỏ qua 1 dòng hàng đợi trong hôm nay: ghi ActivityLog CARE_SKIP kèm khóa định danh. */
export async function POST(request: Request) {
  try {
    const raw = await crmBody(request, 4000)
    const actor = await getCrmActor()
    const input = bodySchema.parse(raw)
    const courseIds = await careScopeCourseIds(actor)
    if (courseIds && !courseIds.includes(input.courseId)) throw new CrmError('Khóa học không thuộc phạm vi phụ trách của bạn.', 403)

    const today = vnDateString(new Date())
    const key = careSkipKey(input.userId, input.courseId, input.ruleId, today)
    const existing = await prisma.activityLog.findFirst({ where: { action: 'CARE_SKIP', detail: key }, select: { id: true } })
    if (!existing) {
      await prisma.activityLog.create({
        data: {
          userId: actor.id,
          action: 'CARE_SKIP',
          detail: key,
          metadata: { studentUserId: input.userId, courseId: input.courseId, ruleId: input.ruleId, vnDate: today },
        },
      })
    }
    return crmResponse({ skipped: true, status: 'skipped' })
  } catch (e) { return crmFailure(e) }
}
