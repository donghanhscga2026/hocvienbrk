import { NextResponse } from 'next/server'
import { withCronLogging } from '@/lib/cron-logger'
import { processBounceEmails } from '@/lib/email-campaign-runner'
import { isAuthorizedRequest } from '@/lib/request-auth'

export const runtime = "nodejs"

async function handler(req: Request) {
  const authResult = isAuthorizedRequest(req as Request & { nextUrl?: { searchParams: URLSearchParams } }, { secretEnv: 'CRON_SECRET' })
  if (!authResult.isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await processBounceEmails(3)

    return NextResponse.json({
      success: true,
      scanned: stats.scanned,
      hardBounced: stats.hardBounced,
      softBounced: stats.softBounced,
      fakeEmails: stats.fakeEmails,
      errors: stats.errors,
      senderDetails: stats.senderDetails?.map((s: any) => ({
        email: s.email,
        scanned: s.scanned,
        hardBounced: s.hardBounced,
        softBounced: s.softBounced,
        error: s.error
      }))
    })
  } catch (error: any) {
    console.error('[ScanBounces] Cron error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export const GET = withCronLogging('scan-bounces', handler)
