import prisma from '@/lib/prisma'
import { addUserToSystemClosure } from '@/lib/system-closure-helpers'
import { getAllLevelConfigs } from './config-service'
import { resolvePlacement } from './placement-rules'

const BRKP_PER_ACTIVATION = 17
const ON_SYSTEM = 4

interface CommissionTx {
  ancestorId: number
  walletId: number
  amount: number
  txId: number
  balanceBefore: number
}

interface BrkdTx {
  ancestorId: number
  walletId: number
  amount: number
  txId: number
}

export interface PreviewResult {
  sourceUserId: number
  sourceName: string | null
  newReferrerUserId: number
  newReferrerName: string | null
  subtreeSize: number
  subtreeUsers: { id: number; name: string | null }[]
  oldChain: { id: number; name: string | null; level: number }[]
  newChain: { id: number; name: string | null; level: number }[]
  commonChainUserIds: number[]
  oldUniqueUserIds: number[]
  newUniqueUserIds: number[]
  totalBatches: number
  estimatedImpact: {
    oldAncestorsReversed: number
    newAncestorsCredited: number
    netLosers: number
    netGainers: number
    brkpChangePerAncestor: number
  }
}

export interface MoveResult {
  success: boolean
  logId?: number
  batchesProcessed: number
  totalNodes: number
  details: {
    oldChainReversed: number
    newChainCredited: number
    levelsChecked: number
    levelsChanged: number
  }
  warnings: string[]
}

interface BatchNode {
  userId: number
  autoId: number
  activatedAt: Date | null
  enrolledAt: Date | null
}

async function getSystemRecord(userId: number) {
  return prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem: ON_SYSTEM } }
  })
}

async function getDescendantAutoIds(autoId: number): Promise<number[]> {
  const closures = await prisma.systemClosure.findMany({
    where: { ancestorId: autoId, depth: { gte: 1 }, systemId: ON_SYSTEM },
    select: { descendantId: true }
  })
  return closures.map(c => c.descendantId)
}

async function getAncestorAutoIds(autoId: number): Promise<number[]> {
  const closures = await prisma.systemClosure.findMany({
    where: { descendantId: autoId, depth: { gte: 1 }, systemId: ON_SYSTEM },
    orderBy: { depth: 'asc' },
    select: { ancestorId: true }
  })
  return closures.map(c => c.ancestorId)
}

async function getAncestorUserIds(autoId: number): Promise<{ autoId: number; userId: number }[]> {
  const closures = await prisma.systemClosure.findMany({
    where: { descendantId: autoId, depth: { gte: 1 }, systemId: ON_SYSTEM },
    orderBy: { depth: 'asc' },
    select: { ancestorId: true }
  })
  if (closures.length === 0) return []
  const systems = await prisma.system.findMany({
    where: { autoId: { in: closures.map(c => c.ancestorId) }, onSystem: ON_SYSTEM },
    select: { autoId: true, userId: true }
  })
  return systems
}

async function buildSubtree(sourceUserId: number): Promise<{ userId: number; autoId: number }[]> {
  const sourceSys = await getSystemRecord(sourceUserId)
  if (!sourceSys) return []
  const descAutoIds = await getDescendantAutoIds(sourceSys.autoId)
  const allAutoIds = [sourceSys.autoId, ...descAutoIds]
  const systems = await prisma.system.findMany({
    where: { autoId: { in: allAutoIds }, onSystem: ON_SYSTEM },
    select: { autoId: true, userId: true }
  })
  return systems
}

async function getUsersInfo(userIds: number[]): Promise<Map<number, { id: number; name: string | null }>> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true }
  })
  const map = new Map<number, { id: number; name: string | null }>()
  for (const u of users) map.set(u.id, u)
  return map
}

