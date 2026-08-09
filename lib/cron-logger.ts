import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * Khoá chống chạy trùng cho cron job có thể bị gọi từ nhiều nguồn kích hoạt
 * cùng lúc (ví dụ GitHub Actions + 1 dịch vụ cron ngoài chạy song song để dự
 * phòng lịch bị bỏ lỡ — xem lib/auto-verify.ts gmail_scan_lock, cùng pattern).
 * Dùng bảng SystemConfig làm nơi lưu lock đơn giản, không cần thêm bảng mới.
 *
 * @param staleMs Sau khoảng thời gian này (ms) kể từ lúc lock được tạo, lock
 * bị coi là "treo" (tiến trình cũ có thể đã crash mà không giải phóng) và cho
 * phép chạy tiếp — nên đặt LỚN HƠN thời gian chạy tối đa thực tế của job.
 */
export async function acquireCronLock(key: string, staleMs: number): Promise<boolean> {
  const nowMs = Date.now()
  try {
    const existing = await prisma.systemConfig.findUnique({ where: { key } })
    if (existing?.value) {
      const lockTime = parseInt(String(existing.value))
      if (nowMs - lockTime < staleMs) {
        return false
      }
    }
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: nowMs.toString() },
      create: { key, value: nowMs.toString() }
    })
    return true
  } catch (err) {
    console.error(`[cron-lock] Lỗi kiểm tra lock "${key}":`, err)
    return true // Lỗi đọc DB thì vẫn cho chạy, tránh khoá cứng job vì sự cố tạm thời
  }
}

export async function releaseCronLock(key: string): Promise<void> {
  try {
    await prisma.systemConfig.deleteMany({ where: { key } })
  } catch (err) {
    console.error(`[cron-lock] Lỗi giải phóng lock "${key}":`, err)
  }
}

export function withCronLogging(
  jobName: string,
  handler: (req: Request) => Promise<NextResponse>
) {
  return async function loggedHandler(request: Request) {
    const run = await prisma.cronRun.create({
      data: { jobName, status: 'RUNNING', triggeredBy: 'CRON' }
    })
    const startTime = Date.now()
    try {
      const result = await handler(request)
      const duration = Date.now() - startTime

      let details = null
      try { details = await result.clone().json() } catch {}

      await prisma.cronRun.update({
        where: { id: run.id },
        data: {
          status: result.ok ? 'SUCCESS' : 'FAILURE',
          details,
          error: result.ok ? null : JSON.stringify(details),
          durationMs: duration,
          endedAt: new Date(),
        }
      })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errMsg = error instanceof Error ? error.message : String(error)
      await prisma.cronRun.update({
        where: { id: run.id },
        data: { status: 'FAILURE', error: errMsg, durationMs: duration, endedAt: new Date() }
      })
      throw error
    }
  }
}
