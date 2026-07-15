import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const STATE_FILE_PATH = path.join(process.cwd(), 'plan_temp', 'simulation_state.json')

async function run() {
  const userId = 914
  console.log(`=== Inspecting Transactions for User #${userId} ===`)

  // In Sim State
  if (fs.existsSync(STATE_FILE_PATH)) {
    const simState = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'))
    const txs = simState.transactions.filter((tx: any) => tx.userId === userId)
    console.log(`\nSimulation State Transactions (${txs.length}):`)
    for (const tx of txs) {
      console.log(`- Type: ${tx.type}, Amt: ${tx.amount}, BalType: ${tx.balanceType}, Date: ${tx.createdAt}, Ref: ${tx.refId}, Desc: ${tx.description}`)
    }
  }

  // In Database
  const wallet = await prisma.brkWallet.findUnique({ where: { userId } })
  if (wallet) {
    const dbTxs = await prisma.brkTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'asc' }
    })
    console.log(`\nDatabase Transactions (${dbTxs.length}):`)
    for (const tx of dbTxs) {
      console.log(`- Type: ${tx.type}, Amt: ${tx.amount}, BalType: ${tx.balanceType}, Date: ${tx.createdAt.toISOString()}, Ref: ${tx.refId}, Desc: ${tx.description}`)
    }
  }
}
run().finally(() => prisma.$disconnect())
