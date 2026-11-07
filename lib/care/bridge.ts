import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Care Engine GĐ4 — luật thuần của kênh Zalo qua Care Bridge.
 *
 * Kiến trúc: website KHÔNG nhúng zca-js. Một tiến trình phụ riêng (Care
 * Bridge, chạy trên máy Windows của chủ hệ thống, giữ phiên nick Zalo
 * phụ) trao đổi với website qua API ký HMAC-SHA256:
 *   chữ ký = HMAC(secret, "<timestamp-ms>.<raw-body>")
 * gửi kèm header x-care-timestamp + x-care-signature, cửa sổ hiệu lực
 * 5 phút chống phát lại. File này chỉ chứa hàm thuần (không chạm DB)
 * để test độc lập bằng scripts/test-care-bridge.cjs; phần đọc/ghi DB
 * nằm ở lib/care/bridge-store.ts.
 */

export const CARE_BRIDGE_DAILY_LIMIT = 200
export const CARE_BRIDGE_SIGNATURE_WINDOW_MS = 5 * 60 * 1000
/** Nhịp tim quá 3 phút không thấy = coi như bridge đang ngoại tuyến. */
export const CARE_BRIDGE_ONLINE_WITHIN_MS = 3 * 60 * 1000

export type ZaloCommandStatus = 'QUEUED' | 'IN_FLIGHT' | 'SENT' | 'FAILED' | 'HELD' | 'CANCELLED'

export const ZALO_COMMAND_STATUSES: ZaloCommandStatus[] = ['QUEUED', 'IN_FLIGHT', 'SENT', 'FAILED', 'HELD', 'CANCELLED']

/** Sinh chữ ký HMAC-SHA256 cho 1 yêu cầu bridge (dùng ở cả 2 phía khi test). */
export function careBridgeSignature(secret: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
}

export type BridgeAuthFailure = 'missing' | 'expired' | 'mismatch'
export type BridgeAuthResult = { ok: true } | { ok: false; reason: BridgeAuthFailure }

/**
 * Xác thực chữ ký bridge: thiếu header → 'missing'; timestamp ngoài cửa
 * sổ 5 phút (quá khứ hoặc tương lai) → 'expired'; chữ ký sai → 'mismatch'.
 * So sánh bằng timingSafeEqual để tránh rò rỉ qua thời gian phản hồi.
 */
export function verifyCareBridgeSignature(input: {
  secret: string
  timestamp: string | null
  signature: string | null
  rawBody: string
  nowMs: number
}): BridgeAuthResult {
  const { secret, timestamp, signature, rawBody, nowMs } = input
  if (!timestamp || !signature) return { ok: false, reason: 'missing' }
  const ts = Number(timestamp)
  if (!Number.isInteger(ts) || ts <= 0) return { ok: false, reason: 'missing' }
  if (Math.abs(nowMs - ts) > CARE_BRIDGE_SIGNATURE_WINDOW_MS) return { ok: false, reason: 'expired' }
  const expected = careBridgeSignature(secret, timestamp, rawBody)
  const expectedBuf = Buffer.from(expected, 'utf8')
  const givenBuf = Buffer.from(signature, 'utf8')
  if (expectedBuf.length !== givenBuf.length) return { ok: false, reason: 'mismatch' }
  return timingSafeEqual(expectedBuf, givenBuf) ? { ok: true } : { ok: false, reason: 'mismatch' }
}

/**
 * Khóa chống trùng của 1 lệnh gửi Zalo: duy nhất theo luật/học viên/khóa/
 * ngày Việt Nam — cùng ngày chỉ sinh 1 lệnh cho 1 tín hiệu. Lệnh thử lại
 * sau khi FAILED dùng attempt > 1 để có khóa mới (hậu tố ":try<n>").
 */
export function buildZaloIdempotencyKey(input: {
  ruleId: string | null
  userId: number
  courseId: number | null
  vnDate: string
  attempt?: number
}): string {
  const base = `care-zalo:${input.ruleId || 'manual'}:${input.userId}:${input.courseId ?? 0}:${input.vnDate}`
  const attempt = input.attempt && input.attempt > 1 ? Math.floor(input.attempt) : 1
  return attempt > 1 ? `${base}:try${attempt}` : base
}

/**
 * Luật chuyển trạng thái lệnh gửi Zalo:
 * - QUEUED → IN_FLIGHT (bridge nhận việc) / HELD (bật tắt khẩn cấp) / CANCELLED
 * - HELD → QUEUED (tắt công tắc khẩn cấp) / CANCELLED
 * - IN_FLIGHT → SENT / FAILED (bridge báo kết quả) / QUEUED (trả lại hàng đợi) / CANCELLED
 * - SENT, FAILED, CANCELLED là trạng thái cuối — không chuyển đi đâu nữa.
 */
const COMMAND_TRANSITIONS: Record<ZaloCommandStatus, ZaloCommandStatus[]> = {
  QUEUED: ['IN_FLIGHT', 'HELD', 'CANCELLED'],
  HELD: ['QUEUED', 'CANCELLED'],
  IN_FLIGHT: ['SENT', 'FAILED', 'QUEUED', 'CANCELLED'],
  SENT: [],
  FAILED: [],
  CANCELLED: [],
}

export function canTransitionCommand(from: ZaloCommandStatus, to: ZaloCommandStatus): boolean {
  return (COMMAND_TRANSITIONS[from] ?? []).includes(to)
}

export type ClaimHoldReason = 'kill-switch' | 'daily-cap'
export interface ClaimDecision {
  held: boolean
  reason: ClaimHoldReason | null
  /** Số lệnh tối đa bridge được lấy ở lượt này. */
  allowed: number
}

/**
 * Quyết định 1 lượt bridge đến lấy lệnh: công tắc tắt khẩn cấp đang bật
 * → giữ toàn bộ; số lệnh đã gửi/đang gửi hôm nay chạm trần ngày → giữ;
 * còn lại được lấy tối đa min(limit yêu cầu, phần trần còn lại).
 */
export function decideClaim(input: {
  killSwitch: boolean
  sentOrInFlightToday: number
  requestedLimit: number
  dailyLimit?: number
}): ClaimDecision {
  if (input.killSwitch) return { held: true, reason: 'kill-switch', allowed: 0 }
  const limit = input.dailyLimit && input.dailyLimit > 0 ? Math.floor(input.dailyLimit) : CARE_BRIDGE_DAILY_LIMIT
  const remaining = limit - Math.max(0, Math.floor(input.sentOrInFlightToday))
  if (remaining <= 0) return { held: true, reason: 'daily-cap', allowed: 0 }
  const requested = Number.isFinite(input.requestedLimit) ? Math.max(1, Math.floor(input.requestedLimit)) : 1
  return { held: false, reason: null, allowed: Math.min(requested, remaining) }
}

/** Bridge còn "trực tuyến" nếu nhịp tim gần nhất trong khoảng cho phép. */
export function isBridgeOnline(lastHeartbeatAt: Date | string | null, now: Date, withinMs = CARE_BRIDGE_ONLINE_WITHIN_MS): boolean {
  if (!lastHeartbeatAt) return false
  const at = lastHeartbeatAt instanceof Date ? lastHeartbeatAt.getTime() : new Date(lastHeartbeatAt).getTime()
  if (!Number.isFinite(at)) return false
  return now.getTime() - at <= withinMs && at <= now.getTime() + 60_000
}
