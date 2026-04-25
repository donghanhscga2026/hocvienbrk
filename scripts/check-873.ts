import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== KIỂM TRA userId TRONG closure BY ANCESTOR ===\n')

  // Build closureByAncestor EXACTLY like code
  const rootSys = await prisma.system.findFirst({ where: { userId: 861, onSystem: 1 } })
  const rootAutoId = rootSys?.autoId || 13937

  const f1Systems: any[] = await prisma.system.findMany({
    where: { refSysId: 861, onSystem: 1, userId: { not: 861 } }
  })
  const f1AutoIds = f1Systems.map(f => f.autoId)

  const allF2Desc: any[] = await prisma.systemClosure.findMany({
    where: { systemId: 1, ancestorId: { in: f1AutoIds }, depth: { gte: 1 } }
  })
  const f2AutoIds = [...new Set(allF2Desc.map(c => c.descendantId))]

  const allClosures: any[] = await prisma.systemClosure.findMany({
    where: {
      systemId: 1,
      OR: [
        { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...f2AutoIds] } },
        { descendantId: { in: f1AutoIds } }
      ],
      depth: { gte: 0 }
    },
    include: { descendant: { include: { user: { select: { id: true, name: true } } } } }
  })

  // Build closureByAncestor (giống code line 192-201)
  const closureByAncestor = new Map<number, any[]>()
  for (const c of allClosures) {
    if (!closureByAncestor.has(c.ancestorId)) closureByAncestor.set(c.ancestorId, [])
    const desc = c.descendant.user
    closureByAncestor.get(c.ancestorId)!.push({
      depth: c.depth,
      userId: desc.id,
      name: desc.name,
      autoId: c.descendantId
    })
  }

  // Check #885 (autoId=14006)
  const closures_885 = closureByAncestor.get(14006) || []
  console.log('\n#885 (autoId=14006) closures:')
  closures_885.forEach(c => console.log('  depth=' + c.depth + ', userId=' + c.userId + ', name=' + c.name + ', autoId=' + c.autoId))

  // Build tcaMemberMap
  const allUserIds = new Set<number>()
  for (const c of allClosures) {
    const desc = c.descendant.user
    if (desc?.id) allUserIds.add(desc.id)
  }

  const tcaMembers: any[] = await prisma.tCAMember.findMany({
    where: { OR: [{ userId: { in: [...allUserIds] } }, { tcaId: { in: [...allUserIds] } }] },
    select: { userId: true, tcaId: true, level: true, personalScore: true, totalScore: true }
  })

  const tcaMemberMap = new Map<number, any>()
  for (const m of tcaMembers) {
    tcaMemberMap.set(m.userId, { level: m.level, personalScore: m.personalScore })
    if (m.tcaId && m.tcaId !== m.userId) {
      tcaMemberMap.set(m.tcaId, { level: m.level, personalScore: m.personalScore })
    }
  }

  // Test lookup cho F2 của #885 (giống code line 239)
  console.log('\n=== TEST LOOKUP FOR #885 F2s ===')
  const f2s = closures_885.filter(c => c.depth === 1)
  for (const f2 of f2s) {
    const tcaData = tcaMemberMap.get(f2.userId) ?? tcaMemberMap.get(f2.autoId)
    console.log('Lookup userId=' + f2.userId + ':', tcaData)
    console.log('Lookup autoId=' + f2.autoId + ':', tcaMemberMap.get(f2.autoId))
  }

  await prisma.$disconnect()
}

main().catch(console.error)