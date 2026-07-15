/**
 * FIX: Duplicate RETURN_FEE processing (July 13, 2026)
 * 
 * Root cause: Old RETURN_FEE had refId=null, new dedup check looked for specific refId string
 * → dedup failed → 18 users re-processed → double RETURN_FEE, double BRKD return,
 *   double commission to ancestors, extra self-points, wrong level promotions.
 * 
 * SAFETY: Run with --dry-run first (default). Use --execute to apply.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');
const BRKP_PER_ACTIVATION = 17;

const AFFECTED_USERS = [1035,1057,1061,229,965,976,974,1059,828,496,3773,1066,617,1068,1075,1076,1088,749];
const AFFECTED_SET = new Set(AFFECTED_USERS);
const COMMISSION_REF_RE = /^sys_4_member_(\d+)$/;
const VOUCHER_REF_RE = /^level_(\d+)_sys_4$/;

async function main() {
  console.log(`\n=== FIX DUPLICATE RETURN_FEE (${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}) ===\n`);

  const allTxnIdsToDelete = [];
  const walletAdjustments = new Map();
  const pointAdjustments = new Map();

  function addWalletAdj(walletId, balanceType, amount) {
    if (!walletAdjustments.has(walletId)) walletAdjustments.set(walletId, { cash: 0, brkd: 0, voucher: 0 });
    const adj = walletAdjustments.get(walletId);
    if (balanceType === 'CASH') adj.cash -= Number(amount);
    else if (balanceType === 'BRKD') adj.brkd -= Number(amount);
    else if (balanceType === 'VOUCHER') adj.voucher -= Number(amount);
  }

  function addPointAdj(userId, pts) {
    pointAdjustments.set(userId, (pointAdjustments.get(userId) || 0) + pts);
  }

  // ── Step 1: Find duplicate RETURN_FEE + BRKD return for affected users ──
  console.log('Step 1: Duplicate RETURN_FEE + BRKD return for affected users...');
  for (const uid of AFFECTED_USERS) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: uid } });
    if (!wallet) continue;

    // Duplicate RETURN_FEE: has proper refId (newer processing)
    const dupReturnFee = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id, type: 'RETURN_FEE', refId: { not: null } }
    });
    for (const t of dupReturnFee) {
      allTxnIdsToDelete.push(t.id);
      addWalletAdj(wallet.id, t.balanceType, t.amount);
    }

    // Duplicate BRKD return: has proper refId
    const dupBrkdReturn = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id, type: 'BRKD_CREDIT', refId: { startsWith: 'return_brkd_sys_' } }
    });
    for (const t of dupBrkdReturn) {
      allTxnIdsToDelete.push(t.id);
      addWalletAdj(wallet.id, t.balanceType, t.amount);
    }

    // Self-points: -17 for each affected user
    addPointAdj(uid, -BRKP_PER_ACTIVATION);
  }

  // ── Step 2: Find duplicate COMMISSION + BRKD for ancestors ──
  console.log('Step 2: Duplicate COMMISSION + BRKD for ancestors...');
  const allAncestorUserIds = new Set();
  for (const uid of AFFECTED_USERS) {
    const sys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: uid, onSystem: 4 } } });
    if (!sys) continue;
    const ancestors = await prisma.systemClosure.findMany({
      where: { descendantId: sys.autoId, depth: { gte: 1 }, systemId: 4 },
      include: { ancestor: true }
    });
    for (const a of ancestors) {
      allAncestorUserIds.add(a.ancestor.userId);
      addPointAdj(a.ancestor.userId, -BRKP_PER_ACTIVATION);
    }
  }

  // For all ancestor wallets, find COMMISSION/BRKD with refId matching affected users
  const ancestorWallets = await prisma.brkWallet.findMany({
    where: { userId: { in: [...allAncestorUserIds] } }
  });

  for (const wallet of ancestorWallets) {
    const dupCommissions = await prisma.brkTransaction.findMany({
      where: {
        walletId: wallet.id,
        type: { in: ['COMMISSION', 'BRKD_CREDIT'] },
        refId: { not: null }
      }
    });

    for (const t of dupCommissions) {
      const match = t.refId?.match(COMMISSION_REF_RE);
      if (match && AFFECTED_SET.has(parseInt(match[1]))) {
        allTxnIdsToDelete.push(t.id);
        addWalletAdj(wallet.id, t.balanceType, t.amount);
      }
    }
  }

  // ── Step 3: Find duplicate VOUCHER with old refId format (missing userId) ──
  console.log('Step 3: Duplicate VOUCHER with old refId format...');
  const allUserIds = [...AFFECTED_USERS, ...allAncestorUserIds];
  const allWallets = await prisma.brkWallet.findMany({
    where: { userId: { in: allUserIds } }
  });

  for (const wallet of allWallets) {
    const vouchers = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id, type: 'VOUCHER_CREDIT', refId: { not: null } }
    });

    for (const t of vouchers) {
      const match = t.refId?.match(VOUCHER_REF_RE);
      if (match) {
        // Old format: level_X_sys_4 (no userId) → duplicate
        const newRefId = `level_${match[1]}_sys_4_user_${wallet.userId}`;
        const existingNew = await prisma.brkTransaction.findFirst({
          where: { walletId: wallet.id, type: 'VOUCHER_CREDIT', refId: newRefId }
        });
        if (existingNew) {
          // New format exists → old one is duplicate → delete it
          allTxnIdsToDelete.push(t.id);
          addWalletAdj(wallet.id, t.balanceType, t.amount);
        }
      }
    }
  }

  // ── Step 4: Summary ──
  const uniqueTxnIds = [...new Set(allTxnIdsToDelete)];
  console.log(`\nStep 4: Summary`);
  console.log(`  Transactions to delete: ${uniqueTxnIds.length}`);

  let totalCash = 0, totalBRKD = 0, totalVoucher = 0;
  for (const [wid, adj] of walletAdjustments) {
    totalCash += adj.cash;
    totalBRKD += adj.brkd;
    totalVoucher += adj.voucher;
  }
  console.log(`  CASH to debit: ${totalCash.toFixed(2)}`);
  console.log(`  BRKD to debit: ${totalBRKD.toLocaleString()}`);
  console.log(`  VOUCHER to debit: ${totalVoucher.toLocaleString()}`);

  // ── Step 5: Point adjustments ──
  console.log(`\nStep 5: Point adjustments:`);
  for (const [uid, pts] of pointAdjustments) {
    console.log(`  User #${uid}: ${pts} points`);
  }

  // ── Step 6: Level promotions to fix ──
  const levelRecords = await prisma.brkLevelUpRecord.findMany({
    where: {
      userId: { in: allUserIds },
      promotedAt: { gte: new Date('2026-07-13T23:00:00Z'), lt: new Date('2026-07-14T00:00:00Z') }
    }
  });
  console.log(`\nStep 6: ${levelRecords.length} level-up records to delete:`);
  for (const r of levelRecords) {
    console.log(`  User #${r.userId}: L${r.fromLevel}→L${r.toLevel}`);
  }

  // ── Step 7: Correct levels after point adjustment ──
  const configs = await prisma.brkLevelConfig.findMany({ where: { systemId: 4 }, orderBy: { level: 'asc' } });
  console.log(`\nStep 7: Level corrections after point adjustment:`);
  const levelFixes = [];
  for (const uid of allUserIds) {
    const sys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: uid, onSystem: 4 } } });
    if (!sys) continue;
    const currentPts = Number(sys.totalPoints);
    const adjustedPts = currentPts + (pointAdjustments.get(uid) || 0);
    let correctLevel = 1;
    for (const c of configs) {
      if (adjustedPts >= Number(c.pointsRequired)) correctLevel = c.level;
    }
    if (sys.level !== correctLevel) {
      levelFixes.push({ autoId: sys.autoId, userId: uid, from: sys.level, to: correctLevel, pts: adjustedPts });
      console.log(`  User #${uid}: L${sys.level}(${currentPts}pts) → L${correctLevel}(${adjustedPts}pts)`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n=== DRY RUN COMPLETE. No changes made. ===`);
    console.log(`Run with --execute to apply changes.\n`);
    await prisma.$disconnect();
    return;
  }

  // ── EXECUTE ──
  console.log(`\n=== EXECUTING CLEANUP ===\n`);

  // A: Delete duplicate transactions
  console.log(`A. Deleting ${uniqueTxnIds.length} duplicate transactions...`);
  await prisma.brkTransaction.deleteMany({ where: { id: { in: uniqueTxnIds } } });
  console.log(`   Done.`);

  // B: Adjust wallet balances
  console.log(`B. Adjusting ${walletAdjustments.size} wallet balances...`);
  for (const [walletId, adj] of walletAdjustments) {
    const updates = {};
    if (adj.cash !== 0) { updates.balance = { increment: adj.cash }; updates.totalEarned = { increment: adj.cash }; }
    if (adj.brkd !== 0) { updates.brkd = { increment: adj.brkd }; }
    if (adj.voucher !== 0) { updates.voucherBalance = { increment: adj.voucher }; }
    if (Object.keys(updates).length > 0) {
      await prisma.brkWallet.update({ where: { id: walletId }, data: updates });
    }
  }
  console.log(`   Done.`);

  // C: Adjust system points
  console.log(`C. Adjusting system points...`);
  for (const [uid, pts] of pointAdjustments) {
    if (pts === 0) continue;
    await prisma.system.updateMany({ where: { userId: uid, onSystem: 4 }, data: { totalPoints: { increment: pts } } });
  }
  console.log(`   Done.`);

  // D: Delete wrong level-up records
  console.log(`D. Deleting ${levelRecords.length} wrong level-up records...`);
  for (const r of levelRecords) {
    await prisma.brkLevelUpRecord.delete({ where: { id: r.id } });
  }
  console.log(`   Done.`);

  // E: Fix system levels
  console.log(`E. Fixing ${levelFixes.length} system levels...`);
  for (const fix of levelFixes) {
    await prisma.system.update({ where: { autoId: fix.autoId }, data: { level: fix.to } });
    console.log(`   User #${fix.userId}: L${fix.from} → L${fix.to}`);
  }
  console.log(`   Done.`);

  // F: Verify
  console.log(`\n=== VERIFICATION ===`);
  for (const uid of AFFECTED_USERS) {
    const sys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: uid, onSystem: 4 } } });
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: uid } });
    const returnFees = await prisma.brkTransaction.count({ where: { wallet: { userId: uid }, type: 'RETURN_FEE' } });
    if (sys && wallet) {
      const pts = Number(sys.totalPoints);
      let lvl = 1;
      for (const c of configs) { if (pts >= Number(c.pointsRequired)) lvl = c.level; }
      const ok = sys.level === lvl && returnFees <= 1;
      console.log(`  User #${uid}: ${pts}pts L${sys.level}${sys.level !== lvl ? '(should be L' + lvl + ')' : ''} | RETURN_FEE=${returnFees} ${ok ? '✓' : '✗'}`);
    }
  }

  console.log(`\n=== CLEANUP COMPLETE ===\n`);
  await prisma.$disconnect();
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
