import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function debug() {
  console.log('=== Debug Sibling Closure ===\n')
  
  // TCA 61789 - sibling trong folder 60073
  const sibling = await prisma.tCAMember.findUnique({ where: { tcaId: 61789 } })
  console.log('Sibling TCA 61789:')
  console.log('  userId:', sibling?.userId)
  
  // System của sibling
  const siblingSystem = await prisma.system.findFirst({ where: { userId: sibling?.userId, onSystem: 1 } })
  console.log('\nSibling System:')
  console.log('  autoId:', siblingSystem?.autoId)
  console.log('  userId:', siblingSystem?.userId)
  console.log('  refSysId:', siblingSystem?.refSysId)
  
  // Closure của sibling
  const closures = await prisma.systemClosure.findMany({ 
    where: { descendantId: siblingSystem?.autoId } 
  })
  console.log('\nClosures for System', siblingSystem?.autoId, ':')
  if (closures.length === 0) {
    console.log('  No closures found!')
  } else {
    closures.forEach(c => console.log('  ancestor=', c.ancestorId, 'depth=', c.depth))
  }
  
  // Tìm System 13809
  console.log('\nSystem 13809:')
  const sys13809 = await prisma.system.findUnique({ where: { autoId: 13809 } })
  console.log(sys13809)
  
  // User 327
  console.log('\nUser 327:')
  const user327 = await prisma.user.findUnique({ where: { id: 327 } })
  console.log({ id: user327?.id, name: user327?.name, referrerId: user327?.referrerId })
  
  await prisma.$disconnect()
}

debug().catch(console.error)
