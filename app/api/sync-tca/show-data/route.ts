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

async function getUsersWithPhoneMap() {
  const users = await prisma.user.findMany({ 
    where: { id: { lte: 900 }, phone: { not: null } } 
  })
  const phoneToUser = new Map<string, any>()
  for (const user of users) {
    if (user.phone) {
      phoneToUser.set(user.phone.replace(/\D/g, ''), user)
    }
  }
  return { users, phoneToUser }
}

function sortByHierarchy(nodes: any[]) {
  const nodeMap = new Map<number, any>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  function getDepth(node: any): number {
    const pid = node.parentFolderId
    if (!pid || pid === 'root' || pid === '0') return 0
    const parentId = Number(pid)
    if (!parentId) return 0
    const parent = nodeMap.get(parentId)
    if (!parent) return 0
    return 1 + getDepth(parent)
  }

  return [...nodes].sort((a, b) => getDepth(a) - getDepth(b))
}

async function simulatePreview(nodes: any[], memberInfo: Record<number, any>) {
  const { users, phoneToUser } = await getUsersWithPhoneMap()
  
  const tcaIdToUserId = new Map<number, number>()
  const result = {
    users: [] as any[],
    userClosures: [] as any[],
    tcaMembers: [] as any[],
    systems: [] as any[],
    systemClosures: [] as any[]
  }

  // Sort nodes
  const sortedNodes = sortByHierarchy(nodes)

  for (const node of sortedNodes) {
    const info = memberInfo[node.id] || {}
    const phone = info.phone || ''
    const normalizedPhone = phone.replace(/\D/g, '')
    const email = info.email || ''

    // BƯỚC 1: USER
    let existingUser = phoneToUser.get(normalizedPhone)
    let existsUser = !!existingUser
    let userId: number

    if (!existingUser && email) {
      existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingUser) existsUser = true
    }

    if (existsUser) {
      userId = existingUser.id
    } else {
      userId = 9000 + node.id
    }

    tcaIdToUserId.set(node.id, userId)

    // BƯỚC 2: USER_CLOSURE
    const referrerId = existingUser?.referrerId ?? null
    if (existsUser && referrerId) {
      result.userClosures.push({
        ancestorId: referrerId,
        descendantId: userId,
        depth: 1
      })
    }

    // BƯỚC 3: TCAMEMBER
    result.tcaMembers.push({
      tcaId: node.id,
      userId: userId,
      name: node.name,
      parentTcaId: node.parentFolderId,
      phone: phone,
      email: email
    })

    // BƯỚC 4: SYSTEM
    let parentUserId: number | null = null
    const parentTcaId = node.parentFolderId
    if (parentTcaId && parentTcaId !== 'root' && parentTcaId !== '0') {
      parentUserId = tcaIdToUserId.get(Number(parentTcaId)) ?? null
    }
    const refSysId = parentUserId ?? 0

    result.systems.push({
      userId: userId,
      onSystem: 1,
      refSysId: refSysId,
      tcaId: node.id
    })

    // BƯỚC 5: SYSTEM_CLOSURE
    result.systemClosures.push({
      ancestorId: userId,
      descendantId: userId,
      depth: 0,
      systemId: 1
    })

    if (parentUserId && parentUserId > 0) {
      const parentClosures = result.systemClosures.filter(c => c.descendantId === parentUserId)
      for (const closure of parentClosures) {
        result.systemClosures.push({
          ancestorId: closure.ancestorId,
          descendantId: userId,
          depth: closure.depth + 1,
          systemId: 1
        })
      }
    }
  }

  return result
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

    // Simulate and get data
    const simulated = await simulatePreview(body.allNodes, body.memberInfo || {})

    return NextResponse.json({
      success: true,
      tables: {
        User: simulated.users,
        user_closure: simulated.userClosures,
        TCAMember: simulated.tcaMembers,
        System: simulated.systems,
        SystemClosure: simulated.systemClosures
      },
      summary: {
        users: simulated.users.length,
        userClosures: simulated.userClosures.length,
        tcaMembers: simulated.tcaMembers.length,
        systems: simulated.systems.length,
        systemClosures: simulated.systemClosures.length
      }
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