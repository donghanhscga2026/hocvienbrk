import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { expireOldVouchers } = await import('@/lib/voucher/voucher-service')
    const expiredCount = await expireOldVouchers()
    return NextResponse.json({
      success: true,
      expired: expiredCount
    })
  } catch (error: any) {
    console.error('[Cron] expire-vouchers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
