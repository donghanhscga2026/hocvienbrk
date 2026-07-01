'use server'

import prisma from '@/lib/prisma'

export async function getLevelConfig(systemId: number, level: number) {
  return prisma.brkLevelConfig.findUnique({
    where: { systemId_level: { systemId, level } },
    include: { branchReqs: true }
  })
}

export async function getAllLevelConfigs(systemId: number) {
  return prisma.brkLevelConfig.findMany({
    where: { systemId },
    include: { branchReqs: true },
    orderBy: { level: 'asc' }
  })
}

export async function getNextLevelConfig(systemId: number, currentLevel: number) {
  if (currentLevel >= 8) return null
  return getLevelConfig(systemId, currentLevel + 1)
}

export async function getSystemTreeByCourseId(courseId: number) {
  return prisma.systemTree.findUnique({
    where: { courseId }
  })
}

export async function getSystemTreeByOnSystem(onSystem: number) {
  return prisma.systemTree.findUnique({
    where: { onSystem }
  })
}
