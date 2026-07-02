'use server'

import prisma from '@/lib/prisma'

// Map system → áp dụng quy tắc placement
// Mở rộng bằng cách thêm entry mới: [onSystem]: 'FORCED_4WIDE'
const PLACEMENT_RULES: Record<number, 'REFERRAL' | 'FORCED_4WIDE'> = {
  4: 'FORCED_4WIDE',
}

// BFS tìm node đầu tiên còn chỗ (< 4 F1)
// ưu tiên chiều rộng, theo thứ tự thời gian kích hoạt
async function findPlacement4Wide(
  onSystem: number,
  referrerUserId: number
): Promise<number> {
  const referrerSystem = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: referrerUserId, onSystem } }
  })
  if (!referrerSystem) return 0

  const queue = [referrerSystem.autoId]
  const visited = new Set<number>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const f1Count = await prisma.systemClosure.count({
      where: { ancestorId: currentId, depth: 1, systemId: onSystem }
    })

    if (f1Count < 4) return currentId

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

  return referrerSystem.autoId
}

// Dispatcher: chọn quy tắc placement theo system
export async function resolvePlacement(
  onSystem: number,
  referrerUserId: number | null
): Promise<number> {
  if (!referrerUserId) return 0

  const rule = PLACEMENT_RULES[onSystem] || 'REFERRAL'

  if (rule === 'FORCED_4WIDE') {
    return findPlacement4Wide(onSystem, referrerUserId)
  }

  // REFERRAL: trực tiếp dưới người giới thiệu
  const refSys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: referrerUserId, onSystem } }
  })
  return refSys?.autoId || 0
}
