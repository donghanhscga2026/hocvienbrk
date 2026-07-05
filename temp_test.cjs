const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Get #709's upline chain
  const upline709 = await prisma.$queryRaw`
    SELECT sc.depth, s."autoId", u.id as "userId", u.name, s.level, 
           CAST(s."totalPoints" AS VARCHAR) as "totalPoints"
    FROM system_closure sc
    JOIN system s ON s."autoId" = sc."ancestorId"
    JOIN "User" u ON u.id = s."userId"
    WHERE sc."descendantId" = 709 AND sc."systemId" = 4
    ORDER BY sc.depth
  `;
  console.log('=== UPLINE #709 (LÂM THỊ TÂM) ===');
  console.log(JSON.stringify(upline709, null, 2));

  // Check all level-up records to see who was promoted
  const lvUp = await prisma.$queryRaw`
    SELECT l.*, u.name FROM brk_level_up_record l
    JOIN "User" u ON u.id = l."userId"
    WHERE l."onSystem" = 4
    ORDER BY l."promotedAt"
  `;
  console.log('\n=== ALL LEVEL-UP RECORDS (with names) ===');
  console.log(JSON.stringify(lvUp, null, 2));

  // Check if ANY transaction happened AFTER 07:12 (level-up time)
  const lateTxns = await prisma.$queryRaw`
    SELECT t.*, w."userId", u.name
    FROM brk_transaction t
    JOIN brk_wallet w ON w.id = t."walletId"
    JOIN "User" u ON u.id = w."userId"
    WHERE t."createdAt" >= '2026-07-05T07:12:35Z' AND t."createdAt" < '2026-07-05T07:13:00Z'
    ORDER BY t."createdAt"
  `;
  console.log('\n=== TRANSACTIONS AFTER LEVEL-UP WINDOW ===');
  console.log(JSON.stringify(lateTxns, null, 2));
  
  await prisma.$disconnect();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
