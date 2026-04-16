import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

interface RollbackPayload {
  syncId: string
}

export async function POST(request: Request) {
  try {
    const body: RollbackPayload = await request.json()
    const { syncId } = body

    if (!syncId) {
      return NextResponse.json(
        { error: 'syncId required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    console.log('==========================================')
    console.log('[API/sync-tca/rollback] Starting rollback')
    console.log('SyncId:', syncId)
    console.log('==========================================')

    // Get all history records for this sync (in reverse order)
    const history = await prisma.tCASyncHistory.findMany({
      where: { syncId },
      orderBy: { id: 'desc' }
    })

    if (history.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No history found for this syncId'
      }, { headers: CORS_HEADERS })
    }

    console.log(`Found ${history.length} history records to rollback`)

    let rolledBack = 0
    let errors: { action: string; error: string }[] = []

    // Rollback in reverse order
    for (const record of history) {
      try {
        if (record.action === 'CREATE_USER' && record.beforeData === null) {
          // Delete the created user
          if (record.recordId) {
            await prisma.user.delete({
              where: { id: record.recordId }
            })
            rolledBack++
            console.log(`[Rollback] Deleted User ${record.recordId}`)
          }
        } else if (record.action === 'UPDATE_USER' && record.beforeData) {
          // Restore previous data
          if (record.recordId) {
            await prisma.user.update({
              where: { id: record.recordId },
              data: record.beforeData as object
            })
            rolledBack++
            console.log(`[Rollback] Restored User ${record.recordId}`)
          }
        } else if (record.action === 'CREATE_SYSTEM' && record.beforeData === null) {
          // Delete the created system
          if (record.recordId) {
            await prisma.system.delete({
              where: { autoId: record.recordId }
            })
            rolledBack++
            console.log(`[Rollback] Deleted System ${record.recordId}`)
          }
        } else if (record.action === 'CREATE_TCA_MEMBER' && record.beforeData === null) {
          // Delete the created TCAMember
          if (record.recordId) {
            await prisma.tCAMember.delete({
              where: { id: record.recordId }
            })
            rolledBack++
            console.log(`[Rollback] Deleted TCAMember ${record.recordId}`)
          }
        } else if (record.action === 'UPDATE_TCA_MEMBER' && record.beforeData) {
          // Restore previous data
          if (record.recordId) {
            await prisma.tCAMember.update({
              where: { id: record.recordId },
              data: record.beforeData as object
            })
            rolledBack++
            console.log(`[Rollback] Restored TCAMember ${record.recordId}`)
          }
        } else if (record.action === 'CREATE_CLOSURE') {
          // Delete created closures
          if (record.tcaId) {
            const userId = record.afterData as { systemId?: number }
            if (userId?.systemId) {
              await prisma.systemClosure.deleteMany({
                where: { descendantId: userId.systemId, systemId: 1 }
              })
              rolledBack++
              console.log(`[Rollback] Deleted SystemClosure for system ${userId.systemId}`)
            }
          }
        } else if (record.action === 'UPDATE_REFERRER') {
          // Restore referrerId
          if (record.recordId && record.beforeData) {
            const before = record.beforeData as { referrerId?: number | null }
            await prisma.user.update({
              where: { id: record.recordId },
              data: { referrerId: before.referrerId ?? null }
            })
            rolledBack++
            console.log(`[Rollback] Restored referrer for User ${record.recordId}`)
          }
        }
      } catch (error) {
        errors.push({
          action: record.action,
          error: String(error)
        })
        console.error(`[Rollback] Error rolling back ${record.action}:`, error)
      }
    }

    // Mark all history as ROLLED_BACK
    await prisma.tCASyncHistory.updateMany({
      where: { syncId },
      data: { status: 'ROLLED_BACK' }
    })

    // Optionally delete history records after rollback
    // await prisma.tCASyncHistory.deleteMany({ where: { syncId } })

    console.log('==========================================')
    console.log('[API/sync-tca/rollback] Rollback completed')
    console.log('Rolled back:', rolledBack)
    console.log('Errors:', errors.length)
    console.log('==========================================')

    return NextResponse.json({
      success: true,
      syncId,
      rolledBack,
      errors: errors.length > 0 ? errors : undefined,
      message: 'Rollback completed'
    }, { headers: CORS_HEADERS })

  } catch (error) {
    console.error('[API/sync-tca/rollback] Error:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function GET() {
  // Get recent rollback history
  const recentRollbacks = await prisma.tCASyncHistory.findMany({
    where: { status: 'ROLLED_BACK' },
    select: {
      syncId: true,
      createdAt: true,
      tableName: true,
      action: true,
      totalRecords: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  return NextResponse.json({
    status: 'TCA Rollback API',
    version: '1.0.0',
    usage: {
      method: 'POST',
      body: {
        syncId: 'UUID của lần sync cần rollback'
      }
    },
    recentRollbacks
  }, { headers: CORS_HEADERS })
}
