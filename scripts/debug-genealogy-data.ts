import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debugData() {
  const ids = [327, 873, 885, 872, 886]
  
  console.log('=== DEBUGGING GENEALOGY DATA ===')
  
  for (const id of ids) {
    console.log(`\n--- ID: #${id} ---`)
    
    // 1. Check User table
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true }
    })
    console.log('User Table:', user ? JSON.stringify(user) : 'NOT FOUND')
    
    // 2. Check System table (Hierarchy)
    const systems = await prisma.system.findMany({
      where: { userId: id },
      select: { autoId: true, userId: true, onSystem: true, refSysId: true }
    })
    console.log('System Table (Position):', systems.length > 0 ? JSON.stringify(systems) : 'NOT FOUND IN ANY SYSTEM')
    
    // 3. Check TCAMember table (Level/Scores)
    // We check both userId and tcaId because mapping can be tricky
    const tcaData = await (prisma as any).tCAMember.findMany({
      where: {
        OR: [
          { userId: id },
          { tcaId: id }
        ]
      }
    })
    console.log('TCAMember Table (Level):', tcaData.length > 0 ? JSON.stringify(tcaData) : 'NOT FOUND')
  }
  
  await prisma.$disconnect()
}

debugData().catch(console.error)
