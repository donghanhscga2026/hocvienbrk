import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import prisma from '../lib/prisma'

const ON_SYSTEM = 4
const COURSE_ID = 22
const CONFIG_KEYS = ['brk_level_promotion_last_round']

export async function createMbtcaBackup() {
  const capturedAt = new Date()
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: COURSE_ID },
    select: { id: true, userId: true, status: true, createdAt: true, updatedAt: true },
  })
  const userIds = enrollments.map(enrollment => enrollment.userId)
  const systems = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM },
    select: { autoId: true, level: true, totalPoints: true, giftClaimed: true, inDongChia: true },
  })
  const autoIds = systems.map(system => system.autoId)
  const closures = await prisma.systemClosure.findMany({
    where: {
      systemId: ON_SYSTEM,
      OR: [
        { ancestorId: { in: autoIds } },
        { descendantId: { in: autoIds } },
      ],
    },
  })
  const wallets = await prisma.brkWallet.findMany({ where: { userId: { in: userIds } } })
  const walletIds = wallets.map(wallet => wallet.id)
  const pools = await prisma.brkRevenuePool.findMany({ where: { systemId: ON_SYSTEM }, select: { id: true } })
  const poolIds = pools.map(pool => pool.id)

  const [transactions, timelineRecords, levelUpRecords, referralBonuses, revenueAwards, activityLogs, configs] = await Promise.all([
    prisma.brkTransaction.findMany({ where: { walletId: { in: walletIds } }, select: { id: true } }),
    prisma.brkTimelineRecord.findMany({ where: { onSystem: ON_SYSTEM }, select: { id: true } }),
    prisma.brkLevelUpRecord.findMany({ where: { onSystem: ON_SYSTEM }, select: { id: true } }),
    prisma.brkReferralBonus.findMany({ where: { onSystem: ON_SYSTEM }, select: { id: true } }),
    prisma.brkRevenueAward.findMany({ where: { poolId: { in: poolIds } }, select: { id: true } }),
    prisma.activityLog.findMany({ where: { userId: { in: userIds }, action: 'WALLET_CHANGE' }, select: { id: true } }),
    prisma.systemConfig.findMany({ where: { key: { in: CONFIG_KEYS } } }),
  ])

  const backup = {
    metadata: { version: 2, onSystem: ON_SYSTEM, courseId: COURSE_ID, capturedAt: capturedAt.toISOString() },
    enrollments,
    systems,
    closures,
    wallets,
    transactions,
    timelineRecords,
    levelUpRecords,
    referralBonuses,
    revenuePools: pools,
    revenueAwards,
    activityLogs,
    configs,
  }

  const backupDir = path.join(process.cwd(), 'plan_temp')
  await mkdir(backupDir, { recursive: true })
  const stamp = capturedAt.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  const outputPath = path.join(backupDir, `mbtca-data-backup_${stamp}.json`)
  await writeFile(outputPath, JSON.stringify(backup, null, 2), 'utf8')

  console.log(`Baseline backup: ${outputPath}`)
  console.log(`Enrollments/systems/closures: ${enrollments.length}/${systems.length}/${closures.length}`)
  console.log(`Wallets/transactions: ${wallets.length}/${transactions.length}`)
  console.log(`Timeline/pools/awards: ${timelineRecords.length}/${pools.length}/${revenueAwards.length}`)
  return outputPath
}

async function main() {
  await createMbtcaBackup()
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/backup-before-mbtca.ts')) {
  main()
    .catch(error => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
