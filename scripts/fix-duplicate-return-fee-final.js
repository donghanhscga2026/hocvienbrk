/**
 * FIX DUPLICATE RETURN_FEE — FINAL VERSION (Self-Correcting)
 *
 * Root cause: commission-calculator.ts incremented totalPoints outside dedup check,
 * and brk-daily-eval dedup used fragile refId matching.
 * Result: 40+ users on system 4 got duplicate RETURN_FEE, inflated points,
 * wrong levels, wrong wallet balances.
 *
 * SAFETY: --dry-run by default. Use --execute to apply.
 * SELF-CORRECTING: Wallet balances recalculated from remaining transactions.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const SYSTEM_ID = 4;
const BRKP_PER_ACTIVATION = 17;

const LEVEL_CONFIGS = [
  { level: 1, pointsRequired: 17 },
  { level: 2, pointsRequired: 50 },
  { level: 3, pointsRequired: 250 },
  { level: 4, pointsRequired: 1000 },
  { level: 5, pointsRequired: 2000 },
  { level: 6, pointsRequired: 5000 },
  { level: 7, pointsRequired: 10000 },
  { level: 8, pointsRequired: 20000 },
];

function getCorrectLevel(totalPoints) {
  let level = 1;
  for (const c of LEVEL_CONFIGS) {
    if (totalPoints >= c.pointsRequired) level = c.level;
  }
  return level;
}

async function main() {
  console.log(`\n=== FIX DUPLICATE RETURN_FEE — FINAL (${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}) ===\n`);

  // ═══════════════════════════════════════════════════
  // STEP 1: Dynamic scan — find ALL wallets with >1 RETURN_FEE
  // ═══════════════════════════════════════════════════
  console.log('Step 1: Scanning for wallets with >1 RETURN_FEE on system 4...');

  const allMembers = await prisma.system.findMany({
    where: { onSystem: SYSTEM_ID },
    select: { userId: true, autoId: true }
  });
  console.log(`  Total members on system ${SYSTEM_ID}: ${allMembers.length}`);

  const affectedWallets = [];
  for (const member of allMembers) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } });
    if (!wallet) continue;

    const returnFeeCount = await prisma.brkTransaction.count({
      where: { walletId: wallet.id, type: 'RETURN_FEE' }
    });

    if (returnFeeCount > 1) {
      affectedWallets.push({ userId: member.userId, walletId: wallet.id, autoId: member.autoId, returnFeeCount });
    }
  }

  console.log(`  Affected wallets (>1 RETURN_FEE): ${affectedWallets.length}`);
  for (const w of affectedWallets) {
    console.log(`    User #${w.userId}: ${w.returnFeeCount} RETURN_FEE`);
  }

  // ═══════════════════════════════════════════════════
  // STEP 2: Identify ALL transactions to delete
  // ═══════════════════════════════════════════════════
  console.log('\nStep 2: Identifying duplicate transactions...');

  const txnIdsToDelete = new Set();

  for (const { userId, walletId } of affectedWallets) {
    // 2a: Duplicate RETURN_FEE — keep oldest, delete rest
    const returnFees = await prisma.brkTransaction.findMany({
      where: { walletId, type: 'RETURN_FEE' },
      orderBy: { createdAt: 'asc' }
    });
    for (let i = 1; i < returnFees.length; i++) {
      txnIdsToDelete.add(returnFees[i].id);
    }

    // 2b: Duplicate BRKD return (refId starts with 'return_brkd_sys_') — keep oldest
    const brkdReturns = await prisma.brkTransaction.findMany({
      where: { walletId, type: 'BRKD_CREDIT', refId: { startsWith: 'return_brkd_sys_' } },
      orderBy: { createdAt: 'asc' }
    });
    for (let i = 1; i < brkdReturns.length; i++) {
      txnIdsToDelete.add(brkdReturns[i].id);
    }
  }

  // 2c: Duplicate COMMISSION for ancestors of affected users
  const ancestorUserIds = new Set();
  for (const { autoId } of affectedWallets) {
    const ancestors = await prisma.systemClosure.findMany({
      where: { descendantId: autoId, depth: { gte: 1 }, systemId: SYSTEM_ID },
      include: { ancestor: true }
    });
    for (const a of ancestors) {
      ancestorUserIds.add(a.ancestor.userId);
    }
  }

  // For each ancestor, find duplicate COMMISSION/BRKD with refId matching affected members
  const affectedMemberUserIds = new Set(affectedWallets.map(w => w.userId));
  const ancestorWallets = await prisma.brkWallet.findMany({
    where: { userId: { in: [...ancestorUserIds] } }
  });

  for (const wallet of ancestorWallets) {
    // Group COMMISSION transactions by refId
    const commissions = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id, type: 'COMMISSION', refId: { not: null } },
      orderBy: { createdAt: 'asc' }
    });

    const commByRefId = new Map();
    for (const t of commissions) {
      if (!commByRefId.has(t.refId)) commByRefId.set(t.refId, []);
      commByRefId.get(t.refId).push(t);
    }

    for (const [refId, txns] of commByRefId) {
      const match = refId.match(/^sys_(\d+)_member_(\d+)$/);
      if (match && parseInt(match[1]) === SYSTEM_ID && affectedMemberUserIds.has(parseInt(match[2]))) {
        for (let i = 1; i < txns.length; i++) {
          txnIdsToDelete.add(txns[i].id);
        }
      }
    }

    // Group BRKD_CREDIT transactions by refId (commission pattern)
    const brkdCredits = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id, type: 'BRKD_CREDIT', refId: { startsWith: `sys_${SYSTEM_ID}_member_` } },
      orderBy: { createdAt: 'asc' }
    });

    const brkdByRefId = new Map();
    for (const t of brkdCredits) {
      if (!brkdByRefId.has(t.refId)) brkdByRefId.set(t.refId, []);
      brkdByRefId.get(t.refId).push(t);
    }

    for (const [refId, txns] of brkdByRefId) {
      const match = refId.match(/^sys_(\d+)_member_(\d+)$/);
      if (match && parseInt(match[1]) === SYSTEM_ID && affectedMemberUserIds.has(parseInt(match[2]))) {
        for (let i = 1; i < txns.length; i++) {
          txnIdsToDelete.add(txns[i].id);
        }
      }
    }
  }

  // 2d: VOUCHER with old refId format (level_X_sys_4 without userId)
  const allRelevantUserIds = [...affectedMemberUserIds, ...ancestorUserIds];
  const allRelevantWallets = await prisma.brkWallet.findMany({
    where: { userId: { in: allRelevantUserIds } }
  });

  for (const wallet of allRelevantWallets) {
    const vouchers = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id, type: 'VOUCHER_CREDIT', refId: { not: null } }
    });

    for (const t of vouchers) {
      const oldMatch = t.refId.match(/^level_(\d+)_sys_(\d+)$/);
      if (oldMatch) {
        const newRefId = `level_${oldMatch[1]}_sys_${oldMatch[2]}_user_${wallet.userId}`;
        const existingNew = await prisma.brkTransaction.findFirst({
          where: { walletId: wallet.id, type: 'VOUCHER_CREDIT', refId: newRefId }
        });
        if (existingNew) {
          txnIdsToDelete.add(t.id);
        }
      }
    }
  }

  const uniqueTxnIds = [...txnIdsToDelete];
  console.log(`  Total transactions to delete: ${uniqueTxnIds.length}`);

  // ═══════════════════════════════════════════════════
  // STEP 3: Identify affected wallets for balance recalculation
  // ═══════════════════════════════════════════════════
  const walletsToRecalc = new Set();
  for (const id of uniqueTxnIds) {
    const txn = await prisma.brkTransaction.findUnique({ where: { id }, select: { walletId: true } });
    if (txn) walletsToRecalc.add(txn.walletId);
  }
  // Also include wallets of all affected members + ancestors (safety)
  for (const uid of allRelevantUserIds) {
    const w = await prisma.brkWallet.findUnique({ where: { userId: uid }, select: { id: true } });
    if (w) walletsToRecalc.add(w.id);
  }
  console.log(`  Wallets to recalculate: ${walletsToRecalc.size}`);

  // ═══════════════════════════════════════════════════
  // STEP 4: Calculate expected balances (DRY RUN preview)
  // ═══════════════════════════════════════════════════
  console.log('\nStep 3: Calculating expected wallet balances...');

  const walletBalances = new Map();
  for (const walletId of walletsToRecalc) {
    const txns = await prisma.brkTransaction.findMany({ where: { walletId } });

    let cashBalance = 0;
    let brkdBalance = 0;
    let voucherBalance = 0;
    let totalEarned = 0;

    for (const t of txns) {
      const amt = Number(t.amount);
      if (t.balanceType === 'CASH') {
        if (['RETURN_FEE', 'COMMISSION', 'DEDUCTION_REFUND', 'WITHDRAWAL_REJECTED'].includes(t.type)) {
          cashBalance += amt;
        } else if (['WITHDRAWAL', 'DEDUCTION'].includes(t.type)) {
          cashBalance -= amt;
        } else {
          cashBalance += amt;
        }
        if (['RETURN_FEE', 'COMMISSION', 'DEDUCTION_REFUND'].includes(t.type)) {
          totalEarned += amt;
        }
      } else if (t.balanceType === 'BRKD') {
        brkdBalance += amt;
      } else if (t.balanceType === 'VOUCHER') {
        voucherBalance += amt;
      }
    }

    const wallet = await prisma.brkWallet.findUnique({ where: { id: walletId }, select: { userId: true, balance: true, brkd: true, voucherBalance: true, totalEarned: true } });
    walletBalances.set(walletId, {
      userId: wallet?.userId,
      expected: { balance: cashBalance, brkd: brkdBalance, voucherBalance, totalEarned },
      current: { balance: Number(wallet?.balance || 0), brkd: Number(wallet?.brkd || 0), voucherBalance: Number(wallet?.voucherBalance || 0), totalEarned: Number(wallet?.totalEarned || 0) }
    });
  }

  let walletMismatches = 0;
  for (const [walletId, { userId, expected, current }] of walletBalances) {
    const diff = expected.balance - current.balance + expected.brkd - current.brkd + expected.voucherBalance - current.voucherBalance;
    if (diff !== 0) {
      walletMismatches++;
      console.log(`  User #${userId}: CASH ${current.balance}→${expected.balance} | BRKD ${current.brkd}→${expected.brkd} | Voucher ${current.voucherBalance}→${expected.voucherBalance}`);
    }
  }
  console.log(`  Wallets with balance changes: ${walletMismatches}`);

  // ═══════════════════════════════════════════════════
  // STEP 5: Recalculate totalPoints
  // ═══════════════════════════════════════════════════
  console.log('\nStep 4: Recalculating totalPoints...');

  const pointsChanges = [];
  for (const member of allMembers) {
    const sys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: member.userId, onSystem: SYSTEM_ID } } });
    if (!sys) continue;

    const activatedDescendants = await prisma.systemClosure.count({
      where: {
        ancestorId: member.autoId,
        depth: { gt: 0 },
        systemId: SYSTEM_ID,
        descendant: { status: 'ACTIVE' }
      }
    });

    // Self gets +17 if confirmed (has RETURN_FEE or was activated before Method B)
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } });
    const hasReturnFee = wallet ? await prisma.brkTransaction.count({ where: { walletId: wallet.id, type: 'RETURN_FEE' } }) > 0 : false;
    const selfPts = hasReturnFee ? BRKP_PER_ACTIVATION : 0;
    const correctPoints = selfPts + (BRKP_PER_ACTIVATION * activatedDescendants);

    if (Number(sys.totalPoints) !== correctPoints) {
      pointsChanges.push({
        userId: member.userId,
        autoId: member.autoId,
        currentPts: Number(sys.totalPoints),
        correctPts: correctPoints,
        diff: correctPoints - Number(sys.totalPoints),
        activatedDescendants,
        selfPts
      });
    }
  }

  console.log(`  Users with point changes: ${pointsChanges.length}`);
  for (const p of pointsChanges) {
    console.log(`    User #${p.userId}: ${p.currentPts}→${p.correctPts} (${p.diff >= 0 ? '+' : ''}${p.diff}) [self=${p.selfPts}, desc=${p.activatedDescendants}]`);
  }

  // ═══════════════════════════════════════════════════
  // STEP 6: Fix levels
  // ═══════════════════════════════════════════════════
  console.log('\nStep 5: Fixing levels...');

  const levelChanges = [];
  for (const member of allMembers) {
    const sys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: member.userId, onSystem: SYSTEM_ID } } });
    if (!sys) continue;

    const ptsChange = pointsChanges.find(p => p.userId === member.userId);
    const correctPoints = ptsChange ? ptsChange.correctPts : Number(sys.totalPoints);
    const correctLevel = getCorrectLevel(correctPoints);

    if (sys.level !== correctLevel) {
      levelChanges.push({ userId: member.userId, autoId: sys.autoId, currentLevel: sys.level, correctLevel, points: correctPoints });
    }
  }

  console.log(`  Users with level changes: ${levelChanges.length}`);
  for (const l of levelChanges) {
    console.log(`    User #${l.userId}: L${l.currentLevel}→L${l.correctLevel} (${l.points}pts)`);
  }

  // ═══════════════════════════════════════════════════
  // STEP 7: Find stale BrkLevelUpRecord
  // ═══════════════════════════════════════════════════
  console.log('\nStep 6: Finding stale level-up records...');

  const staleRecords = [];
  for (const l of levelChanges) {
    const records = await prisma.brkLevelUpRecord.findMany({
      where: { userId: l.userId, onSystem: SYSTEM_ID, toLevel: { gt: l.correctLevel } }
    });
    for (const r of records) {
      staleRecords.push(r);
      console.log(`    User #${l.userId}: Delete L${r.fromLevel}→L${r.toLevel} record (promoted ${r.promotedAt})`);
    }
  }
  console.log(`  Stale records to delete: ${staleRecords.length}`);

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('══════════════════════════════════════════');
  console.log(`  Transactions to delete: ${uniqueTxnIds.length}`);
  console.log(`  Wallets to recalculate: ${walletsToRecalc.size}`);
  console.log(`  Points changes: ${pointsChanges.length}`);
  console.log(`  Level changes: ${levelChanges.length}`);
  console.log(`  Stale records to delete: ${staleRecords.length}`);
  console.log('══════════════════════════════════════════');

  if (DRY_RUN) {
    console.log(`\n=== DRY RUN COMPLETE. No changes made. ===`);
    console.log(`Run with --execute to apply.\n`);
    await prisma.$disconnect();
    return;
  }

  // ═══════════════════════════════════════════════════
  // EXECUTE
  // ═══════════════════════════════════════════════════
  console.log(`\n=== EXECUTING CLEANUP ===\n`);

  // A: Delete duplicate transactions
  console.log(`A. Deleting ${uniqueTxnIds.length} duplicate transactions...`);
  await prisma.brkTransaction.deleteMany({ where: { id: { in: uniqueTxnIds } } });
  console.log(`   Done.`);

  // B: Recalculate wallet balances (self-correcting)
  console.log(`B. Recalculating ${walletsToRecalc.size} wallet balances...`);
  for (const [walletId, { userId, expected }] of walletBalances) {
    await prisma.brkWallet.update({
      where: { id: walletId },
      data: {
        balance: expected.balance,
        brkd: expected.brkd,
        voucherBalance: expected.voucherBalance,
        totalEarned: expected.totalEarned,
      }
    });
    console.log(`   User #${userId}: balance=${expected.balance}, brkd=${expected.brkd}, voucher=${expected.voucherBalance}`);
  }
  console.log(`   Done.`);

  // C: Update totalPoints
  console.log(`C. Updating ${pointsChanges.length} totalPoints...`);
  for (const p of pointsChanges) {
    await prisma.system.update({
      where: { userId_onSystem: { userId: p.userId, onSystem: SYSTEM_ID } },
      data: { totalPoints: p.correctPts }
    });
    console.log(`   User #${p.userId}: ${p.currentPts}→${p.correctPts}`);
  }
  console.log(`   Done.`);

  // D: Update levels
  console.log(`D. Updating ${levelChanges.length} levels...`);
  for (const l of levelChanges) {
    await prisma.system.update({
      where: { autoId: l.autoId },
      data: { level: l.correctLevel }
    });
    console.log(`   User #${l.userId}: L${l.currentLevel}→L${l.correctLevel}`);
  }
  console.log(`   Done.`);

  // E: Delete stale level-up records
  console.log(`E. Deleting ${staleRecords.length} stale level-up records...`);
  for (const r of staleRecords) {
    await prisma.brkLevelUpRecord.delete({ where: { id: r.id } });
  }
  console.log(`   Done.`);

  // ═══════════════════════════════════════════════════
  // VERIFICATION
  // ═══════════════════════════════════════════════════
  console.log(`\n=== VERIFICATION ===`);
  let pass = 0, fail = 0;

  for (const member of allMembers) {
    const sys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: member.userId, onSystem: SYSTEM_ID } } });
    if (!sys) continue;

    const wallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } });
    const returnFeeCount = wallet ? await prisma.brkTransaction.count({ where: { walletId: wallet.id, type: 'RETURN_FEE' } }) : 0;

    const activatedDescendants = await prisma.systemClosure.count({
      where: { ancestorId: member.autoId, depth: { gt: 0 }, systemId: SYSTEM_ID, descendant: { status: 'ACTIVE' } }
    });

    const selfPts = returnFeeCount > 0 ? BRKP_PER_ACTIVATION : 0;
    const expectedPts = selfPts + (BRKP_PER_ACTIVATION * activatedDescendants);
    const expectedLevel = getCorrectLevel(expectedPts);

    const ptsOk = Number(sys.totalPoints) === expectedPts;
    const lvlOk = sys.level === expectedLevel;
    const rfOk = returnFeeCount <= 1;

    if (ptsOk && lvlOk && rfOk) {
      pass++;
    } else {
      fail++;
      const issues = [];
      if (!ptsOk) issues.push(`pts: ${sys.totalPoints}≠${expectedPts}`);
      if (!lvlOk) issues.push(`lvl: ${sys.level}≠${expectedLevel}`);
      if (!rfOk) issues.push(`rf: ${returnFeeCount}>1`);
      console.log(`  ✗ User #${member.userId}: ${issues.join(', ')}`);
    }
  }

  console.log(`\n  Passed: ${pass}/${allMembers.length}`);
  if (fail > 0) console.log(`  Failed: ${fail}`);
  else console.log(`  All users verified ✓`);

  console.log(`\n=== CLEANUP COMPLETE ===\n`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
