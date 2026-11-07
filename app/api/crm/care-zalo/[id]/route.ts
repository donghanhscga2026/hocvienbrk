import { getCrmActor } from '@/lib/crm/auth'
import { crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { cancelZaloCommand } from '@/lib/care/bridge-store'
export const dynamic = 'force-dynamic'

/** Hủy tay 1 lệnh gửi Zalo đang chờ hoặc đang bị giữ (trong phạm vi actor). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCrmActor()
    const { id } = await params
    const value = Number(id)
    if (!Number.isInteger(value) || value <= 0) throw new CrmError('Mã lệnh gửi Zalo không hợp lệ.', 400)
    const result = await cancelZaloCommand(actor, value)
    return crmResponse(result)
  } catch (e) { return crmFailure(e) }
}
