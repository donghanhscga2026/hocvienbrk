import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBrkWallet, getBrkTransactionHistory } from '@/lib/brk/wallet-service'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = Number(session.user.id)

  const wallet = await getBrkWallet(userId)
  const transactions = await getBrkTransactionHistory(userId)

  return NextResponse.json({ wallet, transactions })
}
