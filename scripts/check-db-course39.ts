import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findUnique({
    where: { id: 39 },
    include: { teacherBankAccount: true }
  })
  console.log('COURSE DATA:', JSON.stringify(course, null, 2))
}

main().finally(() => prisma.$disconnect())
