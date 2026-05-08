import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const userId = parseInt(id)
        
        if (isNaN(userId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
        }
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, image: true }
        })
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        
        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
