import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { buildYouTubeAuthUrl, signOAuthState } from "@/lib/social/youtube"

/** Bắt đầu liên kết kênh YouTube: chuyển thành viên sang Google cấp quyền đọc. */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  const clientId = process.env.YOUTUBE_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/ket-noi-tai-khoan?error=missing-config', request.url))
  }
  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/social/youtube/callback`
  const state = signOAuthState(Number(session.user.id))
  return NextResponse.redirect(buildYouTubeAuthUrl({ clientId, redirectUri, state }))
}
