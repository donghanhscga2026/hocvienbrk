import { NextResponse } from "next/server"
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
