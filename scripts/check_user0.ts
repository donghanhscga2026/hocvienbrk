import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user0 = await prisma.user.findUnique({
    where: { id: 0 }
  })
  if (user0) {
    console.log('User ID 0 exists:', user0.name, user0.email)
  } else {
    console.log('User ID 0 DOES NOT EXIST')
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
