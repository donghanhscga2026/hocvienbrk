import { NextResponse } from 'next/server'
import { verifyCareBridgeSignature } from './bridge'

/**
 * Xác thực yêu cầu từ Care Bridge cho các route /api/care-bridge/*:
 * - Chưa đặt env CARE_BRIDGE_SECRET → 503 mềm (kênh Zalo chưa cấu hình,
 *   không lộ lỗi hệ thống, không chặn các kênh chăm sóc khác).
 * - Thiếu/sai/hết hạn chữ ký HMAC → 401.
 * Trả về rawBody (chuỗi gốc đã ký) để route parse JSON từ đúng nội dung
 * đã xác thực — tuyệt đối không đọc body 2 lần theo 2 cách khác nhau.
 */
export async function authorizeBridgeRequest(
  request: Request,
): Promise<{ ok: true; rawBody: string } | { ok: false; response: NextResponse }> {
  const secret = process.env.CARE_BRIDGE_SECRET
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Kênh Zalo chưa được cấu hình trên máy chủ (thiếu CARE_BRIDGE_SECRET).' },
        { status: 503 },
      ),
    }
  }
  const rawBody = await request.text()
  const result = verifyCareBridgeSignature({
    secret,
    timestamp: request.headers.get('x-care-timestamp'),
    signature: request.headers.get('x-care-signature'),
    rawBody,
    nowMs: Date.now(),
  })
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Chữ ký Care Bridge không hợp lệ.', reason: result.reason },
        { status: 401 },
      ),
    }
  }
  return { ok: true, rawBody }
}

export function bridgeJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export function parseBridgeBody(rawBody: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}
