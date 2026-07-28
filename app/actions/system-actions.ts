'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { Role } from '@prisma/client'

// ==========================================
// GET SYSTEM STATS
// ==========================================
export async function getSystemStatsAction() {
  const session = await auth()
  const userId = session?.user?.id ? parseInt(session.user.id) : null
  const userRole = session?.user?.role
  if (userId === null || (userId !== 0 && userRole !== Role.ADMIN)) {
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
  const userId = session?.user?.id ? parseInt(session.user.id) : null
  const userRole = session?.user?.role
  if (userId === null || (userId !== 0 && userRole !== Role.ADMIN)) {
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
  const userId = session?.user?.id ? parseInt(session.user.id) : null
  const userRole = session?.user?.role
  if (userId === null || (userId !== 0 && userRole !== Role.ADMIN)) {
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

// ==========================================
// GET MY SYSTEMS (user participates in)
// ==========================================
export async function getMySystemsAction() {
  const session = await auth()
  const userId = session?.user?.id ? parseInt(session.user.id) : null
  const userRole = session?.user?.role
  if (userId === null) return { success: false, error: 'Unauthorized' }

  const isAdmin = userId === 0 || userRole === Role.ADMIN

  if (isAdmin) {
    const systems = await prisma.systemTree.findMany({
      orderBy: { onSystem: 'asc' },
      select: { onSystem: true, nameSystem: true }
    })
    return { success: true, systems }
  }

  const mySystemIds = await prisma.system.findMany({
    where: { userId },
    distinct: ['onSystem'],
    select: { onSystem: true }
  })

  if (mySystemIds.length === 0) return { success: true, systems: [] }

  const systems = await prisma.systemTree.findMany({
    where: { onSystem: { in: mySystemIds.map(s => s.onSystem) } },
    orderBy: { onSystem: 'asc' },
    select: { onSystem: true, nameSystem: true }
  })

  return { success: true, systems }
}

// ==========================================
// GET SYSTEM DETAIL STATS (for one system)
// ==========================================
export async function getSystemDetailStatsAction(onSystem: number) {
  const session = await auth()
  const userId = session?.user?.id ? parseInt(session.user.id) : null
  if (userId === null) return { success: false, error: 'Unauthorized' }

  const [systemTree, statusCounts, levelGroups, dhttCount, closureCount, maxDepthResult] = await Promise.all([
    prisma.systemTree.findUnique({
      where: { onSystem },
      select: { onSystem: true, nameSystem: true }
    }),
    prisma.system.groupBy({
      by: ['status'],
      where: { onSystem },
      _count: { autoId: true }
    }),
    prisma.system.groupBy({
      by: ['level'],
      where: { onSystem },
      _count: { autoId: true }
    }),
    prisma.system.count({
      where: { onSystem, inDongChia: true }
    }),
    prisma.systemClosure.count({
      where: { systemId: onSystem }
    }),
    prisma.$queryRaw<{ maxDepth: bigint }[]>`
      SELECT COALESCE(MAX(depth), 0) as "maxDepth"
      FROM system_closure
      WHERE "systemId" = ${onSystem}
    `
  ])

  if (!systemTree) return { success: false, error: 'Hệ thống không tồn tại' }

  const statusMap = new Map(statusCounts.map(s => [s.status, s._count.autoId]))
  const totalMembers = statusCounts.reduce((sum, s) => sum + s._count.autoId, 0)
  const activeMembers = statusMap.get('ACTIVE') || 0
  const pendingMembers = statusMap.get('PENDING') || 0
  const expiredMembers = statusMap.get('EXPIRED') || 0

  const levelDistribution: Record<number, number> = {}
  for (const l of levelGroups) {
    levelDistribution[l.level] = l._count.autoId
  }
  const bdhMembers = levelGroups.filter(l => l.level >= 2).reduce((sum, l) => sum + l._count.autoId, 0)

  return {
    success: true,
    system: systemTree,
    stats: {
      totalMembers,
      activeMembers,
      pendingMembers,
      expiredMembers,
      bdhMembers,
      dhttMembers: dhttCount,
      activatedMembers: 0,
      closureCount,
      maxDepth: Number(maxDepthResult[0]?.maxDepth || 0),
      levelDistribution,
    }
  }
}

// ==========================================
// GET LEADERBOARD (Top members by criteria)
// ==========================================
export type LeaderboardCriteria = 'teamSize' | 'revenue' | 'income' | 'points'

async function getSystemRootUserId(onSystem: number): Promise<number | null> {
  const potentialRoots = await prisma.system.findMany({
    where: { onSystem, refSysId: 0 },
    select: { autoId: true, userId: true }
  })
  for (const sys of potentialRoots) {
    const hasParent = await prisma.systemClosure.findFirst({
      where: { descendantId: sys.autoId, systemId: onSystem, depth: { gt: 0 } }
    })
    if (!hasParent) return sys.userId
  }
  return potentialRoots.length > 0 ? potentialRoots[0].userId : null
}

async function buildSharingCountMapForSystem(memberIds: number[]): Promise<Map<number, number>> {
  if (memberIds.length === 0) return new Map()

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: 22 },
    select: { userId: true, referrerId: true }
  })

  const parentToChildren = new Map<number, number[]>()
  for (const e of enrollments) {
    if (e.referrerId) {
      if (!parentToChildren.has(e.referrerId)) parentToChildren.set(e.referrerId, [])
      parentToChildren.get(e.referrerId)!.push(e.userId)
    }
  }

  const countCache = new Map<number, number>()
  function countDescendants(uid: number): number {
    if (countCache.has(uid)) return countCache.get(uid)!
    const children = parentToChildren.get(uid) || []
    let count = children.length
    for (const child of children) {
      count += countDescendants(child)
    }
    countCache.set(uid, count)
    return count
  }

  const memberSet = new Set(memberIds)
  for (const uid of memberSet) {
    countDescendants(uid)
  }

  return countCache
}

export async function getLeaderboardAction(onSystem: number, criteria: LeaderboardCriteria = 'teamSize') {
  const session = await auth()
  const userId = session?.user?.id ? parseInt(session.user.id) : null
  if (userId === null) return { success: false, error: 'Unauthorized' }

  const [rootUserId, systemMembers] = await Promise.all([
    getSystemRootUserId(onSystem),
    prisma.system.findMany({
      where: { onSystem },
      select: {
        userId: true,
        officialTeamSize: true,
        totalMbdtVolume: true,
        totalCashVolume: true,
        totalPoints: true,
        level: true,
        user: { select: { name: true, image: true } }
      }
    })
  ])

  const eligibleMembers = rootUserId !== null
    ? systemMembers.filter(m => m.userId !== rootUserId)
    : systemMembers

  if (criteria === 'teamSize') {
    const memberIds = eligibleMembers.map(m => m.userId)
    const sharingCountMap = await buildSharingCountMapForSystem(memberIds)

    const leaderboard = eligibleMembers
      .map(m => ({
        userId: m.userId,
        name: m.user.name || `HV #${m.userId}`,
        image: m.user.image,
        level: m.level,
        teamSize: sharingCountMap.get(m.userId) || 0,
        revenue: 0,
        income: 0,
        points: 0,
      }))
      .sort((a, b) => b.teamSize - a.teamSize)
      .slice(0, 10)
      .map((m, idx) => ({ rank: idx + 1, ...m }))

    return { success: true, leaderboard, criteria }
  }

  if (criteria === 'income') {
    const memberUserIds = eligibleMembers.map(m => m.userId)
    const wallets = await prisma.brkWallet.findMany({
      where: { userId: { in: memberUserIds } },
      select: { userId: true, totalEarned: true }
    })
    const walletMap = new Map(wallets.map(w => [w.userId, Number(w.totalEarned)]))

    const leaderboard = eligibleMembers
      .map(m => ({
        userId: m.userId,
        name: m.user.name || `HV #${m.userId}`,
        image: m.user.image,
        level: m.level,
        teamSize: m.officialTeamSize,
        revenue: Number(m.totalMbdtVolume),
        income: walletMap.get(m.userId) || 0,
        points: Number(m.totalPoints),
      }))
      .sort((a, b) => b.income - a.income)
      .slice(0, 10)
      .map((m, idx) => ({ rank: idx + 1, ...m }))

    return { success: true, leaderboard, criteria }
  }

  let sortFn: (a: typeof eligibleMembers[0], b: typeof eligibleMembers[0]) => number

  switch (criteria) {
    case 'revenue':
      sortFn = (a, b) => Number(b.totalMbdtVolume) - Number(a.totalMbdtVolume)
      break
    case 'points':
      sortFn = (a, b) => Number(b.totalPoints) - Number(a.totalPoints)
      break
    default:
      sortFn = (a, b) => b.officialTeamSize - a.officialTeamSize
  }

  const leaderboard = eligibleMembers
    .sort(sortFn)
    .slice(0, 10)
    .map((m, idx) => ({
      rank: idx + 1,
      userId: m.userId,
      name: m.user.name || `HV #${m.userId}`,
      image: m.user.image,
      level: m.level,
      teamSize: m.officialTeamSize,
      revenue: Number(m.totalMbdtVolume),
      income: Number(m.totalCashVolume),
      points: Number(m.totalPoints),
    }))

  return { success: true, leaderboard, criteria }
}
