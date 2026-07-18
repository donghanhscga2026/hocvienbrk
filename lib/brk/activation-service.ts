'use server'

import prisma from '@/lib/prisma'
import { ensureBrkWallet, creditBrkWallet, creditBrkdWallet, creditVoucherWallet, makeSystemSnapshotDescription, createBrkTimelineRecord } from './wallet-service'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'
import { distributeCommission } from './commission-calculator'
import { checkAndPromoteLevel, create2F1Voucher } from './level-manager'
import { resolvePlacement } from './placement-rules'

const BRKP_PER_ACTIVATION = 17
const BRKD_PER_ACTIVATION = 12_868_686
const MBDT_BASE = 12_000_000
const MBDT_MIN = 12_868_686
const MBDT_MAX = 14_686_868

function generateMBDT(): number {
  return Math.floor(Math.random() * (MBDT_MAX - MBDT_MIN + 1)) + MBDT_MIN
}

function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}

export async function activateBrkMember(
  userId: number,
  onSystem: number,
  enrollmentReferrerId?: number | null,
  activatedAt?: Date,
  forcedRefSysId?: number,
) {
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  if (!systemTree) throw new Error('System not found')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const now = activatedAt || new Date()
  const graceDays = systemTree.graceDays || 1
  const graceEnd = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000)
  const expiresAt = new Date(now.getTime() + systemTree.durationDays * 24 * 60 * 60 * 1000)
  const fee = Number(systemTree.fee)

  const existing = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (existing) {
    if (existing.status === 'ACTIVE') throw new Error('User already active in this system')
    if (existing.status === 'CANCELLED' || existing.status === 'EXPIRED') {
      throw new Error('User was previously in this system and cannot rejoin')
    }
  }

  const effectiveReferrer = enrollmentReferrerId ?? user.referrerId
  const refSysId = forcedRefSysId !== undefined ? forcedRefSysId : await resolvePlacement(onSystem, effectiveReferrer)

  const system = await prisma.system.upsert({
    where: { userId_onSystem: { userId, onSystem } },
    update: {
      status: 'ACTIVE',
      refSysId,
      activatedAt: now,
      gracePeriodEnd: graceEnd,
      expiresAt,
      level: 0, // Chưa qua grace period → chưa được xét cấp
    },
    create: {
      userId,
      onSystem,
      refSysId,
      status: 'ACTIVE',
      activatedAt: now,
      gracePeriodEnd: graceEnd,
      expiresAt,
      level: 0, // Chưa qua grace period → chưa được xét cấp
      totalPoints: 0,
    }
  })

  await addUserToSystemClosure(userId, refSysId, onSystem)

  await ensureBrkWallet(userId)

  // Check if Method B (24h cooling-off — defer commissions/points)
  const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
  const isOptionB = promoConfig?.value === 'B'
  if (isOptionB) {
    // 1. Ghi nhận giao dịch JOIN cho chính học viên đó
    const joinDesc = await makeSystemSnapshotDescription(
      userId,
      onSystem,
      'JOIN',
      'Tham gia hệ thống',
      'Bắt đầu tham gia hệ thống, đang trong thời gian cân nhắc, cấp 0.',
      { mBdtVolume: 0, cashVolume: 0 }
    )
    await creditBrkdWallet(
      userId,
      0,
      joinDesc,
      `sys_${onSystem}_user_${userId}_join`,
      now,
      userId
    )

    await createBrkTimelineRecord({
      userId,
      onSystem,
      type: 'ACTIVATION',
      time: now,
      title: 'Đã kích hoạt hệ thống',
      description: `Đang trong thời gian ${graceDays * 24}h cân nhắc, Cấp 0.`,
      fromLevel: undefined,
      toLevel: 0,
      sourceMemberId: userId
    })

    // 2. Ghi nhận log active (F1_ACTIVE / F2_ACTIVE / F3_ACTIVE) cho ancestors (tối đa 3 cấp bảo trợ gần nhất)
    const userAncestors = await prisma.systemClosure.findMany({
      where: { descendantId: system.autoId, depth: { gte: 1, lte: 3 }, systemId: onSystem },
      orderBy: { depth: 'asc' },
      include: { ancestor: true }
    })

    const parentClosure = userAncestors.find(c => c.depth === 1)
    const parentSys = parentClosure ? await prisma.system.findUnique({
      where: { autoId: parentClosure.ancestorId },
      include: { user: true }
    }) : null

    const grandparentClosure = userAncestors.find(c => c.depth === 2)
    const grandparentSys = grandparentClosure ? await prisma.system.findUnique({
      where: { autoId: grandparentClosure.ancestorId },
      include: { user: true }
    }) : null

    for (const closure of userAncestors) {
      const ancestorSys = closure.ancestor
      let descText = ""
      if (closure.depth === 1) {
        descText = `Bạn vừa có thêm F1 #${userId} ${user.name || 'N/A'} đăng ký và đang trong thời gian cân nhắc)`
      } else if (closure.depth === 2 && parentSys) {
        descText = `Bạn vừa có thêm F2 #${userId} ${user.name || 'N/A'} dưới F1 #${parentSys.userId} ${parentSys.user?.name || 'N/A'} đăng ký và đang trong thời gian cân nhắc)`
      } else if (closure.depth === 3 && grandparentSys) {
        descText = `Bạn vừa có thêm F3 #${userId} ${user.name || 'N/A'} dưới F2 #${grandparentSys.userId} ${grandparentSys.user?.name || 'N/A'} đăng ký và đang trong thời gian cân nhắc)`
      }

      const activeLogDesc = await makeSystemSnapshotDescription(
        ancestorSys.userId,
        onSystem,
        closure.depth === 1 ? 'F1_ACTIVE' : (closure.depth === 2 ? 'F2_ACTIVE' : 'F3_ACTIVE'),
        'Học viên mới đăng ký',
        descText,
        {
          newMemberId: userId,
          newMemberName: user.name,
          depth: closure.depth
        }
      )

      await creditBrkdWallet(
        ancestorSys.userId,
        0,
        activeLogDesc,
        `sys_${onSystem}_user_${ancestorSys.userId}_under_${userId}_active`,
        now,
        userId
      )

      await createBrkTimelineRecord({
        userId: ancestorSys.userId,
        onSystem,
        type: 'TRANSACTION',
        time: now,
        title: 'Tăng trưởng thành viên',
        description: descText,
        targetMemberId: userId,
        targetMemberName: user.name ?? undefined,
        txType: 'ADJUSTMENT',
        sourceMemberId: userId
      })
    }

    return system
  }

  // Method A: immediate commissions + points + level-up + 2F1 voucher
  // Self points +17 (same as Method B cron)
  await prisma.system.update({
    where: { userId_onSystem: { userId, onSystem } },
    data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
  })
  await distributeCommission(userId, onSystem, fee, systemTree, now, undefined, undefined, userId)

  await checkAndPromoteLevel(userId, onSystem, now, undefined, userId)

  if (refSysId > 0) {
    await create2F1Voucher(refSysId, onSystem, now, userId)
  }

  return system
}