async function getCommissionTransactionsForMember(
  memberUserId: number,
  ancestorUserIds: number[]
): Promise<CommissionTx[]> {
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: ancestorUserIds } },
    select: { id: true, userId: true, balance: true }
  })
  const userIdToWallet = new Map(wallets.map(w => [w.userId, w]))

  const results: CommissionTx[] = []
  for (const ancestorId of ancestorUserIds) {
    const wallet = userIdToWallet.get(ancestorId)
    if (!wallet) continue
    const txs = await prisma.brkTransaction.findMany({
      where: {
        walletId: wallet.id,
        type: 'COMMISSION',
        description: { contains: `thành viên mới #${memberUserId}` }
      },
      select: { id: true, amount: true, balanceBefore: true, balanceAfter: true }
    })
    for (const tx of txs) {
      results.push({ ancestorId, walletId: wallet.id, amount: Number(tx.amount), txId: tx.id, balanceBefore: Number(tx.balanceBefore) })
    }
  }
  return results
}

async function getBrkdTransactionsForMember(
  memberUserId: number,
  ancestorUserIds: number[]
): Promise<BrkdTx[]> {
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: ancestorUserIds } },
    select: { id: true, userId: true }
  })
  const userIdToWallet = new Map(wallets.map(w => [w.userId, w]))

  const results: BrkdTx[] = []
  for (const ancestorId of ancestorUserIds) {
    const wallet = userIdToWallet.get(ancestorId)
    if (!wallet) continue
    const txs = await prisma.brkTransaction.findMany({
      where: {
        walletId: wallet.id,
        type: 'BRKD_CREDIT',
        description: { contains: `thành viên mới #${memberUserId}` }
      },
      select: { id: true, amount: true }
    })
    for (const tx of txs) {
      results.push({ ancestorId, walletId: wallet.id, amount: Number(tx.amount), txId: tx.id })
    }
  }
  return results
}

async function reversalDebit(
  walletUserId: number,
  maxAmount: number,
  description: string,
  balanceType: 'CASH' | 'BRKD'
): Promise<{ debited: number; shortfall: number }> {
  const wallet = await prisma.brkWallet.findUnique({ where: { userId: walletUserId } })
  if (!wallet) return { debited: 0, shortfall: maxAmount }

  const field = balanceType === 'BRKD' ? 'brkd' : 'balance'
  const currentBalance = Number(wallet[field])
  const actualDebit = Math.min(maxAmount, Math.max(0, currentBalance))
  const shortfall = maxAmount - actualDebit

  if (actualDebit <= 0) return { debited: 0, shortfall: maxAmount }

  const oldVal = currentBalance
  const newVal = oldVal - actualDebit

  const updateData: Record<string, number | { decrement: number }> = { [field]: newVal }
  if (balanceType === 'CASH') {
    updateData.totalEarned = { decrement: actualDebit }
  }

  await prisma.$transaction([
    prisma.brkWallet.update({ where: { userId: walletUserId }, data: updateData as any }),
    prisma.brkTransaction.create({
      data: {
        walletId: wallet.id,
        amount: -actualDebit,
        type: 'ADJUSTMENT',
        description,
        balanceType,
        balanceBefore: oldVal,
        balanceAfter: newVal,
      }
    })
  ])

  return { debited: actualDebit, shortfall }
}

function filterRevertible(userIds: number[], excludeSet: Set<number>): number[] {
  return userIds.filter(id => !excludeSet.has(id))
}

function findCommonAncestorIds(oldUserIds: number[], newUserIds: number[]): Set<number> {
  const oldSet = new Set(oldUserIds)
  return new Set(newUserIds.filter(id => oldSet.has(id)))
}

