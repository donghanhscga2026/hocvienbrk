import { NextResponse } from "next/server"
import { awardBadgesForAllUsers } from "@/lib/badges/engine"

/**
 * Cron trao huy hiệu tự động cho mọi thành viên có hoạt động: đồng bộ
 * bộ huy hiệu mẫu vào bảng Badge rồi trao các huy hiệu đã đạt mà chưa
 * có. Bảo vệ bằng CRON_SECRET (Bearer). Idempotent.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await awardBadgesForAllUsers()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[CRON badge-awards] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
