'use server'

import prisma from '@/lib/prisma'
import type { SystemTree } from '@prisma/client'
import { creditBrkWallet } from './wallet-service'
import { getLevelConfig } from './config-service'

export async function distributeCommission(
  newMemberUserId: number,
  onSystem: number,
  fee: number,
  systemTree: SystemTree
) {
  const newMemberSys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: newMemberUserId, onSystem } }
  })
  if (!newMemberSys) return

  const ancestors = await prisma.systemClosure.findMany({
    where: {
      descendantId: newMemberSys.autoId,
      depth: { gte: 1 },
      systemId: onSystem
    },
    orderBy: { depth: 'asc' },
    include: {
      ancestor: true
    }
  })

  let previousPct = 0

  for (const closure of ancestors) {
    const uplineSystem = closure.ancestor
    const uplineLevel = uplineSystem.level || 1
    const config = await getLevelConfig(onSystem, uplineLevel)

    if (!config) continue

    const uplinePct = Number(config.personalFeePct)
    const earnPct = uplinePct - previousPct
    previousPct = Math.max(previousPct, uplinePct)

    if (earnPct <= 0) continue

    const commissionAmount = (fee * earnPct) / 100

    const pointsEarned = Math.round((fee * Number(systemTree.pointsPerDollar)) / 1000)
    await prisma.system.update({
      where: { autoId: uplineSystem.autoId },
      data: { totalPoints: { increment: pointsEarned } }
    })

    if (commissionAmount > 0) {
      await creditBrkWallet(
        uplineSystem.userId,
        commissionAmount,
        'COMMISSION',
        `Hoa hồng cấp ${uplineLevel} (${earnPct}%) từ thành viên mới #${newMemberUserId}`,
        `sys_${onSystem}_member_${newMemberUserId}`
      )
    }
  }
}
