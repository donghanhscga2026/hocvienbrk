import { NextResponse } from "next/server"
import { syncSalesLedger } from "@/lib/sales-ledger/sync"

/**
 * Cron đồng bộ sổ cái doanh số thành viên từ bảng Order.
 * Bảo vệ bằng CRON_SECRET (Bearer) như các cron khác trong hệ thống.
 * Idempotent — chạy lại không ghi trùng (dedupeKey duy nhất).
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await syncSalesLedger()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[CRON sales-ledger] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
