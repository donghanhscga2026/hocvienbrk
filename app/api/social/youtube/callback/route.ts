import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { verifyOAuthState, parseChannelResponse, YOUTUBE_PROVIDER } from "@/lib/social/youtube"
import { syncConnectedAccount } from "@/lib/social/youtube-sync"
import { logActivity } from "@/lib/activity-logger"

/**
 * Callback OAuth YouTube: đổi code lấy token, đọc kênh của chính thành
 * viên (mine=true) bằng access token vừa cấp, lưu liên kết rồi đồng bộ
 * lần đầu ngay. State có chữ ký HMAC và phải khớp người đang đăng nhập.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const back = (q: string) => NextResponse.redirect(new URL(`/ket-noi-tai-khoan?${q}`, request.url))
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect(new URL('/login', request.url))

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') ?? ''
  if (!code) return back('error=denied')
  const verified = verifyOAuthState(state)
  if (!verified.ok || verified.userId !== Number(session.user.id)) return back('error=bad-state')

  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  if (!clientId || !clientSecret) return back('error=missing-config')
  const redirectUri = `${url.origin}/api/social/youtube/callback`

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    })
    if (!tokenRes.ok) return back('error=token')
    const tokens = await tokenRes.json()

    const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!channelRes.ok) return back('error=channel')
    const channel = parseChannelResponse(await channelRes.json())
    if (!channel) return back('error=no-channel')

    const account = await prisma.connectedAccount.upsert({
      where: { userId_provider: { userId: verified.userId, provider: YOUTUBE_PROVIDER } },
      create: {
        userId: verified.userId, provider: YOUTUBE_PROVIDER, externalId: channel.channelId,
        displayName: channel.title, handle: channel.handle,
        accessToken: tokens.access_token ?? null, refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        status: 'ACTIVE',
      },
      update: {
        externalId: channel.channelId, displayName: channel.title, handle: channel.handle,
        accessToken: tokens.access_token ?? null,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        status: 'ACTIVE', lastError: null,
      },
    })
    await syncConnectedAccount(account.id).catch(() => undefined)
    await logActivity({
      userId: verified.userId,
      action: 'SOCIAL_ACCOUNT_LINKED',
      detail: `Liên kết kênh YouTube: ${channel.title}`,
      metadata: { provider: YOUTUBE_PROVIDER, externalId: channel.channelId },
    }).catch(() => undefined)
    return back('linked=youtube')
  } catch {
    return back('error=exception')
  }
}
