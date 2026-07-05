import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  // Check remaining closures after systemId=4 deletion
  const remainingClosures = await p.systemClosure.count()  
  console.log(`Total closures remaining in DB: ${remainingClosures}`)
  
  const sys4Closures = await p.systemClosure.count({ where: { systemId: 4 } })
  console.log(`Closures with systemId=4: ${sys4Closures}`)
  
  // Check system 4 records
  const sys4 = await p.system.findMany({ where: { onSystem: 4 }, select: { autoId: true, userId: true } })
  console.log(`System 4 records: ${sys4.length}`)
  
  // Check if any of these autoIds are referenced by closures with systemId != 4
  const autoIds = sys4.map(s => s.autoId)
  if (autoIds.length > 0) {
    const otherClosures = await p.systemClosure.findMany({
      where: {
        systemId: { not: 4 },
        OR: [
          { ancestorId: { in: autoIds } },
          { descendantId: { in: autoIds } }
        ]
      }
    })
    console.log(`Closures from other systems referencing system 4 autoIds: ${otherClosures.length}`)
    for (const c of otherClosures.slice(0, 5)) {
      console.log(`  systemId=${c.systemId} anc=${c.ancestorId} desc=${c.descendantId}`)
    }
    
    // Also check depth=0 (self-referencing) closures
    const selfClosures = await p.systemClosure.count({
      where: { systemId: 4, depth: 0 }
    })
    console.log(`Self-referencing closures (depth=0, systemId=4): ${selfClosures}`)
  }
  await p.$disconnect()
}
main()
