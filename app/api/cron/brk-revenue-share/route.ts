import { NextResponse } from 'next/server'
import { processAllBrkRevenueShares } from '@/lib/brk/revenue-share-service'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await processAllBrkRevenueShares()
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('BRK revenue share processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
