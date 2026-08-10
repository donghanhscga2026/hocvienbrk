import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 1180 },
    select: { id: true, name: true, email: true, createdAt: true }
  })
  const wallet = await prisma.brkWallet.findUnique({ where: { userId: 1180 } })
  const txs = wallet ? await prisma.brkTransaction.findMany({ where: { walletId: wallet.id } }) : []
  const enrollment = await prisma.enrollment.findFirst({ where: { userId: 1180, courseId: 38 } })

  console.log('=== USER #1180 ===', user)
  console.log('=== WALLET #1180 ===', wallet)
  console.log('=== ENROLLMENT #1180 ===', enrollment)
  console.log('=== TRANSACTIONS #1180 ===', txs)
}

main().catch(console.error).finally(() => prisma.$disconnect())
