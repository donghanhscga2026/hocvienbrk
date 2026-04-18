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

export async function POST(request: Request) {
  try {
    const body: ShowDataPayload = await request.json()

    if (!body.allNodes || !Array.isArray(body.allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // GỌI API PREVIEW ĐỂ LẤY DỮ LIỆU ĐÚNG!
    const previewUrl = process.env.API_BASE_URL || 'http://localhost:3000'
    const previewResponse = await fetch(previewUrl + '/api/sync-tca/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        allNodes: body.allNodes,
        memberInfo: body.memberInfo
      })
    })

    const previewResult = await previewResponse.json()

    if (!previewResult?.rows) {
      return NextResponse.json(
        { error: 'Preview API failed: ' + previewResult?.error },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    const rows = previewResult.rows

    // Build tables từ preview data
    const User: any[] = []
    const user_closure: any[] = []
    const TCAMember: any[] = []
    const System: any[] = []
    const SystemClosure: any[] = []

    // Map tcaId -> userId cho closure
    const nodeMap = new Map<number, any>()
    rows.forEach((r: any) => nodeMap.set(r.tcaId, r))

    function getDepth(tcaId: number): number {
      const r = nodeMap.get(tcaId)
      if (!r || !r.parentTcaId) return 0
      return 1 + getDepth(r.parentTcaId)
    }

    const sortedRows = [...rows].sort((a, b) => getDepth(a.tcaId) - getDepth(b.tcaId))
    const tcaIdToUserId = new Map<number, number>()

    for (const row of sortedRows) {
      const uid = row.expectedUserId || row.userId
      const action = row.expectedUserId ? 'CREATE' : 'EXISTS'

      tcaIdToUserId.set(row.tcaId, uid)

      // User
      User.push({
        table: 'User',
        action: action,
        id: uid,
        name: row.name,
        email: row.email,
        phone: row.phone,
        referrerId: row.expectedReferrerId || row.referrerId || 0
      })

      // user_closure
      if (row.referrerId && row.expectedUserId) {
        user_closure.push({
          table: 'user_closure',
          action: 'CREATE',
          ancestorId: row.referrerId,
          descendantId: uid,
          depth: 1
        })
      }

      // TCAMember
      TCAMember.push({
        table: 'TCAMember',
        action: row.expectedUserId ? 'CREATE' : 'UPDATE',
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
        action: row.expectedUserId ? 'CREATE' : 'UPDATE',
        userId: uid,
        onSystem: 1,
        refSysId: row.expectedReferrerId || 0
      })

      // SystemClosure
      SystemClosure.push({
        table: 'SystemClosure',
        action: 'CREATE',
        ancestorId: uid,
        descendantId: uid,
        depth: 0,
        systemId: 1
      })

      const parentTcaId = row.parentTcaId
      if (parentTcaId) {
        const parentUserId = tcaIdToUserId.get(parentTcaId)
        if (parentUserId) {
          const parentClosures = SystemClosure.filter(sc => sc.descendantId === parentUserId)
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
      users: User.length,
      userClosures: user_closure.length,
      tcaMembers: TCAMember.length,
      systems: System.length,
      systemClosures: SystemClosure.length
    }

    const allRecords = [...User, ...user_closure, ...TCAMember, ...System, ...SystemClosure]

    return NextResponse.json({
      success: true,
      summary,
      tables: { User, user_closure, TCAMember, System, SystemClosure },
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