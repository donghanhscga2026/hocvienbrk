const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    // Find all COMMISSION and BRKD_CREDIT transactions with refId
    const all = await prisma.$queryRaw`
      SELECT id, "walletId", type, amount, "refId", "createdAt"
      FROM brk_transaction
      WHERE type IN ('COMMISSION', 'BRKD_CREDIT')
      AND "refId" IS NOT NULL
      ORDER BY "refId", "createdAt"
    `;

    // Group by type + refId + walletId (same wallet, same ref = true duplicate)
    const grouped = {};
    for (const row of all) {
      const key = row.type + "::" + row.refId + "::" + row.walletId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    const dups = Object.entries(grouped).filter(([k, v]) => v.length > 1);

    console.log("Total records:", all.length);
    console.log("Groups with duplicates:", dups.length);

    let totalExtraCommission = 0;
    let totalExtraBrkd = 0;
    const affectedWallets = new Map();
    const extraIds = [];

    for (const [key, records] of dups) {
      const extras = records.slice(1); // keep first, remove rest
      console.log(`\n${key}: ${records.length} records`);
      console.log(`  Keep: ${records[0].id} amount=${records[0].amount}`);
      for (const extra of extras) {
        console.log(`  Remove: ${extra.id} amount=${extra.amount}`);
        const amt = parseFloat(String(extra.amount));
        if (records[0].type === "COMMISSION") {
          totalExtraCommission += amt;
        } else {
          totalExtraBrkd += amt;
        }
        affectedWallets.set(String(extra.walletId), extra.walletId);
        extraIds.push({ id: extra.id, type: records[0].type, walletId: extra.walletId, amount: amt });
      }
    }

    console.log("\n=== SUMMARY ===");
    console.log("Extra COMMISSION to debit:", totalExtraCommission.toFixed(2));
    console.log("Extra BRKD_CREDIT to debit:", totalExtraBrkd.toFixed(2));
    console.log("Total extra records to delete:", extraIds.length);
    console.log("Affected wallets:", affectedWallets.size);

    // Check wallet balances
    for (const [wId, bigintId] of affectedWallets) {
      const wallet = await prisma.brkWallet.findUnique({
        where: { id: bigintId },
        select: { id: true, balance: true, brkd: true, voucherBalance: true, userId: true },
      });
      if (wallet) {
        console.log(
          `  Wallet ${wId}: balance=${wallet.balance} type=${wallet.type}`
        );
      }
    }

    // Export extraIds for cleanup script
    console.log("\n=== EXTRA_IDS_FOR_CLEANUP ===");
    console.log(JSON.stringify(extraIds));
  } finally {
    await prisma.$disconnect();
  }
})();
