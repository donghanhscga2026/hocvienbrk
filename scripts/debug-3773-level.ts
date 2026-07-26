import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 3773
  const systemId = 4

  const systemRecord = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem: systemId } }
  })
  
  const f1s = await prisma.system.findMany({
    where: { refSysId: userId, onSystem: systemId },
    select: { userId: true, level: true, totalPoints: true }
  })

  const closures = await prisma.systemClosure.findMany({
    where: { ancestorId: systemRecord?.autoId, systemId },
    include: { descendant: true }
  })

  const levelConfigs = await prisma.brkLevelConfig?.findMany({
    where: { systemId },
    orderBy: { level: 'asc' }
  })

  console.log('=== ROOT USER 3773 SYSTEM RECORD ===')
  console.log(JSON.stringify(systemRecord, null, 2))

  console.log('\n=== F1 MEMBERS ===')
  console.log(JSON.stringify(f1s, null, 2))

  console.log('\n=== ALL DESCENDANTS COUNT ===')
  console.log(closures.length)

  console.log('\n=== LEVEL CONFIGS FOR SYSTEM 4 ===')
  console.log(JSON.stringify(levelConfigs, null, 2))
}

main().finally(() => prisma.$disconnect())
