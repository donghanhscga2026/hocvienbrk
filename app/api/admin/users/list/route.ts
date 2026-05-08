import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { id: 'asc' }
    })
    return NextResponse.json({ users })
  } catch (error) {
    console.error('[API] Users list error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}