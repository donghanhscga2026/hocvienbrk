import { z } from 'zod'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { buildCareQueue, careScopeCourseIds } from '@/lib/care/queue'
import { createFollowUp, listFollowUps } from '@/lib/care/followup-store'
export const dynamic = 'force-dynamic'

const createSchema = z.object({
  studentId: z.number().int().positive(),
  courseId: z.number().int().positive().nullable().optional(),
  ruleId: z.enum(['R1', 'R2', 'R3', 'R4', 'R5', 'R6']).nullable().optional(),
  templateId: z.number().int().positive().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  days: z.union([z.literal(1), z.literal(3), z.literal(7)]),
}).strict()

/**
 * Hẹn giờ theo dõi Care Engine GĐ2: danh sách hẹn trong phạm vi actor.
 * ?withStudents=1 kèm danh sách học viên đang có trong hàng đợi cần chăm
 * để UI dựng ô chọn người khi đặt hẹn mới.
 */
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const followUps = await listFollowUps(actor)
    const url = new URL(request.url)
    let students: { userId: number; userName: string; courseId: number; courseName: string; ruleId: string }[] | undefined
    if (url.searchParams.get('withStudents') === '1') {
      const courseIds = await careScopeCourseIds(actor)
      const queue = await buildCareQueue(courseIds, new Date())
      const seen = new Set<string>()
      students = []
      for (const row of queue.rows) {
        const key = `${row.userId}:${row.courseId}`
        if (seen.has(key)) continue
        seen.add(key)
        students.push({ userId: row.userId, userName: row.userName, courseId: row.courseId, courseName: row.courseName, ruleId: row.ruleId })
      }
    }
    return crmResponse({ followUps, ...(students ? { students } : {}) })
  } catch (e) { return crmFailure(e) }
}

export async function POST(request: Request) {
  try {
    const raw = await crmBody(request, 4000)
    const actor = await getCrmActor()
    const input = createSchema.parse(raw)
    const followUp = await createFollowUp(actor, {
      studentId: input.studentId,
      courseId: input.courseId ?? null,
      ruleId: input.ruleId ?? null,
      templateId: input.templateId ?? null,
      note: input.note?.trim() ? input.note.trim() : null,
      days: input.days,
    })
    return crmResponse({ followUp }, 201)
  } catch (e) { return crmFailure(e) }
}
