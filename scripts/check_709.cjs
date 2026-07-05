const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Get system tree info
  const tree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } });
  console.log('Fee:', Number(tree.fee), 'ReturnPct:', Number(tree.returnPct));
  
  // Check #709 current state
  const sys709 = await prisma.system.findUnique({ where: { userId_onSystem: { userId: 1075, onSystem: 4 } } });
  console.log('\n#709 system:', JSON.stringify(sys709, null, 2));
  
  // Check current levels of ancestors
  const upline = await prisma.$queryRaw`
    SELECT sc.depth, s."autoId", u.id as "userId", u.name, s.level, CAST(s."totalPoints" AS VARCHAR) as "totalPoints"
    FROM system_closure sc
    JOIN system s ON s."autoId" = sc."ancestorId"
    JOIN "User" u ON u.id = s."userId"
    WHERE sc."descendantId" = 709 AND sc."systemId" = 4 AND sc.depth > 0
    ORDER BY sc.depth
  `;
  console.log('\n#709 upline (current levels):');
  for (const u of upline) {
    console.log('  depth', u.depth, '-', u.name.trim(), '(Lv' + u.level + ')');
  }
  
  // Check if #709 already has commission transactions
  const wallet = await prisma.brkWallet.findUnique({ where: { userId: 1075 } });
  const txns = await prisma.brkTransaction.findMany({ where: { walletId: wallet.id } });
  console.log('\n#709 transactions:', txns.length);
  console.log(JSON.stringify(txns, null, 2));
  
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
