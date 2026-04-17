import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function test() {
  // TCA 61297
  const tca61297 = await prisma.tCAMember.findUnique({ where: { tcaId: 61297 } })
  console.log('TCA 61297:', tca61297)
  
  // TCA 61752 (Thanh Vân)
  const tca61752 = await prisma.tCAMember.findUnique({ where: { tcaId: 61752 } })
  console.log('\nTCA 61752:', tca61752)
  
  // User 3773
  const user3773 = await prisma.user.findUnique({ where: { id: 3773 } })
  console.log('\nUser 3773:', { id: user3773?.id, name: user3773?.name, referrerId: user3773?.referrerId })
  
  // User 866 (Thanh Vân)
  const user866 = await prisma.user.findUnique({ where: { id: 866 } })
  console.log('\nUser 866 (Thanh Vân):', { id: user866?.id, name: user866?.name, referrerId: user866?.referrerId })
  
  await prisma.$disconnect()
}

test().catch(console.error)
