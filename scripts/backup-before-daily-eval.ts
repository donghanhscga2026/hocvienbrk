/**
 * BACKUP TRƯỚC KHI CHẠY DAILY EVAL
 * Lưu tất cả data có thể bị ảnh hưởng
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const ON_SYSTEM = 4
const EVAL_TIME = new Date('2026-07-03T18:13:00.000Z')
const OUTPUT_FILE = 'plan_temp/backup-before-daily-eval.json'

async function main() {
  console.log('═'.repeat(60))
  console.log('  BACKUP TRƯỚC KHI CHẠY DAILY EVAL')
  console.log('═'.repeat(60))
  console.log(`  Thời gian dự kiến: ${EVAL_TIME.toISOString()} (01:13 VN 04/07)`)
  console.log('═'.repeat(60))
  console.log()

  // Lấy danh sách member ACTIVE
  const members = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM, status: 'ACTIVE' },
    select: { userId: true, autoId: true, level: true, totalPoints: true, gracePeriodEnd: true }
  })
  const memberIds = members.map(m => m.userId)

  // Backup System
  console.log('📊 Backup System records...')
  const systems = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM },
    include: { user: { select: { id: true, name: true } } }
  })
  console.log(`   → ${systems.length} records`)

  // Backup Wallet
  console.log('💰 Backup Wallet records...')
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: memberIds } }
  })
  console.log(`   → ${wallets.length} records`)

  // Backup Timeline
  console.log('📝 Backup Timeline records...')
  const timelines = await prisma.brkTimelineRecord.findMany({
    where: { onSystem: ON_SYSTEM },
    orderBy: [{ userId: 'asc' }, { time: 'asc' }, { id: 'asc' }]
  })
  console.log(`   → ${timelines.length} records`)

  // Backup Level Up
  console.log('📈 Backup Level Up records...')
  const levelUps = await prisma.brkLevelUpRecord.findMany({
    where: { onSystem: ON_SYSTEM },
    orderBy: [{ userId: 'asc' }, { promotedAt: 'asc' }]
  })
  console.log(`   → ${levelUps.length} records`)

  // Backup Transactions
  console.log('💸 Backup Transaction records...')
  const transactions = await prisma.brkTransaction.findMany({
    where: { wallet: { userId: { in: memberIds } } },
    orderBy: [{ walletId: 'asc' }, { createdAt: 'asc' }]
  })
  console.log(`   → ${transactions.length} records`)

  // Backup Referral Bonuses
  console.log('🎁 Backup Referral Bonus records...')
  const referrals = await prisma.brkReferralBonus.findMany({
    where: { onSystem: ON_SYSTEM }
  })
  console.log(`   → ${referrals.length} records`)

  // Ghi file backup
  const backup = {
    metadata: {
      backedUpAt: new Date().toISOString(),
      evalTime: EVAL_TIME.toISOString(),
      onSystem: ON_SYSTEM,
      memberCount: memberIds.length
    },
    systems,
    wallets,
    timelines,
    levelUps,
    transactions,
    referrals
  }

  fs.mkdirSync('plan_temp', { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(backup, null, 2), 'utf-8')

  console.log()
  console.log('═'.repeat(60))
  console.log(`  ✅ Backup saved: ${OUTPUT_FILE}`)
  console.log(`     Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`)
  console.log('═'.repeat(60))
}

main()
  .catch(e => { console.error('❌ Lỗi:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())