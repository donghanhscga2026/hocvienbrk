import { getCrmActor } from '@/lib/crm/auth'
import { crmFailure, crmResponse } from '@/lib/crm/http'
import { buildCareQueue, careScopeCourseIds } from '@/lib/care/queue'

export const dynamic = 'force-dynamic'

/** Hàng đợi "Cần chăm hôm nay" trong phạm vi actor (admin = tất cả, giảng viên = khóa của mình). */
export async function GET() {
  try {
    const actor = await getCrmActor()
    const courseIds = await careScopeCourseIds(actor)
    return crmResponse(await buildCareQueue(courseIds))
  } catch (e) { return crmFailure(e) }
}
