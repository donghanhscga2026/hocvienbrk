import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    // req.auth
})

// Middleware để lưu ref cookie từ URL
export function middleware(request: NextRequest) {
    const response = NextResponse.next()
    
    // Lấy ref từ URL query param
    const refCode = request.nextUrl.searchParams.get('ref')
    
    if (refCode) {
        // Lưu vào cookie trong 30 ngày
        response.cookies.set('aff_ref', refCode, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            httpOnly: false, // Có thể đọc từ client
            sameSite: 'lax',
            path: '/'
        })
    }
    
    return response
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
}
