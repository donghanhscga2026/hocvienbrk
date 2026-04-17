import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function test() {
  // TCA 61451
  const tca61451 = await prisma.tCAMember.findUnique({ where: { tcaId: 61451 } })
  console.log('TCA 61451:')
  console.log('  tcaId:', tca61451?.tcaId)
  console.log('  userId:', tca61451?.userId)
  console.log('  parentTcaId:', tca61451?.parentTcaId)
  
  // User 864
  const user864 = await prisma.user.findUnique({ where: { id: 864 } })
  console.log('\nUser 864:')
  console.log('  id:', user864?.id)
  console.log('  name:', user864?.name)
  console.log('  referrerId:', user864?.referrerId)
  
  // Tất cả TCAMembers có parentTcaId = 60073
  const all60073 = await prisma.tCAMember.findMany({
    where: { parentTcaId: 60073 },
    orderBy: { tcaId: 'asc' }
  })
  console.log('\nTất cả TCA với parentTcaId = 60073:', all60073.length)
  for (const t of all60073) {
    console.log(`  TCA ${t.tcaId}: User ${t.userId}`)
  }
  
  // Tất cả TCAMembers trong DB
  const allTCAs = await prisma.tCAMember.findMany({
    orderBy: { tcaId: 'asc' }
  })
  console.log('\nTất cả TCAMembers trong DB:', allTCAs.length)
  for (const t of allTCAs) {
    console.log(`  TCA ${t.tcaId}: User ${t.userId}, parentTcaId=${t.parentTcaId}`)
  }
  
  await prisma.$disconnect()
}

test().catch(console.error)
