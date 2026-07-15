'use server'

import prisma from '@/lib/prisma'
import type { SystemTree } from '@prisma/client'
import { creditBrkWallet, creditBrkdWallet } from './wallet-service'
import { getLevelConfig } from './config-service'

const BRKP_PER_ACTIVATION = 17
const BRKD_PER_ACTIVATION = 12_868_686

interface AncestorCredit {
  uplineSystem: { autoId: number; userId: number; level: number | null }
  uplineLevel: number
  earnPct: number
}

export async function distributeCommission(
  newMemberUserId: number,
  onSystem: number,
  fee: number,
  systemTree: SystemTree,
  createdAt?: Date,
  levelConfigs?: Map<number, any>
): Promise<{ ancestorCredits: AncestorCredit[] }> {
  const newMemberSys = await prisma.system.findUnique({
    where: { userId_onSystem: { userId: newMemberUserId, onSystem } }
  })
  if (!newMemberSys) return { ancestorCredits: [] }

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

  const newMemberLevel = newMemberSys.level || 1
  const newMemberConfig = levelConfigs?.get(newMemberLevel) ?? await getLevelConfig(onSystem, newMemberLevel)
  let previousPct = newMemberConfig ? Number(newMemberConfig.personalFeePct) : 0

  const ancestorCredits: AncestorCredit[] = []

  for (const closure of ancestors) {
    const uplineSystem = closure.ancestor
    const uplineLevel = uplineSystem.level || 1
    const config = levelConfigs?.get(uplineLevel) ?? await getLevelConfig(onSystem, uplineLevel)
    if (!config) continue

    const uplinePct = Number(config.personalFeePct)
    const earnPct = uplinePct - previousPct
    previousPct = Math.max(previousPct, uplinePct)

    ancestorCredits.push({ uplineSystem, uplineLevel, earnPct })
  }

  const commissionRefId = `sys_${onSystem}_member_${newMemberUserId}`

  await Promise.all(ancestorCredits.map(async ({ uplineSystem, uplineLevel, earnPct }) => {
    let alreadyProcessed = false
    if (earnPct > 0) {
      const existingComm = await prisma.brkTransaction.findFirst({
        where: { wallet: { userId: uplineSystem.userId }, type: 'COMMISSION', refId: commissionRefId }
      })
      if (existingComm) {
        alreadyProcessed = true
      }
    }

    if (!alreadyProcessed) {
      await prisma.system.update({
        where: { autoId: uplineSystem.autoId },
        data: { totalPoints: { increment: BRKP_PER_ACTIVATION } }
      })

      if (earnPct > 0) {
        const commissionAmount = (fee * earnPct) / 100
        if (commissionAmount > 0) {
          await creditBrkWallet(
            uplineSystem.userId,
            commissionAmount,
            'COMMISSION',
            `Hoa hồng cấp ${uplineLevel} (${earnPct}%) từ thành viên mới #${newMemberUserId}`,
            commissionRefId,
            createdAt
          )
        }

        const brkdAmount = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100)
        if (brkdAmount > 0) {
          await creditBrkdWallet(
            uplineSystem.userId,
            brkdAmount,
            `BRKD cấp ${uplineLevel} (${earnPct}%) từ thành viên mới #${newMemberUserId}`,
            commissionRefId,
            createdAt
          )
        }
      }
    }
  }))

  return { ancestorCredits }
}
