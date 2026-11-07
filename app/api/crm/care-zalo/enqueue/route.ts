import { z } from 'zod'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { buildCareQueue, careScopeCourseIds, countCareToday } from '@/lib/care/queue'
import { CARE_BRIDGE_DAILY_LIMIT } from '@/lib/care/bridge'
import { countZaloToday, countZaloTodayForStudent, enqueueZaloCommand } from '@/lib/care/bridge-store'
import { bumpTemplateUsedCount, getTemplateForSend } from '@/lib/care/templates-store'
import { renderCareLibraryTemplate } from '@/lib/care/templates-lib'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  userId: z.number().int().positive(),
  courseId: z.number().int().positive(),
  ruleId: z.enum(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']),
  templateId: z.number().int().positive().optional(),
}).strict()

/**
 * Xếp 1 lệnh gửi nhắc qua Zalo cho đúng 1 dòng hàng đợi cần chăm: tính
 * lại tín hiệu ở server như đường gửi nhắc trong app, khắt khe hơn ở 2
 * điểm — luật R5 là việc phía giảng viên (không gửi Zalo cho học viên)
 * và dòng đang có người thật xử lý (takeover) thì kênh Zalo không chen
 * vào. Trần 1 nhắc/ngày tính liên kênh: đã nhắc trong app hoặc đã có
 * lệnh Zalo hôm nay đều chặn.
 */
export async function POST(request: Request) {
  try {
    const raw = await crmBody(request, 4000)
    const actor = await getCrmActor()
    const input = bodySchema.parse(raw)
    if (input.ruleId === 'R5') throw new CrmError('Luật R5 là việc phía giảng viên — không gửi Zalo cho học viên.', 400)
    const courseIds = await careScopeCourseIds(actor)
    if (courseIds && !courseIds.includes(input.courseId)) throw new CrmError('Khóa học không thuộc phạm vi phụ trách của bạn.', 403)

    const now = new Date()
    const queue = await buildCareQueue([input.courseId], now)
    const row = queue.rows.find((r) => r.userId === input.userId && r.courseId === input.courseId && r.ruleId === input.ruleId)
    if (!row) throw new CrmError('Tín hiệu chăm sóc này không còn hiệu lực. Hãy tải lại hàng đợi.', 409)
    if (row.status === 'reminded') throw new CrmError('Học viên đã được nhắc hôm nay — trần 1 nhắc/ngày tính cả kênh Zalo.', 409)
    if (row.status === 'capped') throw new CrmError('Học viên đã nhận 1 nhắc chăm sóc hôm nay (trần 1 nhắc/ngày).', 409)
    if (row.status === 'skipped') throw new CrmError('Dòng này đã được bỏ qua hôm nay.', 409)
    if (row.status === 'takeover') throw new CrmError('Đang có người thật xử lý học viên này — kênh Zalo tạm dừng để không chen vào.', 409)

    const [zaloToday, careToday, zaloTotalToday] = await Promise.all([
      countZaloTodayForStudent(row.userId, now),
      countCareToday(row.userId, now),
      countZaloToday(now),
    ])
    if (zaloToday > 0) throw new CrmError('Học viên đã có lệnh gửi Zalo hôm nay.', 409)
    if (careToday > 0) throw new CrmError('Học viên đã được nhắc trong app hôm nay — trần 1 nhắc/ngày tính liên kênh.', 409)
    if (zaloTotalToday >= CARE_BRIDGE_DAILY_LIMIT) throw new CrmError('Kênh Zalo đã chạm trần ' + CARE_BRIDGE_DAILY_LIMIT + ' lệnh hôm nay.', 409)

    let body = row.message
    if (input.templateId) {
      const template = await getTemplateForSend(actor, input.templateId)
      if (template.scope === 'COURSE' && template.courseId !== input.courseId) {
        throw new CrmError('Câu mẫu theo khóa chỉ dùng được cho đúng khóa của mẫu.', 400)
      }
      body = renderCareLibraryTemplate(template.body, row.templateVars)
    }
    const result = await enqueueZaloCommand({
      studentId: row.userId, courseId: row.courseId, ruleId: row.ruleId, body, createdById: actor.id,
    }, now)
    if (!result.created) throw new CrmError('Tín hiệu này đã có lệnh gửi Zalo hôm nay.', 409)
    if (input.templateId) await bumpTemplateUsedCount(input.templateId)
    return crmResponse({ queued: true, commandId: result.commandId }, 201)
  } catch (e) { return crmFailure(e) }
}
