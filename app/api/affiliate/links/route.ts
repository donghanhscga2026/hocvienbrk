import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
    try {
        const userId = 0 // Admin
        
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
        
        const landings = await prisma.landingPage.findMany({
            where: { isActive: true },
            select: { slug: true, title: true }
        })
        
        return NextResponse.json({
            links,
            refs,
            landings,
            user,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        })
    } catch (error) {
        console.error('[API] Affiliate links error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
