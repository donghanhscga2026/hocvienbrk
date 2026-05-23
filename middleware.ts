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
    const { nextUrl } = request
    
    // 1. KHÔNG can thiệp vào các route auth để tránh lỗi PKCE/Cookies
    if (nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next()
    }

    const response = NextResponse.next()
    
    const refCode = request.nextUrl.searchParams.get('ref')
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean)
    const potentialSlug = pathParts.length > 0 ? pathParts[0] : null
    
    // 2. Logic Affiliate Referral
    if (refCode) {
        const landingSlug = potentialSlug && !RESERVED_PATHS.has(potentialSlug) ? potentialSlug : null
        saveRefCookie(response, refCode, landingSlug, landingSlug, null)
    }

    // 3. Logic Site Profile Redirect (Khôi phục nguyên bản)
    if (potentialSlug && !RESERVED_PATHS.has(potentialSlug)) {
        try {
            // Kiểm tra nếu là SiteProfile slug (từ database)
            // Lưu ý: Prisma có thể lỗi trên Edge, chúng ta bọc try-catch
            const isSiteProfile = await checkIsSiteProfile(potentialSlug)
            if (isSiteProfile) {
                return response
            }
        } catch (e) {
            // Bỏ qua nếu lỗi Prisma trên Edge
        }
    }
    
    return response
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
        // Query database - Lưu ý: logic này có thể fail trên Edge Runtime
        // Nếu dùng Supabase/Edge-ready DB thì OK.
        const profiles = await prisma.siteProfile.findMany({
            where: { isActive: true },
            select: { slug: true }
        })
        
        profileSlugCache = new Set(profiles.map((p: any) => p.slug))
        cacheTimestamp = Date.now()
        
        return profileSlugCache.has(slug)
    } catch (error) {
        // Fallback: cho phép qua nếu lỗi (để tránh block pages hợp lệ)
        return false
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
