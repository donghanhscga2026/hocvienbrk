const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Backup current BrkTransaction + BrkWallet for system 4 members
  const memberIds = await prisma.$queryRaw`SELECT "userId" FROM system WHERE "onSystem" = 4 AND status = 'ACTIVE'`;
  const ids = memberIds.map(r => r.userId);
  console.log('Member count:', ids.length);
  
  // Export current wallets
  const wallets = await prisma.brkWallet.findMany({ where: { userId: { in: ids } } });
  console.log('WALLETS_BACKUP:');
  console.log(JSON.stringify(wallets, null, 2));
  
  // Export current transactions
  const txns = await prisma.brkTransaction.findMany({
    where: { wallet: { userId: { in: ids } } },
    orderBy: { createdAt: 'asc' }
  });
  console.log('TRANSACTIONS_BACKUP:');
  console.log(JSON.stringify(txns, null, 2));
  
  await prisma.$disconnect();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
