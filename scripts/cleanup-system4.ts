/**
 * cleanup-system4.ts
 *
 * Xóa toàn bộ dữ liệu hệ thống #4 (BRK) & reset ví về 0.
 * Giữ nguyên enrollment (courseId=22), payment, system_tree config, brk_level_config.
 *
 * Cách chạy:
 *   npx tsx scripts/cleanup-system4.ts           → Dry-run (chỉ xem, không xóa)
 *   npx tsx scripts/cleanup-system4.ts --execute  → Thực sự xóa
 */

import { PrismaClient, Prisma } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()
const ON_SYSTEM = 4
const COURSE_ID = 22

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function divider(title: string) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log(`${'═'.repeat(60)}`)
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`\n⚠️  ${question} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

// ═══════════════════════════════════════════════════════
// PHASE 1: HIỂN THỊ THỐNG KÊ TRƯỚC KHI XÓA
// ═══════════════════════════════════════════════════════

async function showPreCleanupStats() {
  divider('PHASE 1: THỐNG KÊ TRƯỚC KHI XÓA')

  const systemCount = await prisma.system.count({ where: { onSystem: ON_SYSTEM } })
  const systemStatuses = await prisma.system.groupBy({
    by: ['status'],
    where: { onSystem: ON_SYSTEM },
    _count: true,
  })
  console.log(`\n📋 system (onSystem=${ON_SYSTEM}): ${systemCount} records`)
  for (const s of systemStatuses) {
    console.log(`   - ${s.status}: ${s._count}`)
  }

  const closureCount = await prisma.systemClosure.count({ where: { systemId: ON_SYSTEM } })
  console.log(`\n📋 system_closure (systemId=${ON_SYSTEM}): ${closureCount} records`)

  const systemUserIds = (await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM },
    select: { userId: true },
  })).map(s => s.userId)

  const walletCount = await prisma.brkWallet.count({
    where: { userId: { in: systemUserIds } },
  })
  const txCount = systemUserIds.length > 0
    ? await prisma.brkTransaction.count({
        where: { wallet: { userId: { in: systemUserIds } } },
      })
    : 0

  console.log(`\n📋 brk_wallet (users trong system #4): ${walletCount} wallets`)
  console.log(`📋 brk_transaction (các wallet trên): ${txCount} transactions`)

  if (systemUserIds.length > 0) {
    const walletTotals = await prisma.brkWallet.aggregate({
      where: { userId: { in: systemUserIds } },
      _sum: { balance: true, brkd: true, voucherBalance: true, totalEarned: true, totalWithdrawn: true },
    })
    console.log(`   Tổng balance: ${Number(walletTotals._sum.balance || 0).toLocaleString()} VND`)
    console.log(`   Tổng brkd:    ${Number(walletTotals._sum.brkd || 0).toLocaleString()}`)
    console.log(`   Tổng voucher: ${Number(walletTotals._sum.voucherBalance || 0).toLocaleString()}`)
    console.log(`   Tổng earned:  ${Number(walletTotals._sum.totalEarned || 0).toLocaleString()} VND`)
  }

  const levelUpCount = await prisma.brkLevelUpRecord.count({ where: { onSystem: ON_SYSTEM } })
  console.log(`\n📋 brk_level_up_record (onSystem=${ON_SYSTEM}): ${levelUpCount} records`)

  const timelineCount = await prisma.brkTimelineRecord.count({ where: { onSystem: ON_SYSTEM } })
  console.log(`📋 brk_timeline_record (onSystem=${ON_SYSTEM}): ${timelineCount} records`)

  const poolCount = await prisma.brkRevenuePool.count({ where: { systemId: ON_SYSTEM } })
  const awardCount = await prisma.brkRevenueAward.count({
    where: { pool: { systemId: ON_SYSTEM } },
  })
  console.log(`\n📋 brk_revenue_pool (systemId=${ON_SYSTEM}): ${poolCount} pools`)
  console.log(`📋 brk_revenue_award (thuộc pool trên): ${awardCount} awards`)

  const referralCount = await prisma.brkReferralBonus.count({ where: { onSystem: ON_SYSTEM } })
  console.log(`\n📋 brk_referral_bonus (onSystem=${ON_SYSTEM}): ${referralCount} records`)

  const walletChangeCount = await prisma.activityLog.count({ where: { action: 'WALLET_CHANGE' } })
  console.log(`\n📋 activity_log (action=WALLET_CHANGE): ${walletChangeCount} records`)

  const enrollmentCount = await prisma.enrollment.count({
    where: { courseId: COURSE_ID, status: 'ACTIVE' },
  })
  console.log(`\n✅ enrollment (courseId=${COURSE_ID}, status=ACTIVE): ${enrollmentCount} records — GIỮ NGUYÊN`)

  return {
    systemCount,
    closureCount,
    walletCount,
    txCount,
    levelUpCount,
    timelineCount,
    poolCount,
    awardCount,
    referralCount,
    walletChangeCount,
    enrollmentCount,
    systemUserIds,
  }
}

