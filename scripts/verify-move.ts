import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const sys = await prisma.system.findUnique({ where: { userId_onSystem: { userId: 1093, onSystem: 4 } } })
  if (!sys) { console.log('NOT FOUND'); return }

  const closures = await prisma.systemClosure.findMany({
    where: { descendantId: sys.autoId, systemId: 4 },
    orderBy: { depth: 'asc' }
  })
  const ancestors = await prisma.system.findMany({
    where: { autoId: { in: closures.map(c => c.ancestorId) }, onSystem: 4 }
  })
  const ancestorUsers = await prisma.user.findMany({
    where: { id: { in: ancestors.map(a => a.userId) } }
  })
  const nameMap = new Map(ancestorUsers.map(u => [u.id, u.name]))

  console.log(`#1093 status: ${sys.status}, level: ${sys.level}, totalPoints: ${Number(sys.totalPoints)}`)
  console.log('Chain:')
  for (const c of closures) {
    const a = ancestors.find(x => x.autoId === c.ancestorId)
    if (a) console.log(`  depth ${c.depth} → #${a.userId} (${nameMap.get(a.userId) || '?'})`)
  }

  // Check #7's F1 count (correctly using autoId)
  const s7 = await prisma.system.findUnique({ where: { userId_onSystem: { userId: 7, onSystem: 4 } } })
  if (s7) {
    const f1 = await prisma.systemClosure.findMany({ where: { ancestorId: s7.autoId, depth: 1, systemId: 4 } })
    const f1Systems = await prisma.system.findMany({ where: { autoId: { in: f1.map(f => f.descendantId) }, onSystem: 4 } })
    console.log(`#7 F1 children (${f1.length}):`, f1Systems.map(s => '#' + s.userId).join(', '))
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
