'use server'

import prisma from '@/lib/prisma'
import type { SystemTree } from '@prisma/client'
import { creditBrkWallet, creditBrkdWallet } from './wallet-service'
import { getLevelConfig } from './config-service'

const BRKP_PER_ACTIVATION = 17
const BRKD_PER_ACTIVATION = 12_868_686

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

    // BRKP: 17 to ALL ancestors (full amount, NOT affected by differential)
    await prisma.system.update({
      where: { autoId: uplineSystem.autoId },
      data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
    })

    // Cash + BRKD: differential (only if earnPct > 0)
    if (earnPct <= 0) continue

    const commissionAmount = (fee * earnPct) / 100

    if (commissionAmount > 0) {
      await creditBrkWallet(
        uplineSystem.userId,
        commissionAmount,
        'COMMISSION',
        `Hoa hồng cấp ${uplineLevel} (${earnPct}%) từ thành viên mới #${newMemberUserId}`,
        `sys_${onSystem}_member_${newMemberUserId}`
      )
    }

    const brkdAmount = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100)
    if (brkdAmount > 0) {
      await creditBrkdWallet(
        uplineSystem.userId,
        brkdAmount,
        `BRKD cấp ${uplineLevel} (${earnPct}%) từ thành viên mới #${newMemberUserId}`,
        `sys_${onSystem}_member_${newMemberUserId}`
      )
    }
  }
}
