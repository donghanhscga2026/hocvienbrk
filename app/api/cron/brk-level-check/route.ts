import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAndPromoteLevel } from '@/lib/brk/level-manager'

export async function POST() {
  try {
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
