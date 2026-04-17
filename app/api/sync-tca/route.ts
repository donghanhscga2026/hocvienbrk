import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

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
  groupName?: string
  name: string
  personalScore?: string
  totalScore?: string
  level?: string
  location?: string
  personalRate?: string
  teamRate?: string
  hasBH?: boolean
  hasTD?: boolean
  parentFolderId?: number | string
  parentFolderName?: string
}

interface MemberInfo {
  phone?: string
  email?: string
  address?: string
  joinDate?: string
  contractDate?: string
  promotionDate?: string
}

interface SyncPayload {
  source: string
  timestamp: number
  allNodes: TCANode[]
  memberInfo: Record<number, MemberInfo>
  stats?: {
    total: number
    folders: number
    items: number
  }
}

async function sendTelegramNotification(message: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID_EMAIL

    if (!token || !chatId) {
      console.log('[TCA Sync] Telegram: Missing config')
      return
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })
  } catch (error) {
    console.error('[TCA Sync] Telegram error:', error)
  }
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

function sortNodesByHierarchy(nodes: TCANode[]): TCANode[] {
  const nodeMap = new Map<number, TCANode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  const roots: TCANode[] = []
  const children: TCANode[] = []

  nodes.forEach(n => {
    const pid = n.parentFolderId
    if (!pid || pid === 'root' || pid === '0') {
      roots.push(n)
    } else {
      children.push(n)
    }
  })

  return [...roots, ...children]
}

