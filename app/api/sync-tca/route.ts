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
  parentFolderId?: number
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
  stats: {
    total: number
    folders: number
    items: number
  }
}

// Gửi notification Telegram
async function sendTelegramNotification(message: string) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID_EMAIL

    if (!token || !chatId) {
      console.log('[TCA Sync] Telegram: Missing config, skipping notification')
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

// Lưu lịch sử sync
async function saveSyncHistory(
  syncId: string,
  action: string,
  tableName: string,
  recordId: number | null,
  tcaId: number | null,
  beforeData: unknown,
  afterData: unknown,
  totalRecords: number
) {
  await prisma.tCASyncHistory.create({
    data: {
      syncId,
      action,
      tableName,
      recordId,
      tcaId,
      beforeData: beforeData as Prisma.JsonObject,
      afterData: afterData as Prisma.JsonObject,
      totalRecords,
      status: 'PENDING'
    }
  })
}

// Find user by phone or email
async function findUserByPhoneOrEmail(phone?: string, email?: string) {
  if (!phone && !email) return null

  return prisma.user.findFirst({
    where: {
      OR: [
        phone ? { phone } : undefined,
        email ? { email } : undefined
      ].filter(Boolean) as { phone: string }[] | { email: string }[]
    }
  })
}

// Parse date string to Date
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

export async function POST(request: Request) {
  const syncId = uuidv4()
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

  try {
    const body: SyncPayload = await request.json()

    console.log('==========================================')
    console.log('[API/sync-tca] New sync started')
    console.log('SyncId:', syncId)
    console.log('Source:', body.source)
    console.log('Timestamp:', new Date(body.timestamp).toISOString())
    console.log('Total nodes:', body.allNodes?.length || 0)
    console.log('==========================================')

    // Validate
    if (!body.allNodes || !Array.isArray(body.allNodes)) {
      return NextResponse.json(
        { error: 'Invalid payload: allNodes required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    stats.totalRecords = body.allNodes.length

    // Gửi notification bắt đầu
    await sendTelegramNotification(
      `🔄 <b>TCA Sync Started</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 Records: ${body.allNodes.length}\n` +
      `🆔 SyncId: ${syncId.substring(0, 8)}...`
    )

    // =====================================================
    // PHASE 1: Upsert User, System, TCAMember
    // =====================================================

    const tcaIdToUserId = new Map<number, number>()
    const tcaIdToSystemId = new Map<number, number>()

    for (const node of body.allNodes) {
      try {
        const memberInfo = body.memberInfo?.[node.id] || {}
        const phone = memberInfo.phone || null
        const email = memberInfo.email || null

        // ---------- 1. Find/Create User ----------
        let user = await findUserByPhoneOrEmail(phone || undefined, email || undefined)
        let isNewUser = false

        if (!user) {
          // Tạo user mới
          const hashedPassword = await bcrypt.hash('Brk#3773', 10)
          const { getNextAvailableId } = await import('@/lib/id-helper')
          const newId = await getNextAvailableId()

          user = await prisma.user.create({
            data: {
              id: newId,
              name: node.name || `TCA User ${node.id}`,
              email: email || `tca_${node.id}@placeholder.local`,
              phone: phone,
              password: hashedPassword,
              role: 'STUDENT',
              referrerId: null  // Sẽ update sau
            }
          })

          isNewUser = true
          stats.usersCreated++

          // Lưu history
          await saveSyncHistory(syncId, 'CREATE_USER', 'User', user.id, node.id, null, user, stats.totalRecords)

          console.log(`[TCA Sync] Created user: ${user.id} (${user.email})`)
        } else {
          // Update thông tin nếu có thay đổi
          const updates: { name?: string; phone?: string | null } = {}
          let hasUpdate = false

          if (node.name && user.name !== node.name) {
            updates.name = node.name
            hasUpdate = true
          }
          if (phone && !user.phone) {
            updates.phone = phone
            hasUpdate = true
          }

          if (hasUpdate) {
            const oldUser = { ...user }
            user = await prisma.user.update({
              where: { id: user.id },
              data: updates
            })
            stats.usersUpdated++
            await saveSyncHistory(syncId, 'UPDATE_USER', 'User', user.id, node.id, oldUser, user, stats.totalRecords)
            console.log(`[TCA Sync] Updated user: ${user.id}`)
          }
        }

        tcaIdToUserId.set(node.id, user.id)

        // ---------- 2. Find/Create System ----------
        let system = await prisma.system.findFirst({
          where: { userId: user.id, onSystem: 1 }
        })

        if (!system) {
          system = await prisma.system.create({
            data: {
              userId: user.id,
              onSystem: 1,  // TCA
              refSysId: 0  // Tạm thời, sẽ update sau
            }
          })
          stats.systemsCreated++
          await saveSyncHistory(syncId, 'CREATE_SYSTEM', 'System', system.autoId, node.id, null, system, stats.totalRecords)
          console.log(`[TCA Sync] Created system: ${system.autoId} for user ${user.id}`)
        } else {
          stats.systemsUpdated++
        }

        tcaIdToSystemId.set(node.id, system.autoId)

        // ---------- 3. Upsert TCAMember ----------
        let tcaMember = await prisma.tCAMember.findUnique({
          where: { tcaId: node.id }
        })

        const tcaMemberData = {
          tcaId: node.id,  // Required field
          userId: user.id,
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
          parentTcaId: node.parentFolderId || null,
          parentName: node.parentFolderName || null,
          teamSize: 0,  // Sẽ update sau
          lastSyncedAt: new Date()
        }

        if (!tcaMember) {
          tcaMember = await prisma.tCAMember.create({
            data: tcaMemberData
          })
          stats.tcaMembersCreated++
          await saveSyncHistory(syncId, 'CREATE_TCA_MEMBER', 'TCAMember', tcaMember.id, node.id, null, tcaMember, stats.totalRecords)
          console.log(`[TCA Sync] Created TCAMember: ${tcaMember.id} for TCA ${node.id}`)
        } else {
          // Check if has changes
          const hasChanges =
            tcaMember.personalScore?.toString() !== tcaMemberData.personalScore?.toString() ||
            tcaMember.totalScore?.toString() !== tcaMemberData.totalScore?.toString() ||
            tcaMember.level !== tcaMemberData.level ||
            tcaMember.phone !== tcaMemberData.phone ||
            tcaMember.email !== tcaMemberData.email

          if (hasChanges) {
            const oldMember = { ...tcaMember }
            tcaMember = await prisma.tCAMember.update({
              where: { id: tcaMember.id },
              data: tcaMemberData
            })
            stats.tcaMembersUpdated++
            await saveSyncHistory(syncId, 'UPDATE_TCA_MEMBER', 'TCAMember', tcaMember.id, node.id, oldMember, tcaMember, stats.totalRecords)
            console.log(`[TCA Sync] Updated TCAMember: ${tcaMember.id}`)
          }
        }

      } catch (error) {
        stats.failed++
        failedRecords.push({ tcaId: node.id, error: String(error) })
        console.error(`[TCA Sync] Error processing TCA ${node.id}:`, error)
      }
    }

    // =====================================================
    // PHASE 2: Build Relationships
    // =====================================================

    console.log('[TCA Sync] Phase 2: Building relationships...')

    // Update SystemClosure và User.referrerId
    for (const node of body.allNodes) {
      try {
        const userId = tcaIdToUserId.get(node.id)
        const systemId = tcaIdToSystemId.get(node.id)

        if (!userId || !systemId) continue

        const parentTcaId = node.parentFolderId

        // ---------- Update System refSysId ----------
        if (parentTcaId && tcaIdToSystemId.has(parentTcaId)) {
          const parentSystemId = tcaIdToSystemId.get(parentTcaId)!

          const system = await prisma.system.findFirst({
            where: { autoId: systemId }
          })

          if (system && system.refSysId !== parentSystemId) {
            await prisma.system.update({
              where: { autoId: systemId },
              data: { refSysId: parentSystemId }
            })
          }

          // ---------- Create/Update SystemClosure ----------
          const existingClosure = await prisma.systemClosure.findFirst({
            where: {
              descendantId: systemId,
              systemId: 1
            }
          })

          if (!existingClosure) {
            // Create self closure
            await prisma.systemClosure.create({
              data: {
                ancestorId: systemId,
                descendantId: systemId,
                depth: 0,
                systemId: 1
              }
            })

            // Create ancestor closures
            const ancestorClosures = await prisma.systemClosure.findMany({
              where: {
                descendantId: parentSystemId,
                systemId: 1
              }
            })

            for (const ancestor of ancestorClosures) {
              await prisma.systemClosure.create({
                data: {
                  ancestorId: ancestor.ancestorId,
                  descendantId: systemId,
                  depth: ancestor.depth + 1,
                  systemId: 1
                }
              })
            }

            stats.closuresCreated++
            await saveSyncHistory(
              syncId,
              'CREATE_CLOSURE',
              'SystemClosure',
              null,
              node.id,
              null,
              { systemId, parentSystemId, ancestorsCount: ancestorClosures.length },
              stats.totalRecords
            )
          }
        }

        // ---------- Update User.referrerId ----------
        if (parentTcaId && tcaIdToUserId.has(parentTcaId)) {
          const parentUserId = tcaIdToUserId.get(parentTcaId)!

          const user = await prisma.user.findUnique({
            where: { id: userId }
          })

          if (user && !user.referrerId) {
            await prisma.user.update({
              where: { id: userId },
              data: { referrerId: parentUserId }
            })
            stats.referrersUpdated++
            await saveSyncHistory(
              syncId,
              'UPDATE_REFERRER',
              'User',
              userId,
              node.id,
              { referrerId: null },
              { referrerId: parentUserId },
              stats.totalRecords
            )
            console.log(`[TCA Sync] Updated referrer for user ${userId} -> ${parentUserId}`)
          }
        }

        // ---------- Update teamSize ----------
        const teamSize = body.allNodes.filter(n => n.parentFolderId === node.id).length
        if (teamSize > 0) {
          await prisma.tCAMember.update({
            where: { tcaId: node.id },
            data: { teamSize }
          })
        }

      } catch (error) {
        console.error(`[TCA Sync] Error building relationships for TCA ${node.id}:`, error)
      }
    }

    // Mark all history as COMPLETED
    await prisma.tCASyncHistory.updateMany({
      where: { syncId, status: 'PENDING' },
      data: { status: 'COMPLETED' }
    })

    console.log('==========================================')
    console.log('[API/sync-tca] Sync completed!')
    console.log('Stats:', stats)
    console.log('==========================================')

    // Gửi notification kết quả
    const message = `✅ <b>TCA Sync Complete</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 SyncId: ${syncId.substring(0, 8)}...\n` +
      `👤 Users: +${stats.usersCreated} | ~${stats.usersUpdated}\n` +
      `📊 Systems: +${stats.systemsCreated} | ~${stats.systemsUpdated}\n` +
      `📋 TCA Members: +${stats.tcaMembersCreated} | ~${stats.tcaMembersUpdated}\n` +
      `🔗 Closures: +${stats.closuresCreated}\n` +
      `👥 Referrers: ${stats.referrersUpdated}\n` +
      `❌ Failed: ${stats.failed}`

    await sendTelegramNotification(message)

    const response = NextResponse.json({
      success: true,
      syncId,
      stats,
      failedRecords: failedRecords.length > 0 ? failedRecords : undefined,
      message: 'Sync completed'
    }, { headers: CORS_HEADERS })

    return response

  } catch (error) {
    console.error('[API/sync-tca] Error:', error)

    // Mark pending history as FAILED
    await prisma.tCASyncHistory.updateMany({
      where: { syncId, status: 'PENDING' },
      data: {
        status: 'ROLLED_BACK',
        errorMessage: String(error)
      }
    })

    await sendTelegramNotification(
      `❌ <b>TCA Sync Failed</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 SyncId: ${syncId.substring(0, 8)}...\n` +
      `Error: ${String(error).substring(0, 100)}`
    )

    const response = NextResponse.json({
      success: false,
      syncId,
      error: String(error)
    }, { status: 500, headers: CORS_HEADERS })

    return response
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'TCA Sync API',
    version: '2.0.0',
    sources: ['TCA_EXT_FULL'],
    features: [
      'Auto upsert User/System/TCAMember',
      'Build SystemClosure relationships',
      'Update User.referrerId',
      'Telegram notifications',
      'Rollback support'
    ],
    usage: {
      method: 'POST',
      body: {
        source: 'TCA_EXT_FULL',
        timestamp: 'Unix timestamp',
        allNodes: 'Array of TCA nodes',
        memberInfo: 'Object of member details',
        stats: 'Scan statistics'
      }
    }
  }, { headers: CORS_HEADERS })
}
