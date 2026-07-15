import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function run() {
  const txs = await prisma.brkTransaction.findMany({
    where: {
      type: 'VOUCHER_CREDIT',
      refId: { startsWith: 'level_' }
    }
  })
  console.log(`Found ${txs.length} level up vouchers in DB:`)
  for (const tx of txs) {
    console.log(`- WalletId: ${tx.walletId}, RefId: ${tx.refId}, Amt: ${tx.amount}, Desc: ${tx.description}`)
  }
}
run().finally(() => prisma.$disconnect())
