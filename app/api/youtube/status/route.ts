import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ connected: false })
    }

    const userId = parseInt(session.user.id)
    const ytToken = await (prisma as any).youTubeToken?.findUnique?.({
      where: { userId },
    })

    if (!ytToken) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      channel: {
        title: ytToken.channelTitle,
        id: ytToken.channelId,
      },
      expiresAt: ytToken.expiresAt,
    })
  } catch (error: any) {
    console.error('YouTube Status Error:', error)
    return NextResponse.json({ connected: false, error: error.message })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    await (prisma as any).youTubeToken?.delete?.({
      where: { userId },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('YouTube Disconnect Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}