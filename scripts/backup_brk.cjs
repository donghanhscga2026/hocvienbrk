const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
async function main() {
  const memberIds = await prisma.$queryRaw`SELECT "userId" FROM system WHERE "onSystem" = 4 AND status = 'ACTIVE'`;
  const ids = memberIds.map(r => r.userId);
  
  const wallets = await prisma.brkWallet.findMany({ where: { userId: { in: ids } } });
  const txns = await prisma.brkTransaction.findMany({
    where: { wallet: { userId: { in: ids } } },
    orderBy: { createdAt: 'asc' }
  });
  
  const backup = { wallets, transactions: txns, backedUpAt: new Date().toISOString() };
  fs.writeFileSync('plan_temp/brk_backup_20260705.json', JSON.stringify(backup, null, 2));
  console.log('Backup OK - wallets:', wallets.length, 'txns:', txns.length);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
