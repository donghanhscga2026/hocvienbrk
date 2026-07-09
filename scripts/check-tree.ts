import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Check if refSysId uses userId or autoId
  const s1093 = await prisma.system.findFirst({ where: { onSystem: 4, userId: 1093 } })
  console.log('#1093 refSysId:', s1093?.refSysId, '(type:', typeof s1093?.refSysId, ')')
  
  // Try finding children via userId ref
  const s976 = await prisma.system.findFirst({ where: { onSystem: 4, userId: 976 } })
  if (s976) {
    const byAutoId = await prisma.system.findMany({ where: { onSystem: 4, refSysId: s976.autoId } })
    const byUserId = await prisma.system.findMany({ where: { onSystem: 4, refSysId: s976.userId } })
    console.log('#976 children via autoId:', byAutoId.length, byAutoId.map(c => '#'+c.userId).join(', '))
    console.log('#976 children via userId:', byUserId.length, byUserId.map(c => '#'+c.userId).join(', '))
  }

  // Check 26 and 7 children
  for (const uid of [26, 7]) {
    const sys = await prisma.system.findFirst({ where: { onSystem: 4, userId: uid } })
    if (sys) {
      const children = await prisma.system.findMany({ where: { onSystem: 4, refSysId: sys.userId } })
      console.log(`#${uid} has ${children.length} children: ${children.map(c => '#'+c.userId).join(', ')}`)
    }
  }
  
  // Also check the global BFS first available
  // F1 of root #3773: who has <4 children?
  const root = await prisma.system.findFirst({ where: { onSystem: 4, refSysId: 0 } })
  console.log('Root:', root?.userId)
  if (root) {
    const rootF1 = await prisma.system.findMany({ where: { onSystem: 4, refSysId: root.userId } })
    console.log('Root F1 count:', rootF1.length, rootF1.map(c => '#'+c.userId).join(', '))
    
    // Check each root F1's children count
    for (const f1 of rootF1) {
      const f1Children = await prisma.system.findMany({ where: { onSystem: 4, refSysId: f1.userId } })
      console.log(`Root F1 #${f1.userId} has ${f1Children.length} children`)
      if (f1.userId === 1010) {
        // Check children of #1010
        for (const c of f1Children) {
          const grandchildren = await prisma.system.findMany({ where: { onSystem: 4, refSysId: c.userId } })
          console.log(`  #${c.userId} has ${grandchildren.length} children`)
        }
      }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
