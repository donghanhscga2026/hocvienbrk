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
}

const RESERVED_PATHS = new Set([
    'api', 'admin', 'affiliate', 'login', 'register', 'courses', 
    'auth', 'dashboard', 'account', 'settings', 'profile',
    'user', 'checkout', 'payment', 'static', 'assets', '_next',
    'landing', 'forgot-password', 'tools'
])

export default auth(async function middleware(request: NextRequest & { auth: any }) {
    const response = NextResponse.next()
    
    const refCode = request.nextUrl.searchParams.get('ref')
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean)
    const potentialSlug = pathParts.length > 0 ? pathParts[0] : null
    
    if (!potentialSlug || RESERVED_PATHS.has(potentialSlug)) {
        if (refCode) {
            saveRefCookie(response, refCode, null, null, null)
        }
        return response
    }
    
    const session = request.auth
    
    let systemName: string | null = null
    let courseSlug: string | null = null
    let landingSlug: string | null = null
    
    if (potentialSlug === 'tca' || potentialSlug === 'ktc') {
        systemName = potentialSlug
    } else {
        courseSlug = potentialSlug // It can be either course or landing, proxy treats them same for now
    }
    
    saveRefCookie(response, refCode || '', landingSlug, courseSlug, systemName)
    
    if (!session?.user) {
        const redirectUrl = new URL('/register', request.url)
        redirectUrl.searchParams.set('redirect', potentialSlug)
        if (refCode) {
            redirectUrl.searchParams.set('ref', refCode)
        }
        return NextResponse.redirect(redirectUrl)
    } else {
        if (systemName) {
            const redirectUrl = new URL(`/tools/genealogy?sysInfo=${systemName}`, request.url)
            return NextResponse.redirect(redirectUrl)
        } else {
            const redirectUrl = new URL(`/landing/${potentialSlug}`, request.url)
            return NextResponse.redirect(redirectUrl)
        }
    }
})

function saveRefCookie(
    response: NextResponse, 
    refCode: string, 
    landingSlug: string | null = null,
    courseSlug: string | null = null,
    systemName: string | null = null
) {
    if (!refCode) return
    
    const cookieData: AffiliateCookie = {
        r: refCode,
        t: Date.now()
    }
    
    if (landingSlug) cookieData.l = landingSlug
    if (courseSlug) cookieData.c = courseSlug
    if (systemName) cookieData.s = systemName
    
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