export async function previewMove(
  sourceUserId: number,
  newReferrerUserId: number
): Promise<PreviewResult> {
  const sourceSys = await getSystemRecord(sourceUserId)
  if (!sourceSys) throw new Error('Source user not found in BRK system')

  const refSys = await getSystemRecord(newReferrerUserId)
  if (!refSys) throw new Error('New referrer not found in BRK system')

  const descAutoIds = await getDescendantAutoIds(sourceSys.autoId)
  const descSystems = descAutoIds.length > 0
    ? await prisma.system.findMany({
        where: { autoId: { in: descAutoIds }, onSystem: ON_SYSTEM },
        select: { userId: true }
      })
    : []

  const subtreeUserIds = [sourceUserId, ...descSystems.map(s => s.userId)]
  const subtreeUsers = (await getUsersInfo(subtreeUserIds)).values()

  const oldAncestors = await getAncestorUserIds(sourceSys.autoId)
  const oldAncestorUserIds = oldAncestors.map(a => a.userId)

  const newRefSysId = await resolvePlacement(ON_SYSTEM, newReferrerUserId)
  const newRefSys = await getSystemRecord(newRefSysId)
  const newAncestors = newRefSys ? await getAncestorUserIds(newRefSys.autoId) : []
  const newAncestorUserIds = newRefSys ? [...newAncestors.map(a => a.userId), newRefSysId] : [newRefSysId]

  const commonSet = findCommonAncestorIds(oldAncestorUserIds, newAncestorUserIds)
  const oldUnique = filterRevertible(oldAncestorUserIds, commonSet)
  const newUnique = filterRevertible(newAncestorUserIds, commonSet)

  const allChainIds = [...new Set([...oldUnique, ...newUnique, ...oldAncestorUserIds, ...newAncestorUserIds])]
  const userInfoMap = await getUsersInfo(allChainIds)

  const oldChainInfo = oldAncestorUserIds.map(id => ({
    id, name: userInfoMap.get(id)?.name || null, level: 0
  }))

  const newChainInfo = [...newAncestorUserIds.map(id => ({
    id, name: userInfoMap.get(id)?.name || null, level: 0
  }))]

  const totalNodes = subtreeUserIds.length
  const batchSize = 10
  const totalBatches = Math.ceil(totalNodes / batchSize)

  return {
    sourceUserId,
    sourceName: userInfoMap.get(sourceUserId)?.name || null,
    newReferrerUserId,
    newReferrerName: userInfoMap.get(newReferrerUserId)?.name || null,
    subtreeSize: totalNodes,
    subtreeUsers: Array.from(subtreeUsers).map(u => ({ id: u.id, name: u.name })),
    oldChain: oldChainInfo,
    newChain: newChainInfo,
    commonChainUserIds: Array.from(commonSet),
    oldUniqueUserIds: oldUnique,
    newUniqueUserIds: newUnique,
    totalBatches,
    estimatedImpact: {
      oldAncestorsReversed: oldAncestorUserIds.length,
      newAncestorsCredited: newAncestorUserIds.length,
      netLosers: oldUnique.length,
      netGainers: newUnique.length,
      brkpChangePerAncestor: BRKP_PER_ACTIVATION * totalNodes,
    }
  }
}

