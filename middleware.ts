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
    'landing', 'forgot-password', 'tools', 'account-settings',
    'tca', 'ktc' // System paths
])

export default auth(async function middleware(request: NextRequest & { auth: any }) {
    const { nextUrl, auth } = request
    
    // KHÔNG can thiệp vào các route auth để tránh lỗi PKCE/Cookies
    if (nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next()
    }

    const isLoggedIn = !!auth?.user
    const response = NextResponse.next()
    
    const refCode = request.nextUrl.searchParams.get('ref')
    const pathParts = request.nextUrl.pathname.split('/').filter(Boolean)
    const potentialSlug = pathParts.length > 0 ? pathParts[0] : null
    
    // 1. Luôn lưu cookie ref nếu có (Mọi trang)
    if (refCode) {
        // Kiểm tra nếu là dynamic slug thì gán luôn vào cookie data
        const landingSlug = potentialSlug && !RESERVED_PATHS.has(potentialSlug) ? potentialSlug : null
        saveRefCookie(response, refCode, landingSlug, landingSlug, null)
    }
    
    // 2. Cho phép request đi tiếp. 
    // Logic Redirect nếu chưa đăng nhập cho Course/Landing sẽ được xử lý trong app/[slug]/page.tsx
    // Middleware chỉ chặn các route cứng trong auth.config (admin, dashboard...)
    return response
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
