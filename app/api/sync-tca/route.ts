import { NextResponse } from 'next/server'
import { PrismaClient, Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Helper để duy trì phả hệ Closure
import { addUserToClosure } from '@/lib/closure-helpers'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'

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
  // Dữ liệu điểm số và cấp bậc từ Extension (trích xuất qua injected-script.js)
  isRootNode?: boolean
  personalScore?: string
  totalScore?: string
  level?: string
}

interface MemberInfo {
  phone?: string
  email?: string
  address?: string
}

interface SyncPayload {
  source: string
  timestamp: number
  previewRows?: PreviewRow[]
  allNodes?: TCANode[]
  memberInfo: Record<number, MemberInfo>
  expectedIds?: Record<number, any>
  overviewData?: OverviewData | null
}

interface OverviewData {
  type: string
  personal_points: number
  team_points: number
  level: number
  timestamp: string
  raw_text?: string
}

interface PreviewRow {
  id: number
  name: string
  userId: number | null
  referrerId: number | null
  refSysId: number | null
  action: string
  match: string
  parentTcaId: string | null
  email?: string
  phone?: string
}

const normalizePhone = (phone: string | null): string | null => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('84') && digits.length === 11) return '0' + digits.substring(2)
  if (digits.startsWith('0')) return digits
  return phone
}

// Hàm lưu SyncLog chi tiết (giữ nguyên để rollback chi tiết khi cần)
async function logSyncChange(syncId: string, tableName: string, recordId: number, action: string, oldData: any, newData: any) {
  await prisma.syncLog.create({
    data: {
      syncId,
      tableName,
      recordId,
      action,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null
    }
  })
}

// Hàm lưu SyncLog tổng hợp - CHỈ TẠO 1 BẢN GHI cho 1 lần sync
async function logSyncSummary(syncId: string, summary: {
  usersCreated: number
  usersUpdated: number
  systemsCreated: number
  systemsUpdated: number
  tcaMembersCreated: number
  tcaMembersUpdated: number
  totalProcessed: number
  tcaIds: number[]
}) {
  await prisma.syncLog.create({
    data: {
      syncId,
      tableName: 'SYNC_SESSION',
      recordId: 0,
      action: 'SYNC_SESSION',
      oldData: null,
      newData: JSON.stringify(summary)
    }
  })
  console.log('[TCA Sync] Summary logged:', summary)
}

