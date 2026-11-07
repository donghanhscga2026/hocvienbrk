import { z } from 'zod'
import { authorizeBridgeRequest, bridgeJson, parseBridgeBody } from '@/lib/care/bridge-http'
import { recordBridgeHeartbeat } from '@/lib/care/bridge-store'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  version: z.string().max(50).nullable().optional(),
}).strict()

/**
 * Nhịp tim của Care Bridge (ký HMAC): website ghi mốc + phiên bản để
 * panel CRM hiện trạng thái trực tuyến, đồng thời trả lại killSwitch
 * để bridge tự biết khi kênh đang bị tắt khẩn cấp.
 */
export async function POST(request: Request) {
  const auth = await authorizeBridgeRequest(request)
  if (!auth.ok) return auth.response
  const raw = parseBridgeBody(auth.rawBody)
  if (!raw) return bridgeJson({ error: 'Nội dung JSON không hợp lệ.' }, 400)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return bridgeJson({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400)
  try {
    const state = await recordBridgeHeartbeat(parsed.data.version ?? null)
    return bridgeJson({ killSwitch: state.killSwitch, lastHeartbeatAt: state.lastHeartbeatAt })
  } catch (error) {
    console.error('[care-bridge heartbeat]', error instanceof Error ? error.name : 'Unknown error')
    return bridgeJson({ error: 'Không ghi được nhịp tim lúc này.' }, 500)
  }
}
