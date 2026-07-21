import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import prisma from '../lib/prisma'

type RowWithId = { id: number }
type Backup = {
  metadata: { version: number; onSystem: number; courseId: number; capturedAt: string }
  enrollments: Array<{ id: number; userId: number; status: string; createdAt: string; updatedAt: string }>
  systems: Array<{ autoId: number; level: number; totalPoints: string; giftClaimed: boolean; inDongChia: boolean }>
  closures: Array<{ ancestorId: number; descendantId: number; depth: number; systemId: number }>
  wallets: Array<{
    id: number
    balance: string
    brkd: string
    voucherBalance: string
    totalEarned: string
    totalWithdrawn: string
  }>
  transactions: RowWithId[]
  timelineRecords: RowWithId[]
  levelUpRecords: RowWithId[]
  referralBonuses: RowWithId[]
  revenuePools: RowWithId[]
  revenueAwards: RowWithId[]
  activityLogs: RowWithId[]
  configs: Array<{ key: string; value: unknown }>
}

const ids = (rows: RowWithId[]) => rows.map(row => row.id)
const newIds = (current: RowWithId[], baseline: RowWithId[]) => {
  const keep = new Set(ids(baseline))
  return current.filter(row => !keep.has(row.id)).map(row => row.id)
}

async function inspect(backup: Backup) {
  const onSystem = backup.metadata.onSystem
  const userIds = backup.enrollments.map(row => row.userId)
  const wallets = await prisma.brkWallet.findMany({ where: { userId: { in: userIds } }, select: { id: true } })
  const walletIds = wallets.map(row => row.id)
  const [systems, closures, pools, awards, transactions, timeline, levelUps, referrals, activityLogs] = await Promise.all([
    prisma.system.findMany({ where: { onSystem }, select: { autoId: true } }),
    prisma.systemClosure.findMany({ where: { systemId: onSystem } }),
    prisma.brkRevenuePool.findMany({ where: { systemId: onSystem }, select: { id: true } }),
    prisma.brkRevenueAward.findMany({ where: { pool: { systemId: onSystem } }, select: { id: true } }),
    prisma.brkTransaction.findMany({ where: { walletId: { in: walletIds } }, select: { id: true } }),
    prisma.brkTimelineRecord.findMany({ where: { onSystem }, select: { id: true } }),
    prisma.brkLevelUpRecord.findMany({ where: { onSystem }, select: { id: true } }),
    prisma.brkReferralBonus.findMany({ where: { onSystem }, select: { id: true } }),
    prisma.activityLog.findMany({ where: { userId: { in: userIds }, action: 'WALLET_CHANGE' }, select: { id: true } }),
  ])
  const closureKeys = new Set(backup.closures.map(row => `${row.ancestorId}:${row.descendantId}:${row.systemId}`))
  return {
    systems,
    closures,
    remove: {
      wallets: newIds(wallets, backup.wallets),
      systems: systems.filter(row => !backup.systems.some(old => old.autoId === row.autoId)).map(row => row.autoId),
      closures: closures.filter(row => !closureKeys.has(`${row.ancestorId}:${row.descendantId}:${row.systemId}`)),
      pools: newIds(pools, backup.revenuePools),
      awards: newIds(awards, backup.revenueAwards),
      transactions: newIds(transactions, backup.transactions),
      timeline: newIds(timeline, backup.timelineRecords),
      levelUps: newIds(levelUps, backup.levelUpRecords),
      referrals: newIds(referrals, backup.referralBonuses),
      activityLogs: newIds(activityLogs, backup.activityLogs),
    },
  }
}

async function main() {
  const backupPath = process.argv.find(arg => !arg.startsWith('--') && arg.endsWith('.json'))
  const execute = process.argv.includes('--execute')
  if (!backupPath) {
    throw new Error('Usage: npx tsx scripts/rollback-mbtca.ts <baseline.json> [--execute]')
  }

  const backup = JSON.parse(await readFile(backupPath, 'utf8')) as Backup
  if (backup.metadata.version !== 2) throw new Error('Rollback requires an MB-TCA baseline backup version 2')
  const state = await inspect(backup)
  const counts = Object.fromEntries(Object.entries(state.remove).map(([key, rows]) => [key, rows.length]))

  console.log(execute ? 'EXECUTE MODE' : 'DRY-RUN ONLY — no database writes')
  console.log(`Baseline captured at: ${backup.metadata.capturedAt}`)
  console.log('Records created after baseline that will be removed:', counts)
  console.log(`Wallets restored exactly to baseline: ${backup.wallets.length}`)
  console.log(`Existing System rows restored to baseline: ${backup.systems.length}`)
  console.log('Enrollment and Payment are never modified by this rollback.')
  if (!execute) return

  await prisma.$transaction(async tx => {
    if (state.remove.awards.length) await tx.brkRevenueAward.deleteMany({ where: { id: { in: state.remove.awards } } })
    if (state.remove.pools.length) await tx.brkRevenuePool.deleteMany({ where: { id: { in: state.remove.pools } } })
    if (state.remove.closures.length) {
      await tx.systemClosure.deleteMany({
        where: { OR: state.remove.closures.map(row => ({ ancestorId: row.ancestorId, descendantId: row.descendantId, systemId: row.systemId })) },
      })
    }
    if (state.remove.timeline.length) await tx.brkTimelineRecord.deleteMany({ where: { id: { in: state.remove.timeline } } })
    if (state.remove.levelUps.length) await tx.brkLevelUpRecord.deleteMany({ where: { id: { in: state.remove.levelUps } } })
    if (state.remove.referrals.length) await tx.brkReferralBonus.deleteMany({ where: { id: { in: state.remove.referrals } } })
    if (state.remove.transactions.length) await tx.brkTransaction.deleteMany({ where: { id: { in: state.remove.transactions } } })
    if (state.remove.activityLogs.length) await tx.activityLog.deleteMany({ where: { id: { in: state.remove.activityLogs } } })
    if (state.remove.systems.length) await tx.system.deleteMany({ where: { autoId: { in: state.remove.systems } } })
    if (state.remove.wallets.length) await tx.brkWallet.deleteMany({ where: { id: { in: state.remove.wallets } } })

    for (const system of backup.systems) {
      await tx.system.update({
        where: { autoId: system.autoId },
        data: {
          level: system.level,
          totalPoints: system.totalPoints,
          giftClaimed: system.giftClaimed,
          inDongChia: system.inDongChia,
        },
      })
    }
    for (const wallet of backup.wallets) {
      await tx.brkWallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance,
          brkd: wallet.brkd,
          voucherBalance: wallet.voucherBalance,
          totalEarned: wallet.totalEarned,
          totalWithdrawn: wallet.totalWithdrawn,
        },
      })
    }
    for (const config of backup.configs) {
      await tx.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value as never },
        create: { key: config.key, value: config.value as never },
      })
    }
    const baselineConfigKeys = new Set(backup.configs.map(config => config.key))
    if (!baselineConfigKeys.has('brk_level_promotion_last_round')) {
      await tx.systemConfig.deleteMany({ where: { key: 'brk_level_promotion_last_round' } })
    }
  }, { timeout: 300_000 })

  const after = await inspect(backup)
  const remaining = Object.values(after.remove).reduce((sum, rows) => sum + rows.length, 0)
  console.log(`Rollback completed. Remaining records beyond baseline: ${remaining}`)
  if (remaining !== 0) throw new Error('Rollback verification failed: records beyond baseline remain')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
