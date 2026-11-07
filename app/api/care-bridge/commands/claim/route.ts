import { z } from 'zod'
import { authorizeBridgeRequest, bridgeJson, parseBridgeBody } from '@/lib/care/bridge-http'
import { claimCommands } from '@/lib/care/bridge-store'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
}).strict()

/**
 * Care Bridge đến lấy lệnh gửi Zalo (ký HMAC). Công tắc tắt khẩn cấp
 * đang bật hoặc đã chạm trần ngày → trả held=true và danh sách rỗng,
 * bridge chỉ chờ rồi hỏi lại sau.
 */
export async function POST(request: Request) {
  const auth = await authorizeBridgeRequest(request)
  if (!auth.ok) return auth.response
  const raw = parseBridgeBody(auth.rawBody)
  if (!raw) return bridgeJson({ error: 'Nội dung JSON không hợp lệ.' }, 400)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return bridgeJson({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400)
  try {
    const result = await claimCommands(parsed.data.limit ?? 10)
    return bridgeJson(result)
  } catch (error) {
    console.error('[care-bridge claim]', error instanceof Error ? error.name : 'Unknown error')
    return bridgeJson({ error: 'Không lấy được lệnh lúc này.' }, 500)
  }
}
