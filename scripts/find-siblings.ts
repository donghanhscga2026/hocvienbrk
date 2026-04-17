import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function test() {
  console.log('=== TCAMembers với parentTcaId = 60073 ===\n')
  
  const siblings = await prisma.tCAMember.findMany({
    where: { parentTcaId: 60073 },
    orderBy: { tcaId: 'asc' }
  })
  
  console.log(`Tìm thấy ${siblings.length} siblings:`)
  for (const s of siblings) {
    const user = await prisma.user.findUnique({
      where: { id: s.userId },
      select: { id: true, name: true, referrerId: true }
    })
    console.log(`  TCA ${s.tcaId}: User ${user?.id} - ${user?.name} - referrerId=${user?.referrerId}`)
  }
  
  // Kiểm tra xem có sibling nào có referrerId = 327 không
  console.log('\n=== Kiểm tra User có referrerId = 327 ===')
  
  const users327 = await prisma.user.findMany({
    where: { referrerId: 327 }
  })
  
  console.log(`Users có referrerId = 327: ${users327.length}`)
  for (const u of users327) {
    console.log(`  User ${u.id}: ${u.name}`)
  }
  
  await prisma.$disconnect()
}

test().catch(console.error)
