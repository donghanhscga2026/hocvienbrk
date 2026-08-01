import { PrismaClient } from '@prisma/client'
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

  const byWallet = new Map<number, number[]>()
  for (const tx of giftTxs) {
    const arr = byWallet.get(tx.walletId) || []
    arr.push(tx.id)
    byWallet.set(tx.walletId, arr)
  }

  let dupWallets = 0
  let dupTxCount = 0
  const dupDetail: string[] = []
  for (const [walletId, ids] of byWallet) {
    if (ids.length > 1) {
      dupWallets++
      dupTxCount += ids.length - 1
      dupDetail.push(`wallet ${walletId}: ${ids.length} lần (tx ${ids.join(',')})`)
    }
  }

  console.log(`Tổng MBV_CREDIT gift transactions: ${giftTxs.length}`)
  console.log(`Tổng wallet có gift: ${byWallet.size}`)
  console.log(`Wallet bị cộng TRÙNG (>1 lần): ${dupWallets}`)
  console.log(`Tổng số lần trùng cần xóa: ${dupTxCount}`)
  console.log('--- Chi tiết wallet trùng ---')
  dupDetail.slice(0, 100).forEach(d => console.log(d))
  if (dupDetail.length > 100) console.log(`... và ${dupDetail.length - 100} wallet khác`)
}

main().finally(async () => { await prisma.$disconnect() })
