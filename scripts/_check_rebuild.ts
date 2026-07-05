import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const count = await p.system.count({ where: { onSystem: 4 } })
  console.log('Members in system 4:', count)
  const levels = await p.system.groupBy({ by: ['level'], where: { onSystem: 4, status: 'ACTIVE' }, _count: true, orderBy: { level: 'asc' } })
  console.log('Levels:', levels.map(l => `Lv${l.level}: ${l._count}`).join(', '))

  const wallets = await p.brkWallet.findMany({ where: { userId: { in: (await p.system.findMany({ where: { onSystem: 4 }, select: { userId: true } })).map(s => s.userId) } } })
  let totalCash = 0
  for (const w of wallets) totalCash += Number(w.balance)
  console.log('Total cash:', totalCash.toLocaleString())
  console.log('Fee collected:', (count * 26868).toLocaleString())

  const txns = await p.brkTransaction.count()
  console.log('Total transactions:', txns)
  await p.$disconnect()
}
main()
