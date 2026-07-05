import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  console.log(`Total fee collected: 36 × 26,868 = ${(36 * 26868).toLocaleString()} VND\n`)

  // Use raw query for type filter to bypass enum issues
  const allTxns = await p.$queryRaw<Array<{id: number; walletId: number; amount: number; type: string; description: string | null}>>(
    Prisma.sql`SELECT id, "walletId", amount, type, description FROM "brk_transaction" ORDER BY id ASC`
  )

  let totalComm = 0, totalVoucher = 0, totalShare = 0
  const commByUser: Record<number, number> = {}
  const shareByUser: Record<number, number> = {}

  for (const tx of allTxns) {
    const amt = Number(tx.amount)
    if (tx.type === 'COMMISSION') {
      totalComm += amt
      commByUser[tx.walletId] = (commByUser[tx.walletId] || 0) + amt
    } else if (tx.type === 'VOUCHER_CREDIT') {
      totalVoucher += amt
    } else if (tx.type === 'REVENUE_SHARE') {
      totalShare += amt
      shareByUser[tx.walletId] = (shareByUser[tx.walletId] || 0) + amt
    }
  }

  // Get wallet to user mapping
  const wallets = await p.brkWallet.findMany({ select: { id: true, userId: true, balance: true } })
  const walletMap = new Map(wallets.map(w => [w.id, w]))

  console.log(`Commission transactions: ${allTxns.filter(t => t.type === 'COMMISSION').length}`)
  console.log(`Voucher transactions: ${allTxns.filter(t => t.type === 'VOUCHER_CREDIT').length}`)
  console.log(`Revenue share transactions: ${allTxns.filter(t => t.type === 'REVENUE_SHARE').length}`)
  console.log(`\n=== CASH FLOW ANALYSIS ===`)
  console.log(`Total commissions:   ${Math.round(totalComm).toLocaleString()} VND`)
  console.log(`Revenue share:      ${Math.round(totalShare).toLocaleString()} VND`)
  console.log(`Vouchers (non-cash): ${Math.round(totalVoucher).toLocaleString()} VND`)
  console.log(`Total cash credited: ${Math.round(totalComm + totalShare).toLocaleString()} VND`)
  console.log(`Total fee collected: ${(36 * 26868).toLocaleString()} VND`)
  console.log(`\n🔴 DIFFERENCE: ${Math.round(totalComm + totalShare - 36 * 26868).toLocaleString()} VND (cash > fee by this much)`)

  // Commission breakdown by wallet
  console.log(`\n=== COMMISSIONS BY WALLET ===`)
  for (const [walletIdStr, amount] of Object.entries(commByUser)) {
    const walletId = parseInt(walletIdStr)
    const w = walletMap.get(walletId)
    const commCount = allTxns.filter(t => t.type === 'COMMISSION' && t.walletId === walletId).length
    console.log(`  uid=${w?.userId} ${commCount} commissions × avg ${Math.round(amount/commCount).toLocaleString()} = ${Math.round(amount).toLocaleString()} VND`)
  }

  // Revenue share breakdown
  console.log(`\n=== REVENUE SHARE BY WALLET ===`)
  for (const [walletIdStr, amount] of Object.entries(shareByUser)) {
    const walletId = parseInt(walletIdStr)
    const w = walletMap.get(walletId)
    console.log(`  uid=${w?.userId} ${Math.round(amount).toLocaleString()} VND`)
  }

  // Check if commissions exceed fee
  console.log(`\n=== TOTAL CASH IN SYSTEM (wallet balances) ===`)
  let totalBalance = 0
  for (const w of wallets) {
    totalBalance += Number(w.balance)
    console.log(`  uid=${w.userId} balance=${Number(w.balance).toLocaleString()}`)
  }
  console.log(`\nTotal wallet balance: ${Math.round(totalBalance).toLocaleString()} VND`)

  await p.$disconnect()
}
main()
