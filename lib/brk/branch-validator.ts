'use server'

import prisma from '@/lib/prisma'

export async function countBranchesAtLevel(
  userId: number,
  onSystem: number,
  targetLevel: number
): Promise<number> {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) return 0

  const f1List = await prisma.systemClosure.findMany({
    where: {
      ancestorId: systemRec.autoId,
      depth: 1,
      systemId: onSystem
    }
  })

  let branchCount = 0
  for (const f1 of f1List) {
    const f1System = await prisma.system.findUnique({
      where: { autoId: f1.descendantId }
    })
    if (f1System && f1System.level >= targetLevel) {
      branchCount++
    }
  }

  return branchCount
}

export async function validateBranchRequirements(
  userId: number,
  onSystem: number,
  configId: number
): Promise<{ passed: boolean; details: { branchLevel: number; required: number; actual: number }[] }> {
  const reqs = await prisma.brkLevelBranchReq.findMany({
    where: { configId }
  })

  const details = []
  for (const req of reqs) {
    const actual = await countBranchesAtLevel(userId, onSystem, req.branchLevel)
    details.push({
      branchLevel: req.branchLevel,
      required: req.count,
      actual
    })
  }

  return {
    passed: details.every(d => d.actual >= d.required),
    details
  }
}