export async function POST(request: Request) {
  const syncId = uuidv4()
  const startTime = Date.now()
  let stats = { usersCreated: 0, usersUpdated: 0, systemsCreated: 0, systemsUpdated: 0, tcaMembersCreated: 0, tcaMembersUpdated: 0, failed: 0, totalRecords: 0, skipped: 0 }
  const failedRecords: { tcaId: number; error: string }[] = []
  const processedTcaIds: number[] = []  // Thu thập tcaIds để rollback

  // Khởi tạo TCAMember model
  const tcaMemberModel = (prisma as any).tCAMember

  try {
    let body: SyncPayload
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON payload', details: String(parseError) }, { status: 400, headers: CORS_HEADERS })
    }

    console.log('[TCA Sync] Sync starting, syncId:', syncId)

    // DÙNG TRỰC TIẾP previewRows
    if (body.previewRows && Array.isArray(body.previewRows)) {
      console.log('[TCA Sync] Using previewRows:', body.previewRows.length)
      stats.totalRecords = body.previewRows.length

      for (const row of body.previewRows) {
        try {
          const tcaId = Number(row.id) || 0
          const targetUserId = Number(row.userId) || 0
          const action = row.action || ''
          const referrerId = Number(row.referrerId) || 0
          const refSysId = Number(row.refSysId) || 0

          if (!targetUserId || action === 'SKIP' || !action) {
            stats.skipped = (stats.skipped || 0) + 1
            continue
          }
          
          // Thu thập tcaId để rollback
          processedTcaIds.push(tcaId)

          const userModel = prisma.user
          const systemModel = prisma.system
          const systemParentId = refSysId || 0

          // PE = tạo User (nếu chưa tồn tại) + closure
          if (action.includes('PE')) {
            const hashedPassword = await bcrypt.hash('Brk#3773', 10)
            const existingUser = await userModel.findUnique({ where: { id: targetUserId } })
            
            if (!existingUser) {
              // Chỉ tạo mới khi user chưa tồn tại
              await userModel.create({
                data: {
                  id: targetUserId,
                  name: row.name || `TCA ${tcaId}`,
                  email: row.email || `tca_${tcaId}@placeholder.local`,
                  phone: row.phone || null,
                  password: hashedPassword,
                  role: 'STUDENT',
                  referrerId: referrerId || null
                }
              })
              stats.usersCreated++
              
              // Tạo closure chỉ khi user thực sự mới
              if (referrerId && referrerId > 0) {
                await addUserToClosure(targetUserId, referrerId)
              }
            } else {
              // User đã tồn tại → bỏ qua create, không lỗi
              console.log(`[TCA Sync] User #${targetUserId} already exists, skipping create (tcaId=${tcaId})`)
            }
          }

          // P = cập nhật phone
          if (action.includes('P') && action.includes('PE') === false && targetUserId) {
            const existingUser = await userModel.findUnique({ where: { id: targetUserId } })
            if (existingUser) {
              const oldData = { phone: existingUser.phone }
              await userModel.update({
                where: { id: targetUserId },
                data: { phone: row.phone || undefined }
              })
              stats.usersUpdated++
            }
          }

          // E = cập nhật email
          if (action.includes('E') && action.includes('PE') === false && targetUserId) {
            const existingUser = await userModel.findUnique({ where: { id: targetUserId } })
            if (existingUser) {
              await userModel.update({
                where: { id: targetUserId },
                data: { email: row.email || undefined }
              })
              stats.usersUpdated++
            }
          }

          // S = tạo System + closure
          if (action.includes('S')) {
            await addUserToSystemClosure(targetUserId, systemParentId, 1)
            stats.systemsCreated++
          }

          // TCA = tạo TCAMember
          if (action.includes('TCA')) {
            const existingTCA = await tcaMemberModel.findUnique({ where: { tcaId } })
            
            // Tìm thông tin chi tiết từ allNodes
            const nodeInfo = body.allNodes?.find(n => Number(n.id) === tcaId)
            
            // TCA Portal dùng '.' là dấu thập phân: '17.006' = 17.006 điểm
            const parseScore = (raw?: string): number => {
              if (!raw || raw === '-' || raw === '0') return 0
              return parseFloat(raw.trim()) || 0
            }
            
            const pScore = parseScore(nodeInfo?.personalScore)
            const tScore = parseScore(nodeInfo?.totalScore)
            const levelVal = nodeInfo?.level ? parseInt(nodeInfo.level) : null

            const memberData = {
                tcaId, userId: targetUserId, name: row.name || '', type: 'item',
                parentTcaId: row.parentTcaId ? Number(row.parentTcaId) : null,
                phone: row.phone || null,
                email: row.email || null,
                personalScore: pScore,
                totalScore: tScore,
                level: levelVal,
                lastSyncedAt: new Date()
            }

            await tcaMemberModel.upsert({
              where: { tcaId },
              update: memberData,
              create: memberData
            })
            if (existingTCA) {
              stats.tcaMembersUpdated++
            } else {
              stats.tcaMembersCreated++
            }
          }
        } catch (rowError) {
          stats.failed++
          failedRecords.push({ tcaId: Number(row.id), error: String(rowError) })
        }
      }

// XỬ LÝ ROOT NODE - UPDATE cho userId=861 (tcaId=60861)
      const ROOT_USER_ID = 861
      const ROOT_TCA_ID = 60861
      console.log('[TCA Sync] Checking overviewData:', body.overviewData ? 'YES' : 'NO', body.overviewData?.type)
      const overview = body.overviewData
      if (overview && overview.type === 'OVERVIEW_REPORT') {
        console.log('[TCA Sync] Root update - personal_points:', overview.personal_points, 'team_points:', overview.team_points)
        const pScore = overview.personal_points || 0
        const tScore = overview.team_points || 0
        const levelVal = overview.level || 1
        
        // Tìm bản ghi root - Ưu tiên userId=861, fallback tcaId=60861
        let existingRoot = await tcaMemberModel.findFirst({ where: { userId: ROOT_USER_ID } })
        if (!existingRoot) {
          existingRoot = await tcaMemberModel.findUnique({ where: { tcaId: ROOT_TCA_ID } })
        }
        
        if (existingRoot) {
          console.log('[TCA Sync] Root found in DB (id=' + existingRoot.id + ', tcaId=' + existingRoot.tcaId + '), updating...')
          await tcaMemberModel.update({
            where: { id: existingRoot.id },
            data: {
              personalScore: pScore,
              totalScore: tScore,
              level: levelVal,
              lastSyncedAt: new Date()
            }
          })
          console.log(`[TCA Sync] ✅ Root #${ROOT_USER_ID} updated: CN=${pScore}, ĐỘI=${tScore}, Cấp=${levelVal}`)
        } else {
          console.log(`[TCA Sync] ⚠️ Root with userId=${ROOT_USER_ID} or tcaId=${ROOT_TCA_ID} not found, skipping`)
        }
      } else {
        console.log('[TCA Sync] ⚠️ No overviewData or wrong type, root NOT updated')
      }

const duration = Date.now() - startTime
      
      // Ghi log tổng hợp - CHỈ 1 BẢN GHI cho 1 lần sync
      await logSyncSummary(syncId, {
        usersCreated: stats.usersCreated,
        usersUpdated: stats.usersUpdated,
        systemsCreated: stats.systemsCreated,
        systemsUpdated: stats.systemsUpdated,
        tcaMembersCreated: stats.tcaMembersCreated,
        tcaMembersUpdated: stats.tcaMembersUpdated,
        totalProcessed: stats.totalRecords - stats.skipped,
        tcaIds: processedTcaIds
      })
      
      return NextResponse.json({ 
        success: true, 
        syncId, 
        stats, 
        failedRecords: failedRecords.slice(0, 5), 
        message: 'Sync completed - dữ liệu đã được đẩy vào Production'
      }, { headers: CORS_HEADERS })
    }

    // Xử lý allNodes trực tiếp (từ Extension auto-sync)
    if (body.allNodes && Array.isArray(body.allNodes) && !body.previewRows) {
      console.log('[TCA Sync] Processing allNodes directly:', body.allNodes.length)
      stats.totalRecords = body.allNodes.length

      for (const node of body.allNodes) {
        try {
          const tcaId = Number(node.id)
          if (!tcaId) {
            stats.skipped++
            continue
          }

          // Tìm userId từ user table (user.id = tcaId theo import script)
          const user = await prisma.user.findUnique({ where: { id: tcaId } })
          const linkedUserId = user?.id || 0

          // Parse scores
          const parseScore = (raw?: string): number => {
            if (!raw || raw === '-' || raw === '0') return 0
            return parseFloat(raw.trim()) || 0
          }

          const pScore = parseScore(node.personalScore)
          const tScore = parseScore(node.totalScore)
          const levelVal = node.level ? parseInt(node.level) : null

          // Get member info if available
          const info = body.memberInfo?.[tcaId] || {}

          const memberData = {
            tcaId,
            userId: linkedUserId,
            name: node.name || '',
            type: node.type || 'item',
            parentTcaId: node.parentFolderId ? Number(node.parentFolderId) : null,
            phone: normalizePhone(info.phone || null) || null,
            email: info.email || null,
            personalScore: pScore,
            totalScore: tScore,
            level: levelVal,
            lastSyncedAt: new Date()
          }

          await tcaMemberModel.upsert({
            where: { tcaId },
            update: memberData,
            create: memberData
          })

          const existingTCA = await tcaMemberModel.findUnique({ where: { tcaId } })
          if (existingTCA) {
            stats.tcaMembersUpdated++
          } else {
            stats.tcaMembersCreated++
          }
          processedTcaIds.push(tcaId)

        } catch (error) {
          console.error('[TCA Sync] Error processing node:', error)
          stats.failed++
        }
      }

      await logSyncSummary(syncId, {
        usersCreated: stats.usersCreated,
        usersUpdated: stats.usersUpdated,
        systemsCreated: stats.systemsCreated,
        systemsUpdated: stats.systemsUpdated,
        tcaMembersCreated: stats.tcaMembersCreated,
        tcaMembersUpdated: stats.tcaMembersUpdated,
        totalProcessed: stats.totalRecords - stats.skipped,
        tcaIds: processedTcaIds
      })

      return NextResponse.json({
        success: true,
        syncId,
        stats,
        message: `Synced ${stats.totalRecords} nodes directly`
      }, { headers: CORS_HEADERS })
    }

    return NextResponse.json({ error: 'Invalid payload - need previewRows or allNodes' }, { status: 400, headers: CORS_HEADERS })

  } catch (error) {
    console.error('[TCA Sync] ERROR:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'TCA Sync API', version: '7.0.0', description: 'Direct sync to Production with SyncLog for rollback' }, { headers: CORS_HEADERS })
}