import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function findTheTruth() {
  const ids = [327, 873, 885, 872, 886]
  console.log('=== DEEP INSPECTION: USER vs TCA MEMBER ===')

  for (const id of ids) {
    const user = await prisma.user.findUnique({ where: { id } })
    const systemRecord = await prisma.system.findFirst({ where: { userId: id, onSystem: 1 } })
    
    // Tìm tất cả các bản ghi trong TCAMember có liên quan đến ID này
    const tcaRecords = await (prisma as any).tCAMember.findMany({
      where: {
        OR: [
          { userId: id },
          { tcaId: id },
          { name: user?.name }
        ]
      }
    })

    console.log(`\nNode #${id} (${user?.name}):`)
    console.log(`- System autoId: ${systemRecord?.autoId}`)
    console.log(`- TCAMember matches found: ${tcaRecords.length}`)
    tcaRecords.forEach((r: any, index: number) => {
      console.log(`  [Match ${index + 1}] userId: ${r.userId}, tcaId: ${r.tcaId}, level: ${r.level}, name: ${r.name}`)
    })
  }
  await prisma.$disconnect()
}

findTheTruth()
