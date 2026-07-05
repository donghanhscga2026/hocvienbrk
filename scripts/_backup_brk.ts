import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
const p = new PrismaClient()

async function main() {
  const backup: any = {}

  backup.systems = await p.system.findMany({ where: { onSystem: 4 }, orderBy: { autoId: 'asc' } })
  backup.closure = await p.systemClosure.findMany({ where: { systemId: 4 }, orderBy: [{ ancestorId: 'asc' }, { depth: 'asc' }] })
  
  const userIds = backup.systems.map((s: any) => s.userId)
  backup.wallets = await p.brkWallet.findMany({ where: { userId: { in: userIds } } })
  
  const walletIds = backup.wallets.map((w: any) => w.id)
  backup.transactions = await p.brkTransaction.findMany({ where: { walletId: { in: walletIds } }, orderBy: { id: 'asc' } })
  
  backup.levelUps = await p.brkLevelUpRecord.findMany({ where: { onSystem: 4 } })
  backup.referralBonuses = await p.brkReferralBonus.findMany({ where: { onSystem: 4 } })
  backup.revenuePools = await p.brkRevenuePool.findMany({ where: { systemId: 4 } })
  backup.revenueAwards = await p.brkRevenueAward.findMany({ where: { pool: { systemId: 4 } } })

  // Serialize decimals to numbers
  const json = JSON.stringify(backup, (key, val) => {
    if (typeof val === 'bigint') return Number(val)
    return val
  }, 2)

  writeFileSync('plan_temp/brk_backup_20260705.json', json, 'utf-8')
  console.log(`✅ Backup saved: plan_temp/brk_backup_20260705.json`)
  console.log(`   Systems: ${backup.systems.length}`)
  console.log(`   Closures: ${backup.closure.length}`)
  console.log(`   Wallets: ${backup.wallets.length}`)
  console.log(`   Transactions: ${backup.transactions.length}`)
  console.log(`   RevenuePools: ${backup.revenuePools.length}`)
  console.log(`   RevenueAwards: ${backup.revenueAwards.length}`)
  
  await p.$disconnect()
}
main()
