import { rebuildSystem4Data } from '../lib/brk/rebuild-service';
import prisma from '../lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  const method = args[0]?.toUpperCase();

  if (method !== 'A' && method !== 'B') {
    console.error("❌ Invalid method! Please run: npx ts-node scripts/rebuild-system.ts <A|B>");
    process.exit(1);
  }

  console.log(`\n=================== REBUILD SYSTEM 4 ===================`);
  console.log(`Method selected: ${method}`);

  await rebuildSystem4Data(method as 'A' | 'B');

  const total = await prisma.system.count({ where: { onSystem: 4 } });
  const levels = await prisma.brkLevelUpRecord.count({ where: { onSystem: 4 } });
  console.log(`\n=================== REBUILD COMPLETE ===================`);
  console.log(`System 4 active members: ${total}`);
  console.log(`Level promotion records created: ${levels}`);
  console.log(`Promotion logic saved: ${method}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
