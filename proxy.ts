import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest, NextFetchEvent, NextMiddleware } from "next/server"
import { activeDomain } from '@/lib/website/domains'
import { domainRoute, requestHostname, isPlatformHost } from '@/lib/website/domain-shared'
import prisma from '@/lib/prisma'
import {courseBelongsToProfile} from '@/lib/site-profile/config'
import { applicationKeys, type ApplicationKey } from '@/lib/website/applications'

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

// Lớp bảo vệ mặc định (defense-in-depth) cho các nhóm route quản trị/nhạy cảm.
// Đây là lớp chặn thứ 2 — mỗi route/action bên trong vẫn PHẢI tự kiểm tra quyền
// (bắt buộc với Server Actions vì proxy không chặn được lời gọi action trực
// tiếp), lớp này chỉ để tránh lọt route mới thêm sau này mà quên gắn check.
const ADMIN_ONLY_PREFIXES = ['/api/admin', '/api/sync-tca', '/api/system-tree']

/**
 * proxy.ts (Next.js 16+)
 * Thay thế cho middleware.ts để xử lý routing, auth và affiliate.
 */
const proxyHandler = auth(async function proxy(request: NextRequest & { auth: any }) {
    const { nextUrl } = request

    if (nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next()
    }

    if (nextUrl.pathname.startsWith('/admin') || ADMIN_ONLY_PREFIXES.some((p) => nextUrl.pathname.startsWith(p))) {
        const role = (request.auth as { user?: { role?: string } } | null)?.user?.role
        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 })
        }
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

/** Domain riêng: chỉ mở các route đã cấp, giữ domain trong thanh địa chỉ. */
export default async function proxy(request: NextRequest, event: NextFetchEvent) {
    const hostname=requestHostname(request.headers.get('host') || '')
    const path=request.nextUrl.pathname
    if(isPlatformHost(hostname)) {
        if(path.startsWith('/site-domain/')) return new NextResponse('Not found',{status:404})
        if(path.startsWith('/api/') && !ADMIN_ONLY_PREFIXES.some(p=>path.startsWith(p))) return NextResponse.next()
        return (proxyHandler as unknown as NextMiddleware)(request,event)
    }
    if(path.startsWith('/.well-known/giautoandien-domain/')) return NextResponse.next()
    const domainStarted=performance.now()
    const domain=await activeDomain(hostname)
    const domainDuration=performance.now()-domainStarted
    if(!domain) return new NextResponse('Tên miền chưa được xác minh hoặc đang tạm dừng.',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}})
    if(path.startsWith('/ung-dung/')) {
        const key=path.slice('/ung-dung/'.length)
        if(!(applicationKeys as readonly string[]).includes(key)) return new NextResponse('Not found',{status:404})
        if(!domain.applications[key as ApplicationKey]) return NextResponse.json({error:'Ứng dụng đã ngắt kết nối hoặc chưa được cấp.'},{status:403,headers:{'Cache-Control':'no-store'}})
    }
    const route=domainRoute(path,domain)
    if(route==='deny') return NextResponse.json({error:'Trang hoặc chức năng chưa được cấp cho website này.'},{status:403,headers:{'Cache-Control':'no-store'}})
    const coursePath=path.match(/^\/(?:khoa-hoc|courses)\/([^/]+)/)
    if(coursePath) {
        let slug: string
        try { slug=decodeURIComponent(coursePath[1]).replace(/\$+$/,'') } catch { return new NextResponse('Not found',{status:404}) }
        const course=await prisma.course.findUnique({where:{id_khoa:slug},select:{id:true,teacherId:true,categoryId:true,status:true}})
        const permitted=courseBelongsToProfile(domain.profile,course)
        if(!permitted) return new NextResponse('Khóa học không thuộc website này.',{status:404})
    }
    const requestHeaders=new Headers(request.headers)
    requestHeaders.set('x-website-path',path)
    const destination=request.nextUrl.clone()
    if(route==='page' || route==='account' || route==='catalog') destination.pathname='/site-domain/'+hostname+(path==='/' ? '' : path)
    if(/^\/courses\/[^/]+$/.test(path)) destination.pathname=path.replace('/courses/','/khoa-hoc/')
    const response=destination.pathname!==path ? NextResponse.rewrite(destination,{request:{headers:requestHeaders}}) : NextResponse.next({request:{headers:requestHeaders}})
    response.headers.set('Server-Timing',`website-domain;dur=${domainDuration.toFixed(1)}`)
    const ref=request.nextUrl.searchParams.get('ref')
    if(ref && domain.affiliate) saveRefCookie(response,ref,domain.profile.slug,coursePath?.[1] || null,null,coursePath ? 'khoa-hoc' : 'page')
    return response
}

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
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)).*)",
        // Các prefix API cần được proxy chặn theo role ADMIN (xem ADMIN_ONLY_PREFIXES ở trên)
        "/api/admin/:path*",
        "/api/sync-tca/:path*",
        "/api/system-tree/:path*",
    ],
}
