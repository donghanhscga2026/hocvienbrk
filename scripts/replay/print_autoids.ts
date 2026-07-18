import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const members = await prisma.system.findMany({
    where: { onSystem: 4 },
    orderBy: { autoId: 'asc' },
    select: { autoId: true, userId: true, refSysId: true, activatedAt: true }
  })

  console.log("=== THỨ TỰ AUTOID TRONG DB CỦA SYSTEM 4 ===")
  members.forEach((m, i) => {
    console.log(`${i+1}. autoId: ${m.autoId} | User #${m.userId} | refSysId: ${m.refSysId} | activatedAt: ${m.activatedAt?.toISOString()}`)
  })
}

main().finally(() => prisma.$disconnect())
