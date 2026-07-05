import { NextResponse } from 'next/server'
import { processGracePeriodExpirations } from '@/lib/brk/activation-service'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processGracePeriodExpirations()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('BRK grace processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
