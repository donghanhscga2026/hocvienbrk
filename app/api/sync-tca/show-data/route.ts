import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

interface ShowDataPayload {
  allNodes: any[]
  memberInfo: Record<number, any>
}

// Sort: parents first
function sortByHierarchy(nodes: any[]) {
  const nodeMap = new Map<number, any>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  function getDepth(node: any): number {
    const pid = node.parentFolderId
    if (!pid || pid === 'root' || pid === '0') return 0
    const parent = nodeMap.get(Number(pid))
    if (!parent) return 0
    return 1 + getDepth(parent)
  }

  return [...nodes].sort((a, b) => getDepth(a) - getDepth(b))
}

export async function POST(request: Request) {
  try {
    const body: ShowDataPayload = await request.json()

    if (!body.allNodes || !Array.isArray(body.allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Lấy users từ DB để map phone/email -> user
    const users = await prisma.user.findMany({ 
      where: { phone: { not: null } },
      select: { id: true, name: true, email: true, phone: true, referrerId: true }
    })
    
    const phoneToUser = new Map<string, any>()
    const emailToUser = new Map<string, any>()
    for (const u of users) {
      if (u.phone) phoneToUser.set(u.phone.replace(/\D/g, ''), u)
      if (u.email) emailToUser.set(u.email.toLowerCase(), u)
    }

    // Sort nodes parents first
    const sortedNodes = sortByHierarchy(body.allNodes)

    // Mock data structures (NHƯ KHI INSERT THẬT)
    let tcaIdToUserId = new Map<number, number>()
    const mockUsers: any[] = []
    const mockUserClosures: any[] = []
    const mockTCAMembers: any[] = []
    const mockSystems: any[] = []
    const mockSystemClosures: any[] = []
    
    let nextUserId = 0
    const maxUser = await prisma.user.findFirst({ orderBy: { id: 'desc' } })
    nextUserId = (maxUser?.id || 0) + 1

    const reserved = await prisma.reservedId.findMany({ select: { id: true } })
    const reservedIds = new Set(reserved.map(r => r.id))
    const reservedIdList = Array.from(reservedIds)

    for (const node of sortedNodes) {
      const info = body.memberInfo?.[node.id] || {}
      const phone = info.phone || ''
      const normalizedPhone = phone.replace(/\D/g, '')
      const email = info.email || ''
      
      // === BƯỚC 1: USER ===
      let userId: number
      let action: string
      let existingUser = null
      
      if (normalizedPhone) existingUser = phoneToUser.get(normalizedPhone)
      if (!existingUser && email) existingUser = emailToUser.get(email.toLowerCase())
      
      if (existingUser) {
        userId = existingUser.id
        action = 'EXISTS'
      } else {
        while (reservedIdList.includes(nextUserId) || users.find(u => u.id === nextUserId)) {
          nextUserId++
        }
        userId = nextUserId++
        action = 'CREATE'
      }

      tcaIdToUserId.set(node.id, userId)

      // Parent lookup cho closure
      let parentUserId: number | null = null
      if (node.parentFolderId && node.parentFolderId !== 'root' && node.parentFolderId !== '0') {
        parentUserId = tcaIdToUserId.get(Number(node.parentFolderId)) ?? null
      }
      const referrerId = existingUser?.referrerId ?? parentUserId

      // === BƯỚC 2: USER_CLOSURE ===
      if (referrerId) {
        mockUserClosures.push({
          table: 'user_closure',
          action: 'CREATE',
          ancestorId: referrerId,
          descendantId: userId,
          depth: 1
        })
      }

      // === BƯỚC 3: TCAMEMBER ===
      mockTCAMembers.push({
        table: 'TCAMember',
        action: action === 'EXISTS' ? 'UPDATE' : 'CREATE',
        tcaId: node.id,
        userId: userId,
        name: node.name,
        parentTcaId: (node.parentFolderId === 'root' || !node.parentFolderId) ? null : Number(node.parentFolderId),
        phone: phone,
        email: email
      })

      // === BƯỚC 4: SYSTEM ===
      mockSystems.push({
        table: 'System',
        action: action === 'EXISTS' ? 'UPDATE' : 'CREATE',
        userId: userId,
        onSystem: 1,
        refSysId: parentUserId || 0
      })

      // === BƯỚC 5: SYSTEM_CLOSURE ===
      mockSystemClosures.push({
        table: 'SystemClosure',
        action: 'CREATE',
        ancestorId: userId,
        descendantId: userId,
        depth: 0,
        systemId: 1
      })
      
      if (parentUserId && parentUserId > 0) {
        const parentClosures = mockSystemClosures.filter((c: any) => c.descendantId === parentUserId)
        for (const pc of parentClosures) {
          mockSystemClosures.push({
            table: 'SystemClosure',
            action: 'CREATE',
            ancestorId: pc.ancestorId,
            descendantId: userId,
            depth: pc.depth + 1,
            systemId: 1
          })
        }
      }
    }

    // Summary
    const summary = {
      users: mockUsers.length,
      userClosures: mockUserClosures.length,
      tcaMembers: mockTCAMembers.length,
      systems: mockSystems.length,
      systemClosures: mockSystemClosures.length
    }

    const allRecords = [
      ...mockUsers,
      ...mockUserClosures,
      ...mockTCAMembers,
      ...mockSystems,
      ...mockSystemClosures
    ]

    return NextResponse.json({
      success: true,
      summary,
      tables: {
        User: mockUsers,
        user_closure: mockUserClosures,
        TCAMember: mockTCAMembers,
        System: mockSystems,
        SystemClosure: mockSystemClosures
      },
      allRecords
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/tca-show-data] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  } finally {
    await prisma.$disconnect()
  }
}