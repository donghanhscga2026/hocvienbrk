'use strict'

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userIdCondition } = body

    if (!userIdCondition) {
      return NextResponse.json({ error: 'Thieu dieu kien' }, { status: 400, headers: CORS_HEADERS })
    }

    // Build where
    const userWhere: Prisma.UserWhereInput = {}
    if (userIdCondition.type === 'gte') {
      userWhere.id = { gte: userIdCondition.value || 0 }
    } else if (userIdCondition.type === 'between') {
      userWhere.id = { gte: userIdCondition.valueA || 0, lte: userIdCondition.valueB || 999999 }
    } else if (userIdCondition.type === 'in') {
      userWhere.id = { in: userIdCondition.values || [] }
    } else {
      userWhere.id = { gte: 0 }
    }

    const users = await prisma.user.findMany({ where: userWhere, select: { id: true } })
    if (users.length === 0) {
      return NextResponse.json({ error: 'Khong tim thay user' }, { status: 404, headers: CORS_HEADERS })
    }

    const ids = users.map(u => u.id)

    // Count each table
    const userClosures = await prisma.userClosure.findMany({ where: { descendantId: { in: ids } } })
    const userClosuresCount = userClosures.length

    const systems = await prisma.system.findMany({ where: { userId: { in: ids } }, select: { autoId: true } })
    const systemIds = systems.map(s => s.autoId)
    const systemsCount = systems.length

    const systemClosures = await prisma.systemClosure.findMany({
      where: {
        OR: [
          { descendantId: { in: systemIds } },
          { ancestorId: { in: systemIds } }
        ]
      }
    })
    const systemClosuresCount = systemClosures.length

    const tcaMembers = await prisma.tCAMember.findMany({
      where: {
        OR: [
          { userId: { in: ids } },
          { tcaId: { in: ids } }
        ]
      }
    })
    const tcaMembersCount = tcaMembers.length

    // Fetch actual user data for preview
    const usersPreview = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, phone: true, email: true }
    })

    const systemsPreview = await prisma.system.findMany({
      where: { userId: { in: ids } },
      include: { user: { select: { name: true } } }
    })

    const tcaMembersPreview = await prisma.tCAMember.findMany({
      where: {
        OR: [
          { userId: { in: ids } },
          { tcaId: { in: ids } }
        ]
      }
    })

    const usersCount = users.length

    const counts = {
      userClosures: userClosuresCount,
      systemClosures: systemClosuresCount,
      tcaMembers: tcaMembersCount,
      systems: systemsCount,
      users: usersCount,
      total: userClosuresCount + systemClosuresCount + tcaMembersCount + systemsCount + usersCount
    }

    const message = `Tim thay ${ids.length} users. Se xoa ${counts.total} records.`

    // Preview only
    if (action !== 'delete') {
      return NextResponse.json({
        success: true,
        stats: counts,
        message,
        users: usersPreview,
        systems: systemsPreview,
        tcaMembers: tcaMembersPreview
      }, { headers: CORS_HEADERS })
    }

    // Delete mode
    if (body.confirmation !== 'XACNHANXOA') {
      return NextResponse.json({ error: 'Go "XACNHANXOA" de xoa' }, { status: 400, headers: CORS_HEADERS })
    }

    // Delete with transaction
    const deleted = { userClosures: 0, systemClosures: 0, tcaMembers: 0, systems: 0, users: 0, total: 0 }

    await prisma.$transaction(async (tx) => {
      const uc = await tx.userClosure.deleteMany({ where: { descendantId: { in: ids } } })
      deleted.userClosures = uc.count || 0

      const sc = await tx.systemClosure.deleteMany({
        where: {
          OR: [
            { descendantId: { in: systemIds } },
            { ancestorId: { in: systemIds } }
          ]
        }
      })
      deleted.systemClosures = sc.count || 0

      const tc = await tx.tCAMember.deleteMany({
        where: {
          OR: [
            { userId: { in: ids } },
            { tcaId: { in: ids } }
          ]
        }
      })
      deleted.tcaMembers = tc.count || 0

      const sy = await tx.system.deleteMany({ where: { userId: { in: ids } } })
      deleted.systems = sy.count || 0

      const safeIds = ids.filter((id: number) => id > 100)
      if (safeIds.length > 0) {
        const u = await tx.user.deleteMany({ where: { id: { in: safeIds } } })
        deleted.users = u.count || 0
      }
    })

    deleted.total = deleted.userClosures + deleted.systemClosures + deleted.tcaMembers + deleted.systems + deleted.users

    return NextResponse.json({
      success: true,
      deleted,
      message: `Da xoa: ${deleted.users} users, ${deleted.systems} systems, ${deleted.tcaMembers} tcaMembers, ${deleted.systemClosures} closures, ${deleted.userClosures} userClosures`
    }, { headers: CORS_HEADERS })

  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500, headers: CORS_HEADERS })
  }
}