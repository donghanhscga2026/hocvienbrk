import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { requireDomainModule } from '@/lib/website/domain-context'

export async function GET() {
    try {
        const domain=await requireDomainModule('affiliate')
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = Number(session.user.id)

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, affiliateCode: true }
        })

        const links = await prisma.affiliateLink.findMany({
            where: { userId },
            include: {
                campaign: true,
                _count: {
                    select: { clicks: true, conversions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        const refs = await prisma.affiliateRef.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })

        const landings = domain ? [] : await prisma.landingPage.findMany({
            where: { isActive: true },
            select: { slug: true, title: true }
        })

        return NextResponse.json({
            links,
            refs,
            landings,
            user,
            baseUrl: domain ? 'https://'+domain.hostname : process.env.NEXT_PUBLIC_BASE_URL || 'https://giautoandien.io.vn'
        })
    } catch (error) {
        console.error('[API] Affiliate links error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

/**
 * POST /api/affiliate/links — tạo link giới thiệu mới có chủ đích
 * (ví dụ: link riêng cho từng chiến dịch/sản phẩm).
 * Body: { name?: string, source?: string }
 */
export async function POST(request: NextRequest) {
    try {
        await requireDomainModule('affiliate')
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userId = Number(session.user.id)

        let body: { name?: string; source?: string } = {}
        try {
            body = await request.json()
        } catch {}

        const name = (body.name || '').toString().slice(0, 100) || 'Link mới'
        const source = (body.source || '').toString().slice(0, 50) || 'manual'

        const campaign = await prisma.affiliateCampaign.findFirst({
            where: { slug: 'default', isActive: true }
        })
        if (!campaign) {
            return NextResponse.json({ error: 'Chưa có chiến dịch affiliate đang hoạt động' }, { status: 400 })
        }

        // Sinh code duy nhất: REF{userId}-{6 ký tự ngẫu nhiên}
        const { randomBytes } = await import("crypto")
        let code = ''
        for (let i = 0; i < 5; i++) {
            const candidate = `REF${userId}-${randomBytes(3).toString('hex').toUpperCase()}`
            const dup = await prisma.affiliateLink.findUnique({ where: { code: candidate } })
            if (!dup) {
                code = candidate
                break
            }
        }
        if (!code) {
            return NextResponse.json({ error: 'Không sinh được mã link, thử lại' }, { status: 500 })
        }

        const link = await prisma.affiliateLink.create({
            data: { userId, campaignId: campaign.id, code, name, source }
        })

        return NextResponse.json({ success: true, link })
    } catch (error) {
        console.error('[API] Create affiliate link error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