export async function getBrkPlacementChain(
  userId: number,
  onSystem: number
): Promise<{
  parentName: string | null;
  parentId: number | null;
  chain: { userId: number; name: string; depth: number }[];
}> {
  const systemRecord = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRecord || !systemRecord.refSysId) {
    return { parentName: null, parentId: null, chain: [] }
  }

  const ancestorClosures = await prisma.systemClosure.findMany({
    where: { descendantId: systemRecord.autoId, systemId: onSystem, depth: { gt: 0 } },
    orderBy: { depth: 'asc' }
  })

  const ancestorIds = ancestorClosures.map(a => a.ancestorId)
  if (ancestorIds.length === 0) return { parentName: null, parentId: null, chain: [] }

  const ancestorSystems = await prisma.system.findMany({
    where: { autoId: { in: ancestorIds }, onSystem }
  })
  const ancestorUserIds = ancestorSystems.map(s => s.userId)

  const users = await prisma.user.findMany({
    where: { id: { in: ancestorUserIds } },
    select: { id: true, name: true }
  })
  const nameMap = new Map(users.map(u => [u.id, u.name?.trim() || 'N/A']))

  const chain = ancestorClosures
    .map(c => {
      const sys = ancestorSystems.find(s => s.autoId === c.ancestorId)
      if (!sys) return null
      return { userId: sys.userId, name: nameMap.get(sys.userId) || 'N/A', depth: c.depth }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const parent = chain.length > 0 ? chain[0] : null
  return {
    parentName: parent?.name || null,
    parentId: parent?.userId || null,
    chain
  }
}

export async function cancelBrkMemberWithinGrace(userId: number, onSystem: number) {
  const systemRec = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem } }
  })
  if (!systemRec) throw new Error('Not a member of this system')
  if (systemRec.status !== 'ACTIVE') throw new Error('Not active')
  if (!systemRec.gracePeriodEnd || new Date() > systemRec.gracePeriodEnd) {
    throw new Error('Grace period has ended')
  }

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  const fee = systemTree ? Number(systemTree.fee) : 0

  // 1. Transfer all F1s to upline
  const f1Closures = await prisma.systemClosure.findMany({
    where: { ancestorId: systemRec.autoId, depth: 1, systemId: onSystem }
  })
  for (const f1 of f1Closures) {
    const f1System = await prisma.system.findUnique({ where: { autoId: f1.descendantId } })
    if (f1System && f1System.status === 'ACTIVE') {
      await prisma.system.update({
        where: { autoId: f1.descendantId },
        data: { refSysId: systemRec.refSysId }
      })
      await addUserToSystemClosure(f1System.userId, systemRec.refSysId, onSystem)
    }
  }

  // 2. Delete systemClosure records for cancelled member
  await prisma.systemClosure.deleteMany({
    where: {
      OR: [
        { ancestorId: systemRec.autoId },
        { descendantId: systemRec.autoId }
      ],
      systemId: onSystem
    }
  })

  // 3. Set status to CANCELLED
  await prisma.system.update({
    where: { autoId: systemRec.autoId },
    data: { status: 'CANCELLED' }
  })

  // 4. Refund 100% fee to wallet (cash)
  if (fee > 0) {
    await creditBrkWallet(
      userId,
      fee,
      'RETURN_FEE',
      `Hoàn 100% phí tham gia BRK (hủy trong thời gian cân nhắc)`,
      `cancel_grace_sys_${onSystem}`
    )
    // BRKD refund equal to self BRKD
    await creditBrkdWallet(
      userId,
      BRKD_PER_ACTIVATION,
      `BRKD hoàn trả khi hủy trong thời gian cân nhắc`,
      `cancel_grace_sys_${onSystem}`
    )
  }

  return { success: true }
}

