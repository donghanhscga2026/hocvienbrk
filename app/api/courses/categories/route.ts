import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        const categories = await prisma.course.findMany({
            select: { category: true },
            distinct: ['category']
        })
        
        const uniqueCategories = categories
            .map((c: { category: string | null }) => c.category)
            .filter((c: string | null) => c && c !== 'Khác')
            .sort()
        
        return NextResponse.json({ categories: uniqueCategories })
    } catch (error: any) {
        console.error('Get categories error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        )
    }
}
