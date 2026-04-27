
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check885() {
  console.log('--- KIỂM TRA NODE #885 ---');
  
  const member = await prisma.tCAMember.findFirst({
    where: { userId: 885 },
    select: { userId: true, name: true, chuc_danh: true }
  });
  console.log('Database Data:', member);

  const systemRecord = await prisma.system.findFirst({
    where: { userId: 885, onSystem: 1 }
  });
  
  if (systemRecord) {
    const parent = await prisma.user.findUnique({
      where: { id: systemRecord.refSysId },
      select: { id: true, name: true }
    });
    console.log('Parent of 885:', parent);

    const closures = await prisma.systemClosure.findMany({
        where: { systemId: 1, ancestorId: systemRecord.autoId, depth: { gt: 0 } }
    });
    console.log('Sub-count of 885:', closures.length);
    
    const hasF2 = closures.some(c => c.depth === 1);
    const hasF3 = closures.some(c => c.depth === 2);
    console.log('Logic categorization:');
    console.log('- Has F2 (Direct Children):', hasF2);
    console.log('- Has F3 (Grandchildren):', hasF3);
    
    if (!hasF2) console.log('=> Phân vào Group A (Lá)');
    else if (!hasF3) console.log('=> Phân vào Group B (Cạn)');
    else console.log('=> Phân vào Group C (Sâu)');
  }
}

check885()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
