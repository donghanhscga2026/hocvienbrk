import { NextRequest, NextResponse } from 'next/server'
import { getVideos, getOAuth2Client, refreshAccessToken } from '@/lib/youtube'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'

    const ytToken = await prisma.youTubeToken.findUnique({
      where: { userId },
    })

    if (!ytToken) {
      return NextResponse.json({ error: 'Not connected to YouTube' }, { status: 400 })
    }

    let accessToken = ytToken.accessToken
    const expiresAt = new Date(ytToken.expiresAt)

    if (expiresAt < new Date()) {
      const newTokens = await refreshAccessToken(ytToken.refreshToken)
      accessToken = newTokens.accessToken || accessToken
      
      await prisma.youTubeToken.update({
        where: { userId },
        data: { 
          accessToken: newTokens.accessToken || ytToken.accessToken, 
          expiresAt: newTokens.expiresAt 
        },
      })
    }

    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const allVideos = await getVideos(oauth2Client, 'all')
    
    let videos = allVideos
    if (filter !== 'all') {
      videos = videos.filter(v => v.status === filter)
    }

    return NextResponse.json({
      videos,
      channel: {
        title: ytToken.channelTitle,
        id: ytToken.channelId,
      },
    })
  } catch (error: any) {
    console.error('YouTube Videos Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}