export async function processGracePeriodExpirations(now: Date = new Date()) {
  const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
  const isOptionB = promoConfig?.value === 'B'

  const expiredGrace = await prisma.system.findMany({
    where: {
      status: 'ACTIVE',
      gracePeriodEnd: { lte: now }
    }
  })

  if (expiredGrace.length === 0) return { processed: 0 }

  let count = 0

  for (const member of expiredGrace) {
    if (member.gracePeriodEnd && member.gracePeriodEnd <= now) {
      // Look up SystemTree per-member to handle multi-system correctly
      const memberSystemTree = await prisma.systemTree.findUnique({ where: { onSystem: member.onSystem } })
      if (!memberSystemTree) continue

      const fee = Number(memberSystemTree.fee)
      const returnPct = Number(memberSystemTree.returnPct)

      // KIỂM TRA CHỐNG TRÙNG LẶP — Per-system refId để tránh bỏ qua user multi-system:
      const returnRefId = `return_fee_sys_${member.onSystem}_user_${member.userId}`
      const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
      if (wallet) {
        const existingRefund = await prisma.brkTransaction.findFirst({
          where: {
            walletId: wallet.id,
            type: 'RETURN_FEE',
            refId: returnRefId
          }
        })
        if (existingRefund) continue // Đã hoàn phí rồi cho hệ thống này, bỏ qua
      }

      const recordTime = member.gracePeriodEnd
      const memberMBDT = generateMBDT()
      const memberMBP = mbdtToMbp(memberMBDT)

      // 1. Credit self points & thăng lên Cấp 1
      await prisma.system.update({
        where: { userId_onSystem: { userId: member.userId, onSystem: member.onSystem } },
        data: {
          totalPoints: { increment: memberMBP },
          level: 1
        }
      })

      // Tạo level up record 0 -> 1
      try {
        await prisma.brkLevelUpRecord.create({
          data: {
            userId: member.userId,
            onSystem: member.onSystem,
            fromLevel: 0,
            toLevel: 1,
            promotedAt: recordTime
          }
        })
      } catch (err: any) {
        if (err.code === 'P2002') {
          console.warn(`[Grace] Level-up record for user #${member.userId} already exists, skipping.`)
        } else {
          throw err
        }
      }

      // 2. Hoàn phí cá nhân (Cash + MBDT)
      const returnAmount = (fee * returnPct) / 100
      const brkdReturn = Math.round((memberMBDT * returnPct) / 100)
      if (returnAmount > 0) {
        // Cash refund snapshot description
        const cashDesc = await makeSystemSnapshotDescription(
          member.userId,
          member.onSystem,
          'RETURN_FEE_CASH',
          'Chính thức tham gia',
          `Được hoàn ${returnPct}% phí tham gia sau ${memberSystemTree.graceDays} ngày cân nhắc`,
          { cashVolume: fee, mBdtVolume: memberMBDT },
          { cash: returnAmount, brkd: brkdReturn }
        )
        await creditBrkWallet(
          member.userId,
          returnAmount,
          'RETURN_FEE',
          cashDesc,
          returnRefId,
          recordTime
        )
        // MBDT refund snapshot description (includes thăng cấp 1)
        if (brkdReturn > 0) {
          const brkdRefId = `return_brkd_sys_${member.onSystem}_user_${member.userId}`
          const brkdDesc = await makeSystemSnapshotDescription(
            member.userId,
            member.onSystem,
            'RETURN_FEE',
            'Chính thức tham gia',
            `Được hoàn ${returnPct}% phí tham gia sau ${memberSystemTree.graceDays} ngày cân nhắc. Cấp 1. Tỷ lệ hoa hồng: 21%.`,
            { cashVolume: fee, mBdtVolume: memberMBDT },
            { cash: returnAmount, brkd: brkdReturn }
          )
          await creditBrkdWallet(
            member.userId,
            brkdReturn,
            brkdDesc,
            brkdRefId,
            recordTime
          )
        }

        await createBrkTimelineRecord({
          userId: member.userId,
          onSystem: member.onSystem,
          type: 'TRANSACTION',
          time: recordTime,
          title: 'Chính thức tham gia',
          description: `Được hoàn ${returnPct}% phí tham gia sau ${memberSystemTree.graceDays} ngày cân nhắc. Cấp 1. Tỷ lệ hoa hồng: 21%.`,
          amountCash: returnAmount,
          amountBrkd: brkdReturn,
          txType: 'RETURN_FEE',
          fromLevel: 0,
          toLevel: 1
        })
      }

      // 3. Nếu là Method A, thực hiện ngay commission + level check + 2F1 voucher
      if (!isOptionB) {
        await distributeCommission(member.userId, member.onSystem, fee, memberSystemTree, recordTime, undefined, memberMBDT, member.userId)
        await checkAndPromoteLevel(member.userId, member.onSystem, recordTime, undefined, member.userId)
        if (member.refSysId > 0) {
          await create2F1Voucher(member.refSysId, member.onSystem, recordTime, member.userId)
        }
      }

      count++
    }
  }

  return { processed: count }
}

