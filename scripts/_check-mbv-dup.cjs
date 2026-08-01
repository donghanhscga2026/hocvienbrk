const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const giftTxs = await prisma.brkTransaction.findMany({
    where: {
      balanceType: 'MBV',
      type: 'MBV_CREDIT',
      description: { contains: 'Quà tặng đăng ký thành công' }
    },
    select: { id: true, walletId: true, amount: true, createdAt: true }
  })

  const byWallet = new Map()
  for (const tx of giftTxs) {
    const arr = byWallet.get(tx.walletId) || []
    arr.push(tx)
    byWallet.set(tx.walletId, arr)
  }

  let dupWallets = 0
  let dupTxCount = 0
  const dupDetail = []
  for (const [walletId, txs] of byWallet) {
    if (txs.length > 1) {
      dupWallets++
      dupTxCount += txs.length - 1
      dupDetail.push(`wallet ${walletId}: ${txs.length} lần (tx ${txs.map(t => t.id).join(',')})`)
    }
  }

  console.log(`Tổng MBV_CREDIT gift transactions: ${giftTxs.length}`)
  console.log(`Tổng wallet có gift: ${byWallet.size}`)
  console.log(`Wallet bị cộng TRÙNG (>1 lần): ${dupWallets}`)
  console.log(`Tổng số transaction dư cần xử lý: ${dupTxCount}`)
  console.log('--- Chi tiết wallet trùng ---')
  dupDetail.slice(0, 200).forEach(d => console.log(d))
  if (dupDetail.length > 200) console.log(`... và ${dupDetail.length - 200} wallet khác`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
