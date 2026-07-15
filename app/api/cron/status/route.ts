import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const CRON_JOBS = [
  'brk-daily-eval',
  'brk-level-check',
  'brk-grace-processing',
  'brk-revenue-share',
  'brk-expiration',
  'gmail-watch',
  'reset-sender-quota',
  'expire-vouchers',
]

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const statuses = []

    for (const jobName of CRON_JOBS) {
      const lastRun = await prisma.cronRun.findFirst({
        where: { jobName },
        orderBy: { startedAt: 'desc' },
      })

      let staleness: 'ok' | 'warning' | 'stale' | 'never' = 'never'
      let lastRunAt: string | null = null
      let lastStatus: string | null = null

      if (lastRun) {
        lastRunAt = lastRun.startedAt.toISOString()
        lastStatus = lastRun.status
        const hoursSince = (now.getTime() - lastRun.startedAt.getTime()) / (1000 * 60 * 60)
        if (hoursSince > 6) staleness = 'stale'
        else if (hoursSince > 2) staleness = 'warning'
        else staleness = 'ok'
      }

      statuses.push({ jobName, lastRunAt, lastStatus, staleness })
    }

    return NextResponse.json({ success: true, jobs: statuses, checkedAt: now.toISOString() })
  } catch (error) {
    console.error('Cron status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
