import { NextResponse } from "next/server"
import { syncAllConnectedAccounts } from "@/lib/social/youtube-sync"

/**
 * Cron đồng bộ số liệu các tài khoản đã liên kết (hiện tại: YouTube).
 * Bảo vệ bằng CRON_SECRET (Bearer) như các cron khác. Lỗi từng tài
 * khoản được ghi vào ConnectedAccount.lastError, không làm hỏng cả lượt.
 */
async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await syncAllConnectedAccounts()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[CRON social-sync] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Vercel Cron gọi bằng GET; bộ lập lịch ngoài có thể gọi POST — cả hai dùng chung một xử lý.
export const GET = handleCron
export const POST = handleCron
