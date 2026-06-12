import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

interface AffiliateCookie {
    r: string
    l?: string | null
    c?: string | null
    s?: string | null
    t: number
    type?: string | null
}

const RESERVED_PATHS = new Set([
    'api', 'admin', 'affiliate', 'login', 'register', 'courses', 
    'auth', 'dashboard', 'account', 'settings', 'profile',
    'user', 'checkout', 'payment', 'static', 'assets', '_next',
    'landing', 'forgot-password', 'tools', 'account-settings',
    'tca', 'ktc', 'khoa-hoc', 'land', 'page', 'du-an'
])

const RESOURCE_PREFIXES = new Set(['khoa-hoc', 'land', 'page', 'du-an'])

/**
 * proxy.ts (Next.js 16+)
 * Thay thế cho middleware.ts để xử lý routing, auth và affiliate.
 */
const proxyHandler = auth(async function proxy(request: NextRequest & { auth: any }) {
    const { nextUrl } = request
    
    if (nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next()
    }

    const response = NextResponse.next()
    
    const refCode = request.nextUrl.searchParams.get('ref')
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean)

    let slug: string | null = null
    let resourceType: string | null = null

    if (pathParts.length >= 2 && RESOURCE_PREFIXES.has(pathParts[0])) {
        slug = pathParts[1]
        resourceType = pathParts[0]
    } else if (pathParts.length === 1) {
        const single = pathParts[0]
        if (!RESERVED_PATHS.has(single) && !single.includes('.')) {
            slug = single
        }
    }

    if (refCode) {
        saveRefCookie(response, refCode, slug, slug, null, resourceType)
    }
    
    return response
})

export { proxyHandler as proxy, proxyHandler as default }

function saveRefCookie(
    response: NextResponse, 
    refCode: string, 
    landingSlug: string | null = null,
    courseSlug: string | null = null,
    systemName: string | null = null,
    resourceType: string | null = null
) {
    if (!refCode) return
    
    const cookieData: AffiliateCookie = {
        r: refCode,
        t: Date.now()
    }
    
    if (landingSlug) cookieData.l = landingSlug
    if (courseSlug) cookieData.c = courseSlug
    if (systemName) cookieData.s = systemName
    if (resourceType) cookieData.type = resourceType
    
    response.cookies.set('aff_ref', JSON.stringify(cookieData), {
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: false,
        sameSite: 'lax',
        path: '/'
    })
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)).*)",
    ],
}
