const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. MBDT gift đã cộng trước đây (VOUCHER_CREDIT 'Quà tặng đăng ký thành công')
  const mbdtGiftTxs = await prisma.brkTransaction.findMany({
    where: {
      balanceType: 'VOUCHER',
      type: 'VOUCHER_CREDIT',
      description: { contains: 'Quà tặng đăng ký thành công' }
    },
    select: { id: true, walletId: true, amount: true, wallet: { select: { userId: true } } }
  })
  console.log(`=== MBDT (VOUCHER) GIFT ===`)
  console.log(`Tổng transaction MBDT gift: ${mbdtGiftTxs.length}`)
  console.log(`Tổng wallet MBDT gift: ${new Set(mbdtGiftTxs.map(t => t.walletId)).size}`)

  const byWallet = new Map()
  for (const tx of mbdtGiftTxs) {
    const arr = byWallet.get(tx.walletId) || []
    arr.push(tx)
    byWallet.set(tx.walletId, arr)
  }
  let dupWallets = 0
  for (const [w, txs] of byWallet) if (txs.length > 1) dupWallets++
  console.log(`Wallet MBDT bị trùng (>1 tx): ${dupWallets}`)

  // 2. Kiểm tra ví voucher hiện tại của các user đã nhận MBDT gift
  const walletIds = [...byWallet.keys()]
  const wallets = await prisma.brkWallet.findMany({
    where: { id: { in: walletIds } },
    select: { id: true, userId: true, voucherBalance: true, mbvBalance: true }
  })

  const negative = wallets.filter(w => Number(w.voucherBalance) < 386386)
  console.log(`\nSố user có voucherBalance < 386386 (nếu trừ sẽ âm): ${negative.length}`)
  negative.slice(0, 20).forEach(w => console.log(`  wallet ${w.id} (user ${w.userId}): voucherBalance=${Number(w.voucherBalance)}`))

  const sumVoucher = wallets.reduce((s, w) => s + Number(w.voucherBalance), 0)
  console.log(`\nTổng voucherBalance của các user đã nhận MBDT gift: ${sumVoucher.toLocaleString()}`)

  // 3. Tổng MBV hiện có
  const allWallets = await prisma.brkWallet.findMany({ select: { id: true, mbvBalance: true } })
  const sumMbv = allWallets.reduce((s, w) => s + Number(w.mbvBalance), 0)
  console.log(`\n=== MBV ===`)
  console.log(`Tổng wallet: ${allWallets.length}`)
  console.log(`Tổng mbvBalance toàn hệ thống: ${sumMbv.toLocaleString()}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
