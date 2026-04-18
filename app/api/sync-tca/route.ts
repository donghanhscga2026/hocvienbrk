import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'
import { addUserToClosure } from '@/lib/closure-helpers'

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

interface ExpectedIds {
  [tcaId: number]: {
    userId: number | null
    systemId: number | null
    referrerId: number | null
    refSysId: number | null
  }
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
  expectedIds?: ExpectedIds
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
        
        // Lấy dữ liệu ID đã chốt từ Frontend
        const expected = body.expectedIds?.[node.id];
        if (!expected || !expected.userId) {
          console.log(`[TCA Sync] Skipping ${node.id}: No finalized UserID provided`);
          continue;
        }

        const targetUserId = expected.userId;
        const targetReferrerId = expected.referrerId; // Có thể là 0
        const targetRefSysId = expected.refSysId;

        console.log(`[TCA Sync] Processing TCA ${node.id} -> User ${targetUserId}`);

        // 1. Kiểm tra sự tồn tại của User dựa trên ID duy nhất
        let existingUser = await prisma.user.findUnique({
          where: { id: targetUserId }
        });

        if (existingUser) {
          // CHỈ CẬP NHẬT thông tin cho phép nếu User đã tồn tại
          const updates: any = {};
          if (node.name && existingUser.name !== node.name) updates.name = node.name;
          if (phone && !existingUser.phone) updates.phone = phone;
          if (email && !existingUser.email) updates.email = email;
          
          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: targetUserId },
              data: updates
            });
            stats.usersUpdated++;
          }
          console.log(`[TCA Sync]   Updated existing User ${targetUserId}`);
        } else {
          // TẠO MỚI User với đúng ID yêu cầu
          const hashedPassword = await bcrypt.hash('Brk#3773', 10);
          await prisma.user.create({
            data: {
              id: targetUserId,
              name: node.name || `TCA User ${node.id}`,
              email: email || `tca_${node.id}@placeholder.local`,
              phone: phone,
              password: hashedPassword,
              role: 'STUDENT',
              referrerId: targetReferrerId
            }
          });
          stats.usersCreated++;
          createdRecords.push({ table: 'User', id: targetUserId, tcaId: node.id });
          console.log(`[TCA Sync]   Created NEW User ${targetUserId} with Referrer ${targetReferrerId}`);

          // Tạo phả hệ giới thiệu (Referral Tree) bằng helper của dự án
          await addUserToClosure(targetUserId, targetReferrerId).catch(e => {
            console.log(`[TCA Sync]   Warning: addUserToClosure error:`, e.message);
          });
        }

        // Lưu vết ID để xử lý batch
        tcaIdToUserId.set(node.id, targetUserId);

        // 2. Tạo/Cập nhật System + SystemClosure (Cây hệ thống TCA)
        // Luôn sử dụng helper dự án để đảm bảo tính nhất quán
        const systemParentId = targetRefSysId || 0;
        await addUserToSystemClosure(targetUserId, systemParentId, 1);
        
        console.log(`[TCA Sync]   Ensured System position under parent ${systemParentId}`);

        // 3. Upsert TCAMember (Dữ liệu lịch sử)
        const existingTCAMember = await (prisma as any).tCAMember?.findUnique({
          where: { tcaId: node.id }
        });


        const tcaMemberData = {
          tcaId: node.id,
          userId: targetUserId,
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
          parentTcaId: (node.parentFolderId && node.parentFolderId !== 'root' && node.parentFolderId !== '0') ? Number(node.parentFolderId) : null,
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
    // PHASE 2: Update teamSize in TCAMember
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
