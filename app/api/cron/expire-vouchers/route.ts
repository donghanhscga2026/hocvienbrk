import { NextResponse } from "next/server"
import { withCronLogging } from '@/lib/cron-logger'

async function handler(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

export const GET = withCronLogging('expire-vouchers', handler)
