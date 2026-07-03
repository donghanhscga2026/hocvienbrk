'use server'

import prisma from '@/lib/prisma'

const PLACEMENT_RULES: Record<number, 'REFERRAL' | 'FORCED_4WIDE'> = {
  4: 'FORCED_4WIDE',
}

async function findSystemRootUser(onSystem: number): Promise<number | null> {
  const root = await prisma.system.findFirst({
    where: { onSystem, refSysId: 0 },
    orderBy: { activatedAt: 'asc' }
  })
  return root?.userId || null
}

async function getDepthFromRoot(
  onSystem: number,
  autoId: number,
  rootAutoId: number
): Promise<number> {
  const result = await prisma.systemClosure.findFirst({
    where: { systemId: onSystem, descendantId: autoId, ancestorId: rootAutoId }
  })
  return result?.depth ?? 999
}

// BFS từ startUserId, trả về parentUserId + depth từ root
async function bfsFirstAvailable(
  onSystem: number,
  startUserId: number,
  rootAutoId: number
): Promise<{ userId: number; depth: number }> {
  const startSys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: startUserId, onSystem } }
  })
  if (!startSys) return { userId: startUserId, depth: 0 }

  const queue = [startSys.autoId]
  const visited = new Set<number>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const f1Count = await prisma.systemClosure.count({
      where: { ancestorId: currentId, depth: 1, systemId: onSystem }
    })

    if (f1Count < 4) {
      const node = await prisma.system.findUnique({ where: { autoId: currentId } })
      if (!node) continue
      const depth = await getDepthFromRoot(onSystem, currentId, rootAutoId)
      return { userId: node.userId, depth }
    }

    const f1Closures = await prisma.systemClosure.findMany({
      where: { ancestorId: currentId, depth: 1, systemId: onSystem },
      include: { descendant: { select: { autoId: true } } }
    })

    const f1Systems = await prisma.system.findMany({
      where: { autoId: { in: f1Closures.map(c => c.descendantId) } },
      select: { autoId: true },
      orderBy: { activatedAt: 'asc' }
    })

    for (const f1 of f1Systems) {
      if (!visited.has(f1.autoId)) queue.push(f1.autoId)
    }
  }

  return { userId: startUserId, depth: 0 }
}

async function findPlacement4Wide(
  onSystem: number,
  referrerUserId: number | null
): Promise<number> {
  const rootUserId = await findSystemRootUser(onSystem)
  if (!rootUserId) return 0

  const rootSys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: rootUserId, onSystem } }
  })
  if (!rootSys) return 0
  const rootAutoId = rootSys.autoId

  // Phase 1: BFS từ root, tìm slot đầu tiên
  const globalSlot = await bfsFirstAvailable(onSystem, rootUserId, rootAutoId)

  // Nếu depth < 3 → F1/F2/F3 chưa full → lấp ngang từ root, ko quan tâm referrer
  if (globalSlot.depth < 2) {
    return globalSlot.userId
  }

  // Phase 2: F1-F2-F3 đã full
  // Nếu có referrer cụ thể (khác root) và đang trong hệ thống → xếp dọc theo referrer
  if (referrerUserId && referrerUserId !== rootUserId) {
    const refSys = await prisma.system.findUnique({
      where: { userId_onSystem: { userId: referrerUserId, onSystem } }
    })
    if (refSys) {
      const refSlot = await bfsFirstAvailable(onSystem, referrerUserId, rootAutoId)
      return refSlot.userId
    }
  }

  // Fallback: BFS từ root (bao gồm ref=root hoặc ref ko trong hệ thống)
  return globalSlot.userId
}

export async function resolvePlacement(
  onSystem: number,
  referrerUserId: number | null
): Promise<number> {
  const rule = PLACEMENT_RULES[onSystem] || 'REFERRAL'

  if (rule === 'FORCED_4WIDE') {
    return findPlacement4Wide(onSystem, referrerUserId)
  }

  if (!referrerUserId) return 0
  return referrerUserId
}
