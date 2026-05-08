import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode, getChannelInfo, getOAuth2Client } from '@/lib/youtube'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'

function getBaseUrl(req: NextRequest) {
  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  
  try {
    const session = await auth()
    console.log('YouTube callback - session:', session?.user?.email)
    
    if (!session?.user?.id) {
      return NextResponse.redirect(`${baseUrl}/tools/youtube-links?error=unauthorized`)
    }

    const userId = parseInt(String(session.user.id))
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    console.log('YouTube callback - error param:', error)
    console.log('YouTube callback - has code:', !!code)

    if (error) {
      return NextResponse.redirect(`${baseUrl}/tools/youtube-links?error=${error}`)
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/tools/youtube-links?error=no_code`)
    }

    console.log('Getting tokens from code...')
    const tokens = await getTokensFromCode(code)
    console.log('Tokens received:', { hasAccessToken: !!tokens.accessToken, hasRefreshToken: !!tokens.refreshToken })
    
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    })

    let channelId = ''
    let channelTitle = ''
    
    try {
      console.log('Getting channel info...')
      const channelInfo = await getChannelInfo(oauth2Client)
      console.log('Channel info:', channelInfo)
      channelId = channelInfo?.channelId || ''
      channelTitle = channelInfo?.channelTitle || ''
    } catch (channelError: any) {
      console.log('Channel info failed (quota?):', channelError.message)
    }

    const tokenData = {
      accessToken: tokens.accessToken || '',
      refreshToken: tokens.refreshToken || '',
      expiresAt: tokens.expiresAt,
      channelId,
      channelTitle,
    }

    await prisma.youTubeToken.upsert({
      where: { userId },
      update: tokenData,
      create: { userId, ...tokenData },
    })

    return NextResponse.redirect(`${baseUrl}/tools/youtube-links?success=connected`)
  } catch (error: any) {
    console.error('YouTube Callback Error:', error?.message || error)
    return NextResponse.redirect(`${baseUrl}/tools/youtube-links?error=callback_failed&detail=${encodeURIComponent(error?.message || 'Unknown')}`)
  }
}