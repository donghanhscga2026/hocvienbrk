import { z } from 'zod'
import { getCrmActor } from '@/lib/crm/auth'
import { crmBody, crmFailure, crmResponse } from '@/lib/crm/http'
import { CrmError } from '@/lib/crm/service'
import { getBridgePanel, setBridgeKillSwitch } from '@/lib/care/bridge-store'
export const dynamic = 'force-dynamic'

/**
 * Panel "Kênh Zalo (Care Bridge)" trong CRM: trạng thái cầu nối, số đếm
 * theo trạng thái, hàng đợi lệnh và tin Zalo đến gần nhất — tất cả giới
 * hạn trong phạm vi khóa của người xem.
 */
export async function GET() {
  try {
    const actor = await getCrmActor()
    const panel = await getBridgePanel(actor)
    return crmResponse(panel)
  } catch (e) { return crmFailure(e) }
}

const patchSchema = z.object({
  killSwitch: z.boolean(),
}).strict()

/**
 * Công tắc tắt khẩn cấp toàn kênh Zalo — chỉ quản trị viên. Bật: lệnh
 * đang chờ chuyển sang bị giữ (HELD), bridge không lấy được lệnh nào;
 * tắt: lệnh bị giữ quay lại hàng chờ.
 */
export async function PATCH(request: Request) {
  try {
    const raw = await crmBody(request, 2000)
    const actor = await getCrmActor()
    if (actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên mới bật/tắt được công tắc khẩn cấp của kênh Zalo.', 403)
    const input = patchSchema.parse(raw)
    const { state, moved } = await setBridgeKillSwitch(input.killSwitch)
    return crmResponse({ killSwitch: state.killSwitch, moved })
  } catch (e) { return crmFailure(e) }
}
