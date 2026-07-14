'use server'

import prisma from '@/lib/prisma'
import { getLevelConfig, getAllLevelConfigs } from './config-service'
import { validateBranchRequirements } from './branch-validator'
import { creditVoucherWallet } from './wallet-service'
import { isTestAccount } from '@/lib/test-account'

export async function checkAndPromoteLevel(userId: number, onSystem: number, promotedAt?: Date) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) return null

  const totalPoints = Number(systemRec.totalPoints || 0)
  let currentLevel = systemRec.level || 1
  let maxPromotedLevel = currentLevel

  // Multi-level promotion: keep promoting while eligible
  while (currentLevel < 8) {
    const nextConfig = await getLevelConfig(onSystem, currentLevel + 1)
    if (!nextConfig) break

    if (totalPoints < Number(nextConfig.pointsRequired)) break

    if (nextConfig.branchReqs.length > 0) {
      const branchCheck = await validateBranchRequirements(userId, onSystem, nextConfig.id)
      if (!branchCheck.passed) break
    }

    currentLevel++
    if (currentLevel > maxPromotedLevel) maxPromotedLevel = currentLevel

    await prisma.brkLevelUpRecord.create({
      data: {
        userId,
        onSystem,
        fromLevel: currentLevel - 1,
        toLevel: currentLevel,
        promotedAt,
      }
    }).catch(() => {})

    if (nextConfig.giftValue > 0) {
      await creditVoucherWallet(
        userId,
        nextConfig.giftValue,
        `Quà tặng lên cấp ${currentLevel} (${nextConfig.giftValue} VND)`,
        `level_${currentLevel}_sys_${onSystem}`,
        promotedAt
      )
    }
  }

  if (maxPromotedLevel > (systemRec.level || 1)) {
    const promoted = await prisma.system.update({
      where: { autoId: systemRec.autoId },
      data: { level: maxPromotedLevel }
    })
    return promoted
  }

  return systemRec
}

export async function claimLevelGift(userId: number, onSystem: number, courseId: number) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) throw new Error('Not a member')

  const lastRecord = await prisma.brkLevelUpRecord.findFirst({
    where: { userId, onSystem },
    orderBy: { promotedAt: 'desc' }
  })
  if (!lastRecord) throw new Error('No level up record found')

  const config = await getLevelConfig(onSystem, lastRecord.toLevel)
  if (!config || config.giftValue <= 0) throw new Error('No gift available for this level')

  if (config.timeLimitDays) {
    let baseDate: Date
    if (config.level === 2) {
      baseDate = systemRec.activatedAt!
    } else {
      const prevLevelUp = await prisma.brkLevelUpRecord.findFirst({
        where: { userId, onSystem, toLevel: config.level - 1 },
        orderBy: { promotedAt: 'desc' }
      })
      if (!prevLevelUp) throw new Error('Previous level-up record not found')
      baseDate = prevLevelUp.promotedAt
    }
    const deadline = new Date(baseDate.getTime() + config.timeLimitDays * 24 * 60 * 60 * 1000)
    if (new Date() > deadline) throw new Error('Gift claim period has expired')
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new Error('Course not found')
  if (course.phi_coc > config.giftValue) {
    throw new Error(`Course fee (${course.phi_coc}) exceeds gift value (${config.giftValue})`)
  }

  if (isTestAccount(userId)) throw new Error('Tài khoản test không được nhận quà tặng level')

  await prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: 'ACTIVE',
      phi_coc: 0,
      startedAt: new Date(),
    }
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

  const allConfigs = await getAllLevelConfigs(onSystem)

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

export async function create2F1Voucher(userId: number, onSystem: number, createdAt?: Date) {
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

  const bonus = await prisma.brkReferralBonus.create({
    data: { userId, onSystem, f1Count }
  })

  // Auto-credit voucher to wallet
  await creditVoucherWallet(
    userId,
    386_000,
    `Thưởng giới thiệu 2 F1 (hệ thống BRK)`,
    `referral_2f1_sys_${onSystem}`,
    createdAt
  )

  return bonus
}
