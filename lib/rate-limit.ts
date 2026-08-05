/**
 * Rate limiter đơn giản, lưu trong bộ nhớ tiến trình (in-memory).
 *
 * LƯU Ý: Ứng dụng chạy trên Vercel serverless — mỗi request có thể được xử lý
 * bởi một instance khác nhau, nên bộ đếm này KHÔNG đảm bảo chính xác 100% giữa
 * các instance/cold start. Đây là lớp chặn "best-effort" để giảm rủi ro dò mật
 * khẩu/OTP hàng loạt so với việc hoàn toàn không giới hạn như hiện tại. Nếu cần
 * chặn chuẩn xác tuyệt đối, nên chuyển sang lưu trữ dùng chung (vd: Upstash Redis).
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Dọn định kỳ để tránh Map phình to vô hạn khi chạy lâu dài
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

export function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number }
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.max - 1, retryAfterMs: 0 }
  }

  if (existing.count >= options.max) {
    return { allowed: false, remaining: 0, retryAfterMs: existing.resetAt - now }
  }

  existing.count += 1
  return { allowed: true, remaining: options.max - existing.count, retryAfterMs: 0 }
}

export function getClientIp(req: Request): string {
  const headers = req.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}
