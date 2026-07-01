import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (search?.trim()) {
      const q = search.trim()
      const numId = parseInt(q)
      const isPureNumeric = /^\d+$/.test(q)

      if (isPureNumeric) {
        where.OR = [
          { id: numId },
          { phone: q },
        ]
      } else {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ]
      }
    }

    const users = await prisma.user.findMany({
      where: Object.keys(where).length ? where : undefined,
      select: { id: true, name: true, email: true },
      orderBy: { id: 'asc' },
      take: Math.min(limit, 100),
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('[API] Users list error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
