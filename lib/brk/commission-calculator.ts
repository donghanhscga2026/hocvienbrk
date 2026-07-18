'use server'

import prisma from '@/lib/prisma'
import type { SystemTree } from '@prisma/client'
import { creditBrkWallet, creditBrkdWallet, makeSystemSnapshotDescription, createBrkTimelineRecord } from './wallet-service'
import { getLevelConfig } from './config-service'

const DEFAULT_MBDT = 12_868_686
const MBDT_BASE = 12_000_000

function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}

interface AncestorCredit {
  uplineSystem: { autoId: number; userId: number; level: number | null }
  uplineLevel: number
  earnPct: number
  depth: number
}

export async function distributeCommission(
  newMemberUserId: number,
  onSystem: number,
  fee: number,
  systemTree: SystemTree,
  createdAt?: Date,
  levelConfigs?: Map<number, any>,
  memberMBDT: number = DEFAULT_MBDT,
  sourceMemberId?: number
): Promise<{ ancestorCredits: AncestorCredit[] }> {
  const memberMBP = mbdtToMbp(memberMBDT)
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

    ancestorCredits.push({ uplineSystem, uplineLevel, earnPct, depth: closure.depth })
  }

  const commissionRefId = `sys_${onSystem}_member_${newMemberUserId}`
  const pointsRefId = `sys_${onSystem}_member_${newMemberUserId}_points`

  const newMemberUser = await prisma.user.findUnique({ where: { id: newMemberUserId } })
  const newMemberName = newMemberUser?.name || 'N/A'

  const parentUser = newMemberSys.refSysId > 0 ? await prisma.user.findUnique({
    where: { id: newMemberSys.refSysId }
  }) : null
  const parentName = parentUser?.name || 'N/A'

  await Promise.all(ancestorCredits.map(async ({ uplineSystem, uplineLevel, earnPct, depth }) => {
    const existingTimeline = await prisma.brkTimelineRecord.findFirst({
      where: {
        userId: uplineSystem.userId,
        onSystem,
        txType: 'COMMISSION',
        targetMemberId: newMemberUserId
      }
    })
    const alreadyProcessed = !!existingTimeline

    if (!alreadyProcessed) {
      await prisma.system.update({
        where: { autoId: uplineSystem.autoId },
        data: { totalPoints: { increment: memberMBP } }
      })

      let leaderChain = ""
      if (depth === 1) {
        leaderChain = `${newMemberName} (#${newMemberUserId}) (F1)`
      } else if (depth === 2 && parentUser) {
        leaderChain = `${parentName} (#${newMemberSys.refSysId}) (F1) ➔ ${newMemberName} (#${newMemberUserId}) (F2)`
      } else {
        leaderChain = `${newMemberName} (#${newMemberUserId}) (F${depth})`
      }

      // Ghi nhận lịch sử cộng điểm và dồn doanh số dưới dạng transaction BRKD (amount = 0)
      const existingPoints = await prisma.brkTransaction.findFirst({
        where: { wallet: { userId: uplineSystem.userId }, refId: pointsRefId }
      })
      if (!existingPoints) {
        const pointsDesc = await makeSystemSnapshotDescription(
          uplineSystem.userId,
          onSystem,
          'F1_CONFIRM',
          'Tăng trưởng tích lũy',
          `Cộng +${memberMBP.toFixed(3)} điểm MBP & Doanh số +${memberMBDT.toLocaleString()} MBDT từ F${depth} #${newMemberUserId} ${newMemberName} đã chính thức tham gia`,
          {
            newMemberId: newMemberUserId,
            newMemberName: newMemberName,
            depth,
            leaderChain,
            memberMBDT,
            memberMBP
          }
        )
        await creditBrkdWallet(
          uplineSystem.userId,
          0,
          pointsDesc,
          pointsRefId,
          createdAt,
          sourceMemberId
        )
      }

      if (earnPct > 0) {
        const commissionAmount = (fee * earnPct) / 100
        const brkdAmount = Math.round((memberMBDT * earnPct) / 100)

        if (commissionAmount > 0) {
          const cashCommDesc = await makeSystemSnapshotDescription(
            uplineSystem.userId,
            onSystem,
            'COMMISSION',
            'Thu nhập gia tăng',
            `Hoa hồng (${earnPct}%) từ thành viên mới F${depth} #${newMemberUserId} - ${newMemberName}`,
            {
              newMemberId: newMemberUserId,
              newMemberName: newMemberName,
              depth,
              leaderChain
            },
            { cash: commissionAmount, brkd: brkdAmount }
          )
          await creditBrkWallet(
            uplineSystem.userId,
            commissionAmount,
            'COMMISSION',
            cashCommDesc,
            commissionRefId,
            createdAt,
            sourceMemberId
          )
        }

        if (brkdAmount > 0) {
          const brkdCommDesc = await makeSystemSnapshotDescription(
            uplineSystem.userId,
            onSystem,
            'COMMISSION',
            'Thu nhập gia tăng',
            `Hoa hồng (${earnPct}%) từ thành viên mới F${depth} #${newMemberUserId} - ${newMemberName}`,
            {
              newMemberId: newMemberUserId,
              newMemberName: newMemberName,
              depth,
              leaderChain
            },
            { cash: commissionAmount, brkd: brkdAmount }
          )
          await creditBrkdWallet(
            uplineSystem.userId,
            brkdAmount,
            brkdCommDesc,
            commissionRefId,
            createdAt,
            sourceMemberId
          )
        }
      }

      if (earnPct > 0) {
        const commissionAmount = (fee * earnPct) / 100
        const brkdAmount = Math.round((memberMBDT * earnPct) / 100)
        await createBrkTimelineRecord({
          userId: uplineSystem.userId,
          onSystem,
          type: 'TRANSACTION',
          time: createdAt || new Date(),
          title: 'Thu nhập gia tăng',
          description: `Hoa hồng (${earnPct}%) từ thành viên mới F${depth} #${newMemberUserId} - ${newMemberName}`,
          amountCash: commissionAmount,
          amountBrkd: brkdAmount,
          txType: 'COMMISSION',
          targetMemberId: newMemberUserId,
          targetMemberName: newMemberName,
          pathStr: leaderChain,
          sourceMemberId
        })
      } else {
        await createBrkTimelineRecord({
          userId: uplineSystem.userId,
          onSystem,
          type: 'TRANSACTION',
          time: createdAt || new Date(),
          title: 'Tăng trưởng tích lũy',
          description: `Cộng +${memberMBP.toFixed(3)} điểm MBP & Doanh số +${memberMBDT.toLocaleString()} MBDT từ F${depth} #${newMemberUserId} ${newMemberName} đã chính thức tham gia`,
          amountCash: 0,
          amountBrkd: 0, // amountBrkd = 0 để tránh cộng vào ví thu nhập!
          txType: 'COMMISSION',
          targetMemberId: newMemberUserId,
          targetMemberName: newMemberName,
          pathStr: leaderChain,
          sourceMemberId
        })
      }
    }
  }))

  return { ancestorCredits }
}
