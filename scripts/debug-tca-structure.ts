import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function debug() {
  // TCA 60073 - parent folder
  // TCA 61789 - child của 60073
  // TCA 61451 - child khác của 60073
  
  const tcas = await prisma.tCAMember.findMany({
    where: { tcaId: { in: [60073, 61789, 61451, 61752, 61753] } },
    orderBy: { tcaId: 'asc' }
  })
  
  console.log('TCAMembers:')
  for (const t of tcas) {
    console.log(`  TCA ${t.tcaId}: User ${t.userId}, parentTcaId=${t.parentTcaId}`)
  }
  
  // Tìm User 327
  const user327 = await prisma.user.findUnique({ where: { id: 327 } })
  console.log('\nUser 327:', { id: user327?.id, name: user327?.name })
  
  // Tìm xem User 327 có TCA nào
  const tcaOf327 = await prisma.tCAMember.findFirst({
    where: { userId: 327 }
  })
  console.log('\nTCA of User 327:', tcaOf327)
  
  await prisma.$disconnect()
}

debug().catch(console.error)
