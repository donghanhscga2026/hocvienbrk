import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  const ids = [873, 885, 872, 886, 327]
  const members = await (prisma as any).tCAMember.findMany({
    where: {
      OR: [
        { userId: { in: ids } },
        { tcaId: { in: ids } }
      ]
    },
    select: { userId: true, tcaId: true, level: true }
  })
  console.log('--- TCA Members Data ---')
  console.log(JSON.stringify(members, null, 2))
  await prisma.$disconnect()
}

check()
