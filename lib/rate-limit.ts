import prisma from "@/lib/prisma"

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

function checkMemoryRateLimit(
  key: string,
  options: { max: number; windowMs: number }
): RateLimitResult {
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

/**
 * Distributed rate limiter backed by PostgreSQL.
 *
 * The database function performs the increment atomically, so all Vercel
 * instances share one counter. The in-memory limiter is retained only as a
 * fail-closed fallback if the shared store is temporarily unavailable.
 */
export async function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number }
): Promise<RateLimitResult> {
  try {
    const rows = await prisma.$queryRaw<Array<{
      allowed: boolean
      remaining: number
      retry_after_ms: bigint | number
    }>>`
      SELECT allowed, remaining, retry_after_ms
      FROM public.check_rate_limit(
        ${key},
        ${options.max},
        ${options.windowMs}
      )
    `

    const row = rows[0]
    if (!row) throw new Error("Rate limit function returned no result")

    return {
      allowed: row.allowed,
      remaining: Number(row.remaining),
      retryAfterMs: Number(row.retry_after_ms),
    }
  } catch (error) {
    console.error("[rate-limit] shared limiter unavailable; using local fallback", error)
    return checkMemoryRateLimit(key, options)
  }
}

export function getClientIp(req: Request): string {
  const headers = req.headers
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1"
  )
}
