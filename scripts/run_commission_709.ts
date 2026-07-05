import { distributeCommission } from '../lib/brk/commission-calculator'
import prisma from '../lib/prisma'

async function main() {
  const tree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } })
  if (!tree) { console.log('Tree not found'); return }

  console.log('Running distributeCommission for #709 (userId=1075)...')
  await distributeCommission(1075, 4, Number(tree.fee), tree)
  console.log('Done!')

  const userIds = [965, 1010, 1075, 26, 3773]
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: userIds } },
  })
  for (const w of wallets) {
    const user = await prisma.user.findUnique({ where: { id: w.userId }, select: { name: true } })
    console.log(
      `#${String(w.userId).padEnd(5)} ${String(user?.name || '').trim().padEnd(25)}` +
      ` | Cash: ${String(w.balance).padStart(10)}` +
      ` | BRKD: ${String(w.brkd).padStart(12)}`
    )
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error('ERROR:', e); process.exit(1) })
