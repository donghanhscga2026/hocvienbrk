import { z } from 'zod'
import { authorizeBridgeRequest, bridgeJson, parseBridgeBody } from '@/lib/care/bridge-http'
import { reportCommand } from '@/lib/care/bridge-store'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  commandId: z.number().int().positive(),
  ok: z.boolean(),
  error: z.string().max(500).nullable().optional(),
  zaloUserId: z.string().max(100).nullable().optional(),
}).strict()

/**
 * Care Bridge báo kết quả gửi 1 lệnh (ký HMAC): IN_FLIGHT → SENT hoặc
 * FAILED. Kèm zaloUserId của người nhận (nếu bridge biết) để website
 * khớp hội thoại đến sau này về đúng học viên.
 */
export async function POST(request: Request) {
  const auth = await authorizeBridgeRequest(request)
  if (!auth.ok) return auth.response
  const raw = parseBridgeBody(auth.rawBody)
  if (!raw) return bridgeJson({ error: 'Nội dung JSON không hợp lệ.' }, 400)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return bridgeJson({ error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, 400)
  try {
    const result = await reportCommand({
      commandId: parsed.data.commandId,
      ok: parsed.data.ok,
      error: parsed.data.error ?? null,
      zaloUserId: parsed.data.zaloUserId ?? null,
    })
    return bridgeJson(result, result.applied ? 200 : 409)
  } catch (error) {
    console.error('[care-bridge report]', error instanceof Error ? error.name : 'Unknown error')
    return bridgeJson({ error: 'Không ghi nhận được kết quả lúc này.' }, 500)
  }
}
