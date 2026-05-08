import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const message = await prisma.message.findUnique({
      where: { id: parseInt(id) }
    })
    
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    await prisma.message.update({
      where: { id: parseInt(id) },
      data: { isActive: !message.isActive }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle message' }, { status: 500 })
  }
}
