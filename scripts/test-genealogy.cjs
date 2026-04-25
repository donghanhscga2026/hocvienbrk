const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const systemId = 1, rootId = 861
  const rootSys = await prisma.system.findFirst({ where: { userId: rootId, onSystem: systemId } })
  const rootAutoId = rootSys.autoId
  
  const f1s = await prisma.system.findMany({ 
    where: { refSysId: rootId, onSystem: systemId, userId: { not: rootId } }, 
    include: { user: { select: { id: true, name: true } } } 
  })
  const f1AutoIds = f1s.map(f => f.autoId)
  
  const f2desc = await prisma.systemClosure.findMany({ 
    where: { systemId, ancestorId: { in: f1AutoIds }, depth: { gte: 1 } }, 
    select: { descendantId: true } 
  })
  const f2AutoIds = [...new Set(f2desc.map(c => c.descendantId))]
  
  const closures = await prisma.systemClosure.findMany({
    where: { 
      systemId, 
      OR: [ 
        { ancestorId: { in: [rootAutoId, ...f1AutoIds, ...f2AutoIds] } }, 
        { descendantId: { in: f1AutoIds } } 
      ], 
      depth: { gte: 0 } 
    },
    include: { descendant: { include: { user: { select: { id: true, name: true } } } } }
  })
  
  const closureByAncestor = new Map()
  const allUserIds = new Set([rootId])
  for (const c of closures) {
    if (!closureByAncestor.has(c.ancestorId)) closureByAncestor.set(c.ancestorId, [])
    const desc = c.descendant.user
    if (desc && desc.id) allUserIds.add(desc.id)
    closureByAncestor.get(c.ancestorId).push({ 
      depth: c.depth, 
      userId: desc ? desc.id : c.descendantId, 
      name: desc ? desc.name : '', 
      autoId: c.descendantId 
    })
  }
  
  const tcaMembers = await prisma.tCAMember.findMany({ 
    where: { 
      OR: [
        { userId: { in: [...allUserIds] } }, 
        { tcaId: { in: [...allUserIds] } 
      }] 
    } 
  })
  const tcaMemberMap = new Map()
  for (const m of tcaMembers) {
    tcaMemberMap.set(m.userId, { level: m.level })
    if (m.tcaId && m.tcaId !== m.userId) tcaMemberMap.set(m.tcaId, { level: m.level })
  }
  
  console.log('=== RESULTS ===')
  for (const f1 of f1s.slice(0, 6)) {
    const f1Closures = closureByAncestor.get(f1.autoId) || []
    const children = f1Closures.filter(c => c.depth === 1)
    const f1tca = tcaMemberMap.get(f1.user.id) || tcaMemberMap.get(f1.autoId)
    console.log('id=' + f1.user.id + ' name=' + f1.user.name + ' level=' + (f1tca ? f1tca.level : 'NULL'))
    for (const child of children) {
      const ct = tcaMemberMap.get(child.userId) || tcaMemberMap.get(child.autoId)
      console.log('  F2: id=' + child.userId + ' name=' + child.name + ' level=' + (ct ? ct.level : 'NULL'))
    }
  }
  await prisma.$disconnect()
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })