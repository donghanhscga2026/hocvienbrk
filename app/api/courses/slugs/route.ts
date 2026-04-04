import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

let cachedSlugs: string[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
    const now = Date.now()
    
    if (cachedSlugs && (now - cacheTimestamp) < CACHE_DURATION) {
        return NextResponse.json({
            slugs: cachedSlugs,
            cachedAt: cacheTimestamp,
            fromCache: true
        })
    }

    try {
        const courses = await prisma.course.findMany({
            where: { status: true },
            select: { id_khoa: true }
        })

        cachedSlugs = courses.map(c => c.id_khoa)
        cacheTimestamp = now

        return NextResponse.json({
            slugs: cachedSlugs,
            cachedAt: cacheTimestamp,
            fromCache: false
        })
    } catch (error) {
        console.error('[API] Error fetching course slugs:', error)
        return NextResponse.json(
            { error: 'Failed to fetch course slugs' },
            { status: 500 }
        )
    }
}

export async function POST() {
    cachedSlugs = null
    cacheTimestamp = 0
    
    return NextResponse.json({ message: 'Cache cleared' })
}
