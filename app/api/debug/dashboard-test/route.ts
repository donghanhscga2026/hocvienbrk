import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET() {
  try {
    // Get current session
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }
    
    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id) 
      : session.user.id
    
    // Use the actual user ID from session
    const closures = await prisma.userClosure.findMany({
      where: { ancestorId: userId, depth: 1 },
      include: {
        descendant: {
          select: {
            id: true,
            name: true,
            emailVerified: true,
            createdAt: true
          }
        }
      }
    })
    
    const f1Count = closures.filter(c => 
      c.descendant.emailVerified && c.descendantId !== 0
    ).length
    
    return NextResponse.json({
      sessionUserId: session.user.id,
      parsedUserId: userId,
      userIdType: typeof session.user.id,
      totalF1InDb: closures.length,
      f1CountWithEmailVerified: f1Count,
      f1CountRaw: closures.length
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}