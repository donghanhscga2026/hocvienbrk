import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 330 },
    select: { id: true, name: true, email: true }
  })
  console.log('USER 330:', user)
}

main().finally(() => prisma.$disconnect())
