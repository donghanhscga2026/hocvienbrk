import { getCrmActor } from '@/lib/crm/auth'
import { crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { cancelFollowUp } from '@/lib/care/followup-store'
export const dynamic = 'force-dynamic'

/** Hủy tay 1 hẹn theo dõi đang chờ (người đặt / GV của khóa / admin). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCrmActor()
    const { id } = await params
    const value = Number(id)
    if (!Number.isInteger(value) || value <= 0) throw new CrmError('Mã hẹn theo dõi không hợp lệ.', 400)
    const followUp = await cancelFollowUp(actor, value)
    return crmResponse({ followUp })
  } catch (e) { return crmFailure(e) }
}
