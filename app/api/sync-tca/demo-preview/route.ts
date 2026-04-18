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

interface TCANode {
  id: number
  type: string
  name: string
  parentFolderId?: number | string
  personalScore?: string
  totalScore?: string
  level?: string
}

interface MemberInfo {
  phone?: string
  email?: string
  address?: string
  joinDate?: string
  contractDate?: string
  promotionDate?: string
}

interface DemoPreviewPayload {
  allNodes: TCANode[]
  memberInfo: Record<number, MemberInfo>
}

// Lấy users từ DB để map phone -> user
async function getUsersWithPhoneMap() {
  const users = await prisma.user.findMany({
    where: { 
      id: { lte: 900 },
      phone: { not: null }
    }
  })
  
  const phoneToUser = new Map<string, any>()
  for (const user of users) {
    if (user.phone) {
      const phone = user.phone.replace(/\D/g, '')
      phoneToUser.set(phone, user)
    }
  }
  return { users, phoneToUser }
}

// Sort nodes: root first, rồi theo depth
function sortNodesByHierarchy(nodes: TCANode[]) {
  const nodeMap = new Map<number, TCANode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  function getDepth(node: TCANode): number {
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
    const body: DemoPreviewPayload = await request.json()

    console.log('[API/tca-demo-preview] Called with', body.allNodes?.length, 'nodes')

    if (!body.allNodes || !Array.isArray(body.allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload: allNodes required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { users, phoneToUser } = await getUsersWithPhoneMap()

    // Sort nodes parents first
    const sortedNodes = sortNodesByHierarchy(body.allNodes)

    // Build preview data
    const tcaIdToUserId = new Map<number, number>()
    const preview = {
      users: [] as any[],
      userClosures: [] as any[],
      tcaMembers: [] as any[],
      systems: [] as any[],
      systemClosures: [] as any[]
    }

    for (const node of sortedNodes) {
      const info = body.memberInfo?.[node.id] || {}
      const phone = info.phone || ''
      const normalizedPhone = phone.replace(/\D/g, '')
      const email = info.email || ''

      // ========== BƯỚC 1: USER ==========
      let existingUser = phoneToUser.get(normalizedPhone)
      let existsUser = !!existingUser
      let userId: number

      // Nếu không tìm thấy theo phone, tìm theo email
      if (!existingUser && email) {
        existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingUser) existsUser = true
      }

      if (existsUser) {
        userId = existingUser.id
        preview.users.push({
          action: 'EXISTS',
          userId: userId,
          name: existingUser.name,
          email: existingUser.email,
          phone: existingUser.phone,
          tcaId: node.id
        })
      } else {
        // Tạo user mới (gán ID tạm)
        userId = 9000 + node.id // ID tạm để preview
        preview.users.push({
          action: 'CREATE',
          userId: userId,
          name: node.name,
          email: email,
          phone: phone,
          tcaId: node.id
        })
      }

      // Lưu map để dùng cho children
      tcaIdToUserId.set(node.id, userId)

      // ========== BƯỚC 2: USER_CLOSURE (theo referrerID) ==========
      const referrerId = existingUser?.referrerId ?? null
      if (existsUser && referrerId) {
        preview.userClosures.push({
          action: 'EXISTS',
          ancestorId: referrerId,
          descendantId: userId,
          depth: 1
        })
      }

      // ========== BƯỚC 3: TCAMEMBER ==========
      preview.tcaMembers.push({
        action: existsUser ? 'UPDATE' : 'CREATE',
        tcaId: node.id,
        userId: userId,
        name: node.name,
        parentTcaId: node.parentFolderId === 'root' ? null : node.parentFolderId,
        phone: phone,
        email: email
      })

      // ========== BƯỚC 4: SYSTEM (refSysId theo cây TCA) ==========
      let parentUserId: number | null = null
      const parentTcaId = node.parentFolderId

      if (parentTcaId && parentTcaId !== 'root' && parentTcaId !== '0') {
        parentUserId = tcaIdToUserId.get(Number(parentTcaId)) ?? null
      }

      const systemRefSysId = parentUserId ?? 0 // 0 = root

      preview.systems.push({
        action: 'CREATE',
        userId: userId,
        onSystem: 1, // TCA
        refSysId: systemRefSysId,
        tcaId: node.id
      })

      // ========== BƯỚC 5: SYSTEM_CLOSURE ==========
      // Self-closure
      preview.systemClosures.push({
        ancestorId: userId,
        descendantId: userId,
        depth: 0,
        systemId: 1
      })

      // Nếu có parent, copy closures từ parent
      if (parentUserId && parentUserId > 0) {
        const parentSystemId = parentUserId // Trong preview, dùng tạm
        // Tìm closures của parent (đã có trong preview)
        const parentClosures = preview.systemClosures.filter(
          c => c.descendantId === parentUserId
        )
        for (const closure of parentClosures) {
          preview.systemClosures.push({
            ancestorId: closure.ancestorId,
            descendantId: userId,
            depth: closure.depth + 1,
            systemId: 1
          })
        }
      }
    }

    // Format response
    const response = {
      success: true,
      summary: {
        totalTCA: body.allNodes.length,
        usersToCreate: preview.users.filter(u => u.action === 'CREATE').length,
        usersExists: preview.users.filter(u => u.action === 'EXISTS').length,
        userClosures: preview.userClosures.length,
        tcaMembers: preview.tcaMembers.length,
        systems: preview.systems.length,
        systemClosures: preview.systemClosures.length
      },
      data: preview
    }

    console.log('[API/tca-demo-preview] Done:', response.summary)

    return NextResponse.json(response, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/tca-demo-preview] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  } finally {
    await prisma.$disconnect()
  }
}