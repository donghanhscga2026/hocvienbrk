import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getLevelProgress } from '@/lib/brk/level-manager'
import { getAllLevelConfigs } from '@/lib/brk/config-service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = Number(session.user.id)
  const onSystem = Number(req.nextUrl.searchParams.get('onSystem') || 0)

  const progress = await getLevelProgress(userId, onSystem)
  const configs = await getAllLevelConfigs(onSystem)

  return NextResponse.json({ progress, configs })
}
