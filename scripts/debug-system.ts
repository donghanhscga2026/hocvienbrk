import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function debug() {
  console.log('=== Debug System Structure ===\n')
  
  // Systems gần 13880
  const systems = await prisma.system.findMany({
    where: { 
      onSystem: 1,
      autoId: { gte: 13875, lte: 13890 }
    },
    orderBy: { autoId: 'asc' }
  })
  
  console.log('Systems 13875-13890:')
  for (const s of systems) {
    console.log(`  System ${s.autoId}: User ${s.userId}, refSysId=${s.refSysId}`)
  }
  
  // Systems có refSysId = 13880
  const refTo13880 = await prisma.system.findMany({
    where: { refSysId: 13880, onSystem: 1 }
  })
  console.log('\nSystems with refSysId = 13880:', refTo13880)
  
  // Systems có refSysId = 13879
  const refTo13879 = await prisma.system.findMany({
    where: { refSysId: 13879, onSystem: 1 }
  })
  console.log('Systems with refSysId = 13879:', refTo13879)
  
  // Closure của 13880
  console.log('\nClosures for 13880:')
  const closures = await prisma.systemClosure.findMany({ 
    where: { descendantId: 13880 },
    orderBy: { depth: 'asc' }
  })
  if (closures.length === 0) {
    console.log('  (none)')
  } else {
    closures.forEach(c => console.log(`  depth ${c.depth} -> ancestor ${c.ancestorId}`))
  }
  
  // Closure của 13809
  console.log('\nClosures for 13809:')
  const closures2 = await prisma.systemClosure.findMany({ 
    where: { descendantId: 13809 },
    orderBy: { depth: 'asc' }
  })
  if (closures2.length === 0) {
    console.log('  (none)')
  } else {
    closures2.forEach(c => console.log(`  depth ${c.depth} -> ancestor ${c.ancestorId}`))
  }
  
  await prisma.$disconnect()
}

debug().catch(console.error)
