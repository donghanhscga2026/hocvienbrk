'use server'

import prisma from '@/lib/prisma'
import { ensureBrkWallet } from './wallet-service'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'
import { distributeCommission } from './commission-calculator'
import { checkAndPromoteLevel } from './level-manager'

export async function activateBrkMember(
  userId: number,
  onSystem: number,
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

  let refSysId = 0
  if (user.referrerId) {
    const referrerSystem = await prisma.system.findUnique({
      where: { userId_onSystem: { userId: user.referrerId, onSystem } }
    })
    if (referrerSystem) {
      refSysId = referrerSystem.autoId
    }
  }

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

  const initialPoints = fee * Number(systemTree.pointsPerDollar)
  const selfPoints = fee * Number(systemTree.pointsPerDollar)
  await prisma.system.update({
    where: { autoId: system.autoId },
    data: { totalPoints: { increment: selfPoints } }
  })

  await distributeCommission(userId, onSystem, fee, systemTree)

  await checkAndPromoteLevel(userId, onSystem)

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

  await prisma.systemClosure.deleteMany({
    where: {
      OR: [
        { ancestorId: systemRec.autoId },
        { descendantId: systemRec.autoId }
      ],
      systemId: onSystem
    }
  })

  await prisma.system.update({
    where: { autoId: systemRec.autoId },
    data: { status: 'CANCELLED' }
  })

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
        const { creditBrkWallet } = await import('./wallet-service')
        await creditBrkWallet(
          member.userId,
          returnAmount,
          'RETURN_FEE',
          `Hoàn ${returnPct}% phí tham gia sau ${systemTree.graceDays} ngày cân nhắc`
        )
        count++
      }
    }
  }

  return { processed: count }
}
