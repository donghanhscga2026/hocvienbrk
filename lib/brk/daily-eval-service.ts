import prisma from '@/lib/prisma'
import { distributeCommission } from './commission-calculator'
import { checkAndPromoteLevel } from './level-manager'
import { getAllLevelConfigs } from './config-service'
import type { SystemTree } from '@prisma/client'

export async function processSystemDailyEval(
  systemTree: SystemTree,
  evalTime: Date,
  now: Date,
  sourceMemberId?: number // New optional param
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
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
    if (!wallet) continue

    const appSuffix = member.applicationId != null ? `_app_${member.applicationId}` : ''
    const returnRefIdApp = `return_fee_sys_${onSystem}_user_${member.userId}${appSuffix}`
    const returnRefIdPlain = `return_fee_sys_${onSystem}_user_${member.userId}`

    let existingReturn = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, type: 'RETURN_FEE', refId: returnRefIdApp }
    })
    if (!existingReturn && appSuffix) {
      existingReturn = await prisma.brkTransaction.findFirst({
        where: { walletId: wallet.id, type: 'RETURN_FEE', refId: returnRefIdPlain }
      })
    }
    if (!existingReturn) continue

    const returnPct = Number(systemTree.returnPct || 21)
    const returnBrkdRefIdApp = `return_brkd_sys_${onSystem}_user_${member.userId}${appSuffix}`
    const returnBrkdRefIdPlain = `return_brkd_sys_${onSystem}_user_${member.userId}`
    let returnBrkdTx = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, refId: returnBrkdRefIdApp }
    })
    if (!returnBrkdTx && appSuffix) {
      returnBrkdTx = await prisma.brkTransaction.findFirst({
        where: { walletId: wallet.id, refId: returnBrkdRefIdPlain }
      })
    }
    const memberMBDT = returnBrkdTx ? Math.round(Number(returnBrkdTx.amount) / (returnPct / 100)) : 12_868_686

    const commissionResult = await distributeCommission(
      member.userId,
      onSystem,
      fee,
      systemTree,
      evalTime,
      configMap,
      memberMBDT,
      member.userId,
      { applicationId: member.applicationId ?? undefined }
    )

    await checkAndPromoteLevel(member.userId, onSystem, evalTime, configMap, member.userId, member.applicationId ?? undefined)

    for (const { uplineSystem } of commissionResult.ancestorCredits) {
      await checkAndPromoteLevel(uplineSystem.userId, onSystem, evalTime, configMap, member.userId, member.applicationId ?? undefined)
    }

    confirmed++
  }

  return { onSystem, checked: dueMembers.length, confirmed }
}
