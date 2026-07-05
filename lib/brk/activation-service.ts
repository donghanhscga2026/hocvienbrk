'use server'

import prisma from '@/lib/prisma'
import { ensureBrkWallet, creditBrkWallet, creditBrkdWallet, creditVoucherWallet } from './wallet-service'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'
import { distributeCommission } from './commission-calculator'
import { checkAndPromoteLevel, create2F1Voucher } from './level-manager'
import { resolvePlacement } from './placement-rules'

const BRKP_PER_ACTIVATION = 17
const BRKD_PER_ACTIVATION = 12_868_686

export async function activateBrkMember(
  userId: number,
  onSystem: number,
  enrollmentReferrerId?: number | null,
) {
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  if (!systemTree) throw new Error('System not found')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const now = new Date()
  const graceEnd = new Date(now.getTime() + systemTree.graceDays * 24 * 60 * 60 * 1000)
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
  const refSysId = await resolvePlacement(onSystem, effectiveReferrer)

  const system = await prisma.system.upsert({
    where: { userId_onSystem: { userId, onSystem } },
    update: {
      status: 'ACTIVE',
      refSysId,
      activatedAt: now,
      gracePeriodEnd: graceEnd,
      expiresAt,
      level: 1,
    },
    create: {
      userId,
      onSystem,
      refSysId,
      status: 'ACTIVE',
      activatedAt: now,
      gracePeriodEnd: graceEnd,
      expiresAt,
      level: 1,
    }
  })

  await addUserToSystemClosure(userId, refSysId, onSystem)

  await ensureBrkWallet(userId)

  // BRKP for self-activation
  await prisma.system.update({
    where: { autoId: system.autoId },
    data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
  })

  // BRKD for self-activation
  await creditBrkdWallet(
    userId,
    BRKD_PER_ACTIVATION,
    `BRKD tự kích hoạt hệ thống BRK`,
    `self_activate_sys_${onSystem}`
  )

  // Distribute commissions to ancestors
  await distributeCommission(userId, onSystem, fee, systemTree)

  // Check level-up
  await checkAndPromoteLevel(userId, onSystem)

  // Check 2F1 voucher for the referrer
  if (refSysId > 0) {
    await create2F1Voucher(refSysId, onSystem)
  }

  return system
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

export async function processGracePeriodExpirations() {
  const now = new Date()
  const expiredGrace = await prisma.system.findMany({
    where: {
      status: 'ACTIVE',
      gracePeriodEnd: { lte: now }
    }
  })

  const systemTree = expiredGrace.length > 0
    ? await prisma.systemTree.findFirst({ where: { onSystem: expiredGrace[0].onSystem } })
    : null

  if (!systemTree) return { processed: 0 }

  const fee = Number(systemTree.fee)
  const returnPct = Number(systemTree.returnPct)
  let count = 0

  for (const member of expiredGrace) {
    if (member.gracePeriodEnd && member.gracePeriodEnd <= now) {
      const returnAmount = (fee * returnPct) / 100
      if (returnAmount > 0) {
        // Cash refund
        await creditBrkWallet(
          member.userId,
          returnAmount,
          'RETURN_FEE',
          `Hoàn ${returnPct}% phí tham gia sau ${systemTree.graceDays} ngày cân nhắc`
        )
        // BRKD refund (proportional)
        const brkdReturn = Math.round((BRKD_PER_ACTIVATION * returnPct) / 100)
        if (brkdReturn > 0) {
          await creditBrkdWallet(
            member.userId,
            brkdReturn,
            `BRKD hoàn ${returnPct}% sau ${systemTree.graceDays} ngày cân nhắc`
          )
        }
        count++
      }
    }
  }

  return { processed: count }
}
