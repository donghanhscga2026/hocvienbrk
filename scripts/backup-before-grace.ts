/**
 * BACKUP TRƯỚC KHI CHẠY GRACE PROCESSING
 * Lưu tất cả data có thể bị ảnh hưởng để restore nếu cần.
 *
 * CHẠY: npx tsx scripts/backup-before-grace.ts
 * OUTPUT: plan_temp/backup-grace-20260704.json
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const OUTPUT_FILE = 'plan_temp/backup-grace-20260704.json'
const ON_SYSTEM = 4
const SIM_TIME = new Date('2026-07-03T17:05:00.000Z') // 00:05 VN 04/07

async function main() {
  console.log('═════════════════════════════════════════════════')
  console.log('  BACKUP TRƯỚC KHI CHẠY GRACE PROCESSING')
  console.log(`  Thời gian: ${SIM_TIME.toISOString()} (00:05 VN 04/07)`)
  console.log('═════════════════════════════════════════════════\n')

  // 1. Tìm eligible members
  const allSystems = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM, status: 'ACTIVE' },
    select: { userId: true, autoId: true }
  })

  const eligibleSystem = await prisma.system.findMany({
    where: {
      onSystem: ON_SYSTEM,
      status: 'ACTIVE',
      gracePeriodEnd: { lte: SIM_TIME }
    },
    select: { userId: true, autoId: true }
  })

  const eligibleUserIds = eligibleSystem.map(s => s.userId)
  console.log(`Eligible members: ${eligibleUserIds.length}`)
  console.log(`User IDs: ${eligibleUserIds.join(', ')}\n`)

  // 2. Backup System records
  console.log('Backing up System records...')
  const systems = await prisma.system.findMany({
    where: { userId: { in: eligibleUserIds }, onSystem: ON_SYSTEM }
  })
  console.log(`  → ${systems.length} system records`)

  // 3. Backup BrkWallet
  console.log('Backing up BrkWallet records...')
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: eligibleUserIds } }
  })
  console.log(`  → ${wallets.length} wallet records`)

  // 4. Backup BrkTimelineRecord (cho system #4)
  console.log('Backing up BrkTimelineRecord...')
  const timelineRecords = await prisma.brkTimelineRecord.findMany({
    where: { userId: { in: eligibleUserIds }, onSystem: ON_SYSTEM }
  })
  console.log(`  → ${timelineRecords.length} timeline records`)

  // 5. Backup BrkLevelUpRecord
  console.log('Backing up BrkLevelUpRecord...')
  const levelUpRecords = await prisma.brkLevelUpRecord.findMany({
    where: { userId: { in: eligibleUserIds }, onSystem: ON_SYSTEM }
  })
  console.log(`  → ${levelUpRecords.length} level-up records`)

  // 6. Backup BrkTransaction (của wallet các member này)
  console.log('Backing up BrkTransaction...')
  const walletIds = wallets.map(w => w.id)
  const transactions = await prisma.brkTransaction.findMany({
    where: { walletId: { in: walletIds } }
  })
  console.log(`  → ${transactions.length} transactions`)

  // 7. Backup BrkReferralBonus
  console.log('Backing up BrkReferralBonus...')
  const referralBonuses = await prisma.brkReferralBonus.findMany({
    where: { userId: { in: eligibleUserIds }, onSystem: ON_SYSTEM }
  })
  console.log(`  → ${referralBonuses.length} referral bonuses`)

  // 8. Snapshot current state summary
  console.log('\n── TRẠNG THÁI HIỆN TẠI ──')
  for (const sys of systems) {
    const user = await prisma.user.findUnique({ where: { id: sys.userId }, select: { name: true } })
    const wallet = wallets.find(w => w.userId === sys.userId)
    const tlCount = timelineRecords.filter(r => r.userId === sys.userId).length
    console.log(`  #${sys.userId} ${user?.name || '?'}: level=${sys.level} pts=${sys.totalPoints} cash=${wallet?.balance || 0} brkd=${wallet?.brkd || 0} records=${tlCount}`)
  }

  // 9. Save backup
  const backup = {
    metadata: {
      createdAt: new Date().toISOString(),
      reason: 'pre-grace-processing',
      simTime: SIM_TIME.toISOString(),
      onSystem: ON_SYSTEM,
      eligibleCount: eligibleUserIds.length,
      eligibleUserIds,
    },
    systems,
    wallets,
    timelineRecords,
    levelUpRecords,
    transactions,
    referralBonuses,
  }

  fs.mkdirSync('plan_temp', { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(backup, null, 2), 'utf-8')

  const fileSize = fs.statSync(OUTPUT_FILE).size
  console.log(`\n✅ Backup saved: ${OUTPUT_FILE} (${(fileSize / 1024).toFixed(1)} KB)`)
  console.log(`   Records: ${systems.length} systems, ${wallets.length} wallets, ${timelineRecords.length} timelines, ${levelUpRecords.length} levelups, ${transactions.length} transactions, ${referralBonuses.length} referral bonuses`)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
