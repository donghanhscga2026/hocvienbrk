/**
 * XÁC NHẬN KẾT QUẢ SAU GRACE PROCESSING
 * So sánh backup trước/sau và hiển thị thay đổi chi tiết.
 *
 * CHẠY: npx tsx scripts/verify-after-grace.ts
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const BACKUP_FILE = 'plan_temp/backup-grace-20260704.json'
const ON_SYSTEM = 4

async function main() {
  console.log('═════════════════════════════════════════════════')
  console.log('  XÁC NHẬN KẾT QUẢ SAU GRACE PROCESSING')
  console.log('═════════════════════════════════════════════════\n')

  // 1. Load backup
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('❌ Backup file not found:', BACKUP_FILE)
    process.exit(1)
  }
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'))
  const backupSystems: any[] = backup.systems
  const backupTimelines: any[] = backup.timelineRecords
  const backupWallets: any[] = backup.wallets

  // 2. Current state
  const currentSystems = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM, status: 'ACTIVE', userId: { in: backup.metadata.eligibleUserIds } },
  })
  const currentTimelines = await prisma.brkTimelineRecord.findMany({
    where: { onSystem: ON_SYSTEM, userId: { in: backup.metadata.eligibleUserIds } },
    orderBy: [{ userId: 'asc' }, { time: 'asc' }, { id: 'asc' }]
  })
  const currentWallets = await prisma.brkWallet.findMany({
    where: { userId: { in: backup.metadata.eligibleUserIds } }
  })
  const currentLevelUps = await prisma.brkLevelUpRecord.findMany({
    where: { onSystem: ON_SYSTEM, userId: { in: backup.metadata.eligibleUserIds } }
  })

  // 3. Compare
  console.log('── SO SÁNH SYSTEM RECORDS ──')
  let systemChanges = 0
  for (const cur of currentSystems) {
    const before = backupSystems.find((s: any) => s.userId === cur.userId)
    if (!before) continue

    const levelChanged = before.level !== cur.level
    const ptsChanged = Number(before.totalPoints) !== Number(cur.totalPoints)
    if (levelChanged || ptsChanged) {
      systemChanges++
      const user = await prisma.user.findUnique({ where: { id: cur.userId }, select: { name: true } })
      console.log(`  #${cur.userId} ${user?.name || '?'}:`)
      console.log(`    Level: ${before.level} → ${cur.level}`)
      console.log(`    Points: ${before.totalPoints} → ${cur.totalPoints}`)
    }
  }
  console.log(`  → ${systemChanges} system records changed\n`)

  console.log('── SO SÁNH WALLET RECORDS ──')
  let walletChanges = 0
  for (const cur of currentWallets) {
    const before = backupWallets.find((w: any) => w.userId === cur.userId)
    if (!before) continue

    const cashChanged = Number(before.balance) !== Number(cur.balance)
    const brkdChanged = Number(before.brkd) !== Number(cur.brkd)
    if (cashChanged || brkdChanged) {
      walletChanges++
      const user = await prisma.user.findUnique({ where: { id: cur.userId }, select: { name: true } })
      console.log(`  #${cur.userId} ${user?.name || '?'}:`)
      console.log(`    Cash: ${before.balance} → ${cur.balance} (+${Number(cur.balance) - Number(before.balance)})`)
      console.log(`    BRKD: ${before.brkd} → ${cur.brkd} (+${Number(cur.brkd) - Number(before.brkd)})`)
    }
  }
  console.log(`  → ${walletChanges} wallet records changed\n`)

  console.log('── TIMELINE RECORDS MỚI ──')
  let newTimelineCount = 0
  for (const userId of backup.metadata.eligibleUserIds) {
    const beforeRecords = backupTimelines.filter((r: any) => r.userId === userId)
    const afterRecords = currentTimelines.filter(r => r.userId === userId)
    const newRecords = afterRecords.filter(ar => !beforeRecords.some((br: any) => br.id === ar.id))

    if (newRecords.length > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
      console.log(`  #${userId} ${user?.name || '?'} — ${newRecords.length} records mới:`)
      for (const r of newRecords) {
        console.log(`    [${r.time.toISOString()}] ${r.type} | ${r.title}`)
        console.log(`      teamSize=${r.accumulatedTeamSize} cash=${r.amountCash} brkd=${r.amountBrkd}`)
        if (r.description) console.log(`      desc: ${r.description.substring(0, 100)}...`)
      }
      newTimelineCount += newRecords.length
    }
  }
  console.log(`  → ${newTimelineCount} new timeline records\n`)

  console.log('── LEVEL UP RECORDS MỚI ──')
  console.log(`  → ${currentLevelUps.length} level-up records`)
  for (const lu of currentLevelUps) {
    console.log(`    #${lu.userId}: ${lu.fromLevel} → ${lu.toLevel} at ${lu.promotedAt.toISOString()}`)
  }

  console.log('\n═════════════════════════════════════════════════')
  console.log('  TÓM TẮT')
  console.log('═════════════════════════════════════════════════')
  console.log(`  System records changed: ${systemChanges}`)
  console.log(`  Wallet records changed: ${walletChanges}`)
  console.log(`  New timeline records:   ${newTimelineCount}`)
  console.log(`  Level-up records:       ${currentLevelUps.length}`)
  console.log(`  Backup file:            ${BACKUP_FILE}`)
  console.log('═════════════════════════════════════════════════')
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
