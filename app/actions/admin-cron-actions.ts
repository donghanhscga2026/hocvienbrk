'use server'

import { auth } from '@/auth'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

const CRON_ROUTES: Record<string, string> = {
  'brk-daily-eval': '/api/cron/brk-daily-eval',
  'brk-level-check': '/api/cron/brk-level-check',
  'brk-grace-processing': '/api/cron/brk-grace-processing',
  'brk-revenue-share': '/api/cron/brk-revenue-share',
  'brk-expiration': '/api/cron/brk-expiration',
  'gmail-watch': '/api/cron/gmail-watch',
  'reset-sender-quota': '/api/cron/reset-sender-quota',
  'expire-vouchers': '/api/cron/expire-vouchers',
}

export async function triggerCronJob(jobName: string) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return { success: false, error: 'Unauthorized' }
  }

  const route = CRON_ROUTES[jobName]
  if (!route) {
    return { success: false, error: `Unknown job: ${jobName}` }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const cronSecret = process.env.CRON_SECRET

  const run = await prisma.cronRun.create({
    data: { jobName, status: 'RUNNING', triggeredBy: 'ADMIN' }
  })

  try {
    const res = await fetch(`${baseUrl}${route}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    const body = await res.json()
    const duration = Date.now() - run.startedAt.getTime()

    await prisma.cronRun.update({
      where: { id: run.id },
      data: {
        status: res.ok ? 'SUCCESS' : 'FAILURE',
        details: body,
        error: res.ok ? null : JSON.stringify(body),
        endedAt: new Date(),
        durationMs: duration,
      }
    })

    return { success: res.ok, status: res.status, body, durationMs: duration }
  } catch (err) {
    const duration = Date.now() - run.startedAt.getTime()
    const errMsg = err instanceof Error ? err.message : String(err)

    await prisma.cronRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILURE',
        error: errMsg,
        endedAt: new Date(),
        durationMs: duration,
      }
    })

    return { success: false, error: errMsg, durationMs: duration }
  }
}
