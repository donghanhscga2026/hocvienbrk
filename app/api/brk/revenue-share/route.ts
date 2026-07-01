import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRevenueShareHistory } from '@/lib/brk/revenue-share-service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = Number(session.user.id)
  const onSystem = Number(req.nextUrl.searchParams.get('onSystem') || 0)

  const history = await getRevenueShareHistory(userId, onSystem)
  return NextResponse.json({ history })
}
