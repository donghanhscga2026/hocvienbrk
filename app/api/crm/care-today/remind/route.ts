import { z } from 'zod'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { buildCareQueue, careScopeCourseIds, countCareToday } from '@/lib/care/queue'
import { sendCareReminder } from '@/lib/care/runner'
import { bumpTemplateUsedCount, getTemplateForSend } from '@/lib/care/templates-store'
import { renderCareLibraryTemplate } from '@/lib/care/templates-lib'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  userId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  ruleId: z.enum(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']),
  // GĐ2: chọn câu mẫu từ thư viện dùng chung — nội dung được render ở
  // server từ mẫu + biến thật của học viên, không tin nội dung client.
  templateId: z.number().int().positive().optional(),
}).strict()

/**
 * Gửi nhắc tay cho đúng 1 dòng hàng đợi: tính lại tín hiệu từ dữ liệu thật
 * ở server (không tin dữ liệu client), tôn trọng trần 1 nhắc care/ngày và
 * trạng thái đã nhắc / đã bỏ qua hôm nay.
 */
export async function POST(request: Request) {
  try {
    const raw = await crmBody(request, 4000)
    const actor = await getCrmActor()
    const input = bodySchema.parse(raw)
    const courseIds = await careScopeCourseIds(actor)
    if (courseIds && !courseIds.includes(input.courseId)) throw new CrmError('Khóa học không thuộc phạm vi phụ trách của bạn.', 403)

    const now = new Date()
    const queue = await buildCareQueue([input.courseId], now)
    const row = queue.rows.find((r) => r.userId === input.userId && r.courseId === input.courseId && r.ruleId === input.ruleId)
    if (!row) throw new CrmError('Tín hiệu chăm sóc này không còn hiệu lực. Hãy tải lại hàng đợi.', 409)
    if (row.status === 'reminded') throw new CrmError('Học viên đã được nhắc theo luật này hôm nay.', 409)
    if (row.status === 'skipped') throw new CrmError('Dòng này đã được bỏ qua hôm nay.', 409)
    if (row.status === 'capped') throw new CrmError('Học viên đã nhận 1 nhắc chăm sóc hôm nay (trần 1 nhắc/ngày).', 409)
    if (row.ruleId !== 'R5') {
      const alreadyToday = await countCareToday(row.userId, now)
      if (alreadyToday > 0) throw new CrmError('Học viên đã nhận 1 nhắc chăm sóc hôm nay (trần 1 nhắc/ngày).', 409)
    }
    let messageOverride: string | undefined
    if (input.templateId) {
      const template = await getTemplateForSend(actor, input.templateId)
      if (template.scope === 'COURSE' && template.courseId !== input.courseId) {
        throw new CrmError('Câu mẫu theo khóa chỉ dùng được cho đúng khóa của mẫu.', 400)
      }
      messageOverride = renderCareLibraryTemplate(template.body, row.templateVars)
    }
    const result = await sendCareReminder(row, now, messageOverride)
    if (!result.sent) throw new CrmError('Chưa gửi được nhắc. Có thể nhắc này vừa được gửi ở lượt khác.', 409)
    if (input.templateId) await bumpTemplateUsedCount(input.templateId)
    return crmResponse({ sent: true, status: 'reminded' })
  } catch (e) { return crmFailure(e) }
}
