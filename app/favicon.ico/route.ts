import { NextResponse } from 'next/server'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const brand = await getCurrentDeploymentBrand()
  const icon = brand?.iconUrl === '/favicon.ico' ? '/wi300/wipa-icon.png' : brand?.iconUrl
  const response = NextResponse.redirect(new URL(icon || '/pwa/platform-favicon.ico', request.url), 307)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
