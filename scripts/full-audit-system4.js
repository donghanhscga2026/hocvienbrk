/**
 * COMPREHENSIVE DATABASE AUDIT — System #4 (BRK)
 * 
 * Checks:
 *   A. Duplicate RETURN_FEE transactions
 *   B. Wallet balance integrity (CASH/BRKD/VOUCHER)
 *   C. Points integrity (totalPoints vs descendants)
 *   D. Level integrity (level vs points threshold)
 *   E. Commission duplicates (same ancestor, same refId)
 *   F. Voucher duplicates (same wallet, same type, same refId)
 * 
 * Run: node scripts/full-audit-system4.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SYSTEM_ID = 4;
const PTS_PER_ACTIVATION = 17;

function hr(label) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(70)}`);
}

function sub(label) {
  console.log(`\n  ── ${label} ──`);
}

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════════════════════════╗`);
  console.log(`║          COMPREHENSIVE DATABASE AUDIT — SYSTEM #4 (BRK)            ║`);
  console.log(`║          Started: ${new Date().toISOString()}                   ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════╝`);

  // ── Preload data ──
  const levelConfigs = await prisma.brkLevelConfig.findMany({
    where: { systemId: SYSTEM_ID },
    orderBy: { level: 'asc' },
  });

  const allSystems = await prisma.system.findMany({
    where: { onSystem: SYSTEM_ID },
    select: {
      autoId: true,
      userId: true,
      totalPoints: true,
      level: true,
      status: true,
      activatedAt: true,
    },
  });

  const systemByUserId = new Map(allSystems.map(s => [s.userId, s]));

  const allWallets = await prisma.brkWallet.findMany({
    where: { userId: { in: allSystems.map(s => s.userId) } },
    include: { transactions: { orderBy: { createdAt: 'asc' } } },
  });

  const walletByUserId = new Map(allWallets.map(w => [w.userId, w]));

  console.log(`  Users on System #4: ${allSystems.length}`);
  console.log(`  Wallets found: ${allWallets.length}`);
  console.log(`  Level configs: ${levelConfigs.map(c => `L${c.level}=${c.pointsRequired}pts`).join(', ')}`);

  let totalIssues = 0;

  // ══════════════════════════════════════════════════════════════════════
  // A. DUPLICATE RETURN_FEE
  // ══════════════════════════════════════════════════════════════════════
  hr('A. DUPLICATE RETURN_FEE TRANSACTIONS');
  {
    let usersWithDup = 0;
    let totalExtraReturnFees = 0;

    for (const sys of allSystems) {
      const wallet = walletByUserId.get(sys.userId);
      if (!wallet) continue;

      const returnFees = wallet.transactions.filter(t => t.type === 'RETURN_FEE');
      if (returnFees.length > 1) {
        usersWithDup++;
        totalExtraReturnFees += returnFees.length - 1;
        sub(`User #${sys.userId} — ${returnFees.length} RETURN_FEE transactions`);
        for (const t of returnFees) {
          console.log(`    id=${t.id}  amount=${t.amount}  balanceType=${t.balanceType}  refId=${t.refId}  created=${t.createdAt.toISOString()}`);
        }
      }
    }

    if (usersWithDup === 0) {
      console.log(`  ✅ No duplicate RETURN_FEE found. All users have ≤ 1 RETURN_FEE.`);
    } else {
      console.log(`\n  ⚠️  ${usersWithDup} users with duplicate RETURN_FEE (${totalExtraReturnFees} extra transactions)`);
    }
    totalIssues += usersWithDup;
  }

  // ══════════════════════════════════════════════════════════════════════
  // B. WALLET BALANCE INTEGRITY
  // ══════════════════════════════════════════════════════════════════════
  hr('B. WALLET BALANCE INTEGRITY');
  {
    let cashMismatches = 0;
    let brkdMismatches = 0;
    let voucherMismatches = 0;

    for (const wallet of allWallets) {
      const txns = wallet.transactions;

      // Expected CASH balance = sum of all CASH transactions (amounts are signed)
      const expectedCash = txns
        .filter(t => t.balanceType === 'CASH')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Expected BRKD balance = sum of all BRKD transactions
      const expectedBrkd = txns
        .filter(t => t.balanceType === 'BRKD')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Expected VOUCHER balance = sum of all VOUCHER transactions
      const expectedVoucher = txns
        .filter(t => t.balanceType === 'VOUCHER')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const actualCash = Number(wallet.balance);
      const actualBrkd = Number(wallet.brkd);
      const actualVoucher = Number(wallet.voucherBalance);

      const cashDiff = Math.abs(actualCash - expectedCash);
      const brkdDiff = Math.abs(actualBrkd - expectedBrkd);
      const voucherDiff = Math.abs(actualVoucher - expectedVoucher);

      const tolerance = 0.01;

      if (cashDiff > tolerance) {
        cashMismatches++;
        console.log(`  ❌ User #${wallet.userId} CASH: actual=${actualCash.toFixed(2)}  expected=${expectedCash.toFixed(2)}  diff=${(actualCash - expectedCash).toFixed(2)}`);
      }

      if (brkdDiff > tolerance) {
        brkdMismatches++;
        console.log(`  ❌ User #${wallet.userId} BRKD: actual=${actualBrkd.toFixed(2)}  expected=${expectedBrkd.toFixed(2)}  diff=${(actualBrkd - expectedBrkd).toFixed(2)}`);
      }

      if (voucherDiff > tolerance) {
        voucherMismatches++;
        console.log(`  ❌ User #${wallet.userId} VOUCHER: actual=${actualVoucher.toFixed(2)}  expected=${expectedVoucher.toFixed(2)}  diff=${(actualVoucher - expectedVoucher).toFixed(2)}`);
      }
    }

    if (cashMismatches === 0 && brkdMismatches === 0 && voucherMismatches === 0) {
      console.log(`  ✅ All ${allWallets.length} wallet balances match transaction sums.`);
    } else {
      console.log(`\n  ⚠️  CASH mismatches: ${cashMismatches}  |  BRKD mismatches: ${brkdMismatches}  |  VOUCHER mismatches: ${voucherMismatches}`);
    }
    totalIssues += cashMismatches + brkdMismatches + voucherMismatches;
  }

  // ══════════════════════════════════════════════════════════════════════
  // C. POINTS INTEGRITY
  // ══════════════════════════════════════════════════════════════════════
  hr('C. POINTS INTEGRITY (totalPoints vs activated descendants)');
  {
    let pointsMismatches = 0;

    for (const sys of allSystems) {
      const wallet = walletByUserId.get(sys.userId);

      // Count activated descendants in system 4 via SystemClosure
      const descendantCount = await prisma.systemClosure.count({
        where: {
          ancestorId: sys.autoId,
          depth: { gte: 1 },
          systemId: SYSTEM_ID,
        },
      });

      // Self gets +17 if they have at least one RETURN_FEE transaction (i.e., activated)
      const hasReturnFee = wallet
        ? wallet.transactions.some(t => t.type === 'RETURN_FEE')
        : false;
      const selfPts = hasReturnFee ? PTS_PER_ACTIVATION : 0;

      const expectedPoints = descendantCount * PTS_PER_ACTIVATION + selfPts;
      const actualPoints = Number(sys.totalPoints);

      if (Math.abs(actualPoints - expectedPoints) > 0.01) {
        pointsMismatches++;
        console.log(`  ❌ User #${sys.userId}: actual=${actualPoints}  expected=${expectedPoints}  diff=${(actualPoints - expectedPoints).toFixed(0)}  (descendants=${descendantCount} selfPts=${selfPts})`);
      }
    }

    if (pointsMismatches === 0) {
      console.log(`  ✅ All ${allSystems.length} users have correct totalPoints.`);
    } else {
      console.log(`\n  ⚠️  ${pointsMismatches} users with incorrect totalPoints.`);
    }
    totalIssues += pointsMismatches;
  }

  // ══════════════════════════════════════════════════════════════════════
  // D. LEVEL INTEGRITY
  // ══════════════════════════════════════════════════════════════════════
  hr('D. LEVEL INTEGRITY (level vs points config)');
  {
    let levelMismatches = 0;

    if (levelConfigs.length === 0) {
      console.log(`  ⚠️  No BrkLevelConfig found for System #4! Cannot verify levels.`);
    } else {
      function getExpectedLevel(points) {
        let lvl = 1;
        for (const cfg of levelConfigs) {
          if (points >= Number(cfg.pointsRequired)) {
            lvl = cfg.level;
          }
        }
        return lvl;
      }

      for (const sys of allSystems) {
        const actualPts = Number(sys.totalPoints);
        const expectedLevel = getExpectedLevel(actualPts);

        if (sys.level !== expectedLevel) {
          levelMismatches++;
          console.log(`  ❌ User #${sys.userId}: level=${sys.level}  expected=${expectedLevel}  points=${actualPts}`);
        }
      }

      if (levelMismatches === 0) {
        console.log(`  ✅ All ${allSystems.length} users have correct levels.`);
      } else {
        console.log(`\n  ⚠️  ${levelMismatches} users with incorrect levels.`);
      }
    }
    totalIssues += levelMismatches;
  }

  // ══════════════════════════════════════════════════════════════════════
  // E. COMMISSION DUPLICATES
  // ══════════════════════════════════════════════════════════════════════
  hr('E. COMMISSION DUPLICATES (same ancestor + same refId)');
  {
    let ancestorDupCount = 0;
    let totalExtraCommissions = 0;

    for (const wallet of allWallets) {
      const commissions = wallet.transactions.filter(t => t.type === 'COMMISSION' && t.refId);
      if (commissions.length < 2) continue;

      // Group by refId
      const byRefId = {};
      for (const t of commissions) {
        const key = t.refId;
        if (!byRefId[key]) byRefId[key] = [];
        byRefId[key].push(t);
      }

      for (const [refId, txns] of Object.entries(byRefId)) {
        if (txns.length > 1) {
          ancestorDupCount++;
          totalExtraCommissions += txns.length - 1;
          sub(`User #${wallet.userId} — ${txns.length} COMMISSION with refId="${refId}"`);
          for (const t of txns) {
            console.log(`    id=${t.id}  amount=${t.amount}  balanceType=${t.balanceType}  created=${t.createdAt.toISOString()}`);
          }
        }
      }
    }

    if (ancestorDupCount === 0) {
      console.log(`  ✅ No duplicate COMMISSION transactions found.`);
    } else {
      console.log(`\n  ⚠️  ${ancestorDupCount} duplicate commission groups (${totalExtraCommissions} extra transactions)`);
    }
    totalIssues += ancestorDupCount;
  }

  // ══════════════════════════════════════════════════════════════════════
  // F. VOUCHER DUPLICATES
  // ══════════════════════════════════════════════════════════════════════
  hr('F. VOUCHER DUPLICATES (same walletId + type + refId)');
  {
    let voucherDupCount = 0;
    let totalExtraVouchers = 0;

    for (const wallet of allWallets) {
      const vouchers = wallet.transactions.filter(t => t.type === 'VOUCHER_CREDIT' && t.refId);
      if (vouchers.length < 2) continue;

      // Group by refId
      const byRefId = {};
      for (const t of vouchers) {
        const key = t.refId;
        if (!byRefId[key]) byRefId[key] = [];
        byRefId[key].push(t);
      }

      for (const [refId, txns] of Object.entries(byRefId)) {
        if (txns.length > 1) {
          voucherDupCount++;
          totalExtraVouchers += txns.length - 1;
          sub(`User #${wallet.userId} — ${txns.length} VOUCHER_CREDIT with refId="${refId}"`);
          for (const t of txns) {
            console.log(`    id=${t.id}  amount=${t.amount}  balanceType=${t.balanceType}  created=${t.createdAt.toISOString()}`);
          }
        }
      }
    }

    if (voucherDupCount === 0) {
      console.log(`  ✅ No duplicate VOUCHER_CREDIT transactions found.`);
    } else {
      console.log(`\n  ⚠️  ${voucherDupCount} duplicate voucher groups (${totalExtraVouchers} extra transactions)`);
    }
    totalIssues += voucherDupCount;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════════
  hr('AUDIT SUMMARY');
  console.log(`  Completed: ${new Date().toISOString()}`);
  console.log(`  System: #${SYSTEM_ID}`);
  console.log(`  Total users: ${allSystems.length}`);
  console.log(`  Total wallets: ${allWallets.length}`);
  console.log(`  Total issues found: ${totalIssues}`);
  if (totalIssues === 0) {
    console.log(`  ✅ DATABASE IS CLEAN — no anomalies detected.`);
  } else {
    console.log(`  ⚠️  ISSUES DETECTED — review details above.`);
  }
  console.log('');
}

main()
  .catch(e => { console.error('FATAL ERROR:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
