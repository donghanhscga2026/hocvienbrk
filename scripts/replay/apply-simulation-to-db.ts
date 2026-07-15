import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const STATE_FILE_PATH = path.join(process.cwd(), 'plan_temp', 'simulation_state.json')
const SYSTEM_ID = 4

async function run() {
  if (!fs.existsSync(STATE_FILE_PATH)) {
    console.error(`❌ Error: Simulation state file not found at ${STATE_FILE_PATH}`)
    return
  }

  const simState = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'))
  const simMembers = simState.memberStates
  console.log(`🚀 Starting database restoration using Simulation State (Day ${simState.lastDayIndex})`)
  console.log(`👤 Processing ${simMembers.length} members...`)

  // 1. Update System levels, points, and Wallets balances
  for (const sim of simMembers) {
    // Update System
    await prisma.system.updateMany({
      where: { userId: sim.userId, onSystem: SYSTEM_ID },
      data: {
        level: sim.level,
        totalPoints: sim.points,
      }
    })

    // Upsert Wallet balances
    await prisma.brkWallet.upsert({
      where: { userId: sim.userId },
      update: {
        balance: sim.cashBalance,
        brkd: sim.brkdBalance,
        voucherBalance: sim.voucherBalance
      },
      create: {
        userId: sim.userId,
        balance: sim.cashBalance,
        brkd: sim.brkdBalance,
        voucherBalance: sim.voucherBalance
      }
    })
  }
  console.log(`✅ System levels, points, and wallets updated for all members.`)

  // Get all wallets for mapping userId -> walletId
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: simMembers.map((m: any) => m.userId) } }
  })
  const walletMap = new Map(wallets.map(w => [w.userId, w.id]))

  // 2. Clear old transactions and level records of System 4
  console.log(`🧹 Clearing old transactions, pools, and promotions for System 4...`)
  
  // Delete all revenue awards of System 4 pools
  await prisma.brkRevenueAward.deleteMany({
    where: { pool: { systemId: SYSTEM_ID } }
  })

  // Delete all pools of System 4
  await prisma.brkRevenuePool.deleteMany({
    where: { systemId: SYSTEM_ID }
  })

  // Delete ALL transactions of these 84 wallets
  await prisma.brkTransaction.deleteMany({
    where: { walletId: { in: wallets.map(w => w.id) } }
  })

  // Delete level up records of these 84 users on System 4
  await prisma.brkLevelUpRecord.deleteMany({
    where: {
      userId: { in: simMembers.map((m: any) => m.userId) },
      onSystem: SYSTEM_ID
    }
  })
  console.log(`✅ Old transaction history, pools and promotions cleared.`)

  // 3. Insert new transactions from Simulation (calculating balanceBefore/balanceAfter dynamically)
  console.log(`📥 Sorting and calculating balances for ${simState.transactions.length} new transactions...`)
  
  // Group transactions by userId
  const userTxGroups = new Map<number, any[]>()
  for (const tx of simState.transactions) {
    if (!userTxGroups.has(tx.userId)) {
      userTxGroups.set(tx.userId, [])
    }
    userTxGroups.get(tx.userId)!.push(tx)
  }

  const txData: any[] = []

  for (const [userId, txs] of userTxGroups.entries()) {
    const walletId = walletMap.get(userId)
    if (!walletId) {
      throw new Error(`Wallet not found for user #${userId}`)
    }

    // Sort user transactions chronologically
    txs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    let cashBalance = 0
    let brkdBalance = 0
    let voucherBalance = 0

    for (const tx of txs) {
      let balanceBefore = 0
      let balanceAfter = 0

      if (tx.balanceType === 'CASH') {
        balanceBefore = cashBalance
        balanceAfter = cashBalance + tx.amount
        cashBalance = balanceAfter
      } else if (tx.balanceType === 'BRKD') {
        balanceBefore = brkdBalance
        balanceAfter = brkdBalance + tx.amount
        brkdBalance = balanceAfter
      } else if (tx.balanceType === 'VOUCHER') {
        balanceBefore = voucherBalance
        balanceAfter = voucherBalance + tx.amount
        voucherBalance = balanceAfter
      }

      txData.push({
        walletId,
        type: tx.type,
        amount: tx.amount,
        balanceType: tx.balanceType,
        description: tx.description,
        refId: tx.refId,
        balanceBefore,
        balanceAfter,
        createdAt: new Date(tx.createdAt)
      })
    }
  }

  // Batch insert transactions (using createMany)
  await prisma.brkTransaction.createMany({
    data: txData
  })
  console.log(`✅ Transactions inserted with running balance calculation.`)

  // 4. Insert new promotions from Simulation
  console.log(`📥 Inserting ${simState.promotions.length} level promotion records...`)
  const promoData = simState.promotions
    .filter((p: any) => p.fromLevel > 0 || p.toLevel > 0) // exclude initial 0->0 activations
    .map((p: any) => ({
      userId: p.userId,
      onSystem: SYSTEM_ID,
      fromLevel: p.fromLevel,
      toLevel: p.toLevel,
      promotedAt: new Date(p.createdAt)
    }))

  await prisma.brkLevelUpRecord.createMany({
    data: promoData
  })
  console.log(`✅ Promotion records inserted.`)

  console.log(`🎉 DATABASE RESTORATION COMPLETE! System 4 data is now 100% matched with simulation.`)
}

run()
  .catch(err => console.error('Database Restoration failed:', err))
  .finally(() => prisma.$disconnect())