export async function moveBrkMember(
  sourceUserId: number,
  newReferrerUserId: number,
  reason: string,
  adminId: number,
  batchSize: number = 10
): Promise<MoveResult> {
  const result: MoveResult = { success: false, batchesProcessed: 0, totalNodes: 0, details: { oldChainReversed: 0, newChainCredited: 0, levelsChecked: 0, levelsChanged: 0 }, warnings: [] }

  const sourceSys = await getSystemRecord(sourceUserId)
  if (!sourceSys) { result.warnings.push('Source user not found'); return result }
  if (sourceSys.status !== 'ACTIVE') { result.warnings.push(`Source user status is ${sourceSys.status}, not ACTIVE`); return result }

  const refSys = await getSystemRecord(newReferrerUserId)
  if (!refSys) { result.warnings.push('New referrer not found in BRK system'); return result }
  if (refSys.status !== 'ACTIVE') { result.warnings.push(`New referrer status is ${refSys.status}, not ACTIVE`); return result }

  if (sourceUserId === newReferrerUserId) { result.warnings.push('Cannot move user under themselves'); return result }

  const descAutoIds = await getDescendantAutoIds(sourceSys.autoId)
  const descAutoIdSet = new Set(descAutoIds)
  if (descAutoIdSet.has(refSys.autoId)) { result.warnings.push('Cannot move under a descendant (circular reference)'); return result }

  const oldRefSysId = sourceSys.refSysId

  const subtrees = await buildSubtree(sourceUserId)
  if (subtrees.length === 0) { result.warnings.push('No subtree found'); return result }

  result.totalNodes = subtrees.length

  const oldAncestors = await getAncestorUserIds(sourceSys.autoId)
  const oldAncestorUserIds = oldAncestors.map(a => a.userId)

  const newRefSysId = await resolvePlacement(ON_SYSTEM, newReferrerUserId)
  const newRefSys = await getSystemRecord(newRefSysId)
  const newAncestors = newRefSys ? await getAncestorUserIds(newRefSys.autoId) : []
  const newAncestorUserIds = newRefSys ? [...newAncestors.map(a => a.userId), newRefSysId] : [newRefSysId]

  const commonSet = findCommonAncestorIds(oldAncestorUserIds, newAncestorUserIds)
  const oldUnique = filterRevertible(oldAncestorUserIds, commonSet)
  const newUnique = filterRevertible(newAncestorUserIds, commonSet)

  const subtreeNodes: BatchNode[] = []
  for (const st of subtrees) {
    const sys = await prisma.system.findUnique({ where: { autoId: st.autoId }, select: { activatedAt: true, createdAt: true } })
    subtreeNodes.push({
      userId: st.userId,
      autoId: st.autoId,
      activatedAt: sys?.activatedAt || null,
      enrolledAt: sys?.createdAt || null
    })
  }
  subtreeNodes.sort((a, b) => (a.activatedAt || a.enrolledAt || new Date(0)).getTime() - (b.activatedAt || b.enrolledAt || new Date(0)).getTime())

  // ===== PHASE 3: REVERSE OLD COMMISSIONS, BRKD & BRKP =====
  // Reverse from ALL old ancestors (including common), then Phase 5 re-credits → common net 0
  let oldReversedCount = 0
  for (const node of subtreeNodes) {
    const commissions = await getCommissionTransactionsForMember(node.userId, oldAncestorUserIds)
    for (const comm of commissions) {
      const { debited, shortfall } = await reversalDebit(
        comm.ancestorId,
        comm.amount,
        `Đảo hoa hồng từ #${node.userId} (di chuyển cây: ${reason})`,
        'CASH'
      )
      if (shortfall > 0) {
        result.warnings.push(`User #${comm.ancestorId}: shortfall ${shortfall}đ khi đảo hoa hồng từ #${node.userId}`)
      }
      oldReversedCount++
    }

    const brkdTxs = await getBrkdTransactionsForMember(node.userId, oldAncestorUserIds)
    for (const bt of brkdTxs) {
      await reversalDebit(
        bt.ancestorId,
        bt.amount,
        `Đảo BRKD từ #${node.userId} (di chuyển cây: ${reason})`,
        'BRKD'
      )
      oldReversedCount++
    }
  }

  for (const ancestorId of oldAncestorUserIds) {
    const ancSys = await getSystemRecord(ancestorId)
    if (ancSys) {
      const deduction = BigInt(subtreeNodes.length) * BigInt(BRKP_PER_ACTIVATION)
      const newTotal = Math.max(0, Number(ancSys.totalPoints) - Number(deduction))
      await prisma.system.update({
        where: { autoId: ancSys.autoId },
        data: { totalPoints: newTotal }
      })
    }
  }

  result.details.oldChainReversed = oldReversedCount

  // ===== PHASE 4: MOVE TREE =====
  await prisma.system.update({
    where: { userId_onSystem: { userId: sourceUserId, onSystem: ON_SYSTEM } },
    data: { refSysId: newRefSysId }
  })

  for (const st of subtrees) {
    await prisma.systemClosure.deleteMany({
      where: { descendantId: st.autoId, depth: { gte: 1 }, systemId: ON_SYSTEM }
    })
  }

  for (const st of subtrees) {
    const sys = await prisma.system.findUnique({ where: { autoId: st.autoId } })
    if (sys) {
      await addUserToSystemClosure(st.userId, sys.refSysId, ON_SYSTEM)
    }
  }

  // ===== PHASE 5: CREDIT NEW COMMISSIONS + BRKP =====
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) {
    result.warnings.push('SystemTree not found — cannot distribute commissions')
    return result
  }
  const fee = Number(systemTree.fee ?? 26868)

  const { distributeCommission } = await import('./commission-calculator')

  let newCreditedCount = 0
  for (let i = 0; i < subtreeNodes.length; i += batchSize) {
    const batch = subtreeNodes.slice(i, i + batchSize)
    for (const node of batch) {
      try {
        await distributeCommission(node.userId, ON_SYSTEM, fee, systemTree)
        newCreditedCount++
      } catch (err) {
        result.warnings.push(`distributeCommission thất bại cho #${node.userId}: ${err}`)
      }
    }
  }

  result.details.newChainCredited = newCreditedCount

  // ===== PHASE 6: RE-CHECK LEVELS =====
  const allAffectedUserIds = [...new Set([...oldUnique, ...newUnique])]
  const allLevelConfigs = await getAllLevelConfigs(ON_SYSTEM)

  let levelsChanged = 0
  for (const affectedId of allAffectedUserIds) {
    const sys = await getSystemRecord(affectedId)
    if (!sys) continue
    result.details.levelsChecked++

    const currentPoints = Number(sys.totalPoints)
    const currentLevel = sys.level

    let highestQualified = 0
    for (const cfg of allLevelConfigs) {
      if (currentPoints >= Number(cfg.pointsRequired)) {
        highestQualified = cfg.level
      }
    }

    if (highestQualified < currentLevel) {
      await prisma.system.update({
        where: { autoId: sys.autoId },
        data: { level: Math.max(1, highestQualified) }
      })
      await prisma.brkLevelUpRecord.deleteMany({
        where: { userId: affectedId, onSystem: ON_SYSTEM, toLevel: { gt: highestQualified } }
      })
      levelsChanged++
    } else if (highestQualified > currentLevel) {
      const { checkAndPromoteLevel } = await import('./level-manager')
      try {
        await checkAndPromoteLevel(affectedId, ON_SYSTEM)
        levelsChanged++
      } catch { }
    }
  }

  result.details.levelsChanged = levelsChanged

  // ===== PHASE 7: AUDIT LOG =====
  const oldChainUserIds = [...new Set(oldAncestorUserIds)]
  const newChainUserIds = [...new Set(newAncestorUserIds)]
  const subtreeUserIds = subtrees.map(s => s.userId)

  const log = await prisma.brkSystemLog.create({
    data: {
      action: 'MOVE_MEMBER',
      onSystem: ON_SYSTEM,
      sourceUserId,
      oldRefSysId,
      newRefSysId,
      oldChain: oldChainUserIds,
      newChain: newChainUserIds,
      subtree: subtreeUserIds,
      affectedCount: subtreeNodes.length,
      reason,
      adminId,
    }
  })

  result.logId = log.id
  result.success = true
  result.batchesProcessed = Math.ceil(subtreeNodes.length / batchSize)

  return result
}

