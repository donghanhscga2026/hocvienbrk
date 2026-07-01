import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST() {
  try {
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
