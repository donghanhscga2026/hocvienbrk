import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function test() {
  const tca60073 = await prisma.tCAMember.findUnique({ where: { tcaId: 60073 } })
  console.log('TCAMember for TCA 60073:', tca60073)
  
  // Tìm tất cả TCAMember
  const all = await prisma.tCAMember.findMany({ take: 20 })
  console.log('\nAll TCAMembers:')
  all.forEach(t => console.log(`  TCA ${t.tcaId}: User ${t.userId}, name: ${t.name.substring(0, 30)}`))
  
  await prisma.$disconnect()
}

test().catch(console.error)