export interface RebuildSubtreeResult {
  success: boolean
  logId?: number
  membersProcessed: number
  details: {
    reversedCount: number
    creditedCount: number
    levelsChecked: number
    levelsChanged: number
  }
  warnings: string[]
}

export async function rebuildSubtree(
  parentUserId: number,
  memberUserIds: number[],
  reason: string,
  adminId: number,
  onSystem: number = ON_SYSTEM
): Promise<RebuildSubtreeResult> {
  const result: RebuildSubtreeResult = {
    success: false,
    membersProcessed: 0,
    details: { reversedCount: 0, creditedCount: 0, levelsChecked: 0, levelsChanged: 0 },
    warnings: []
  }

  const parentSys = await getSystemRecord(parentUserId)
  if (!parentSys) { result.warnings.push('Parent user not found'); return result }
  if (parentSys.status !== 'ACTIVE') { result.warnings.push('Parent not active'); return result }

  const memberSystems: { userId: number; autoId: number; refSysId: number; activatedAt: Date | null }[] = []
  for (const uid of [...new Set(memberUserIds)]) {
    const sys = await prisma.system.findUnique({
      where: { userId_onSystem: { userId: uid, onSystem } },
      select: { autoId: true, refSysId: true, activatedAt: true, status: true }
    })
    if (!sys || sys.status !== 'ACTIVE') {
      result.warnings.push(`Member #${uid} not found or not active, skipping`)
      continue
    }
    // Check circular: parent cannot be a descendant of any member being moved
    const closures = await prisma.systemClosure.findFirst({
      where: { ancestorId: sys.autoId, descendantId: parentSys.autoId, depth: { gte: 1 }, systemId: onSystem }
    })
    if (closures) {
      result.warnings.push(`Cannot rebuild: #${parentUserId} is a descendant of #${uid} (circular)`)
      return result
    }
    memberSystems.push({ userId: uid, autoId: sys.autoId, refSysId: sys.refSysId, activatedAt: sys.activatedAt })
  }

  if (memberSystems.length === 0) { result.warnings.push('No valid members to process'); return result }

  // ===== PHASE 1: REVERSE & DETACH ALL =====
  const allOldAncestorIds = new Set<number>()
  let reversedCount = 0

  for (const ms of memberSystems) {
    const oldAncestors = await getAncestorUserIds(ms.autoId)
    const oldAncestorUserIds = oldAncestors.map(a => a.userId)
    for (const aid of oldAncestorUserIds) allOldAncestorIds.add(aid)

    // Reverse commissions
    const commissions = await getCommissionTransactionsForMember(ms.userId, oldAncestorUserIds)
    for (const comm of commissions) {
      const { debited, shortfall } = await reversalDebit(
        comm.ancestorId,
        comm.amount,
        `Đảo hoa hồng từ #${ms.userId} (rebuild subtree: ${reason})`,
        'CASH'
      )
      if (shortfall > 0) {
        result.warnings.push(`User #${comm.ancestorId}: shortfall ${shortfall}đ khi đảo hoa hồng từ #${ms.userId}`)
      }
      reversedCount++
    }

    // Reverse BRKD
    const brkdTxs = await getBrkdTransactionsForMember(ms.userId, oldAncestorUserIds)
    for (const bt of brkdTxs) {
      await reversalDebit(
        bt.ancestorId,
        bt.amount,
        `Đảo BRKD từ #${ms.userId} (rebuild subtree: ${reason})`,
        'BRKD'
      )
      reversedCount++
    }

    // Deduct BRKP from all old ancestors
    for (const ancestorId of oldAncestorUserIds) {
      const ancSys = await getSystemRecord(ancestorId)
      if (ancSys) {
        const newTotal = Math.max(0, Number(ancSys.totalPoints) - BRKP_PER_ACTIVATION)
        await prisma.system.update({
          where: { autoId: ancSys.autoId },
          data: { totalPoints: newTotal }
        })
      }
    }

    // Detach: delete closure entries (depth ≥ 1) and reset refSysId
    await prisma.systemClosure.deleteMany({
      where: { descendantId: ms.autoId, depth: { gte: 1 }, systemId: onSystem }
    })
    await prisma.system.update({
      where: { autoId: ms.autoId },
      data: { refSysId: 0 }
    })
  }

  result.details.reversedCount = reversedCount

  // ===== PHASE 2: PLACE & CREDIT CHRONOLOGICALLY =====
  memberSystems.sort((a, b) => (a.activatedAt || new Date(0)).getTime() - (b.activatedAt || new Date(0)).getTime())

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem } })
  if (!systemTree) { result.warnings.push('SystemTree not found'); return result }
  const fee = Number(systemTree.fee ?? 26868)

  const allNewAncestorIds = new Set<number>()
  let creditedCount = 0

  const { distributeCommission } = await import('./commission-calculator')

  for (const ms of memberSystems) {
    const refSysId = await resolvePlacement(onSystem, parentUserId)

    await prisma.system.update({
      where: { autoId: ms.autoId },
      data: { refSysId }
    })

    await addUserToSystemClosure(ms.userId, refSysId, onSystem)

    // Track new chain ancestors
    const newSys = await prisma.system.findUnique({ where: { autoId: ms.autoId }, select: { autoId: true } })
    if (newSys) {
      const newAncestors = await getAncestorUserIds(newSys.autoId)
      for (const a of newAncestors) allNewAncestorIds.add(a.userId)
    }

    try {
      await distributeCommission(ms.userId, onSystem, fee, systemTree)
      creditedCount++
    } catch (err) {
      result.warnings.push(`distributeCommission thất bại cho #${ms.userId}: ${err}`)
    }
  }

  result.details.creditedCount = creditedCount
  result.membersProcessed = memberSystems.length

  // ===== PHASE 3: RE-CHECK LEVELS =====
  const allAffectedUserIds = [...new Set([...allOldAncestorIds, ...allNewAncestorIds, ...memberSystems.map(m => m.userId)])]
  const allLevelConfigs = await getAllLevelConfigs(onSystem)

  let levelsChanged = 0
  for (const affectedId of allAffectedUserIds) {
    const sys = await getSystemRecord(affectedId)
    if (!sys) continue
    result.details.levelsChecked++

    const currentPoints = Number(sys.totalPoints)
    const currentLevel = sys.level

    // Find highest qualified level
    let highestQualified = 0
    for (const cfg of allLevelConfigs) {
      if (currentPoints >= Number(cfg.pointsRequired)) {
        highestQualified = cfg.level
      }
    }

    if (highestQualified < currentLevel) {
      await prisma.system.update({
        where: { autoId: sys.autoId },
        data: { level: Math.max(1, highestQualified) }
      })
      await prisma.brkLevelUpRecord.deleteMany({
        where: { userId: affectedId, onSystem, toLevel: { gt: highestQualified } }
      })
      levelsChanged++
    } else if (highestQualified > currentLevel) {
      const { checkAndPromoteLevel } = await import('./level-manager')
      try {
        await checkAndPromoteLevel(affectedId, onSystem)
        levelsChanged++
      } catch { }
    }
  }

  result.details.levelsChanged = levelsChanged

  // ===== PHASE 4: AUDIT LOG =====
  const log = await prisma.brkSystemLog.create({
    data: {
      action: 'REBUILD_SUBTREE',
      onSystem,
      sourceUserId: parentUserId,
      oldRefSysId: 0,
      newRefSysId: 0,
      oldChain: [],
      newChain: [],
      subtree: memberSystems.map(m => m.userId),
      affectedCount: memberSystems.length,
      reason,
      adminId,
      metadata: JSON.parse(JSON.stringify({
        memberCount: memberSystems.length,
        totalOldAncestors: allOldAncestorIds.size,
        totalNewAncestors: allNewAncestorIds.size,
        sortOrder: memberSystems.map(m => ({ userId: m.userId, activatedAt: m.activatedAt?.toISOString() }))
      }))
    }
  })

  result.logId = log.id
  result.success = true

  return result
}
