import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    const session = await auth()
    
    console.log('[Debug] Session:', JSON.stringify(session, (key, val) => key === 'user' ? '...' : val, 2))
    console.log('[Debug] session.user:', session?.user)
    console.log('[Debug] session.user.id:', session?.user?.id, 'type:', typeof session?.user?.id)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not logged in', session: 'none' }, { status: 401 })
    }
    
    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id, 10)
      : session.user.id
    
    console.log('[Debug] Parsed userId:', userId, 'type:', typeof userId)
    
    // Same as dashboard API
    const [wallet, closures] = await Promise.all([
      prisma.affiliateWallet.findUnique({ where: { userId } }),
      prisma.userClosure.findMany({
        where: { ancestorId: userId, depth: 1 },
        include: {
          descendant: {
            select: { id: true, name: true, emailVerified: true }
          }
        }
      })
    ])
    
    const f1Count = closures.filter(c => 
      c.descendant.emailVerified && c.descendantId !== 0
    ).length
    
    return NextResponse.json({
      sessionUserId: session.user.id,
      parsedUserId: userId,
      userIdType: typeof session.user.id,
      wallet: wallet ? { balance: wallet.balance, pendingBalance: wallet.pendingBalance } : null,
      closuresCount: closures.length,
      f1Count: f1Count
    })
  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}