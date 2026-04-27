import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  console.log('=== KIỂM TRA XEM 874, 878 CÓ TRONG CÂY KHÔNG ===\n')

  // Lấy tất cả System records có onSystem = 1
  const allSystems = await (prisma as any).system.findMany({
    where: { onSystem: 1 },
    select: { autoId: true, userId: true, refSysId: true }
  })
  
  const allUserIds = new Set<number>()
  for (const s of allSystems) {
    allUserIds.add(s.userId)
  }
  
  console.log('All TCA userIds:', Array.from(allUserIds).sort((a, b) => a - b))
  console.log('\n874 in allUserIds:', allUserIds.has(874))
  console.log('878 in allUserIds:', allUserIds.has(878))
  
  // Query TCAMember với allUserIds
  console.log('\n--- Query TCAMember ---')
  const tcaMembers = await (prisma as any).tCAMember.findMany({
    where: { 
      OR: [
        { userId: { in: Array.from(allUserIds) } },
        { tcaId: { in: Array.from(allUserIds) } }
      ]
    },
    select: { userId: true, tcaId: true, name: true, groupName: true }
  })
  
  console.log('\nTCAMember records found:', tcaMembers.length)
  console.log(JSON.stringify(tcaMembers, null, 2))
  
  // Check specifically for 874, 878
  const member874 = tcaMembers.find(m => m.userId === 874)
  const member878 = tcaMembers.find(m => m.userId === 878)
  
  console.log('\n--- Specific check ---')
  console.log('Member 874:', member874)
  console.log('Member 878:', member878)

  await prisma.$disconnect()
}

checkData().catch(console.error)