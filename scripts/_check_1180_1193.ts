import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: {
      id: { in: [1180, 1193] }
    },
    select: { id: true, name: true, email: true, phone: true, emailVerified: true, createdAt: true }
  })
  const txs = await prisma.brkTransaction.findMany({
    where: {
      wallet: { userId: { in: [1180, 1193] } },
      balanceType: 'MBV'
    },
    include: { wallet: true }
  })
  console.log('=== USERS ===', users)
  console.log('=== TXS ===', txs)
}

main().catch(console.error).finally(() => prisma.$disconnect())
