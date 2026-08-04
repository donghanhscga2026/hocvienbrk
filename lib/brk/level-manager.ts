'use server'

import prisma from '@/lib/prisma'
import { getLevelConfig, getAllLevelConfigs } from './config-service'
import { validateBranchRequirements } from './branch-validator'
import { creditMbvWallet, creditBrkdWallet, makeSystemSnapshotDescription, createBrkTimelineRecord } from './wallet-service'

export async function checkAndPromoteLevel(userId: number, onSystem: number, promotedAt?: Date, levelConfigs?: Map<number, any>, sourceMemberId?: number, applicationId?: number) {
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

    // Idempotency: skip if this promotion already recorded (any applicationId)
    const existing = await prisma.brkLevelUpRecord.findFirst({
      where: {
        userId,
        onSystem,
        toLevel: currentLevel,
      }
    })
    if (existing) continue

    try {
      await prisma.brkLevelUpRecord.create({
        data: {
          userId,
          onSystem,
          fromLevel: currentLevel - 1,
          toLevel: currentLevel,
          sourceMemberId,
          applicationId,
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
    } catch (err) {
      console.error('❌ level-manager: Failed to send Telegram notification:', err);
    }

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
      promotedAt,
      sourceMemberId,
      applicationId
    )

    // Idempotency: skip MBV gift if already credited for this level (check cả VOUCHER_CREDIT cũ để tránh tặng kép)
    const hasVoucherGift = nextConfig.giftValue > 0 && currentLevel >= 2
    if (hasVoucherGift) {
      const refId = `level_${currentLevel}_sys_${onSystem}_user_${userId}${applicationId != null ? `_app_${applicationId}` : ''}`
      const existingGift = await prisma.brkTransaction.findFirst({
        where: { refId, type: { in: ['VOUCHER_CREDIT', 'MBV_CREDIT'] } }
      })
      if (!existingGift) {
        const giftDesc = await makeSystemSnapshotDescription(
          userId,
          onSystem,
          'MBV',
          'Thưởng thăng cấp',
          `Quà tặng lên cấp ${currentLevel} (${nextConfig.giftValue.toLocaleString()} MBV)`,
          {},
          { mbv: nextConfig.giftValue }
        )
        await creditMbvWallet(
          userId,
          nextConfig.giftValue,
          giftDesc,
          refId,
          promotedAt,
          sourceMemberId,
          applicationId
        )
      }
    }

    await createBrkTimelineRecord({
      userId,
      onSystem,
      type: 'LEVEL_UP',
      time: promotedAt || new Date(),
      title: 'Thăng tiến cấp bậc',
      description: `Thăng cấp từ Cấp ${currentLevel - 1} lên Cấp ${currentLevel}${hasVoucherGift ? ` & nhận Quà tặng thăng cấp (${nextConfig.giftValue.toLocaleString()} MBV)` : ''}`,
      fromLevel: currentLevel - 1,
      toLevel: currentLevel,
      amountVoucher: hasVoucherGift ? nextConfig.giftValue : 0,
      txType: hasVoucherGift ? 'MBV_CREDIT' : undefined,
      sourceMemberId,
      applicationId
    })
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

export async function create2F1Voucher(userId: number, onSystem: number, createdAt?: Date, sourceMemberId?: number) {
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
    where: { userId, onSystem }
  })
  if (existing?.claimed) return existing

  const bonus = existing ?? await prisma.brkReferralBonus.create({
    data: { userId, onSystem, f1Count, sourceMemberId }
  })

  // Auto-credit MBV to wallet with snapshot description
  const giftDesc = await makeSystemSnapshotDescription(
    userId,
    onSystem,
    'MBV',
    'Thưởng thăng cấp',
    `Thưởng giới thiệu 2 F1 (hệ thống BRK)`,
    {},
    { mbv: 386000 }
  )
  await creditMbvWallet(
    userId,
    386_000,
    giftDesc,
    `referral_2f1_sys_${onSystem}_user_${userId}`,
    createdAt,
    sourceMemberId
  )

  await createBrkTimelineRecord({
    userId,
    onSystem,
    type: 'TRANSACTION',
    time: createdAt || new Date(),
    title: 'Thưởng thăng cấp',
    description: `Thưởng giới thiệu 2 F1 (hệ thống BRK)`,
    amountVoucher: 386000,
    txType: 'MBV_CREDIT',
    sourceMemberId
  })

  return prisma.brkReferralBonus.update({
    where: { id: bonus.id },
    data: { f1Count, sourceMemberId, claimed: true, claimedAt: createdAt || new Date() },
  })
}
