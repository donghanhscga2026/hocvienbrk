import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import prisma from "@/lib/prisma"

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
    'landing', 'forgot-password', 'tools', 'account-settings',
    'tca', 'ktc' // System paths
])

export default auth(async function middleware(request: NextRequest & { auth: any }) {
    const response = NextResponse.next()
    
    const refCode = request.nextUrl.searchParams.get('ref')
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean)
    const potentialSlug = pathParts.length > 0 ? pathParts[0] : null
    
    // Root path (giautoandien.io.vn/) → cho phép qua, app/page.tsx sẽ xử lý
    if (!potentialSlug) {
        if (refCode) {
            saveRefCookie(response, refCode, null, null, null)
        }
        return response
    }
    
    // Check nếu là reserved path
    if (RESERVED_PATHS.has(potentialSlug)) {
        if (refCode) {
            saveRefCookie(response, refCode, null, null, null)
        }
        return response
    }
    
    // Check nếu là SiteProfile slug (từ database)
    const isSiteProfile = await checkIsSiteProfile(potentialSlug)
    
    if (isSiteProfile) {
        // SiteProfile → cho phép qua (route /[slug]/page.tsx sẽ xử lý)
        if (refCode) {
            saveRefCookie(response, refCode, null, null, null)
        }
        return response
    }
    
    // Không phải SiteProfile → xử lý như cũ (course/landing)
    const session = request.auth
    
    // Kiểm tra course/landing slug
    const courseSlug = potentialSlug
    const landingSlug = potentialSlug
    
    saveRefCookie(response, refCode || '', landingSlug, courseSlug, null)
    
    if (!session?.user) {
        const redirectUrl = new URL('/register', request.url)
        redirectUrl.searchParams.set('redirect', potentialSlug)
        if (refCode) {
            redirectUrl.searchParams.set('ref', refCode)
        }
        return NextResponse.redirect(redirectUrl)
    } else {
        const redirectUrl = new URL(`/landing/${potentialSlug}`, request.url)
        return NextResponse.redirect(redirectUrl)
    }
})

// Cache để tránh query database quá nhiều
let profileSlugCache: Set<string> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 60 * 1000 // 1 phút

async function checkIsSiteProfile(slug: string): Promise<boolean> {
    // Check cache trước
    if (profileSlugCache && Date.now() - cacheTimestamp < CACHE_TTL) {
        return profileSlugCache.has(slug)
    }
    
    try {
        // Query database
        const profiles = await prisma.siteProfile.findMany({
            where: { isActive: true },
            select: { slug: true }
        })
        
        profileSlugCache = new Set(profiles.map((p: { slug: string }) => p.slug))
        cacheTimestamp = Date.now()
        
        return profileSlugCache.has(slug)
    } catch (error) {
        console.error('Error checking SiteProfile:', error)
        // Fallback: cho phép qua nếu lỗi (để tránh block pages hợp lệ)
        return true
    }
}

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
