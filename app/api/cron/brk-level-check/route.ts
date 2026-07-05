import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAndPromoteLevel } from '@/lib/brk/level-manager'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activeMembers = await prisma.system.findMany({
      where: { status: 'ACTIVE' }
    })

    let promoted = 0
    for (const member of activeMembers) {
      const result = await checkAndPromoteLevel(member.userId, member.onSystem)
      if (result) promoted++
    }

    return NextResponse.json({ success: true, checked: activeMembers.length, promoted })
  } catch (error) {
    console.error('BRK level check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
