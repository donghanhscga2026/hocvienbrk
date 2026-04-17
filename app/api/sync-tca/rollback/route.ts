import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

interface RollbackBySyncId {
  mode: 'syncId'
  syncId: string
  createBackup?: boolean
}

interface RollbackByTcaIds {
  mode: 'tcaIds'
  tcaIds: number[]
  createBackup?: boolean
}

interface RollbackByDate {
  mode: 'dateRange'
  fromDate: string
  toDate: string
  createBackup?: boolean
}

type RollbackPayload = RollbackBySyncId | RollbackByTcaIds | RollbackByDate

async function createBackupFile(data: {
  syncId: string
  type: string
  records: {
    users: { id: number; tcaId: number | null }[]
    systems: { autoId: number; tcaId: number | null }[]
    tcaMembers: { id: number; tcaId: number }[]
    closures: { systemId: number }[]
  }
}): Promise<string> {
  const backupId = uuidv4()
  const backupData = {
    backupId,
    createdAt: new Date().toISOString(),
    ...data
  }
  
  console.log('[TCA Rollback] Backup created:', backupId)
  console.log('[TCA Rollback] Backup data:', JSON.stringify(backupData, null, 2))
  
  return backupId
}

export async function POST(request: Request) {
  try {
    const body: RollbackPayload = await request.json()
    const { mode, createBackup = true } = body

    console.log('==========================================')
    console.log('[API/sync-tca/rollback] Starting rollback')
    console.log('Mode:', mode)
    console.log('==========================================')

    let recordsToDelete: {
      users: { id: number; tcaId: number | null }[]
      systems: { autoId: number; tcaId: number | null }[]
      tcaMembers: { id: number; tcaId: number }[]
      closures: { systemId: number }[]
    } = {
      users: [] as { id: number; tcaId: number | null }[],
      systems: [] as { autoId: number; tcaId: number | null }[],
      tcaMembers: [] as { id: number; tcaId: number }[],
      closures: [] as { systemId: number }[]
    }

    let syncId = ''
    let totalRecords = 0

    // =====================================================
    // MODE: Rollback by SyncId
    // =====================================================
    if (mode === 'syncId') {
      const { syncId: targetSyncId } = body as RollbackBySyncId
      syncId = targetSyncId

      const history = await (prisma as any).tCASyncHistory.findMany({
        where: { syncId: targetSyncId },
        orderBy: { id: 'asc' }
      })

      if (history.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Không tìm thấy lịch sử sync này'
        }, { headers: CORS_HEADERS })
      }

      // Get sync timestamp and TCA IDs from SYNC_START
      const syncStartRecord = history.find((h: { action: string }) => h.action === 'SYNC_START')
      const syncTimestamp = syncStartRecord?.createdAt ? new Date(syncStartRecord.createdAt) : new Date()
      
      let tcaIdsFromSync: number[] = []
      if (syncStartRecord?.afterData) {
        const afterData = syncStartRecord.afterData as { nodeIds?: number[]; totalNodes?: number }
        if (afterData?.nodeIds && Array.isArray(afterData.nodeIds)) {
          tcaIdsFromSync = afterData.nodeIds
        }
      }

      // Check if history has detailed CREATE records
      const hasDetailedHistory = history.some((h: { action: string }) => 
        ['CREATE_USER', 'CREATE_SYSTEM', 'CREATE_TCA_MEMBER', 'CREATE_CLOSURE'].includes(h.action)
      )

      if (hasDetailedHistory) {
        // Standard rollback using detailed history
        console.log('[TCA Rollback] Using detailed history')
        for (const record of history) {
          if (record.action === 'CREATE_USER' && record.recordId && record.tcaId) {
            recordsToDelete.users.push({ id: record.recordId, tcaId: record.tcaId })
          } else if (record.action === 'CREATE_SYSTEM' && record.recordId && record.tcaId) {
            recordsToDelete.systems.push({ autoId: record.recordId, tcaId: record.tcaId })
          } else if (record.action === 'CREATE_TCA_MEMBER' && record.recordId && record.tcaId) {
            recordsToDelete.tcaMembers.push({ id: record.recordId, tcaId: record.tcaId })
          } else if (record.action === 'CREATE_CLOSURE' && record.afterData) {
            const data = record.afterData as { systemId?: number }
            if (data?.systemId) {
              recordsToDelete.closures.push({ systemId: data.systemId })
            }
          }
        }
      } else if (tcaIdsFromSync.length > 0) {
        // No detailed history but we have TCA IDs from SYNC_START
        console.log('[TCA Rollback] Finding TCAMembers by TCA IDs from sync:', tcaIdsFromSync)
        
        for (const tcaId of tcaIdsFromSync) {
          const tcaMember = await (prisma as any).tCAMember?.findUnique({
            where: { tcaId }
          })
          if (tcaMember) {
            recordsToDelete.tcaMembers.push({ id: tcaMember.id, tcaId })
            
            const system = await prisma.system.findFirst({
              where: { userId: tcaMember.userId, onSystem: 1 }
            })
            if (system) {
              recordsToDelete.systems.push({ autoId: system.autoId, tcaId })
              recordsToDelete.closures.push({ systemId: system.autoId })
            }
            
            recordsToDelete.users.push({ id: tcaMember.userId, tcaId })
          }
        }
      } else {
        // No detailed history and no TCA IDs - find by timestamp
        const timeWindow = 60 * 60 * 1000 // 1 hour
        const fromTime = new Date(syncTimestamp.getTime() - timeWindow)
        const toTime = new Date(syncTimestamp.getTime() + timeWindow)
        
        console.log('[TCA Rollback] Finding TCAMembers synced between', fromTime, 'and', toTime)
        
        const recentTCAMembers = await (prisma as any).tCAMember?.findMany({
          where: {
            lastSyncedAt: {
              gte: fromTime,
              lte: toTime
            }
          }
        })
        
        if (recentTCAMembers && recentTCAMembers.length > 0) {
          console.log('[TCA Rollback] Found', recentTCAMembers.length, 'TCAMembers to rollback')
          
          for (const tcaMember of recentTCAMembers) {
            recordsToDelete.tcaMembers.push({ id: tcaMember.id, tcaId: tcaMember.tcaId })
            
            const system = await prisma.system.findFirst({
              where: { userId: tcaMember.userId, onSystem: 1 }
            })
            if (system) {
              recordsToDelete.systems.push({ autoId: system.autoId, tcaId: tcaMember.tcaId })
              recordsToDelete.closures.push({ systemId: system.autoId })
            }
            
            recordsToDelete.users.push({ id: tcaMember.userId, tcaId: tcaMember.tcaId })
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'Không tìm thấy dữ liệu để rollback cho sync này',
            hint: 'Sync này có thể không tạo dữ liệu hoặc dữ liệu đã được xóa trước đó.'
          }, { headers: CORS_HEADERS })
        }
      }
      totalRecords = history.length

    // =====================================================
    // MODE: Rollback by TCA IDs
    // =====================================================
    } else if (mode === 'tcaIds') {
      const { tcaIds } = body as RollbackByTcaIds
      syncId = 'manual_' + uuidv4()

      for (const tcaId of tcaIds) {
        const tcaMember = await (prisma as any).tCAMember?.findUnique({
          where: { tcaId }
        })
        if (tcaMember) {
          recordsToDelete.tcaMembers.push({ id: tcaMember.id, tcaId })

          const system = await prisma.system.findFirst({
            where: { userId: tcaMember.userId, onSystem: 1 }
          })
          if (system) {
            recordsToDelete.systems.push({ autoId: system.autoId, tcaId })
            recordsToDelete.closures.push({ systemId: system.autoId })
          }

          recordsToDelete.users.push({ id: tcaMember.userId, tcaId })
        }
      }
      totalRecords = tcaIds.length

    // =====================================================
    // MODE: Rollback by Date Range
    // =====================================================
    } else if (mode === 'dateRange') {
      const { fromDate, toDate } = body as RollbackByDate
      syncId = 'daterange_' + uuidv4()

      const from = new Date(fromDate)
      const to = new Date(toDate)

      const history = await (prisma as any).tCASyncHistory.findMany({
        where: {
          createdAt: {
            gte: from,
            lte: to
          },
          action: { in: ['CREATE_USER', 'CREATE_SYSTEM', 'CREATE_TCA_MEMBER', 'CREATE_CLOSURE'] }
        },
        orderBy: { id: 'desc' }
      })

      for (const record of history) {
        if (record.action === 'CREATE_USER' && record.recordId && record.tcaId) {
          if (!recordsToDelete.users.find(u => u.id === record.recordId)) {
            recordsToDelete.users.push({ id: record.recordId, tcaId: record.tcaId })
          }
        } else if (record.action === 'CREATE_SYSTEM' && record.recordId && record.tcaId) {
          if (!recordsToDelete.systems.find(s => s.autoId === record.recordId)) {
            recordsToDelete.systems.push({ autoId: record.recordId, tcaId: record.tcaId })
          }
        } else if (record.action === 'CREATE_TCA_MEMBER' && record.recordId && record.tcaId) {
          if (!recordsToDelete.tcaMembers.find(m => m.id === record.recordId)) {
            recordsToDelete.tcaMembers.push({ id: record.recordId, tcaId: record.tcaId })
          }
        } else if (record.action === 'CREATE_CLOSURE' && record.afterData) {
          const data = record.afterData as { systemId?: number }
          if (data?.systemId && !recordsToDelete.closures.find(c => c.systemId === data.systemId)) {
            recordsToDelete.closures.push({ systemId: data.systemId })
          }
        }
      }
      totalRecords = history.length
    }

    console.log('[TCA Rollback] Records to delete:', {
      users: recordsToDelete.users.length,
      systems: recordsToDelete.systems.length,
      tcaMembers: recordsToDelete.tcaMembers.length,
      closures: recordsToDelete.closures.length
    })

    if (createBackup) {
      const backupId = await createBackupFile({
        syncId,
        type: mode,
        records: recordsToDelete
      })
      console.log('[TCA Rollback] Backup ID:', backupId)
    }

    let deleted = {
      users: 0,
      systems: 0,
      tcaMembers: 0,
      closures: 0
    }

    const errors: { table: string; id: number; error: string }[] = []

    // Delete in reverse dependency order
    // 1. Closures first (references System)
    for (const closure of recordsToDelete.closures) {
      try {
        await prisma.systemClosure.deleteMany({
          where: {
            descendantId: closure.systemId,
            systemId: 1
          }
        })
        deleted.closures++
      } catch (e) {
        errors.push({ table: 'SystemClosure', id: closure.systemId, error: String(e) })
      }
    }

    // 2. TCAMembers
    for (const member of recordsToDelete.tcaMembers) {
      try {
        await (prisma as any).tCAMember?.delete({
          where: { id: member.id }
        }).catch(() => { })
        deleted.tcaMembers++
      } catch (e) {
        errors.push({ table: 'TCAMember', id: member.id, error: String(e) })
      }
    }

    // 3. Systems
    for (const system of recordsToDelete.systems) {
      try {
        await prisma.system.delete({
          where: { autoId: system.autoId }
        }).catch(() => { })
        deleted.systems++
      } catch (e) {
        errors.push({ table: 'System', id: system.autoId, error: String(e) })
      }
    }

    // 4. Users (last - they might have other data)
    for (const user of recordsToDelete.users) {
      try {
        await prisma.user.delete({
          where: { id: user.id }
        }).catch(() => { })
        deleted.users++
      } catch (e) {
        errors.push({ table: 'User', id: user.id, error: String(e) })
      }
    }

    // Save rollback record
    await (prisma as any).tCASyncHistory?.create({
      data: {
        syncId,
        action: 'ROLLBACK',
        tableName: '_ROLLBACK',
        recordId: null,
        tcaId: null,
        beforeData: null,
        afterData: {
          mode,
          deleted,
          errors: errors.length,
          originalSyncId: mode === 'syncId' ? (body as RollbackBySyncId).syncId : null
        },
        totalRecords,
        status: 'COMPLETED'
      }
    }).catch(() => { })

    console.log('==========================================')
    console.log('[API/sync-tca/rollback] Rollback completed')
    console.log('Deleted:', deleted)
    console.log('Errors:', errors.length)
    console.log('==========================================')

    return NextResponse.json({
      success: true,
      syncId,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
      message: `Đã xóa: ${deleted.users} users, ${deleted.systems} systems, ${deleted.tcaMembers} tcaMembers, ${deleted.closures} closures`
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/sync-tca/rollback] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const syncId = searchParams.get('syncId')
  const limit = parseInt(searchParams.get('limit') || '20')

  let where = {}
  if (syncId) {
    where = { syncId }
  }

  const history = await (prisma as any).tCASyncHistory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  const stats = {
    totalSyncs: 0,
    totalUsers: 0,
    totalSystems: 0,
    totalTCAMembers: 0,
    totalClosures: 0
  }

  const uniqueSyncIds = new Set<string>()
  history.forEach((h: { syncId: string; action: string }) => {
    uniqueSyncIds.add(h.syncId)
  })
  stats.totalSyncs = uniqueSyncIds.size

  history.forEach((h: { action: string }) => {
    if (h.action === 'CREATE_USER') stats.totalUsers++
    if (h.action === 'CREATE_SYSTEM') stats.totalSystems++
    if (h.action === 'CREATE_TCA_MEMBER') stats.totalTCAMembers++
    if (h.action === 'CREATE_CLOSURE') stats.totalClosures++
  })

  return NextResponse.json({
    status: 'TCA Rollback API',
    version: '3.0.0',
    usage: {
      method: 'POST',
      body: {
        mode: "'syncId' | 'tcaIds' | 'dateRange'",
        syncId: 'UUID của lần sync cần rollback (mode=syncId)',
        tcaIds: 'Mảng TCA IDs cần xóa (mode=tcaIds)',
        fromDate: 'Ngày bắt đầu (mode=dateRange)',
        toDate: 'Ngày kết thúc (mode=dateRange)',
        createBackup: 'Tạo backup trước khi xóa (mặc định: true)'
      }
    },
    stats,
    history: history.map((h: { id: number; syncId: string; action: string; tableName: string; recordId: number | null; tcaId: number | null; status: string; createdAt: Date }) => ({
      id: h.id,
      syncId: h.syncId,
      action: h.action,
      tableName: h.tableName,
      recordId: h.recordId,
      tcaId: h.tcaId,
      status: h.status,
      createdAt: h.createdAt
    }))
  }, { headers: CORS_HEADERS })
}
