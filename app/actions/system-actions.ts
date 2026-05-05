'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { Role } from '@prisma/client'

// ==========================================
// GET SYSTEM STATS
// ==========================================
export async function getSystemStatsAction() {
  const session = await auth()
  if (session?.user?.id === undefined || session.user.role !== Role.ADMIN) {
    return { error: 'Unauthorized' }
  }

  const systems = await prisma.systemTree.findMany({
    orderBy: { onSystem: 'asc' }
  })

  // Get system counts separately (no direct relation in schema)
  const systemCounts = await prisma.system.groupBy({
    by: ['onSystem'],
    _count: { autoId: true }
  })
  const systemCountMap = new Map(systemCounts.map((s: any) => [s.onSystem, s._count.autoId]))

  // Get closure counts via raw query
  const closureCounts = await prisma.$queryRaw<{ systemId: number, count: bigint }[]>`
    SELECT "systemId", COUNT(*) as count 
    FROM system_closure 
    GROUP BY "systemId"
  `
  const closureMap = new Map(closureCounts.map(c => [c.systemId, Number(c.count)]))

  return {
    success: true,
    systems: systems.map((s: any) => ({
      onSystem: s.onSystem,
      nameSystem: s.nameSystem,
      systemCount: systemCountMap.get(s.onSystem) || 0,
      closureCount: closureMap.get(s.onSystem) || 0
    }))
  }
}

// ==========================================
// CREATE SYSTEM
// ==========================================
export async function createSystemAction(nameSystem: string, onSystem?: number) {
  const session = await auth()
  if (session?.user?.id === undefined || session.user.role !== Role.ADMIN) {
    return { error: 'Unauthorized' }
  }

  if (!nameSystem?.trim()) {
    return { error: 'Tên hệ thống không được để trống' }
  }

  try {
    // Auto-generate onSystem if not provided
    if (!onSystem) {
      const maxSystem = await prisma.systemTree.findFirst({
        orderBy: { onSystem: 'desc' },
        select: { onSystem: true }
      })
      onSystem = (maxSystem?.onSystem || 0) + 1
    }

    // Check if onSystem already exists
    const existing = await prisma.systemTree.findUnique({
      where: { onSystem }
    })
    if (existing) {
      return { error: `Hệ thống với onSystem=${onSystem} đã tồn tại` }
    }

    // Create system tree
    const newSystem = await prisma.systemTree.create({
      data: { onSystem, nameSystem: nameSystem.trim() }
    })

    // Log to SyncLog
    await prisma.syncLog.create({
      data: {
        syncId: `create_system_${onSystem}_${Date.now()}`,
        tableName: 'system_tree',
        recordId: newSystem.id,
        action: 'CREATE',
        newData: JSON.stringify({ onSystem, nameSystem: nameSystem.trim() }),
        createdAt: new Date()
      }
    })

    return { success: true, message: `Đã tạo hệ thống "${nameSystem}" (onSystem=${onSystem})` }
  } catch (error: any) {
    return { error: error.message || 'Lỗi khi tạo hệ thống' }
  }
}

// ==========================================
// DELETE SYSTEM (with SyncLog)
// ==========================================
export async function deleteSystemTreeAction(onSystem: number) {
  const session = await auth()
  if (session?.user?.id === undefined || session.user.role !== Role.ADMIN) {
    return { error: 'Unauthorized' }
  }

  // Protect default systems
  if ([0, 1, 2].includes(onSystem)) {
    return { error: `Không thể xóa hệ thống mặc định (onSystem=${onSystem})` }
  }

  // Verify system exists
  const systemTree = await prisma.systemTree.findUnique({
    where: { onSystem },
    select: { id: true, onSystem: true, nameSystem: true }
  })

  if (!systemTree) {
    return { error: `Không tìm thấy hệ thống với onSystem=${onSystem}` }
  }

  // Generate syncId for this delete operation
  const syncId = `delete_system_${onSystem}_${Date.now()}`

  try {
    // Get records to delete (for logging)
    const closuresToDelete = await prisma.systemClosure.findMany({
      where: { systemId: onSystem },
      select: { ancestorId: true, descendantId: true, depth: true }
    })

    const systemsToDelete = await prisma.system.findMany({
      where: { onSystem },
      select: { autoId: true, userId: true, refSysId: true }
    })

    await prisma.$transaction(async (tx) => {
      // 1. Log closures to SyncLog (Ghi 1 bản ghi tổng hợp vì system_closure không có ID duy nhất kiểu Int)
      if (closuresToDelete.length > 0) {
        await tx.syncLog.create({
          data: {
            syncId,
            tableName: 'system_closure',
            recordId: onSystem,
            action: 'DELETE',
            oldData: JSON.stringify(closuresToDelete),
            newData: null,
            createdAt: new Date()
          }
        })
      }

      // 2. Log systems to SyncLog
      for (const sys of systemsToDelete) {
        await tx.syncLog.create({
          data: {
            syncId,
            tableName: 'system',
            recordId: sys.autoId,
            action: 'DELETE',
            oldData: JSON.stringify(sys),
            newData: null,
            createdAt: new Date()
          }
        })
      }

      // 3. Log system tree to SyncLog
      await tx.syncLog.create({
        data: {
          syncId,
          tableName: 'system_tree',
          recordId: systemTree.id,
          action: 'DELETE',
          oldData: JSON.stringify(systemTree),
          newData: null,
          createdAt: new Date()
        }
      })

      // 4. Delete in correct order (child first)
      await tx.systemClosure.deleteMany({
        where: { systemId: onSystem }
      })

      await tx.system.deleteMany({
        where: { onSystem }
      })

      await tx.systemTree.delete({
        where: { onSystem }
      })
    })

    return { 
      success: true, 
      message: `Đã xóa hệ thống "${systemTree.nameSystem}" (onSystem=${onSystem})`,
      deleted: {
        closures: closuresToDelete.length,
        systems: systemsToDelete.length
      }
    }
  } catch (error: any) {
    console.error('[deleteSystemTree] Error:', error)
    return { error: 'Lỗi khi xóa hệ thống. Vui lòng thử lại.' }
  }
}
