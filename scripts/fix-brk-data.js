/**
 * BRK Data Cleanup Script
 * Fixes: duplicate level-up records, duplicate vouchers, duplicate RETURN_FEE, stale referral bonuses
 * Run: node scripts/fix-brk-data.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run')
  console.log(`\n🔧 BRK Data Cleanup ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}\n`)

  // ═══════════════════════════════════════════════════════════════════
  // 1. DELETE DUPLICATE BrkLevelUpRecords (keep oldest)
  // ═══════════════════════════════════════════════════════════════════
  console.log('━━━ 1. BrkLevelUpRecord duplicates ━━━')
  const dups = await prisma.$queryRaw`
    SELECT "userId", "onSystem", "toLevel", COUNT(*) as cnt
    FROM "brk_level_up_record"
    GROUP BY "userId", "onSystem", "toLevel"
    HAVING COUNT(*) > 1
  `
  let levelUpDeleted = 0
  for (const dup of dups) {
    const records = await prisma.brkLevelUpRecord.findMany({
      where: { userId: dup.userId, onSystem: dup.onSystem, toLevel: dup.toLevel },
      orderBy: { promotedAt: 'asc' }
    })
    const toDelete = records.slice(1) // keep first (oldest)
    console.log(`  User#${dup.userId} toLevel=${dup.toLevel}: ${records.length} records → delete ${toDelete.length}`)
    if (!DRY_RUN) {
      await prisma.brkLevelUpRecord.deleteMany({
        where: { id: { in: toDelete.map(r => r.id) } }
      })
    }
    levelUpDeleted += toDelete.length
  }
  console.log(`  Total level-up records to delete: ${levelUpDeleted}\n`)

  // ═══════════════════════════════════════════════════════════════════
  // 2. DELETE DUPLICATE VOUCHER TRANSACTIONS (keep oldest per refId)
  // ═══════════════════════════════════════════════════════════════════
  console.log('━━━ 2. Duplicate VOUCHER_CREDIT transactions ━━━')
  const voucherDups = await prisma.$queryRaw`
    SELECT "walletId", "refId", COUNT(*) as cnt, SUM("amount") as "totalAmt"
    FROM "brk_transaction"
    WHERE "type" = 'VOUCHER_CREDIT' AND "balanceType" = 'VOUCHER' AND "refId" IS NOT NULL
    GROUP BY "walletId", "refId"
    HAVING COUNT(*) > 1
  `
  let voucherDeleted = 0
  let voucherDebitTotal = 0
  for (const dup of voucherDups) {
    const records = await prisma.brkTransaction.findMany({
      where: { walletId: dup.walletId, refId: dup.refId, type: 'VOUCHER_CREDIT' },
      orderBy: { createdAt: 'asc' }
    })
    const toDelete = records.slice(1)
    const debitAmount = toDelete.reduce((sum, r) => sum + Number(r.amount), 0)
    console.log(`  Wallet#${dup.walletId} refId=${dup.refId}: ${records.length} records → delete ${toDelete.length} (debit ${debitAmount}đ)`)

    if (!DRY_RUN) {
      // Delete duplicate transactions
      await prisma.brkTransaction.deleteMany({
        where: { id: { in: toDelete.map(r => r.id) } }
      })
      // Debit wallet voucher balance
      const wallet = await prisma.brkWallet.findUnique({ where: { id: dup.walletId } })
      if (wallet) {
        await prisma.brkWallet.update({
          where: { id: dup.walletId },
          data: { voucherBalance: Number(wallet.voucherBalance) - debitAmount }
        })
      }
    }
    voucherDeleted += toDelete.length
    voucherDebitTotal += debitAmount
  }
  console.log(`  Total voucher txns to delete: ${voucherDeleted}, total debit: ${voucherDebitTotal}đ\n`)

  // ═══════════════════════════════════════════════════════════════════
  // 3. DELETE DUPLICATE RETURN_FEE + BRKD (keep oldest per wallet+system)
  //    We need to identify duplicates by walletId + type
  // ═══════════════════════════════════════════════════════════════════
  console.log('━━━ 3. Duplicate RETURN_FEE transactions ━━━')
  const returnFeeDups = await prisma.$queryRaw`
    SELECT t1."id" as "keep_id", t1."walletId", t1."amount",
           ARRAY_AGG(t2."id") as "delete_ids"
    FROM "brk_transaction" t1
    JOIN "brk_transaction" t2 ON t1."walletId" = t2."walletId"
      AND t1."type" = t2."type"
      AND t1."balanceType" = t2."balanceType"
      AND t2."id" > t1."id"
    WHERE t1."type" = 'RETURN_FEE' AND t1."balanceType" = 'CASH'
    GROUP BY t1."id", t1."walletId", t1."amount"
    HAVING COUNT(t2."id") > 0
  `
  let returnDeleted = 0
  let returnDebitTotal = 0
  for (const dup of returnFeeDups) {
    const deleteIds = dup.delete_ids
    console.log(`  Wallet#${dup.walletId} RETURN_FEE: keep #${dup.keep_id}, delete ${deleteIds.length} dups (${dup.amount}đ each)`)

    if (!DRY_RUN) {
      await prisma.brkTransaction.deleteMany({ where: { id: { in: deleteIds } } })
      // Also delete corresponding BRKD RETURN_FEE for same wallet
      const brkdDups = await prisma.brkTransaction.findMany({
        where: { walletId: dup.walletId, type: 'RETURN_FEE', balanceType: 'BRKD' }
      })
      if (brkdDups.length > 1) {
        await prisma.brkTransaction.deleteMany({
          where: { id: { in: brkdDups.slice(1).map(r => r.id) } }
        })
      }
      // Debit wallet cash balance
      const wallet = await prisma.brkWallet.findUnique({ where: { id: dup.walletId } })
      if (wallet) {
        const debitAmt = Number(dup.amount) * deleteIds.length
        await prisma.brkWallet.update({
          where: { id: dup.walletId },
          data: {
            balance: Number(wallet.balance) - debitAmt,
            totalEarned: Number(wallet.totalEarned) - debitAmt
          }
        })
      }
    }
    returnDeleted += deleteIds.length
    returnDebitTotal += Number(dup.amount) * deleteIds.length
  }
  console.log(`  Total RETURN_FEE to delete: ${returnDeleted}, total debit: ${returnDebitTotal}đ\n`)

  // ═══════════════════════════════════════════════════════════════════
  // 4. FIX BrkReferralBonus — update f1Count from actual systemClosure
  // ═══════════════════════════════════════════════════════════════════
  console.log('━━━ 4. Fix BrkReferralBonus f1Count ━━━')
  const bonuses = await prisma.brkReferralBonus.findMany()
  let bonusFixed = 0
  for (const bonus of bonuses) {
    const sys = await prisma.system.findUnique({
      where: { userId_onSystem: { userId: bonus.userId, onSystem: bonus.onSystem } }
    })
    if (!sys) continue
    const actualF1 = await prisma.systemClosure.count({
      where: { ancestorId: sys.autoId, depth: 1, systemId: bonus.onSystem }
    })
    if (actualF1 !== bonus.f1Count) {
      console.log(`  User#${bonus.userId}: f1Count ${bonus.f1Count} → ${actualF1}`)
      if (!DRY_RUN) {
        await prisma.brkReferralBonus.update({
          where: { id: bonus.id },
          data: { f1Count: actualF1 }
        })
      }
      bonusFixed++
    }
  }
  console.log(`  Bonuses updated: ${bonusFixed}\n`)

  // ═══════════════════════════════════════════════════════════════════
  // 5. RECALCULATE system.totalPoints from actual data
  // ═══════════════════════════════════════════════════════════════════
  console.log('━━━ 5. Recalculate system.totalPoints ━━━')
  const correctedPointsMap = new Map() // autoId → corrected points
  const allSystems = await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { autoId: true, userId: true, onSystem: true, totalPoints: true, level: true }
  })
  let pointsFixed = 0
  for (const sys of allSystems) {
    const descendantCount = await prisma.systemClosure.count({
      where: { ancestorId: sys.autoId, depth: { gte: 1 }, systemId: sys.onSystem }
    })
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: sys.userId } })
    const hasReturnFee = wallet ? await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, type: 'RETURN_FEE' }
    }) : null
    const selfPoints = hasReturnFee ? 17 : 0
    const correctPoints = descendantCount * 17 + selfPoints
    const currentPoints = Number(sys.totalPoints)

    correctedPointsMap.set(sys.autoId, correctPoints)

    if (correctPoints !== currentPoints) {
      console.log(`  User#${sys.userId}: ${currentPoints} → ${correctPoints} (diff: ${correctPoints - currentPoints})`)
      if (!DRY_RUN) {
        await prisma.system.update({
          where: { autoId: sys.autoId },
          data: { totalPoints: correctPoints }
        })
      }
      pointsFixed++
    }
  }
  console.log(`  Points recalculated: ${pointsFixed} users\n`)

  // ═══════════════════════════════════════════════════════════════════
  // 6. RECALCULATE LEVELS from corrected points
  // ═══════════════════════════════════════════════════════════════════
  console.log('━━━ 6. Recalculate levels from corrected points ━━━')
  const levels = await prisma.brkLevelConfig.findMany({
    where: { systemId: 4 },
    orderBy: { level: 'asc' }
  })

  let levelFixed = 0
  for (const sys of allSystems) {
    const pts = correctedPointsMap.get(sys.autoId) ?? Number(sys.totalPoints)
    let correctLevel = 1
    for (const cfg of levels) {
      if (pts >= Number(cfg.pointsRequired)) {
        correctLevel = cfg.level
      }
    }
    if (correctLevel !== sys.level) {
      console.log(`  User#${sys.userId}: level ${sys.level} → ${correctLevel} (points: ${pts})`)
      if (!DRY_RUN) {
        await prisma.system.update({
          where: { autoId: sys.autoId },
          data: { level: correctLevel }
        })
      }
      levelFixed++
    }
  }
  console.log(`  Levels corrected: ${levelFixed} users\n`)

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ Cleanup complete${DRY_RUN ? ' (DRY RUN — no changes made)' : ''}`)
  console.log(`  - Level-up records deleted: ${levelUpDeleted}`)
  console.log(`  - Voucher txns deleted: ${voucherDeleted} (${voucherDebitTotal}đ debited)`)
  console.log(`  - RETURN_FEE deleted: ${returnDeleted} (${returnDebitTotal}đ debited)`)
  console.log(`  - BrkReferralBonus fixed: ${bonusFixed}`)
  console.log(`  - Points recalculated: ${pointsFixed}`)
  console.log(`  - Levels corrected: ${levelFixed}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
