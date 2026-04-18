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
}

interface MemberInfo {
  phone?: string
  email?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { allNodes, memberInfo } = body

    if (!allNodes || !Array.isArray(allNodes)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: CORS_HEADERS })
    }

    // Gọi API preview ĐỂ LẤY DATA (đã test OK)
    const previewUrl = process.env.VERCEL_URL 
      ? 'https://' + process.env.VERCEL_URL 
      : 'http://localhost:3000'
    
    const previewRes = await fetch(previewUrl + '/api/sync-tca/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allNodes, memberInfo: memberInfo || {} })
    })

    const preview = await previewRes.json()

    if (!preview.success || !preview.rows) {
      return NextResponse.json(
        { error: 'Preview API failed: ' + preview.error },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Format từ preview.rows -> 5 tables
    const User: any[] = []
    const user_closure: any[] = []
    const TCAMember: any[] = []
    const System: any[] = []
    const SystemClosure: any[] = []

    // Map tcaId -> userId cho closure
    const tcaIdToUserId = new Map<number, number>()

    // Sort theo depth de build closure
    const rowMap = new Map<number, any>()
    preview.rows.forEach((r: any) => rowMap.set(r.tcaId, r))

    function getDepth(r: any): number {
      if (!r.parentTcaId) return 0
      const parent = rowMap.get(r.parentTcaId)
      return parent ? 1 + getDepth(parent) : 0
    }

    const sortedRows = [...preview.rows].sort((a, b) => getDepth(a) - getDepth(b))

    // Build tables
    for (const row of sortedRows) {
      const userId = row.expectedUserId || (row.currentData?.userId ?? 0)
      if (!userId) continue

      tcaIdToUserId.set(row.tcaId, userId)
      const isCreate = !!row.expectedUserId

      // === User ===
      User.push({
        table: 'User',
        action: isCreate ? 'CREATE' : 'EXISTS',
        id: userId,
        name: row.name,
        email: row.email,
        phone: row.phone,
        referrerId: row.expectedReferrerId || row.currentData?.referrerId || 0
      })

      // === user_closure ===
      if (row.expectedReferrerId && isCreate) {
        user_closure.push({
          table: 'user_closure',
          action: 'CREATE',
          ancestorId: row.expectedReferrerId,
          descendantId: userId,
          depth: 1
        })
      }

      // === TCAMember ===
      TCAMember.push({
        table: 'TCAMember',
        action: isCreate ? 'CREATE' : 'UPDATE',
        tcaId: row.tcaId,
        userId: userId,
        name: row.name,
        parentTcaId: row.parentTcaId,
        phone: row.phone,
        email: row.email
      })

      // === System ===
      System.push({
        table: 'System',
        action: isCreate ? 'CREATE' : 'UPDATE',
        userId: userId,
        onSystem: 1,
        refSysId: row.expectedReferrerId || 0
      })

      // === SystemClosure (self) ===
      SystemClosure.push({
        table: 'SystemClosure',
        action: 'CREATE',
        ancestorId: userId,
        descendantId: userId,
        depth: 0,
        systemId: 1
      })

      // === SystemClosure (copy from parent) ===
      if (row.parentTcaId) {
        const parentUserId = tcaIdToUserId.get(row.parentTcaId)
        if (parentUserId) {
          const parentClosures = SystemClosure.filter(sc => sc.descendantId === parentUserId)
          for (const pc of parentClosures) {
            SystemClosure.push({
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
    }

    const summary = {
      totalTCA: preview.total,
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
  }
}