import { z } from 'zod'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { careScopeCourseIds } from '@/lib/care/queue'
import { compileCourseBrain, getBrainStats } from '@/lib/care/brain'
export const dynamic = 'force-dynamic'

const compileSchema = z.object({ courseId: z.number().int().positive() }).strict()

async function assertCourseInScope(actor: Awaited<ReturnType<typeof getCrmActor>>, courseId: number) {
  const scope = await careScopeCourseIds(actor)
  if (scope && !scope.includes(courseId)) {
    throw new CrmError('Khóa học nằm ngoài phạm vi phụ trách của bạn.', 403)
  }
}

/** Thống kê Second Brain của 1 khóa cho panel CRM (số bài, đoạn, transcript, Q&A, phiên bản). */
export async function GET(request: Request) {
  try {
    const actor = await getCrmActor()
    const courseId = Number(new URL(request.url).searchParams.get('courseId'))
    if (!Number.isInteger(courseId) || courseId <= 0) throw new CrmError('Thiếu mã khóa học hợp lệ.', 400)
    await assertCourseInScope(actor, courseId)
    const stats = await getBrainStats(courseId)
    return crmResponse({ courseId, stats })
  } catch (error) {
    return crmFailure(error)
  }
}

/** Biên dịch lại tri thức khóa: dựng lại chỉ mục BM25 + ghi vết phiên bản. */
export async function POST(request: Request) {
  try {
    const actor = await getCrmActor()
    const { courseId } = compileSchema.parse(await crmBody(request, 4096))
    await assertCourseInScope(actor, courseId)
    const stats = await compileCourseBrain(courseId, actor.id)
    return crmResponse({ courseId, stats })
  } catch (error) {
    return crmFailure(error)
  }
}
