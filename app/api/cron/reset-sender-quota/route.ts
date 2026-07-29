import { NextResponse } from "next/server"
import { withCronLogging } from '@/lib/cron-logger'
import prisma from "@/lib/prisma"
import { isAuthorizedRequest } from '@/lib/request-auth'

async function handler(req: Request) {
  const authResult = isAuthorizedRequest(req as Request & { nextUrl?: { searchParams: URLSearchParams } }, { secretEnv: 'CRON_SECRET' })
  if (!authResult.isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.emailSender.updateMany({
      data: {
        sentToday: 0,
        lastResetAt: new Date(),
      }
    })

    return NextResponse.json({ success: true, message: "Đã reset quota gửi email." })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export const GET = withCronLogging('reset-sender-quota', handler)
