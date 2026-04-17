import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== KIỂM TRA SYSTEM 13807 VÀ USER ===\n')

  // System 13807 thuộc user nào?
  const sys13807 = await prisma.system.findUnique({ where: { autoId: 13807 } })
  console.log('System 13807:', sys13807)

  // User của system 13807
  if (sys13807) {
    const user = await prisma.user.findUnique({ where: { id: sys13807.userId } })
    console.log('\nUser of System 13807:', user)

    // TCA của user đó
    const tca = await prisma.tCAMember.findFirst({ where: { userId: sys13807.userId } })
    console.log('TCA of that user:', tca)
  }

  // Tất cả closures với ancestorId = 13807
  const closures13807 = await prisma.systemClosure.findMany({
    where: { ancestorId: 13807 },
    orderBy: { depth: 'asc' }
  })
  console.log('\nClosures from 13807:', closures13807.length)
  for (const c of closures13807) {
    // Tìm descendant system
    const descSys = await prisma.system.findUnique({ where: { autoId: c.descendantId } })
    const descTCA = descSys ? await prisma.tCAMember.findFirst({ where: { userId: descSys.userId } }) : null
    console.log(`  -> Descendant ${c.descendantId} (${descTCA?.name || 'unknown'}), depth=${c.depth}`)
  }

  // User IDs của các TCA members hiện tại
  const tcaMembers = await prisma.tCAMember.findMany()
  const userIds = tcaMembers.map(t => t.userId)
  console.log('\nTCA User IDs:', userIds)

  // Kiểm tra tất cả Systems trong hệ thống
  const allSystems = await prisma.system.findMany({
    where: { onSystem: 1 },
    orderBy: { autoId: 'asc' }
  })
  console.log('\nTất cả Systems (onSystem=1):', allSystems.length)
  for (const s of allSystems) {
    const user = await prisma.user.findUnique({ where: { id: s.userId } })
    const tca = user ? await prisma.tCAMember.findFirst({ where: { userId: s.userId } }) : null
    console.log(`  System ${s.autoId}: userId=${s.userId} (${user?.name || 'unknown'}), TCA=${tca?.tcaId || '-'}, refSysId=${s.refSysId}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
