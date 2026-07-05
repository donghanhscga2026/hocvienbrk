const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const members = await prisma.$queryRaw`SELECT "userId" FROM system WHERE "onSystem" = 4 AND status = 'ACTIVE'`;
  const userIds = members.map(m => m.userId);
  
  const wallets = await prisma.brkWallet.findMany({ where: { userId: { in: userIds } } });
  for (const w of wallets) {
    const user = await prisma.user.findUnique({ where: { id: w.userId }, select: { name: true } });
    console.log(
      '#' + String(w.userId).padEnd(5) +
      ' ' + String(user?.name || '').trim().padEnd(25) +
      ' | Cash: ' + String(w.balance).padStart(10) +
      ' | BRKD: ' + String(w.brkd).padStart(12) +
      ' | Voucher: ' + String(w.voucherBalance).padStart(10) +
      ' | Earned: ' + String(w.totalEarned).padStart(10)
    );
  }

  const txnCount = await prisma.brkTransaction.count({
    where: { wallet: { userId: { in: userIds } } }
  });
  console.log('\nTổng giao dịch:', txnCount);
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
