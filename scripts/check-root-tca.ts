import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== KIỂM TRA ROOT TCA VÀ HIERARCHY ===\n')

  // Kiểm tra TCA 60073
  const tca60073 = await prisma.tCAMember.findUnique({ where: { tcaId: 60073 } })
  console.log('TCA 60073:', tca60073)

  // Kiểm tra System của 60073
  if (tca60073?.userId) {
    const sys60073 = await prisma.system.findFirst({ where: { userId: tca60073.userId, onSystem: 1 } })
    console.log('System 60073:', sys60073)
  }

  // Kiểm tra TCA nào có parentTcaId = null (root)
  const rootTCAs = await prisma.tCAMember.findMany({ where: { parentTcaId: null } })
  console.log('\nTCAMembers có parentTcaId = null (root):', rootTCAs.length)
  for (const t of rootTCAs) {
    console.log(' - TCA', t.tcaId, t.name)
  }

  // Kiểm tra Systems của root TCA
  const rootUserIds = rootTCAs.map(t => t.userId).filter(id => id != null)
  const rootSystems = await prisma.system.findMany({
    where: { userId: { in: rootUserIds }, onSystem: 1 }
  })
  console.log('\nRoot Systems:')
  for (const s of rootSystems) {
    console.log(' - System', s.autoId, 'userId', s.userId, 'refSysId', s.refSysId)
  }

  // Kiểm tra closures của các root systems
  console.log('\nClosures của root systems:')
  for (const s of rootSystems) {
    const closures = await prisma.systemClosure.findMany({
      where: { descendantId: s.autoId }
    })
    console.log(` System ${s.autoId}:`, closures.map(c => `(${c.ancestorId}, depth=${c.depth})`).join(', '))
  }

  // Kiểm tra System có autoId = 1 (root system)
  const sys1 = await prisma.system.findUnique({ where: { autoId: 1 } })
  console.log('\nSystem autoId=1:', sys1)

  // Kiểm tra closures với ancestorId = 1
  const rootClosures = await prisma.systemClosure.findMany({
    where: { ancestorId: 1 },
    take: 10
  })
  console.log('\nClosures với ancestorId=1:', rootClosures.length)

  // Xem chi tiết closures của một vài TCA members
  console.log('\n=== CHI TIẾT CLOSURES CỦA 3 TCA ĐẦU ===')
  const tcaMembers = await prisma.tCAMember.findMany({
    take: 3,
    orderBy: { tcaId: 'asc' }
  })

  for (const tca of tcaMembers) {
    const sys = await prisma.system.findFirst({ where: { userId: tca.userId, onSystem: 1 } })
    if (sys) {
      const closures = await prisma.systemClosure.findMany({
        where: { descendantId: sys.autoId },
        orderBy: { depth: 'asc' }
      })
      console.log(`\nTCA ${tca.tcaId} ${tca.name} (System ${sys.autoId}):`)
      for (const c of closures) {
        // Tìm user của ancestor
        const ancSys = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
        const ancTCA = ancSys ? await prisma.tCAMember.findFirst({ where: { userId: ancSys.userId } }) : null
        console.log(`  -> Ancestor ${c.ancestorId} (${ancTCA?.name || 'unknown'}), depth=${c.depth}`)
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
