import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'

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
  address?: string
}

interface PrecheckPayload {
  allNodes: TCANode[]
  memberInfo: Record<number, MemberInfo>
}

const normalizePhone = (phone: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) {
    return '0' + digits.substring(2);
  }
  if (digits.startsWith('0')) {
    return digits;
  }
  return phone;
}

export async function POST(request: Request) {
  try {
    const body: PrecheckPayload = await request.json()
    const { allNodes, memberInfo } = body

    console.log('[API/staging-sync] Staging sync request')
    console.log('Total nodes:', allNodes?.length || 0)

    if (!allNodes || !Array.isArray(allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload: allNodes required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Bước 1: Thu thập tất cả phone và email từ TCA Portal
    const tcaPhones = new Map<string, number>()
    const tcaEmails = new Map<string, number>()
    
    for (const node of allNodes) {
      const info = memberInfo?.[node.id] || {}
      if (info.phone) {
        const normalized = normalizePhone(info.phone)
        if (normalized) tcaPhones.set(normalized, node.id)
      }
      if (info.email) {
        tcaEmails.set(info.email.toLowerCase(), node.id)
      }
    }

    console.log('[API/staging-sync] TCA phones:', tcaPhones.size, 'emails:', tcaEmails.size)

    // Bước 2: Tìm các user trong Production có phone/email trùng
    let prodUsersMap = new Map<number, any>()
    
    // Tìm theo phone
    for (const [phone, tcaId] of tcaPhones) {
      const users = await prisma.user.findMany({
        where: { phone: { not: null } }
      })
      for (const user of users) {
        if (user.phone && normalizePhone(user.phone) === phone) {
          prodUsersMap.set(user.id, { ...user, matchedTcaId: tcaId })
        }
      }
    }

    // Tìm theo email
    for (const [email, tcaId] of tcaEmails) {
      const users = await prisma.user.findMany()
      for (const user of users) {
        if (user.email && user.email.toLowerCase() === email) {
          // Ưu tiên user đã được map trước đó (theo phone), nếu chưa có thì thêm mới
          if (!prodUsersMap.has(user.id)) {
            prodUsersMap.set(user.id, { ...user, matchedTcaId: tcaId })
          }
        }
      }
    }

    console.log('[API/staging-sync] Found', prodUsersMap.size, 'users in Production')

    // Bước 3: Copy dữ liệu từ Production sang Test (batch operations)
    let usersCopied = 0
    let systemsCopied = 0
    let tcaMembersCopied = 0

    // Batch copy user → userTest (kiểm tra tồn tại trước, tạo batch sau)
    const newUsers: any[] = []
    for (const [userId, prodUser] of prodUsersMap) {
      const existingTestUser = await (prisma as any).userTest.findUnique({
        where: { id: userId }
      })
      if (!existingTestUser) {
        newUsers.push({
          id: prodUser.id,
          name: prodUser.name,
          email: prodUser.email,
          phone: prodUser.phone,
          password: prodUser.password,
          role: prodUser.role,
          referrerId: prodUser.referrerId
        })
      }
    }
    if (newUsers.length > 0) {
      await (prisma as any).userTest.createMany({ data: newUsers })
      usersCopied = newUsers.length
      console.log(`[API/staging-sync] Batch copied ${newUsers.length} users`)
    }

    // Batch copy system → systemTest
    const allProdUserIds = [...prodUsersMap.keys()]
    const prodSystems = await prisma.system.findMany({
      where: { userId: { in: allProdUserIds } }
    })
    const existingSysAutoIds = await (prisma as any).systemTest.findMany({
      where: { autoId: { in: prodSystems.map(s => s.autoId) } },
      select: { autoId: true }
    })
    const existingSysSet = new Set(existingSysAutoIds.map((s: any) => s.autoId))
    
    const newSystems = prodSystems
      .filter(s => !existingSysSet.has(s.autoId))
      .map(s => ({ userId: s.userId, autoId: s.autoId, onSystem: s.onSystem }))
    if (newSystems.length > 0) {
      await (prisma as any).systemTest.createMany({ data: newSystems })
      systemsCopied = newSystems.length
      console.log(`[API/staging-sync] Batch copied ${newSystems.length} systems`)
    }

    // Batch copy TCAMember → TCAMemberTest
    const nodeIds = allNodes.map(n => n.id)
    const prodTCAMembers = await (prisma as any).tCAMember.findMany({
      where: { tcaId: { in: nodeIds } }
    })
    const existingTCATcaIds = await (prisma as any).tCAMemberTest.findMany({
      where: { tcaId: { in: prodTCAMembers.map((t: any) => t.tcaId) } },
      select: { tcaId: true }
    })
    const existingTCASet = new Set(existingTCATcaIds.map((t: any) => t.tcaId))
    
    const newTCAMembers = prodTCAMembers
      .filter((t: any) => !existingTCASet.has(t.tcaId))
      .map((t: any) => ({
        tcaId: t.tcaId, userId: t.userId, type: t.type, groupName: t.groupName,
        name: t.name, personalScore: t.personalScore, totalScore: t.totalScore,
        level: t.level, location: t.location, phone: t.phone, email: t.email,
        parentTcaId: t.parentTcaId, lastSyncedAt: t.lastSyncedAt,
        personalRate: t.personalRate, teamRate: t.teamRate,
        hasBH: t.hasBH, hasTD: t.hasTD,
        address: t.address, joinDate: t.joinDate,
        contractDate: t.contractDate, promotionDate: t.promotionDate
      }))
    if (newTCAMembers.length > 0) {
      await (prisma as any).tCAMemberTest.createMany({ data: newTCAMembers })
      tcaMembersCopied = newTCAMembers.length
      console.log(`[API/staging-sync] Batch copied ${newTCAMembers.length} TCAMembers`)
    }

    console.log('[API/staging-sync] Copied:', { usersCopied, systemsCopied, tcaMembersCopied })

    // Bước 4: Generate preview dựa trên dữ liệu TEST đã sync
    const lastUser = await (prisma as any).userTest.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    })
    let nextAvailableUserId = (lastUser?.id || 0) + 1

    const preview = {
      total: allNodes.length,
      nextAvailableUserId,
      rows: [] as any[]
    }

    for (const node of allNodes) {
      const info = memberInfo?.[node.id] || {}
      const phone = info.phone || null
      const email = info.email || null
      const normalizedPhone = normalizePhone(phone)

      // Tìm trong dữ liệu TEST (đã sync ở bước trên)
      let testUser: any = null
      let matchType = 'N'

      // Tìm theo phone trong UserTest
      if (normalizedPhone) {
        const users = await (prisma as any).userTest.findMany({
          where: { phone: { not: null } }
        })
        for (const user of users) {
          if (user.phone && normalizePhone(user.phone) === normalizedPhone) {
            testUser = user
            matchType = 'PE'
            break
          }
        }
      }

      // Tìm theo email trong UserTest nếu không tìm thấy theo phone
      if (!testUser && email) {
        const users = await (prisma as any).userTest.findMany()
        for (const user of users) {
          if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
            testUser = user
            matchType = 'PE'
            break
          }
        }
      }

      // Check System trong SystemTest
      if (testUser) {
        const sys = await (prisma as any).systemTest.findFirst({
          where: { userId: testUser.id }
        })
        if (sys) {
          matchType = matchType.includes('S') ? matchType : matchType + ' S'
        }
      }

      // Check TCAMember trong TCAMemberTest
      if (testUser) {
        const tca = await (prisma as any).tCAMemberTest.findUnique({
          where: { tcaId: node.id }
        })
        if (tca) {
          matchType = matchType.includes('TCA') ? matchType : matchType + ' TCA'
        }
      }

      // Resolve parent
      const parentId = node.parentFolderId
      const parentTcaId = (!parentId || parentId === 'root' || parentId === '0') ? null : Number(parentId)
      const TCA_ROOT_USER_ID = 861

      let parentUserId = TCA_ROOT_USER_ID
      if (parentTcaId) {
        const parentTCA = await (prisma as any).tCAMemberTest.findUnique({
          where: { tcaId: parentTcaId }
        })
        if (parentTCA?.userId) {
          parentUserId = parentTCA.userId
        }
      }

      const finalUserId = testUser?.id || (matchType === 'N' ? nextAvailableUserId++ : null)
      let action = ''

      if (matchType === 'N') {
        action = 'PE S TCA'
      } else if (matchType === 'PE') {
        action = 'S TCA'
      } else if (matchType === 'PE S') {
        action = 'TCA'
      } else if (matchType === 'PE S TCA' || matchType === 'S TCA') {
        action = 'SKIP'
      }

      preview.rows.push({
        id: node.id,
        name: node.name,
        type: node.type,
        match: matchType,
        db: testUser ? {
          userId: testUser.id,
          name: testUser.name,
          email: testUser.email,
          phone: testUser.phone,
          referrerId: testUser.referrerId
        } : null,
        userId: finalUserId,
        email,
        phone,
        parentTcaId,
        parentUserId,
        referrerId: parentUserId,
        refSysId: parentUserId,
        action,
        changes: []
      })
    }

    console.log('[API/staging-sync] Preview:', { total: preview.total, nextAvailableUserId: preview.nextAvailableUserId })

    return NextResponse.json({
      success: true,
      ...preview,
      stagingSync: { usersCopied, systemsCopied, tcaMembersCopied }
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/staging-sync] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'TCA Staging Sync API',
    version: '1.0.0',
    description: 'Sync dữ liệu từ Production sang Test trước khi preview',
    usage: {
      method: 'POST',
      body: {
        allNodes: 'Array of TCA nodes',
        memberInfo: 'Object of member details'
      }
    }
  }, { headers: CORS_HEADERS })
}