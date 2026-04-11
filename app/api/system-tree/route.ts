import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { onSystem, f0UserId } = body

    if (!onSystem || !f0UserId) {
      return NextResponse.json({ error: 'Missing onSystem or f0UserId' }, { status: 400 })
    }

    // Kiểm tra xem đã có root trong hệ thống này chưa
    const existingRoot = await prisma.system.findFirst({
      where: { onSystem, refSysId: 0 }
    })

    if (existingRoot) {
      return NextResponse.json({ 
        error: 'Hệ thống đã có cây, không thể tạo mới', 
        existingRootId: existingRoot.userId
      }, { status: 400 })
    }

    // Tạo F0 - user đầu tiên làm root
    const systemRecord = await prisma.system.create({
      data: {
        userId: f0UserId,
        onSystem,
        refSysId: 0  // F0 = root
      }
    })

    // Tạo closure cho F0
    await prisma.systemClosure.create({
      data: {
        ancestorId: systemRecord.autoId,
        descendantId: systemRecord.autoId,
        depth: 0,
        systemId: onSystem
      }
    })

    return NextResponse.json({ 
      success: true, 
      treeId: onSystem,
      f0UserId,
      autoId: systemRecord.autoId
    })
  } catch (error) {
    console.error('[API] Create tree error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}