// ═══════════════════════════════════════════════════════
// PHASE 2: XÓA DỮ LIỆU
// ═══════════════════════════════════════════════════════

async function executeCleanup(systemUserIds: number[]) {
  divider('PHASE 2: THỰC HIỆN XÓA DỮ LIỆU')

  console.log('\n🔄 Deleting brk_revenue_award...')
  const deletedAwards = await prisma.brkRevenueAward.deleteMany({
    where: { pool: { systemId: ON_SYSTEM } },
  })
  console.log(`   ✅ Deleted ${deletedAwards.count} awards`)

  console.log('🔄 Deleting brk_revenue_pool...')
  const deletedPools = await prisma.brkRevenuePool.deleteMany({
    where: { systemId: ON_SYSTEM },
  })
  console.log(`   ✅ Deleted ${deletedPools.count} pools`)

  console.log('🔄 Deleting system_closure...')
  const deletedClosures = await prisma.systemClosure.deleteMany({
    where: { systemId: ON_SYSTEM },
  })
  console.log(`   ✅ Deleted ${deletedClosures.count} closures`)

  console.log('🔄 Deleting brk_timeline_record...')
  const deletedTimeline = await prisma.brkTimelineRecord.deleteMany({
    where: { onSystem: ON_SYSTEM },
  })
  console.log(`   ✅ Deleted ${deletedTimeline.count} timeline records`)

  console.log('🔄 Deleting brk_level_up_record...')
  const deletedLevelUp = await prisma.brkLevelUpRecord.deleteMany({
    where: { onSystem: ON_SYSTEM },
  })
  console.log(`   ✅ Deleted ${deletedLevelUp.count} level-up records`)

  console.log('🔄 Deleting brk_referral_bonus...')
  const deletedReferral = await prisma.brkReferralBonus.deleteMany({
    where: { onSystem: ON_SYSTEM },
  })
  console.log(`   ✅ Deleted ${deletedReferral.count} referral bonuses`)

  if (systemUserIds.length > 0) {
    const wallets = await prisma.brkWallet.findMany({
      where: { userId: { in: systemUserIds } },
      select: { id: true },
    })
    const walletIds = wallets.map(w => w.id)

    if (walletIds.length > 0) {
      console.log('🔄 Deleting brk_transaction...')
      const deletedTx = await prisma.brkTransaction.deleteMany({
        where: { walletId: { in: walletIds } },
      })
      console.log(`   ✅ Deleted ${deletedTx.count} transactions`)

      console.log('🔄 Resetting brk_wallet balances to 0...')
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "brk_wallet" SET balance = 0, brkd = 0, "voucherBalance" = 0, "totalEarned" = 0, "totalWithdrawn" = 0 WHERE id IN (${Prisma.join(walletIds)})`
      )
      console.log(`   ✅ Reset ${walletIds.length} wallets to 0`)
    }
  }

  console.log('🔄 Deleting activity_log (WALLET_CHANGE)...')
  const deletedLogs = await prisma.activityLog.deleteMany({
    where: { action: 'WALLET_CHANGE' },
  })
  console.log(`   ✅ Deleted ${deletedLogs.count} WALLET_CHANGE logs`)

  console.log('🔄 Deleting system records...')
  const deletedSystem = await prisma.system.deleteMany({
    where: { onSystem: ON_SYSTEM },
  })
  console.log(`   ✅ Deleted ${deletedSystem.count} system records`)
}

// ═══════════════════════════════════════════════════════
// PHASE 3: KIỂM TRA SAU KHI XÓA
// ═══════════════════════════════════════════════════════

async function showPostCleanupStats(systemUserIds: number[]) {
  divider('PHASE 3: KIỂM TRA SAU KHI XÓA')

  const systemCount = await prisma.system.count({ where: { onSystem: ON_SYSTEM } })
  const closureCount = await prisma.systemClosure.count({ where: { systemId: ON_SYSTEM } })
  const levelUpCount = await prisma.brkLevelUpRecord.count({ where: { onSystem: ON_SYSTEM } })
  const timelineCount = await prisma.brkTimelineRecord.count({ where: { onSystem: ON_SYSTEM } })
  const poolCount = await prisma.brkRevenuePool.count({ where: { systemId: ON_SYSTEM } })
  const referralCount = await prisma.brkReferralBonus.count({ where: { onSystem: ON_SYSTEM } })
  const walletChangeCount = await prisma.activityLog.count({ where: { action: 'WALLET_CHANGE' } })

  let txCount = 0
  let walletBalancesNonZero = 0
  if (systemUserIds.length > 0) {
    const wallets = await prisma.brkWallet.findMany({
      where: { userId: { in: systemUserIds } },
      select: { id: true, balance: true, brkd: true, voucherBalance: true },
    })
    const walletIds = wallets.map(w => w.id)
    txCount = walletIds.length > 0
      ? await prisma.brkTransaction.count({ where: { walletId: { in: walletIds } } })
      : 0
    walletBalancesNonZero = wallets.filter(
      w => Number(w.balance) !== 0 || Number(w.brkd) !== 0 || Number(w.voucherBalance) !== 0
    ).length
  }

  const enrollmentCount = await prisma.enrollment.count({
    where: { courseId: COURSE_ID, status: 'ACTIVE' },
  })

  console.log(`\n📋 system:              ${systemCount} (mong đợi: 0)`)
  console.log(`📋 system_closure:      ${closureCount} (mong đợi: 0)`)
  console.log(`📋 brk_transaction:     ${txCount} (mong đợi: 0)`)
  console.log(`📋 brk_wallet non-zero: ${walletBalancesNonZero} (mong đợi: 0)`)
  console.log(`📋 brk_level_up:        ${levelUpCount} (mong đợi: 0)`)
  console.log(`📋 brk_timeline:        ${timelineCount} (mong đợi: 0)`)
  console.log(`📋 brk_revenue_pool:    ${poolCount} (mong đợi: 0)`)
  console.log(`📋 brk_referral:        ${referralCount} (mong đợi: 0)`)
  console.log(`📋 activity_log WL:     ${walletChangeCount} (mong đợi: 0)`)
  console.log(`\n✅ enrollment courseId=22 ACTIVE: ${enrollmentCount} (GIỮ NGUYÊN)`)

  const allClean =
    systemCount === 0 &&
    closureCount === 0 &&
    txCount === 0 &&
    walletBalancesNonZero === 0 &&
    levelUpCount === 0 &&
    timelineCount === 0 &&
    poolCount === 0 &&
    referralCount === 0

  if (allClean) {
    console.log(`\n🎉 DỌN DẸP HOÀN TOÀN THÀNH CÔNG!`)
  } else {
    console.log(`\n⚠️  CÒN DỮ LIỆU THỪA — CẦN KIỂM TRA LẠI!`)
  }
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════

async function main() {
  const isExecute = process.argv.includes('--execute')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  CLEANUP SYSTEM #4 (BRK) — RESET VÍ & XÓA DATA    ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log(`║  Mode: ${isExecute ? '🔴 EXECUTE (XÓA THỰC TẾ)    ' : '🟢 DRY-RUN (CHỈ XEM)       '}║`)
  console.log('╚══════════════════════════════════════════════════════╝')

  const stats = await showPreCleanupStats()

  if (stats.enrollmentCount === 0) {
    console.error('\n❌ KHÔNG TÌM THẤY enrollment nào courseId=22 ACTIVE!')
    console.error('   Dừng lại để tránh xóa nhầm.')
    return
  }

  if (stats.systemCount === 0) {
    console.log('\nℹ️  Không có system record nào để xóa. Script kết thúc.')
    return
  }

  if (!isExecute) {
    console.log('\n' + '─'.repeat(60))
    console.log('📌 Đây là DRY-RUN — không có dữ liệu nào bị xóa.')
    console.log('📌 Để thực sự xóa, chạy lại với --execute:')
    console.log('   npx tsx scripts/cleanup-system4.ts --execute')
    console.log('─'.repeat(60))
    return
  }

  console.log(`\n⚠️  SỐ LƯỢNG ENROLLMENT: ${stats.enrollmentCount} (mong đợi 88)`)
  if (stats.enrollmentCount !== 88) {
    const proceed = await askConfirmation(
      `Enrollment ACTIVE courseId=22 = ${stats.enrollmentCount} (khác 88). Bạn có chắc muốn tiếp tục?`
    )
    if (!proceed) {
      console.log('❌ Đã hủy.')
      return
    }
  }

  const confirmed = await askConfirmation(
    `XÁC NHẬN: Xóa toàn bộ dữ liệu system #4?\n` +
    `   - ${stats.systemCount} system records\n` +
    `   - ${stats.closureCount} closures\n` +
    `   - ${stats.txCount} transactions\n` +
    `   - ${stats.walletCount} wallets reset về 0\n` +
    `   - ${stats.levelUpCount} level-up records\n` +
    `   - ${stats.timelineCount} timeline records\n` +
    `   - ${stats.poolCount} revenue pools + ${stats.awardCount} awards\n` +
    `   - ${stats.referralCount} referral bonuses\n` +
    `   - ${stats.walletChangeCount} WALLET_CHANGE logs\n` +
    `   ✅ GIỮ NGUYÊN: ${stats.enrollmentCount} enrollment courseId=22`
  )

  if (!confirmed) {
    console.log('❌ Đã hủy.')
    return
  }

  await executeCleanup(stats.systemUserIds)
  await showPostCleanupStats(stats.systemUserIds)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
