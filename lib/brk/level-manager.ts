'use server'

import prisma from '@/lib/prisma'
import { getNextLevelConfig } from './config-service'
import { validateBranchRequirements } from './branch-validator'

export async function checkAndPromoteLevel(userId: number, onSystem: number) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) return null

  const currentLevel = systemRec.level || 1
  const nextConfig = await getNextLevelConfig(onSystem, currentLevel)
  if (!nextConfig) return null

  const totalPoints = Number(systemRec.totalPoints || 0)
  if (totalPoints < Number(nextConfig.pointsRequired)) return null

  if (nextConfig.branchReqs.length > 0) {
    const branchCheck = await validateBranchRequirements(userId, onSystem, nextConfig.id)
    if (!branchCheck.passed) return null
  }

  const promoted = await prisma.system.update({
    where: { autoId: systemRec.autoId },
    data: { level: nextConfig.level }
  })

  await prisma.brkLevelUpRecord.create({
    data: {
      userId,
      onSystem,
      fromLevel: currentLevel,
      toLevel: nextConfig.level,
    }
  })

  if (nextConfig.giftValue > 0) {
    await prisma.system.update({
      where: { autoId: systemRec.autoId },
      data: { giftClaimed: false }
    })
  }

  return promoted
}

export async function claimLevelGift(userId: number, onSystem: number, courseId: number) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) throw new Error('Not a member')
  if (systemRec.giftClaimed) throw new Error('Gift already claimed')

  const lastRecord = await prisma.brkLevelUpRecord.findFirst({
    where: { userId, onSystem },
    orderBy: { promotedAt: 'desc' }
  })
  if (!lastRecord) throw new Error('No level up record found')

  const config = await prisma.brkLevelConfig.findUnique({
    where: { systemId_level: { systemId: onSystem, level: lastRecord.toLevel } }
  })
  if (!config || config.giftValue <= 0) throw new Error('No gift available for this level')

  if (config.timeLimitDays) {
    const deadline = new Date(lastRecord.promotedAt.getTime() + config.timeLimitDays * 24 * 60 * 60 * 1000)
    if (new Date() > deadline) throw new Error('Gift claim period has expired')
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new Error('Course not found')
  if (course.phi_coc > config.giftValue) {
    throw new Error(`Course fee (${course.phi_coc}) exceeds gift value (${config.giftValue})`)
  }

  await prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: 'ACTIVE',
      phi_coc: 0,
      startedAt: new Date(),
    }
  })

  await prisma.system.update({
    where: { autoId: systemRec.autoId },
    data: { giftClaimed: true }
  })

  return { success: true, courseId }
}

export async function getLevelProgress(userId: number, onSystem: number) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) return null

  const currentLevel = systemRec.level || 1
  const totalPoints = Number(systemRec.totalPoints || 0)

  const allConfigs = await prisma.brkLevelConfig.findMany({
    where: { systemId: onSystem },
    include: { branchReqs: true },
    orderBy: { level: 'asc' }
  })

  const nextConfig = allConfigs.find(c => c.level === currentLevel + 1)
  const currentConfig = allConfigs.find(c => c.level === currentLevel)

  let progress = 0
  let pointsNeeded = 0
  if (nextConfig) {
    pointsNeeded = Math.max(0, Number(nextConfig.pointsRequired) - totalPoints)
    const range = Number(nextConfig.pointsRequired) - (currentConfig ? Number(currentConfig.pointsRequired) : 0)
    const earned = totalPoints - (currentConfig ? Number(currentConfig.pointsRequired) : 0)
    progress = range > 0 ? Math.min(100, Math.round((earned / range) * 100)) : 0
  } else {
    progress = 100
  }

  return {
    currentLevel,
    totalPoints,
    currentConfig,
    nextConfig,
    progress,
    pointsNeeded,
    giftClaimed: systemRec.giftClaimed,
    levelUpRecords: await prisma.brkLevelUpRecord.findMany({
      where: { userId, onSystem },
      orderBy: { promotedAt: 'desc' }
    })
  }
}

export async function createReferralBonus(userId: number, onSystem: number) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) return null

  const f1Count = await prisma.systemClosure.count({
    where: {
      ancestorId: systemRec.autoId,
      depth: 1,
      systemId: onSystem
    }
  })

  if (f1Count < 2) return null

  const existing = await prisma.brkReferralBonus.findFirst({
    where: { userId, onSystem, claimed: false }
  })
  if (existing) return existing

  return prisma.brkReferralBonus.create({
    data: { userId, onSystem, f1Count }
  })
}
