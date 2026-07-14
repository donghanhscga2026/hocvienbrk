const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EXTRA_IDS = [
  {id:5672,walletId:17,amount:2418.12,type:"COMMISSION"},
  {id:5678,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5669,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5665,walletId:17,amount:1158182,type:"BRKD_CREDIT"},
  {id:5670,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5668,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5572,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5570,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5569,walletId:17,amount:1158182,type:"BRKD_CREDIT"},
  {id:5568,walletId:17,amount:2418.12,type:"COMMISSION"},
  {id:5581,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5579,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5617,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5616,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5615,walletId:12,amount:2316363,type:"BRKD_CREDIT"},
  {id:5614,walletId:12,amount:4836.24,type:"COMMISSION"},
  {id:5608,walletId:1,amount:2895454,type:"BRKD_CREDIT"},
  {id:5603,walletId:24,amount:1158182,type:"BRKD_CREDIT"},
  {id:5606,walletId:1,amount:6045.30,type:"COMMISSION"},
  {id:5602,walletId:24,amount:2418.12,type:"COMMISSION"},
  {id:5753,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5749,walletId:4,amount:2418.12,type:"COMMISSION"},
  {id:5750,walletId:4,amount:1158182,type:"BRKD_CREDIT"},
  {id:5751,walletId:8,amount:2418.12,type:"COMMISSION"},
  {id:5752,walletId:8,amount:1158182,type:"BRKD_CREDIT"},
  {id:5754,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5548,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5549,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5546,walletId:16,amount:2418.12,type:"COMMISSION"},
  {id:5553,walletId:16,amount:1158182,type:"BRKD_CREDIT"},
  {id:5667,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5662,walletId:35,amount:1158182,type:"BRKD_CREDIT"},
  {id:5658,walletId:35,amount:2418.12,type:"COMMISSION"},
  {id:5657,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5659,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5663,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5723,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5721,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5726,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5725,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5697,walletId:35,amount:1158182,type:"BRKD_CREDIT"},
  {id:5706,walletId:35,amount:1158182,type:"BRKD_CREDIT"},
  {id:5702,walletId:35,amount:2418.12,type:"COMMISSION"},
  {id:5696,walletId:35,amount:2418.12,type:"COMMISSION"},
  {id:5716,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5713,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5712,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5710,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5597,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5593,walletId:39,amount:2418.12,type:"COMMISSION"},
  {id:5595,walletId:39,amount:1158182,type:"BRKD_CREDIT"},
  {id:5596,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5598,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5599,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5646,walletId:1,amount:1737273,type:"BRKD_CREDIT"},
  {id:5624,walletId:37,amount:2418.12,type:"COMMISSION"},
  {id:5644,walletId:1,amount:3627.18,type:"COMMISSION"},
  {id:5639,walletId:12,amount:1158182,type:"BRKD_CREDIT"},
  {id:5637,walletId:12,amount:2418.12,type:"COMMISSION"},
  {id:5636,walletId:37,amount:1158182,type:"BRKD_CREDIT"},
];

(async () => {
  try {
    console.log("=== Phase 4: Clean duplicate COMMISSION + BRKD_CREDIT ===\n");

    // Aggregate by wallet: { walletId: { cash: 0, brkd: 0 } }
    const walletDebits = {};
    for (const item of EXTRA_IDS) {
      if (!walletDebits[item.walletId]) walletDebits[item.walletId] = { cash: 0, brkd: 0 };
      if (item.type === "COMMISSION") {
        walletDebits[item.walletId].cash += item.amount;
      } else {
        walletDebits[item.walletId].brkd += item.amount;
      }
    }

    console.log("Wallet debits to apply:");
    for (const [wId, debits] of Object.entries(walletDebits)) {
      console.log(`  Wallet ${wId}: cash -${debits.cash}, brkd -${debits.brkd}`);
    }

    // Step 1: Delete duplicate transactions
    const ids = EXTRA_IDS.map(i => i.id);
    const deleteResult = await prisma.brkTransaction.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(`\nDeleted ${deleteResult.count} duplicate transactions`);

    // Step 2: Debit wallets
    for (const [wId, debits] of Object.entries(walletDebits)) {
      const walletId = parseInt(wId);

      if (debits.cash > 0) {
        await prisma.brkWallet.update({
          where: { id: walletId },
          data: {
            balance: { decrement: debits.cash },
            totalEarned: { decrement: debits.cash },
          },
        });
        console.log(`  Wallet ${walletId}: debited ${debits.cash} from cash + totalEarned`);
      }

      if (debits.brkd > 0) {
        await prisma.brkWallet.update({
          where: { id: walletId },
          data: {
            brkd: { decrement: debits.brkd },
          },
        });
        console.log(`  Wallet ${walletId}: debited ${debits.brkd} from brkd`);
      }
    }

    // Step 3: Verify
    console.log("\n=== Verification ===");
    for (const wId of Object.keys(walletDebits)) {
      const wallet = await prisma.brkWallet.findUnique({
        where: { id: parseInt(wId) },
        select: { id: true, balance: true, brkd: true, totalEarned: true },
      });
      console.log(`  Wallet ${wallet.id}: cash=${wallet.balance} brkd=${wallet.brkd} earned=${wallet.totalEarned}`);
    }

    console.log("\nDone!");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
})();
