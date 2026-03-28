import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)
        
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
        }
        
        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true }
        })
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        
        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
