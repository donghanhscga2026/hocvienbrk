'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedSystemTree() {
  console.log('Seeding SystemTree...')
  
  const systems = [
    { onSystem: 0, nameSystem: 'Học viên' },
    { onSystem: 1, nameSystem: 'TCA' },
    { onSystem: 2, nameSystem: 'KTC' },
  ]

  for (const sys of systems) {
    const existing = await prisma.systemTree.findUnique({
      where: { onSystem: sys.onSystem }
    })
    
    if (!existing) {
      await prisma.systemTree.create({
        data: sys
      })
      console.log(`Created: ${sys.nameSystem} (onSystem: ${sys.onSystem})`)
    } else {
      console.log(`Already exists: ${sys.nameSystem} (onSystem: ${sys.onSystem})`)
    }
  }
  
  console.log('Seed completed!')
}

seedSystemTree()
  .catch(console.error)
  .finally(() => prisma.$disconnect())