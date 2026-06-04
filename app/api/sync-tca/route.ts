import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

import { addUserToClosure } from '@/lib/closure-helpers'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'
import { generatePreview, type PreviewRow } from '@/lib/tca-preview-logic'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

interface SyncPayload {
  source: string
  timestamp: number
  previewRows?: PreviewRow[]
  allNodes?: any[]
  memberInfo: Record<number, any>
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

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split(/[/-]/)
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  return new Date(year, month - 1, day)
}

export async function POST(request: Request) {
  const syncId = uuidv4()
  const startTime = Date.now()
  let stats = { usersCreated: 0, usersUpdated: 0, systemsCreated: 0, systemsUpdated: 0, tcaMembersCreated: 0, tcaMembersUpdated: 0, failed: 0, totalRecords: 0, skipped: 0 }
  const failedRecords: { tcaId: number; error: string }[] = []
  const processedTcaIds: number[] = []

  const tcaMemberModel = (prisma as any).tCAMember

  try {
    let body: SyncPayload
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON payload', details: String(parseError) }, { status: 400, headers: CORS_HEADERS })
    }

    console.log('[TCA Sync] Sync starting, syncId:', syncId)

    // ====== TẠO previewRows NẾU CHỈ CÓ allNodes (auto-sync từ background.js) ======
    let previewRows = body.previewRows
    if (!previewRows && body.allNodes && Array.isArray(body.allNodes)) {
      console.log('[TCA Sync] Generating previewRows from allNodes:', body.allNodes.length)
      const previewResult = await generatePreview(body.allNodes, body.memberInfo || {})
      previewRows = previewResult.rows
    }

    if (previewRows && Array.isArray(previewRows)) {
      console.log('[TCA Sync] Using previewRows:', previewRows.length)
      stats.totalRecords = previewRows.length

      for (const row of previewRows) {
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

          processedTcaIds.push(tcaId)

          const systemParentId = refSysId || 0

          // PE = tạo User (nếu chưa tồn tại) + closure
          if (action.includes('PE')) {
            const hashedPassword = await bcrypt.hash('Brk#3773', 10)
            const existingUser = await prisma.user.findUnique({ where: { id: targetUserId } })

            if (!existingUser) {
              await prisma.user.create({
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

              if (referrerId && referrerId > 0) {
                await addUserToClosure(targetUserId, referrerId)
              }
            } else {
              console.log(`[TCA Sync] User #${targetUserId} already exists, skipping create (tcaId=${tcaId})`)
            }
          }

          // P = cập nhật phone
          if (action.includes('P') && action.includes('PE') === false && targetUserId) {
            const existingUser = await prisma.user.findUnique({ where: { id: targetUserId } })
            if (existingUser) {
              await prisma.user.update({
                where: { id: targetUserId },
                data: { phone: row.phone || undefined }
              })
              stats.usersUpdated++
            }
          }

          // E = cập nhật email
          if (action.includes('E') && action.includes('PE') === false && targetUserId) {
            const existingUser = await prisma.user.findUnique({ where: { id: targetUserId } })
            if (existingUser) {
              await prisma.user.update({
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

          // TCA = upsert TCAMember (dữ liệu từ preview row, KHÔNG cần allNodes)
          if (action.includes('TCA')) {
            const existingTCA = await tcaMemberModel.findUnique({ where: { tcaId } })

            const pScore = row.tcaScores?.personalScore ?? 0
            const tScore = row.tcaScores?.totalScore ?? 0
            const levelVal = row.tcaScores?.level ?? null

            const memberData = {
              tcaId, userId: targetUserId, name: row.name || '', type: 'item',
              parentTcaId: row.parentTcaId ? Number(row.parentTcaId) : null,
              phone: row.phone || null,
              email: row.email || null,
              personalScore: pScore,
              totalScore: tScore,
              level: levelVal,
              groupName: row.groupName || null,
              location: row.location || null,
              personalRate: row.personalRate || null,
              teamRate: row.teamRate || null,
              hasBH: row.hasBH ?? false,
              hasTD: row.hasTD ?? false,
              address: row.address || null,
              joinDate: parseDate(row.joinDate),
              contractDate: parseDate(row.contractDate),
              promotionDate: parseDate(row.promotionDate),
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

    return NextResponse.json({ error: 'Invalid payload - need previewRows or allNodes' }, { status: 400, headers: CORS_HEADERS })

  } catch (error) {
    console.error('[TCA Sync] ERROR:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'TCA Sync API',
    version: '8.0.0',
    description: 'Unified sync - uses shared preview logic for allNodes/auto-sync'
  }, { headers: CORS_HEADERS })
}
