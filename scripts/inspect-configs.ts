import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function run() {
  const configs = await prisma.brkLevelConfig.findMany({
    where: { systemId: 4 },
    orderBy: { level: 'asc' },
    include: { branchReqs: true }
  })
  console.log('Level Configs for System 4:')
  for (const c of configs) {
    console.log(`Level ${c.level}: pointsRequired=${c.pointsRequired}, giftValue=${c.giftValue}, branchReqs=`, c.branchReqs)
  }
}
run().finally(() => prisma.$disconnect())