export async function POST(request: Request) {
  const syncId = uuidv4()
  const startTime = Date.now()

  let stats = {
    usersCreated: 0,
    usersUpdated: 0,
    systemsCreated: 0,
    systemsUpdated: 0,
    tcaMembersCreated: 0,
    tcaMembersUpdated: 0,
    closuresCreated: 0,
    referrersUpdated: 0,
    failed: 0,
    totalRecords: 0
  }

  const failedRecords: { tcaId: number; error: string }[] = []
  const createdRecords: { table: string; id: number; tcaId: number }[] = []

  try {
    const body: SyncPayload = await request.json()

    console.log('==========================================')
    console.log('[API/sync-tca] New sync started')
    console.log('[TCA Sync] SyncId:', syncId)
    console.log('[TCA Sync] Source:', body.source)
    console.log('[TCA Sync] Timestamp:', new Date(body.timestamp).toISOString())
    console.log('[TCA Sync] Total nodes:', body.allNodes?.length || 0)
    console.log('[TCA Sync] Node IDs:', body.allNodes?.map((n: TCANode) => n.id))
    console.log('==========================================')

    if (!body.allNodes || !Array.isArray(body.allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload: allNodes required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    stats.totalRecords = body.allNodes.length

    await sendTelegramNotification(
      `🔄 <b>TCA Sync Started</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 Records: ${body.allNodes.length}\n` +
      `🆔 SyncId: ${syncId.substring(0, 8)}...`
    )

    // Lưu request vào history
    await (prisma as any).tCASyncHistory?.create({
      data: {
        syncId,
        action: 'SYNC_START',
        tableName: '_REQUEST',
        recordId: null,
        tcaId: null,
        beforeData: null,
        afterData: {
          source: body.source,
          timestamp: body.timestamp,
          totalNodes: body.allNodes.length,
          nodeIds: body.allNodes.map((n: TCANode) => n.id),
          memberInfoKeys: Object.keys(body.memberInfo || {})
        },
        totalRecords: body.allNodes.length,
        status: 'COMPLETED'
      }
    }).catch(() => { })

    const tcaIdToUserId = new Map<number, number>()
    const tcaIdToSystemId = new Map<number, number>()
    const sortedNodes = sortNodesByHierarchy(body.allNodes)

    console.log('[TCA Sync] Sorted nodes (parents first):', sortedNodes.map(n => n.id))

    // =====================================================
    // PHASE 1: Create/Update User, System, TCAMember
    // =====================================================

    for (const node of sortedNodes) {
      try {
        const memberInfo = body.memberInfo?.[node.id] || {}
        const phone = memberInfo.phone || null
        const email = memberInfo.email || null

        console.log(`[TCA Sync] Processing TCA ${node.id}: ${node.name}`)

        // ---------- 1. Find/Create User ----------
        const normalizedPhone = phone ? phone.replace(/\D/g, '') : null
        let existingUser = null

        if (normalizedPhone || email) {
          existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                normalizedPhone ? { phone: normalizedPhone } : undefined,
                email ? { email: email } : undefined
              ].filter(Boolean) as { phone: string }[] | { email: string }[]
            }
          })

          if (!existingUser && normalizedPhone) {
            const allUsers = await prisma.user.findMany({
              where: { phone: { not: null } }
            })
            for (const user of allUsers) {
              if (user.phone && user.phone.replace(/\D/g, '') === normalizedPhone) {
                existingUser = user
                break
              }
            }
          }
        }

        let userId: number
        let isNewUser = false

        // Resolve parent info trước khi tạo User
        const parentTcaId = node.parentFolderId
        let parentUserId: number | null = null
        let parentSystemId: number | null = null

        if (parentTcaId && parentTcaId !== 'root' && parentTcaId !== '0') {
          const parentIdNum = Number(parentTcaId)
          
          // Thử lấy từ batch trước
          if (tcaIdToUserId.has(parentIdNum)) {
            parentUserId = tcaIdToUserId.get(parentIdNum)!
            parentSystemId = tcaIdToSystemId.get(parentIdNum) || null
          } else {
            // Resolve từ DB
            const parentTCAMember = await (prisma as any).tCAMember?.findUnique({
              where: { tcaId: parentIdNum },
              include: { user: { select: { id: true } } }
            })
            if (parentTCAMember && parentTCAMember.userId) {
              parentUserId = parentTCAMember.userId
              
              const parentSystem = await prisma.system.findFirst({
                where: { userId: parentTCAMember.userId, onSystem: 1 }
              })
              if (parentSystem) {
                parentSystemId = parentSystem.autoId
              }
            }
          }
          
          console.log(`[TCA Sync]   Parent TCA ${parentIdNum} → User ${parentUserId}, System ${parentSystemId}`)
        }

        if (existingUser) {
          userId = existingUser.id
          console.log(`[TCA Sync]   Found existing user: ${userId}`)

          const updates: { name?: string; phone?: string | null } = {}
          let hasUpdate = false

          if (node.name && existingUser.name !== node.name) {
            updates.name = node.name
            hasUpdate = true
          }
          if (phone && !existingUser.phone) {
            updates.phone = phone
            hasUpdate = true
          }

          if (hasUpdate) {
            existingUser = await prisma.user.update({
              where: { id: existingUser.id },
              data: updates
            })
            stats.usersUpdated++
            console.log(`[TCA Sync]   Updated user: ${userId}`)
          }
        } else {
          const hashedPassword = await bcrypt.hash('Brk#3773', 10)
          const { getNextAvailableId } = await import('@/lib/id-helper')
          const newId = await getNextAvailableId()

          const newUser = await prisma.user.create({
            data: {
              id: newId,
              name: node.name || `TCA User ${node.id}`,
              email: email || `tca_${node.id}@placeholder.local`,
              phone: phone,
              password: hashedPassword,
              role: 'STUDENT',
              referrerId: parentUserId
            }
          })

          userId = newUser.id
          isNewUser = true
          stats.usersCreated++
          createdRecords.push({ table: 'User', id: userId, tcaId: node.id })

          console.log(`[TCA Sync]   Created NEW user: ${userId} with referrerId: ${parentUserId}`)
        }

        tcaIdToUserId.set(node.id, userId)

        // ---------- 2. Find/Create System ----------
        let existingSystem = await prisma.system.findFirst({
          where: { userId: userId, onSystem: 1 }
        })

        let systemId: number

        if (!existingSystem) {
          const newSystem = await prisma.system.create({
            data: {
              userId: userId,
              onSystem: 1,
              refSysId: 0
            }
          })
          systemId = newSystem.autoId
          stats.systemsCreated++
          createdRecords.push({ table: 'System', id: systemId, tcaId: node.id })
          console.log(`[TCA Sync]   Created NEW system: ${systemId}`)
        } else {
          systemId = existingSystem.autoId
          stats.systemsUpdated++
          console.log(`[TCA Sync]   Found existing system: ${systemId}`)
        }

        tcaIdToSystemId.set(node.id, systemId)

        // ---------- 3. Update System refSysId ----------
        if (parentSystemId && existingSystem && existingSystem.refSysId !== parentSystemId) {
          await prisma.system.update({
            where: { autoId: systemId },
            data: { refSysId: parentSystemId }
          })
          console.log(`[TCA Sync]   Updated refSysId: ${systemId} -> ${parentSystemId}`)
        }

        // ---------- 4. Upsert TCAMember ----------
        const existingTCAMember = await (prisma as any).tCAMember?.findUnique({
          where: { tcaId: node.id }
        })

        const tcaMemberData = {
          tcaId: node.id,
          userId: userId,
          type: node.type || 'item',
          groupName: node.groupName || null,
          name: node.name || '',
          personalScore: node.personalScore ? new Prisma.Decimal(parseFloat(node.personalScore)) : null,
          totalScore: node.totalScore ? new Prisma.Decimal(parseFloat(node.totalScore)) : null,
          level: node.level ? parseInt(node.level) : null,
          location: node.location || null,
          personalRate: node.personalRate || null,
          teamRate: node.teamRate || null,
          hasBH: node.hasBH || false,
          hasTD: node.hasTD || false,
          phone: phone,
          email: email,
          address: memberInfo.address || null,
          joinDate: parseDate(memberInfo.joinDate),
          contractDate: parseDate(memberInfo.contractDate),
          promotionDate: parseDate(memberInfo.promotionDate),
          parentTcaId: (parentTcaId && parentTcaId !== 'root' && parentTcaId !== '0') ? Number(parentTcaId) : null,
          parentName: node.parentFolderName || null,
          teamSize: 0,
          lastSyncedAt: new Date()
        }

        if (!existingTCAMember) {
          const newMember = await (prisma as any).tCAMember?.create({
            data: tcaMemberData
          })
          stats.tcaMembersCreated++
          createdRecords.push({ table: 'TCAMember', id: newMember?.id || 0, tcaId: node.id })
          console.log(`[TCA Sync]   Created NEW TCAMember for TCA ${node.id}`)
        } else {
          const hasChanges =
            existingTCAMember.personalScore?.toString() !== tcaMemberData.personalScore?.toString() ||
            existingTCAMember.totalScore?.toString() !== tcaMemberData.totalScore?.toString() ||
            existingTCAMember.level !== tcaMemberData.level ||
            existingTCAMember.phone !== tcaMemberData.phone ||
            existingTCAMember.email !== tcaMemberData.email

          if (hasChanges) {
            await (prisma as any).tCAMember?.update({
              where: { id: existingTCAMember.id },
              data: tcaMemberData
            })
            stats.tcaMembersUpdated++
            console.log(`[TCA Sync]   Updated TCAMember: ${existingTCAMember.id}`)
          }
        }

      } catch (error) {
        stats.failed++
        failedRecords.push({ tcaId: node.id, error: String(error) })
        console.error(`[TCA Sync] Error processing TCA ${node.id}:`, error)
      }
    }

    // =====================================================
    // PHASE 2: Build SystemClosure (Bottom-up approach)
    // =====================================================

    console.log('[TCA Sync] Phase 2: Building SystemClosure...')

    const closureMap = new Map<number, { ancestorId: number; depth: number }[]>()
    const allClosures: { ancestorId: number; descendantId: number; depth: number; systemId: number }[] = []

    for (const node of sortedNodes) {
      const systemId = tcaIdToSystemId.get(node.id)
      if (!systemId) continue

      const nodeClosures: { ancestorId: number; depth: number }[] = []

      nodeClosures.push({ ancestorId: systemId, depth: 0 })
      allClosures.push({ ancestorId: systemId, descendantId: systemId, depth: 0, systemId: 1 })

      const parentTcaId = node.parentFolderId
      if (parentTcaId && parentTcaId !== 'root' && parentTcaId !== '0' && closureMap.has(Number(parentTcaId))) {
        const parentClosures = closureMap.get(Number(parentTcaId))!
        for (const pc of parentClosures) {
          nodeClosures.push({ ancestorId: pc.ancestorId, depth: pc.depth + 1 })
          allClosures.push({
            ancestorId: pc.ancestorId,
            descendantId: systemId,
            depth: pc.depth + 1,
            systemId: 1
          })
        }
      }

      closureMap.set(node.id, nodeClosures)
    }

    if (allClosures.length > 0) {
      await prisma.systemClosure.createMany({
        data: allClosures,
        skipDuplicates: true
      })
      stats.closuresCreated = allClosures.length
      console.log(`[TCA Sync] Created ${allClosures.length} closure rows`)
    }

    // =====================================================
    // PHASE 3: Update teamSize in TCAMember
    // =====================================================

    for (const node of sortedNodes) {
      const teamSize = sortedNodes.filter(n => n.parentFolderId === node.id).length
      if (teamSize > 0) {
        await (prisma as any).tCAMember?.update({
          where: { tcaId: node.id },
          data: { teamSize }
        }).catch(() => { })
      }
    }

    const duration = Date.now() - startTime

    console.log('==========================================')
    console.log('[API/sync-tca] Sync completed!')
    console.log('[TCA Sync] Duration:', duration, 'ms')
    console.log('[TCA Sync] Stats:', stats)
    console.log('[TCA Sync] Created records:', createdRecords)
    console.log('==========================================')

    await sendTelegramNotification(
      `✅ <b>TCA Sync Complete</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 SyncId: ${syncId.substring(0, 8)}...\n` +
      `⏱ Duration: ${duration}ms\n` +
      `👤 Users: +${stats.usersCreated} | ~${stats.usersUpdated}\n` +
      `📊 Systems: +${stats.systemsCreated} | ~${stats.systemsUpdated}\n` +
      `📋 TCA Members: +${stats.tcaMembersCreated} | ~${stats.tcaMembersUpdated}\n` +
      `🔗 Closures: +${stats.closuresCreated}\n` +
      `❌ Failed: ${stats.failed}`
    )

    return NextResponse.json({
      success: true,
      syncId,
      stats,
      createdRecords,
      failedRecords: failedRecords.length > 0 ? failedRecords : undefined,
      message: 'Sync completed'
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/sync-tca] Error:', error)

    await sendTelegramNotification(
      `❌ <b>TCA Sync Failed</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 SyncId: ${syncId.substring(0, 8)}...\n` +
      `Error: ${String(error).substring(0, 100)}`
    )

    return NextResponse.json({
      success: false,
      syncId,
      error: String(error)
    }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'TCA Sync API',
    version: '3.0.0',
    sources: ['TCA_EXT_FULL', 'TCA_EXT_PREVIEW'],
    features: [
      'Auto upsert User/System/TCAMember',
      'Sorted nodes (parents first)',
      'Bottom-up SystemClosure building',
      'Detailed logging',
      'Created records tracking'
    ],
    usage: {
      method: 'POST',
      body: {
        source: 'TCA_EXT_PREVIEW',
        timestamp: 'Unix timestamp',
        allNodes: 'Array of TCA nodes',
        memberInfo: 'Object of member details',
        stats: 'Scan statistics'
      }
    }
  }, { headers: CORS_HEADERS })
}
