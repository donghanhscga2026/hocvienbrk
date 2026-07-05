import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // Get ALL transaction types
  const allTxns = await p.$queryRaw<Array<{id: number; walletId: number; amount: number; type: string; description: string | null; balanceBefore: number; balanceAfter: number}>>(
    Prisma.sql`SELECT id, "walletId", amount, type, description, "balanceBefore", "balanceAfter" FROM "brk_transaction" ORDER BY id ASC`
  )

  console.log(`Total transactions: ${allTxns.length}`)
  console.log(`\n=== TRANSACTION TYPES ===`)
  const typeCount: Record<string, number> = {}
  for (const tx of allTxns) {
    typeCount[tx.type] = (typeCount[tx.type] || 0) + 1
  }
  for (const [type, count] of Object.entries(typeCount)) {
    console.log(`  ${type}: ${count} transactions`)
  }

  // Analyze by type + total amount
  const typeAmount: Record<string, number> = {}
  for (const tx of allTxns) {
    typeAmount[tx.type] = (typeAmount[tx.type] || 0) + Number(tx.amount)
  }
  console.log(`\n=== AMOUNT BY TYPE ===`)
  for (const [type, amount] of Object.entries(typeAmount)) {
    console.log(`  ${type}: ${Math.round(amount).toLocaleString()} VND`)
  }

  // Show all transactions for uid=3773 (walletId should be determined)
  const wallets = await p.brkWallet.findMany({ select: { id: true, userId: true, balance: true } })
  const walletMap = new Map(wallets.map(w => [w.id, w]))
  
  // Show all transactions grouped by wallet
  console.log(`\n=== ALL TRANSACTIONS FOR TOP WALLETS ===`)
  const txByWallet: Record<number, typeof allTxns> = {}
  for (const tx of allTxns) {
    if (!txByWallet[tx.walletId]) txByWallet[tx.walletId] = []
    txByWallet[tx.walletId].push(tx)
  }
  
  for (const [walletIdStr, txns] of Object.entries(txByWallet)) {
    const walletId = parseInt(walletIdStr)
    const w = walletMap.get(walletId)
    if (!w || Number(w.balance) < 10000) continue
    
    console.log(`\nWallet uid=${w?.userId} (balance=${Number(w.balance).toLocaleString()}):`)
    for (const tx of txns) {
      console.log(`  #${tx.id} ${tx.type} ${Number(tx.amount).toLocaleString()} → balance ${Number(tx.balanceBefore).toLocaleString()}→${Number(tx.balanceAfter).toLocaleString()} | ${(tx.description || '').slice(0, 60)}`)
    }
    
    // Verify: balanceAfter of last tx should equal wallet balance
    const lastTx = txns[txns.length - 1]
    if (lastTx) {
      console.log(`  VERIFY: last tx balanceAfter=${Number(lastTx.balanceAfter).toLocaleString()} vs wallet balance=${Number(w.balance).toLocaleString()} ${Number(lastTx.balanceAfter) === Number(w.balance) ? '✅' : '❌'}`)
    }
  }

  // Check: any transactions without matching wallet (orphaned)
  const deletedCount = await p.$queryRaw<Array<{count: number}>>(
    Prisma.sql`SELECT COUNT(*) as count FROM "brk_transaction" t LEFT JOIN "brk_wallet" w ON w.id = t."walletId" WHERE w.id IS NULL`
  )

  await p.$disconnect()
}
main()
