import { NextResponse } from "next/server"
import { withCronLogging, acquireCronLock, releaseCronLock } from '@/lib/cron-logger'
import prisma from "@/lib/prisma"
import { runCampaignQueueUntilBudget } from "@/lib/email-campaign-runner"
import { isAuthorizedRequest } from '@/lib/request-auth'

export const runtime = "nodejs"
export const maxDuration = 300

const LOCK_KEY = 'email_campaign_queue_lock'
// Lớn hơn budgetMs bên dưới (260s) + chút thời gian dư cho query/overhead —
// tránh 1 lượt gọi trùng (ví dụ có 2 nguồn kích hoạt cron song song để dự
// phòng lịch GitHub Actions bị bỏ lỡ) chạy chồng lên lượt đang xử lý, gây
// gửi email trùng cho cùng người nhận.
const LOCK_STALE_MS = 280_000

// Tiếp tục các chiến dịch email đang RUNNING ngay cả khi admin đã đóng tab
// trình duyệt (trước đây vòng lặp gửi hoàn toàn phụ thuộc vào tab client
// còn mở — xem app/tools/email-mkt/[id]/page.tsx handleSendBatch). Cron này
// chạy mỗi 15 phút (.github/workflows/cron-jobs.yml), mỗi lượt cố gắng gửi
// tối đa trong ngân sách thời gian còn lại của request. Không sleep chờ
// cooldown — nếu sender đang cooldown thì dừng ngay, lượt cron kế tiếp sẽ
// tự tiếp tục khi cooldown (lưu trong DB) đã hết hạn.
async function handler(req: Request) {
  const authResult = isAuthorizedRequest(req as Request & { nextUrl?: { searchParams: URLSearchParams } }, { secretEnv: 'CRON_SECRET' })
  if (!authResult.isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gotLock = await acquireCronLock(LOCK_KEY, LOCK_STALE_MS)
  if (!gotLock) {
    return NextResponse.json({ success: true, skipped: true, reason: 'Đang có lượt chạy khác xử lý, bỏ qua để tránh gửi trùng.' })
  }

  try {
    const startedAt = Date.now()
    const budgetMs = 260_000 // để dư so với maxDuration=300s

    const runningCampaigns = await prisma.emailCampaign.findMany({
      where: { status: "RUNNING" },
      select: { id: true, title: true }
    })

    const results: { campaignId: number; title: string; finished: boolean; batchesRun: number }[] = []

    for (const campaign of runningCampaigns) {
      const remaining = budgetMs - (Date.now() - startedAt)
      if (remaining <= 5_000) break

      const outcome = await runCampaignQueueUntilBudget(campaign.id, remaining)
      results.push({
        campaignId: campaign.id,
        title: campaign.title,
        finished: outcome.finished,
        batchesRun: outcome.batchesRun
      })
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      campaigns: results
    })
  } finally {
    await releaseCronLock(LOCK_KEY)
  }
}

export const GET = withCronLogging('process-email-campaigns', handler)