export async function revertMemberActivation(
  sourceMemberId: number,
  onSystem: number,
  activatedAt?: Date
): Promise<void> {
  const system = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: sourceMemberId, onSystem } }
  })
  if (!system) {
    throw new Error(`System record not found for user ${sourceMemberId} onSystem ${onSystem}`)
  }

  // --- BƯỚC 1: Lấy danh sách ancestors trước khi xóa closure ---
  const ancestorClosures = await prisma.systemClosure.findMany({
    where: { descendantId: system.autoId, systemId: onSystem, depth: { gte: 1 } },
    include: { ancestor: true }
  })
  const ancestorAutoIds = ancestorClosures.map(c => c.ancestor)

  // --- BƯỚC 2: Xóa dấu vết của member này khỏi ví và timeline của TỪNG ANCESTOR ---
  // Các refId pattern được tạo bởi commission-calculator và activation-service
  const commissionRefId = `sys_${onSystem}_member_${sourceMemberId}`
  const pointsRefId     = `sys_${onSystem}_member_${sourceMemberId}_points`

  for (const ancestorSys of ancestorAutoIds) {
    const ancestorUserId = ancestorSys.userId
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: ancestorUserId } })
    if (!wallet) continue

    // Lấy các transactions liên quan đến member này trên ví của ancestor
    const relatedTxs = await prisma.brkTransaction.findMany({
      where: {
        walletId: wallet.id,
        OR: [
          { refId: commissionRefId },
          { refId: pointsRefId },
          { sourceMemberId: sourceMemberId },
        ]
      }
    })

    // Tính tổng cần trừ lại theo từng loại ví
    let cashToDeduct    = 0
    let brkdToDeduct    = 0
    let voucherToDeduct = 0
    let totalEarnedToDeduct = 0

    for (const tx of relatedTxs) {
      const amt = Number(tx.amount)
      if (amt <= 0) continue // chỉ trừ các khoản đã credit (dương)
      if (tx.balanceType === 'CASH')    { cashToDeduct    += amt; totalEarnedToDeduct += amt }
      if (tx.balanceType === 'BRKD')    { brkdToDeduct    += amt }
      if (tx.balanceType === 'VOUCHER') { voucherToDeduct += amt }
    }

    // Trừ ngược balance ví của ancestor (floor at 0 để tránh âm)
    if (cashToDeduct > 0 || brkdToDeduct > 0 || voucherToDeduct > 0) {
      await prisma.brkWallet.update({
        where: { userId: ancestorUserId },
        data: {
          balance:        { decrement: cashToDeduct },
          brkd:           { decrement: brkdToDeduct },
          voucherBalance: { decrement: voucherToDeduct },
          totalEarned:    { decrement: totalEarnedToDeduct },
        }
      })
    }

    // Xóa các BrkTransaction liên quan
    if (relatedTxs.length > 0) {
      await prisma.brkTransaction.deleteMany({
        where: { id: { in: relatedTxs.map(t => t.id) } }
      })
    }

    // Trừ điểm MBP đã cộng cho ancestor từ member này
    // Dùng pointsRefId để xác định chính xác, không trừ lại nếu không có transaction
    const hadPointsTx = relatedTxs.some(t => t.refId === pointsRefId)
    if (hadPointsTx) {
      // Tính memberMBP từ MBDT gốc (đọc từ tx hoặc dùng mặc định)
      const returnBrkdRefId = `return_brkd_sys_${onSystem}_user_${sourceMemberId}`
      const returnBrkdTx = await prisma.brkTransaction.findFirst({
        where: { wallet: { userId: sourceMemberId }, refId: returnBrkdRefId }
      })
      const memberMBDT = returnBrkdTx ? Math.round(Number(returnBrkdTx.amount) / 0.21) : 12_868_686
      const MBDT_BASE = 12_000_000
      const memberMBP = Math.round((memberMBDT / MBDT_BASE) * 16 * 1000) / 1000

      await prisma.system.update({
        where: { autoId: ancestorSys.autoId },
        data: { totalPoints: { decrement: memberMBP } }
      })
    }

    // Xóa timeline records của ancestor liên quan đến member này
    await prisma.brkTimelineRecord.deleteMany({
      where: {
        userId: ancestorUserId,
        onSystem,
        OR: [
          { targetMemberId: sourceMemberId },
          { sourceMemberId: sourceMemberId },
        ]
      }
    })

    // Kiểm tra và hạ cấp ancestor nếu điểm tụt dưới ngưỡng
    const updatedAncestorSys = await prisma.system.findUnique({ where: { autoId: ancestorSys.autoId } })
    if (updatedAncestorSys && (updatedAncestorSys.level || 0) > 1) {
      const { getAllLevelConfigs } = await import('./config-service')
      const allConfigs = await getAllLevelConfigs(onSystem)
      const currentPts = Number(updatedAncestorSys.totalPoints || 0)
      // Tìm cấp cao nhất mà ancestor còn đủ điều kiện
      let eligibleLevel = 1
      for (const cfg of allConfigs.sort((a, b) => a.level - b.level)) {
        if (currentPts >= Number(cfg.pointsRequired)) {
          eligibleLevel = cfg.level
        }
      }
      if (eligibleLevel < (updatedAncestorSys.level || 0)) {
        await prisma.system.update({
          where: { autoId: ancestorSys.autoId },
          data: { level: eligibleLevel }
        })
        // Xóa BrkLevelUpRecord cao hơn eligibleLevel
        await prisma.brkLevelUpRecord.deleteMany({
          where: { userId: ancestorUserId, onSystem, toLevel: { gt: eligibleLevel } }
        })
      }
    }
  }

  // --- BƯỚC 3: Xóa toàn bộ BrkTransaction của chính member ---
  const memberWallet = await prisma.brkWallet.findUnique({ where: { userId: sourceMemberId } })
  if (memberWallet) {
    await prisma.brkTransaction.deleteMany({ where: { walletId: memberWallet.id } })
    // Zero ví của member
    await prisma.brkWallet.update({
      where: { userId: sourceMemberId },
      data: { balance: 0, brkd: 0, voucherBalance: 0, totalEarned: 0, totalWithdrawn: 0 }
    })
  }

  // --- BƯỚC 4: Xóa toàn bộ timeline records của chính member ---
  await prisma.brkTimelineRecord.deleteMany({
    where: { userId: sourceMemberId, onSystem }
  })

  // --- BƯỚC 5: Xóa BrkLevelUpRecord + BrkReferralBonus của member ---
  await prisma.brkLevelUpRecord.deleteMany({ where: { userId: sourceMemberId, onSystem } })
  await prisma.brkReferralBonus.deleteMany({ where: { userId: sourceMemberId, onSystem } })

  // --- BƯỚC 6: Xóa SystemClosure có liên quan đến member (descendant hoặc ancestor) ---
  await prisma.systemClosure.deleteMany({
    where: {
      OR: [
        { descendantId: system.autoId, systemId: onSystem },
        { ancestorId: system.autoId, systemId: onSystem },
      ]
    }
  })

  // --- BƯỚC 7: Set System record về CANCELLED + level 0 ---
  await prisma.system.update({
    where: { autoId: system.autoId },
    data: { status: 'CANCELLED', level: 0, totalPoints: 0 }
  })
}
