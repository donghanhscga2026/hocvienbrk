import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const expired = await prisma.system.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now }
      },
      data: { status: 'EXPIRED' }
    })

    return NextResponse.json({ success: true, expired: expired.count })
  } catch (error) {
    console.error('BRK expiration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
