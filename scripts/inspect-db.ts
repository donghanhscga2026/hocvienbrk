import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function run() {
  const systems = await prisma.system.findMany({
    where: { onSystem: 4 },
  })
  console.log(`Total System 4 records: ${systems.length}`)
  const confirmed = systems.filter(s => Number(s.totalPoints) > 0)
  console.log(`Confirmed in DB (totalPoints > 0): ${confirmed.length}`)
  
  const statuses = systems.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  console.log('Statuses in DB:', statuses)

  // Check some example users
  const topUsers = systems.filter(s => [3773, 1010, 229, 965].includes(s.userId))
  console.log('\nTop Users in DB:')
  for (const u of topUsers) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: u.userId } })
    console.log(`User #${u.userId}: Level=${u.level}, Points=${u.totalPoints}, CASH=${wallet?.balance}, MBDT=${wallet?.brkd}`)
  }
}
run().finally(() => prisma.$disconnect())
