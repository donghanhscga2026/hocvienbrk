import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user0Closures = await prisma.userClosure.findMany({
    where: { descendantId: 0 }
  })
  
  console.log(`Found ${user0Closures.length} closure rows for descendantId = 0`)
  console.log('Rows:', user0Closures)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
