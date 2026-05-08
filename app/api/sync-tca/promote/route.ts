import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

/**
 * API Promote: Copy dữ liệu từ bảng Test → Production
 * Sau đó xóa dữ liệu trong bảng Test
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  let stats = { usersPromoted: 0, systemsPromoted: 0, tcaMembersPromoted: 0, testDataCleared: 0 }

  try {
    // 1. Lấy tất cả UserTest
    const userTests = await prisma.userTest.findMany()
    
    // 2. Promote UserTest → User
    for (const ut of userTests) {
      const existingUser = await prisma.user.findUnique({ where: { id: ut.id } })
      
      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { id: ut.id },
          data: {
            name: ut.name,
            phone: ut.phone,
            email: ut.email,
            role: ut.role,
            referrerId: ut.referrerId
          }
        })
      } else {
        // Create new user
        await prisma.user.create({
          data: {
            id: ut.id,
            name: ut.name,
            email: ut.email,
            phone: ut.phone,
            password: ut.password,
            role: ut.role,
            referrerId: ut.referrerId,
            passwordChanged: ut.passwordChanged
          }
        })
      }
      stats.usersPromoted++
    }

    // 3. Promote UserClosureTest → UserClosure
    const closureTests = await prisma.userClosureTest.findMany()
    for (const ct of closureTests) {
      await prisma.userClosure.upsert({
        where: { ancestorId_descendantId: { ancestorId: ct.ancestorId, descendantId: ct.descendantId } },
        update: { depth: ct.depth },
        create: { ancestorId: ct.ancestorId, descendantId: ct.descendantId, depth: ct.depth }
      })
    }

    // 4. Promote SystemTest → System
    const systemTests = await prisma.systemTest.findMany()
    for (const st of systemTests) {
      const existingSys = await prisma.system.findFirst({ 
        where: { userId: st.userId, onSystem: st.onSystem } 
      })
      
      if (existingSys) {
        await prisma.system.update({
          where: { autoId: existingSys.autoId },
          data: { refSysId: st.refSysId }
        })
      } else {
        await prisma.system.create({
          data: {
            userId: st.userId,
            onSystem: st.onSystem,
            refSysId: st.refSysId
          }
        })
      }
      stats.systemsPromoted++
    }

    // 5. Promote SystemClosureTest → SystemClosure
    const sysClosures = await prisma.systemClosureTest.findMany()
    for (const sc of sysClosures) {
      await prisma.systemClosure.upsert({
        where: { ancestorId_descendantId_systemId: { 
          ancestorId: sc.ancestorId, 
          descendantId: sc.descendantId,
          systemId: sc.systemId 
        } },
        update: { depth: sc.depth },
        create: { 
          ancestorId: sc.ancestorId, 
          descendantId: sc.descendantId, 
          depth: sc.depth,
          systemId: sc.systemId
        }
      })
    }

    // 6. Promote TCAMemberTest → TCAMember
    const tcaMemberTests = await prisma.tCAMemberTest.findMany()
    for (const tm of tcaMemberTests) {
      await prisma.tCAMember.upsert({
        where: { tcaId: tm.tcaId },
        update: {
          userId: tm.userId,
          type: tm.type,
          groupName: tm.groupName,
          name: tm.name,
          personalScore: tm.personalScore,
          totalScore: tm.totalScore,
          level: tm.level,
          location: tm.location,
          personalRate: tm.personalRate,
          teamRate: tm.teamRate,
          hasBH: tm.hasBH,
          hasTD: tm.hasTD,
          phone: tm.phone,
          email: tm.email,
          parentTcaId: tm.parentTcaId,
          lastSyncedAt: new Date()
        },
        create: {
          tcaId: tm.tcaId,
          userId: tm.userId,
          type: tm.type,
          groupName: tm.groupName,
          name: tm.name,
          personalScore: tm.personalScore,
          totalScore: tm.totalScore,
          level: tm.level,
          location: tm.location,
          personalRate: tm.personalRate,
          teamRate: tm.teamRate,
          hasBH: tm.hasBH,
          hasTD: tm.hasTD,
          phone: tm.phone,
          email: tm.email,
          parentTcaId: tm.parentTcaId,
          lastSyncedAt: new Date()
        }
      })
      stats.tcaMembersPromoted++
    }

    // 7. Xoa du lieu Test sau khi promote
    await prisma.userClosureTest.deleteMany()
    await prisma.systemClosureTest.deleteMany()
    await prisma.tCAMemberTest.deleteMany()
    await prisma.systemTest.deleteMany()
    await prisma.userTest.deleteMany()
    stats.testDataCleared = 1

    const duration = Date.now() - startTime
    return NextResponse.json({ 
      success: true, 
      stats, 
      message: `Promoted: ${stats.usersPromoted} users, ${stats.systemsPromoted} systems, ${stats.tcaMembersPromoted} tcaMembers. Test data cleared.`,
      duration 
    }, { headers: CORS_HEADERS })

  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'TCA Promote API', 
    description: 'Copy Test data to Production and clear Test tables',
    usage: 'POST with body: {}' 
  }, { headers: CORS_HEADERS })
}