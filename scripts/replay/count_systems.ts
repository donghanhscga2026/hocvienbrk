import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.system.count({
    where: { onSystem: 4 }
  })
  console.log(`📊 Số bản ghi System 4 trong DB: ${count}`)

  const members = await prisma.system.findMany({
    where: { onSystem: 4 },
    select: { userId: true, refSysId: true, activatedAt: true }
  })
  console.log(`Danh sách:`)
  members.forEach((m, i) => {
    console.log(`${i+1}. User #${m.userId} | refSysId: ${m.refSysId} | activatedAt: ${m.activatedAt?.toISOString()}`)
  })
}

main().finally(() => prisma.$disconnect())
