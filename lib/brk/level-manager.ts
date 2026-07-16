'use server'

import prisma from '@/lib/prisma'
import { getLevelConfig, getAllLevelConfigs } from './config-service'
import { validateBranchRequirements } from './branch-validator'
import { creditVoucherWallet, creditBrkdWallet, makeSystemSnapshotDescription, createBrkTimelineRecord } from './wallet-service'
import { isTestAccount } from '@/lib/test-account'

export async function checkAndPromoteLevel(userId: number, onSystem: number, promotedAt?: Date, levelConfigs?: Map<number, any>) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) return null

  const totalPoints = Number(systemRec.totalPoints || 0)
  let currentLevel = systemRec.level || 1
  let maxPromotedLevel = currentLevel

  // Multi-level promotion: keep promoting while eligible
  while (currentLevel < 8) {
    const nextConfig = levelConfigs?.get(currentLevel + 1) ?? await getLevelConfig(onSystem, currentLevel + 1)
    if (!nextConfig) break

    if (totalPoints < Number(nextConfig.pointsRequired)) break

    if (nextConfig.branchReqs.length > 0) {
      const branchCheck = await validateBranchRequirements(userId, onSystem, nextConfig.id)
      if (!branchCheck.passed) break
    }

    currentLevel++
    if (currentLevel > maxPromotedLevel) maxPromotedLevel = currentLevel

    // Idempotency: skip if this promotion already recorded
    const existing = await prisma.brkLevelUpRecord.findFirst({
      where: { userId, onSystem, toLevel: currentLevel }
    })
    if (existing) continue

    try {
      await prisma.brkLevelUpRecord.create({
        data: {
          userId,
          onSystem,
          fromLevel: currentLevel - 1,
          toLevel: currentLevel,
          promotedAt,
        }
      })
    } catch (err: any) {
      if (err.code === 'P2002') {
        console.warn(`[LevelUp] Promotion record for user #${userId} to level ${currentLevel} already exists, skipping create.`)
      } else {
        throw err
      }
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } })
      const { sendTelegramAdmin } = await import('@/lib/notifications')
      await sendTelegramAdmin(
        `🎖️ <b>THĂNG CẤP BRK</b>\n\n` +
        `👤 Học viên: <b>#${userId} ${user?.name || 'N/A'}</b>\n` +
        `📞 SĐT: ${user?.phone || 'N/A'}\n` +
        `🔄 Cấp: ${currentLevel - 1} → <b>${currentLevel}</b>\n` +
        `🖥️ Hệ thống: #${onSystem}\n` +
        `⏰ ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
      )
    } catch (_) {}

    // Tạm thời update system level trong DB để makeSystemSnapshotDescription đọc đúng level mới
    await prisma.system.update({
      where: { autoId: systemRec.autoId },
      data: { level: currentLevel }
    })

    // Record thăng cấp Timeline snapshot
    const prevConfig = levelConfigs?.get(currentLevel - 1) ?? await getLevelConfig(onSystem, currentLevel - 1)
    const prevPct = prevConfig ? Number(prevConfig.personalFeePct) : 0
    const nextPct = Number(nextConfig.personalFeePct)

    const levelUpDesc = await makeSystemSnapshotDescription(
      userId,
      onSystem,
      'LEVEL_UP',
      'Thăng tiến cấp bậc',
      `Cấp ${currentLevel - 1} (+${nextConfig.pointsRequired} MBP) ➔ Cấp ${currentLevel}. Tỷ lệ hoa hồng: ${prevPct}% ➔ ${nextPct}%.`
    )
    await creditBrkdWallet(
      userId,
      0,
      levelUpDesc,
      `level_${currentLevel}_sys_${onSystem}_user_${userId}_points`,
      promotedAt
    )

    await createBrkTimelineRecord({
      userId,
      onSystem,
      type: 'LEVEL_UP',
      time: promotedAt || new Date(),
      title: 'Thăng tiến cấp bậc',
      description: `Thăng cấp từ Cấp ${currentLevel - 1} lên Cấp ${currentLevel}`,
      fromLevel: currentLevel - 1,
      toLevel: currentLevel
    })

    // Idempotency: skip voucher if already credited for this level
    if (nextConfig.giftValue > 0 && currentLevel > 2) {
      const refId = `level_${currentLevel}_sys_${onSystem}_user_${userId}`
      const existingVoucher = await prisma.brkTransaction.findFirst({
        where: { refId, type: 'VOUCHER_CREDIT' }
      })
      if (!existingVoucher) {
        const voucherDesc = await makeSystemSnapshotDescription(
          userId,
          onSystem,
          'VOUCHER',
          'Thưởng thăng cấp',
          `Quà tặng lên cấp ${currentLevel} (${nextConfig.giftValue.toLocaleString()} VND)`,
          {},
          { voucher: nextConfig.giftValue }
        )
        await creditVoucherWallet(
          userId,
          nextConfig.giftValue,
          voucherDesc,
          refId,
          promotedAt
        )

        await createBrkTimelineRecord({
          userId,
          onSystem,
          type: 'TRANSACTION',
          time: promotedAt || new Date(),
          title: 'Thưởng thăng cấp',
          description: `Quà tặng lên cấp ${currentLevel} (${nextConfig.giftValue.toLocaleString()} VND)`,
          amountVoucher: nextConfig.giftValue,
          txType: 'VOUCHER_CREDIT'
        })
      }
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

  // Auto-credit voucher to wallet with snapshot description
  const voucherDesc = await makeSystemSnapshotDescription(
    userId,
    onSystem,
    'VOUCHER',
    'Thưởng thăng cấp',
    `Thưởng giới thiệu 2 F1 (hệ thống BRK)`,
    {},
    { voucher: 386000 }
  )
  await creditVoucherWallet(
    userId,
    386_000,
    voucherDesc,
    `referral_2f1_sys_${onSystem}`,
    createdAt
  )

  await createBrkTimelineRecord({
    userId,
    onSystem,
    type: 'TRANSACTION',
    time: createdAt || new Date(),
    title: 'Thưởng thăng cấp',
    description: `Thưởng giới thiệu 2 F1 (hệ thống BRK)`,
    amountVoucher: 386000,
    txType: 'VOUCHER_CREDIT'
  })

  return bonus
}
