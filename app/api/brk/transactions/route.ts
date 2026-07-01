import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBrkTransactionHistory } from '@/lib/brk/wallet-service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = Number(session.user.id)

  const limit = Number(req.nextUrl.searchParams.get('limit') || 50)
  const transactions = await getBrkTransactionHistory(userId, limit)

  return NextResponse.json({ transactions })
}
