import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const usersWithNullReferrer = await prisma.user.findMany({
    where: { referrerId: null },
    select: { id: true, email: true, name: true }
  })
  
  console.log(`Found ${usersWithNullReferrer.length} users with referrerId = null`)
  if (usersWithNullReferrer.length > 0) {
      console.log('Sample users:', usersWithNullReferrer.slice(0, 5))
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
