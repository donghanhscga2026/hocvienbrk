import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function test() {
  console.log('=== Kiểm tra Parent Relationship ===\n')
  
  // TCA 61789 - child của folder 60073
  const child = await prisma.tCAMember.findUnique({ where: { tcaId: 61789 } })
  console.log('TCA 61789 (child):')
  console.log('  tcaId:', child?.tcaId)
  console.log('  userId:', child?.userId)
  console.log('  parentTcaId:', child?.parentTcaId)
  
  // User 8291 - user của TCA 61789
  const childUser = await prisma.user.findUnique({ where: { id: 8291 } })
  console.log('\nUser 8291:')
  console.log('  id:', childUser?.id)
  console.log('  name:', childUser?.name)
  console.log('  referrerId:', childUser?.referrerId)
  
  // System 13880 - system của User 8291
  const childSystem = await prisma.system.findUnique({ where: { autoId: 13880 } })
  console.log('\nSystem 13880:')
  console.log('  autoId:', childSystem?.autoId)
  console.log('  userId:', childSystem?.userId)
  console.log('  refSysId:', childSystem?.refSysId)
  
  // System 13809 - parent system (refSysId của child)
  const parentSystem = await prisma.system.findUnique({ where: { autoId: 13809 } })
  console.log('\nSystem 13809 (parent):')
  console.log('  autoId:', parentSystem?.autoId)
  console.log('  userId:', parentSystem?.userId)
  console.log('  refSysId:', parentSystem?.refSysId)
  
  // User 327 - user của parent system
  const parentUser = await prisma.user.findUnique({ where: { id: 327 } })
  console.log('\nUser 327 (parent):')
  console.log('  id:', parentUser?.id)
  console.log('  name:', parentUser?.name)
  console.log('  referrerId:', parentUser?.referrerId)
  
  // System 13807 - parent của parent system
  const grandparentSystem = await prisma.system.findUnique({ where: { autoId: 13807 } })
  console.log('\nSystem 13807 (grandparent):')
  console.log('  autoId:', grandparentSystem?.autoId)
  console.log('  userId:', grandparentSystem?.userId)
  console.log('  refSysId:', grandparentSystem?.refSysId)
  
  // User 330 - user của grandparent
  const grandparentUser = await prisma.user.findUnique({ where: { id: 330 } })
  console.log('\nUser 330 (grandparent):')
  console.log('  id:', grandparentUser?.id)
  console.log('  name:', grandparentUser?.name)
  console.log('  referrerId:', grandparentUser?.referrerId)
  
  await prisma.$disconnect()
}

test().catch(console.error)
