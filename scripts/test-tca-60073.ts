import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function test() {
  console.log('=== Kiểm tra TCA 60073 ===\n')
  
  // TCA 60073
  const tcaMember = await prisma.tCAMember.findUnique({
    where: { tcaId: 60073 }
  })
  console.log('TCAMember for TCA 60073:', tcaMember)
  
  if (tcaMember) {
    console.log('User ID của TCA 60073:', tcaMember.userId)
  }
  
  // System với userId 327 (parent TCA 60073)
  const system = await prisma.system.findFirst({
    where: { userId: 327, onSystem: 1 },
    include: { user: { select: { id: true, name: true, referrerId: true } } }
  })
  console.log('\nSystem for User 327:', system)
  
  // Tất cả TCAMember
  const allTCAMembers = await prisma.tCAMember.findMany({
    take: 20
  })
  console.log('\nTất cả TCAMembers count:', await prisma.tCAMember.count())
  console.log('Mẫu TCAMembers:', allTCAMembers.slice(0, 5))
  
  await prisma.$disconnect()
}

test().catch(console.error)
