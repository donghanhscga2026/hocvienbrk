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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { allNodes, memberInfo } = body

    if (!allNodes || !Array.isArray(allNodes)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: CORS_HEADERS })
    }

    // === GỌI TRỰC TIẾP PREVIEW LOGIC (không HTTP!) ===
    
    // 1. Lấy users từ DB
    const users = await prisma.user.findMany({ 
      where: { phone: { not: null } },
      select: { id: true, name: true, email: true, phone: true, referrerId: true }
    })
    
    const phoneToUser = new Map<string, any>()
    for (const u of users) {
      if (u.phone) phoneToUser.set(u.phone.replace(/\D/g, ''), u)
    }

    // 2. Sort nodes parents first
    const nodeMap = new Map<number, any>()
    allNodes.forEach((n: any) => nodeMap.set(n.id, n))

    function getDepth(n: any): number {
      const pid = n.parentFolderId
      if (!pid || pid === 'root' || pid === '0') return 0
      const parent = nodeMap.get(Number(pid))
      return parent ? 1 + getDepth(parent) : 0
    }

    const sortedNodes = [...allNodes].sort((a, b) => getDepth(a) - getDepth(b))

    // 3. Get next user ID
    const maxUser = await prisma.user.findFirst({ orderBy: { id: 'desc' } })
    let nextUserId = (maxUser?.id || 0) + 1
    const reserved = await prisma.reservedId.findMany({ select: { id: true } })
    const reservedIds = new Set(reserved.map((r: any) => r.id))

    // 4. Process each node
    const rows: any[] = []
    const tcaIdToUserId = new Map<number, number>()

    for (const node of sortedNodes) {
      const info = memberInfo?.[node.id] || {}
      const phone = info.phone || ''
      const normalizedPhone = phone.replace(/\D/g, '')
      const email = info.email || ''

      // Find existing user
      let existingUser = normalizedPhone ? phoneToUser.get(normalizedPhone) : null
      if (!existingUser && email) {
        existingUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
      }

      // Determine parent
      let parentTcaId: number | null = null
      let parentUserId: number | null = null
      
      if (node.parentFolderId && node.parentFolderId !== 'root' && node.parentFolderId !== '0') {
        parentTcaId = Number(node.parentFolderId)
        parentUserId = tcaIdToUserId.get(parentTcaId) || 861
      }

      // Determine expected IDs
      let expectedUserId: number | null = null
      if (!existingUser) {
        while (reservedIds.has(nextUserId) || users.find((u: any) => u.id === nextUserId)) {
          nextUserId++
        }
        expectedUserId = nextUserId++
      }

      const userId = existingUser?.id || expectedUserId
      tcaIdToUserId.set(node.id, userId)

      const isCreate = !!expectedUserId

      // Build row (giống preview)
      rows.push({
        tcaId: node.id,
        name: node.name,
        type: node.type,
        email,
        phone,
        action: isCreate ? 'CREATE' : 'SKIP',
        expectedUserId,
        expectedReferrerId: parentUserId || 861,
        currentData: existingUser ? { userId: existingUser.id, referrerId: existingUser.referrerId } : null,
        parentTcaId
      })
    }

    // === FORMAT TO 5 TABLES ===
    const User: any[] = []
    const user_closure: any[] = []
    const TCAMember: any[] = []
    const System: any[] = []
    const SystemClosure: any[] = []

    const mapTcaToUser = new Map<number, number>()

    for (const row of rows) {
      const uid = row.expectedUserId || row.currentData?.userId
      if (!uid) continue

      mapTcaToUser.set(row.tcaId, uid)
      const isCreate = !!row.expectedUserId

      // User
      User.push({
        table: 'User',
        action: isCreate ? 'CREATE' : 'EXISTS',
        id: uid,
        name: row.name,
        email: row.email,
        phone: row.phone,
        referrerId: row.expectedReferrerId || 0
      })

      // user_closure
      if (row.expectedReferrerId && isCreate) {
        user_closure.push({
          table: 'user_closure',
          action: 'CREATE',
          ancestorId: row.expectedReferrerId,
          descendantId: uid,
          depth: 1
        })
      }

      // TCAMember
      TCAMember.push({
        table: 'TCAMember',
        action: isCreate ? 'CREATE' : 'UPDATE',
        tcaId: row.tcaId,
        userId: uid,
        name: row.name,
        parentTcaId: row.parentTcaId,
        phone: row.phone,
        email: row.email
      })

      // System
      System.push({
        table: 'System',
        action: isCreate ? 'CREATE' : 'UPDATE',
        userId: uid,
        onSystem: 1,
        refSysId: row.expectedReferrerId || 0
      })

      // SystemClosure - self
      SystemClosure.push({
        table: 'SystemClosure',
        action: 'CREATE',
        ancestorId: uid,
        descendantId: uid,
        depth: 0,
        systemId: 1
      })

      // SystemClosure - copy from parent
      if (row.parentTcaId) {
        const parentUid = mapTcaToUser.get(row.parentTcaId)
        if (parentUid) {
          const parentClosures = SystemClosure.filter(sc => sc.descendantId === parentUid)
          for (const pc of parentClosures) {
            SystemClosure.push({
              table: 'SystemClosure',
              action: 'CREATE',
              ancestorId: pc.ancestorId,
              descendantId: uid,
              depth: pc.depth + 1,
              systemId: 1
            })
          }
        }
      }
    }

    const summary = {
      totalTCA: rows.length,
      usersToCreate: User.filter(u => u.action === 'CREATE').length,
      usersExists: User.filter(u => u.action === 'EXISTS').length,
      userClosures: user_closure.length,
      tcaMembers: TCAMember.length,
      systems: System.length,
      systemClosures: SystemClosure.length
    }

    return NextResponse.json({
      success: true,
      summary,
      tables: { User, user_closure, TCAMember, System, SystemClosure }
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[DemoPreview] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500, headers: CORS_HEADERS })
  } finally {
    await prisma.$disconnect()
  }
}