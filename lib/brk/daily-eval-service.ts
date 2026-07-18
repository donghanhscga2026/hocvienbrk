import prisma from '@/lib/prisma'
import { distributeCommission } from './commission-calculator'
import { checkAndPromoteLevel, create2F1Voucher } from './level-manager'
import { getAllLevelConfigs } from './config-service'
import type { SystemTree } from '@prisma/client'

export async function processSystemDailyEval(
  systemTree: SystemTree,
  evalTime: Date,
  now: Date
) {
  const onSystem = systemTree.onSystem
  const fee = Number(systemTree.fee)

  const dueMembers = await prisma.system.findMany({
    where: {
      onSystem,
      status: 'ACTIVE',
      gracePeriodEnd: { lt: now },
    }
  })

  const allConfigs = await getAllLevelConfigs(onSystem)
  const configMap = new Map(allConfigs.map(c => [c.level, c]))

  let confirmed = 0

  for (const member of dueMembers) {
    const returnRefId = `return_fee_sys_${onSystem}_user_${member.userId}`
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
    if (!wallet) continue

    const existingReturn = await prisma.brkTransaction.findFirst({
      where: {
        walletId: wallet.id,
        type: 'RETURN_FEE',
        refId: returnRefId
      }
    })
    if (!existingReturn) continue

    const returnPct = Number(systemTree.returnPct || 21)
    const returnBrkdRefId = `return_brkd_sys_${onSystem}_user_${member.userId}`
    const returnBrkdTx = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, refId: returnBrkdRefId }
    })
    const memberMBDT = returnBrkdTx ? Math.round(Number(returnBrkdTx.amount) / (returnPct / 100)) : 12_868_686

    const commissionResult = await distributeCommission(
      member.userId,
      onSystem,
      fee,
      systemTree,
      evalTime,
      configMap,
      memberMBDT
    )

    if (member.refSysId > 0) {
      await create2F1Voucher(member.refSysId, onSystem, evalTime)
    }

    await checkAndPromoteLevel(member.userId, onSystem, evalTime, configMap)

    for (const { uplineSystem } of commissionResult.ancestorCredits) {
      await checkAndPromoteLevel(uplineSystem.userId, onSystem, evalTime, configMap)
    }

    confirmed++
  }

  return { onSystem, checked: dueMembers.length, confirmed }
}
