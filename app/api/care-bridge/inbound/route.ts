import { z } from 'zod'
import { authorizeBridgeRequest, bridgeJson, parseBridgeBody } from '@/lib/care/bridge-http'
import { receiveInbound } from '@/lib/care/bridge-store'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  zaloMsgId: z.string().min(1).max(200),
  zaloUserId: z.string().min(1).max(100),
  text: z.string().min(1).max(4000),
  phone: z.string().max(30).nullable().optional(),
}).strict()

/**
 * Care Bridge đẩy tin Zalo đến (ký HMAC): chống trùng theo zaloMsgId,
 * khớp học viên theo số điện thoại / lịch sử hội thoại / lệnh đã gửi,
 * rồi tạo CrmRequest loại SUPPORT để giảng viên trả lời trong CRM.
 */
export async function POST(request: Request) {
  const auth = await authorizeBridgeRequest(request)
  if (!auth.ok) return auth.response
  const raw = parseBridgeBody(auth.rawBody)
  if (!raw) return bridgeJson({ error: 'Nội dung JSON không hợp lệ.' }, 400)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return bridgeJson({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400)
  try {
    const result = await receiveInbound({
      zaloMsgId: parsed.data.zaloMsgId,
      zaloUserId: parsed.data.zaloUserId,
      text: parsed.data.text,
      phone: parsed.data.phone ?? null,
    })
    return bridgeJson(result, result.duplicated ? 200 : 201)
  } catch (error) {
    console.error('[care-bridge inbound]', error instanceof Error ? error.name : 'Unknown error')
    return bridgeJson({ error: 'Không tiếp nhận được tin lúc này.' }, 500)
  }
}
