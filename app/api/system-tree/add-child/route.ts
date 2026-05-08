import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { onSystem, parentId, childId } = body

    if (!onSystem || !parentId || !childId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Lấy thông tin parent trong System table
    const parentRecord = await prisma.system.findFirst({
      where: { userId: parentId, onSystem }
    })

    if (!parentRecord) {
      return NextResponse.json({ error: 'Parent user not in this system' }, { status: 400 })
    }

    // Kiểm tra xem child đã có trong hệ thống chưa
    const existingChild = await prisma.system.findFirst({
      where: { userId: childId, onSystem }
    })

    if (existingChild) {
      return NextResponse.json({ error: 'User đã có trong hệ thống' }, { status: 400 })
    }

    // Tạo bản ghi System cho F1 (child có refSysId = parent userId)
    const systemRecord = await prisma.system.create({
      data: {
        userId: childId,
        onSystem,
        refSysId: parentId
      }
    })

    // Lấy tất cả ancestors của parent (bao gồm cả parent)
    const parentAncestors = await prisma.systemClosure.findMany({
      where: { descendantId: parentRecord.autoId, systemId: onSystem }
    })

    // Tạo closure entries cho child:
    // 1. Child là descendant của tất cả ancestors của parent
    for (const ancestor of parentAncestors) {
      await prisma.systemClosure.create({
        data: {
          ancestorId: ancestor.ancestorId,
          descendantId: systemRecord.autoId,
          depth: ancestor.depth + 1,
          systemId: onSystem
        }
      })
    }

    // 2. Child là descendant của chính nó với depth = 0
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
      parentId,
      childId,
      autoId: systemRecord.autoId
    })
  } catch (error) {
    console.error('[API] Add child error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}