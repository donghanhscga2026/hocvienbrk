import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const session = await auth()
        
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        
        const userId = typeof session.user.id === 'string' 
            ? parseInt(session.user.id) 
            : session.user.id
        
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
        
        const landings = await prisma.landingPage.findMany({
            where: { isActive: true },
            select: { slug: true, title: true }
        })
        
        return NextResponse.json({
            links,
            landings,
            user,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        })
    } catch (error) {
        console.error('[API] Affiliate links error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
