import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/youtube'

export async function GET() {
  try {
    const authUrl = getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('YouTube Auth Error:', error)
    return NextResponse.redirect('/tools/youtube-links?error=auth_failed')
  }
}