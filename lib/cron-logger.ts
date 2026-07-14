import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export function withCronLogging(
  jobName: string,
  handler: (req: Request) => Promise<NextResponse>
) {
  return async function loggedHandler(request: Request) {
    const run = await prisma.cronRun.create({
      data: { jobName, status: 'RUNNING', triggeredBy: 'CRON' }
    })
    const startTime = Date.now()
    try {
      const result = await handler(request)
      const duration = Date.now() - startTime

      let details = null
      try { details = await result.clone().json() } catch {}

      await prisma.cronRun.update({
        where: { id: run.id },
        data: {
          status: result.ok ? 'SUCCESS' : 'FAILURE',
          details,
          error: result.ok ? null : JSON.stringify(details),
          durationMs: duration,
          endedAt: new Date(),
        }
      })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errMsg = error instanceof Error ? error.message : String(error)
      await prisma.cronRun.update({
        where: { id: run.id },
        data: { status: 'FAILURE', error: errMsg, durationMs: duration, endedAt: new Date() }
      })
      throw error
    }
  }
}
