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

// Hàm lưu SyncLog
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

export async function POST(request: Request) {
  const syncId = uuidv4()
  const startTime = Date.now()
  let stats = { usersCreated: 0, usersUpdated: 0, systemsCreated: 0, systemsUpdated: 0, tcaMembersCreated: 0, tcaMembersUpdated: 0, failed: 0, totalRecords: 0, skipped: 0 }
  const failedRecords: { tcaId: number; error: string }[] = []

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

          const userModel = prisma.user
          const systemModel = prisma.system
          const tcaMemberModel = (prisma as any).tCAMember
          const systemParentId = refSysId || 0

          // PE = tạo User + closure
          if (action.includes('PE')) {
            const hashedPassword = await bcrypt.hash('Brk#3773', 10)
            
            // Lưu oldData trước khi tạo
            const existingUser = await userModel.findUnique({ where: { id: targetUserId } })
            
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
            
            // Log tạo user
            await logSyncChange(syncId, 'User', targetUserId, 'CREATE', existingUser, { name: row.name, email: row.email })

            // Closure
            if (referrerId && referrerId > 0) {
              await addUserToClosure(targetUserId, referrerId)
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
              await logSyncChange(syncId, 'User', targetUserId, 'UPDATE', oldData, { phone: row.phone })
            }
          }

          // E = cập nhật email
          if (action.includes('E') && action.includes('PE') === false && targetUserId) {
            const existingUser = await userModel.findUnique({ where: { id: targetUserId } })
            if (existingUser) {
              const oldData = { email: existingUser.email }
              await userModel.update({
                where: { id: targetUserId },
                data: { email: row.email || undefined }
              })
              stats.usersUpdated++
              await logSyncChange(syncId, 'User', targetUserId, 'UPDATE', oldData, { email: row.email })
            }
          }

          // S = tạo System + closure
          if (action.includes('S')) {
            await addUserToSystemClosure(targetUserId, systemParentId, 1)
            stats.systemsCreated++
            
            // Log tạo system
            await logSyncChange(syncId, 'System', targetUserId, 'CREATE', null, { autoId: systemParentId })
          }

          // TCA = tạo TCAMember
          if (action.includes('TCA')) {
            const existingTCA = await tcaMemberModel.findUnique({ where: { tcaId } })
            
            await tcaMemberModel.upsert({
              where: { tcaId },
              update: {
                tcaId, userId: targetUserId, name: row.name || '', type: 'item',
                parentTcaId: row.parentTcaId ? Number(row.parentTcaId) : null,
                phone: row.phone || null,
                email: row.email || null,
                lastSyncedAt: new Date()
              },
              create: {
                tcaId, userId: targetUserId, name: row.name || '', type: 'item',
                parentTcaId: row.parentTcaId ? Number(row.parentTcaId) : null,
                phone: row.phone || null,
                email: row.email || null,
                lastSyncedAt: new Date()
              }
            })
            stats.tcaMembersCreated++
            
            // Log tạo/cập nhật TCAMember
            await logSyncChange(syncId, 'TCAMember', tcaId, existingTCA ? 'UPDATE' : 'CREATE', existingTCA, { name: row.name })
          }

        } catch (rowError) {
          stats.failed++
          failedRecords.push({ tcaId: Number(row.id), error: String(rowError) })
        }
      }

      const duration = Date.now() - startTime
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
  return NextResponse.json({ status: 'TCA Sync API', version: '7.0.0', description: 'Direct sync to Production with SyncLog for rollback' }, { headers: CORS_HEADERS })
}