import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { onSystem, nodeId } = body

    if (!onSystem || !nodeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Lấy thông tin node trong System table
    const nodeRecord = await prisma.system.findFirst({
      where: { userId: nodeId, onSystem }
    })

    if (!nodeRecord) {
      return NextResponse.json({ error: 'Node not in this system' }, { status: 400 })
    }

    // Không cho phép xóa F0 (root) - refSysId = 0
    if (nodeRecord.refSysId === 0) {
      return NextResponse.json({ error: 'Không thể xóa F0 (root)' }, { status: 400 })
    }

    // Kiểm tra xem node có con không (chỉ xóa node không có con)
    const hasChildren = await prisma.system.findFirst({
      where: { refSysId: nodeRecord.autoId, onSystem }
    })

    if (hasChildren) {
      return NextResponse.json({ error: 'Không thể xóa node có F1. Hãy xóa F1 trước.' }, { status: 400 })
    }

    // Xóa closure entries liên quan đến node này
    await prisma.systemClosure.deleteMany({
      where: { 
        OR: [
          { ancestorId: nodeRecord.autoId },
          { descendantId: nodeRecord.autoId }
        ],
        systemId: onSystem
      }
    })

    // Xóa bản ghi System
    await prisma.system.delete({
      where: { autoId: nodeRecord.autoId }
    })

    return NextResponse.json({ 
      success: true, 
      nodeId
    })
  } catch (error) {
    console.error('[API] Delete node error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}