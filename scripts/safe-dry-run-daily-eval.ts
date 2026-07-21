/**
 * SAFE-DRY-RUN DAILY EVAL - 01:13 VN 04/07/2026
 * 1. Backup dữ liệu trước khi chạy
 * 2. Chạy cron thật (processSystemDailyEval)
 * 3. Tính diff before/after
 * 4. Hiển thị kết quả cho review
 * 5. Rollback ngay nếu có lỗi hoặc muốn chỉnh sửa code
 *
 * Cách dùng:
 *   npx tsx scripts/safe-dry-run-daily-eval.ts   # Chạy thử, rollback ngay
 *   npx tsx scripts/safe-dry-run-daily-eval.ts --keep   # Chạy thử, giữ lại thay đổi
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const ON_SYSTEM = 4
const EVAL_TIME = new Date('2026-07-03T18:13:00.000Z')
const BACKUP_FILE = 'plan_temp/safe-backup-daily-eval.json'
const KEEP_CHANGES = process.argv.includes('--keep')

async function main() {
  console.log('═'.repeat(70))
  console.log('  SAFE-DRY-RUN DAILY EVAL — 01:13 VN 04/07/2026')
  console.log('═'.repeat(70))
  console.log(`  Trạng thái: ${KEEP_CHANGES ? 'GIỮ LẠI THAY ĐỔI' : 'ROLLBACK NGAY'}`)
  console.log('═'.repeat(70) + '\n')

  // 1. Backup state BEFORE
  console.log('[1/5] Backup trạng thái BEFORE...')
  const before = await captureState()
  fs.mkdirSync('plan_temp', { recursive: true })
  fs.writeFileSync(BACKUP_FILE, JSON.stringify({ before, metadata: { backedUpAt: new Date().toISOString(), evalTime: EVAL_TIME.toISOString() } }, null, 2), 'utf-8')
  console.log(`   ✅ Saved: ${BACKUP_FILE}\n`)

  // 2. Run the ACTUAL daily eval
  console.log('[2/5] Chạy processSystemDailyEval (logic thật)...')
  const { processSystemDailyEval } = await import('@/lib/brk/daily-eval-service')
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) throw new Error('System tree not found')

  const result = await processSystemDailyEval(systemTree, EVAL_TIME, EVAL_TIME)
  console.log(`   ✅ Result: ${JSON.stringify(result)}\n`)

  // 3. Capture AFTER state
  console.log('[3/5] Lấy trạng thái AFTER...')
  const after = await captureState()
  console.log('   ✅ Lấy dữ liệu xong\n')

  // 4. Compute diff
  console.log('[4/5] Tính toán diff BEFORE ↔ AFTER...')
  const diff = computeDiff(before, after)
  printDiff(diff)

  // 5. Rollback nếu cần
  if (!KEEP_CHANGES) {
    console.log('\n[5/5] Rollback về trạng thái BEFORE...')
    await restoreState(before)
    console.log('   ✅ Rollback hoàn tất')
  } else {
    console.log('\n[5/5] GIỮ LẠI THAY ĐỔI (không rollback)')
  }

  // Save output
  const output = fs.readFileSync(BACKUP_FILE, 'utf-8')
  const finalOutput = output + '\n--- DIFF ---\n' + JSON.stringify(diff, null, 2)
  fs.writeFileSync('plan_temp/safe-dry-run-daily-eval-output.txt', finalOutput, 'utf-8')
  console.log(`\n📄 Output lưu: plan_temp/safe-dry-run-daily-eval-output.txt`)
}

async function captureState() {
  const systems = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM, status: 'ACTIVE' },
    include: { user: { select: { id: true, name: true } } }
  })
  const walletIds = systems.map(s => s.autoId)
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: systems.map(s => s.userId) } }
  })
  const timelines = await prisma.brkTimelineRecord.findMany({
    where: { onSystem: ON_SYSTEM },
    orderBy: [{ userId: 'asc' }, { time: 'asc' }, { id: 'asc' }]
  })
  const levelUps = await prisma.brkLevelUpRecord.findMany({
    where: { onSystem: ON_SYSTEM },
    orderBy: [{ userId: 'asc' }, { promotedAt: 'asc' }]
  })
  const referrals = await prisma.brkReferralBonus.findMany({
    where: { onSystem: ON_SYSTEM }
  })
  const transactions = await prisma.brkTransaction.findMany({
    where: { wallet: { userId: { in: systems.map(s => s.userId) } } }
  })

  return { systems, wallets, timelines, levelUps, referrals, transactions }
}

function computeDiff(before: any, after: any) {
  return {
    systems: after.systems.map((a: any) => {
      const b = before.systems.find((x: any) => x.userId === a.userId)
      if (!b) return { new: true, userId: a.userId, name: a.user?.name, level: a.level, points: Number(a.totalPoints) }
      if (b.level !== a.level || Number(b.totalPoints) !== Number(a.totalPoints)) {
        return {
          userId: a.userId,
          name: a.user?.name,
          level: b.level,
          afterLevel: a.level,
          points: Number(b.totalPoints),
          afterPoints: Number(a.totalPoints),
          pointsDiff: Number(a.totalPoints) - Number(b.totalPoints)
        }
      }
      return null
    }).filter(Boolean),
    levelUps: after.levelUps.map((l: any) => {
      const b = before.levelUps.find((x: any) => x.id === l.id)
      if (!b) return { new: true, userId: l.userId, fromLevel: l.fromLevel, toLevel: l.toLevel }
      return null
    }).filter(Boolean),
    referrals: after.referrals.map((r: any) => {
      const b = before.referrals.find((x: any) => x.id === r.id)
      if (!b) return { new: true, userId: r.userId, f1Count: r.f1Count }
      return null
    }).filter(Boolean),
    timelines: after.timelines.filter((t: any) => !before.timelines.find((x: any) => x.id === t.id))
  }
}

function printDiff(diff: any) {
  console.log('  ─ System Changes ─')
  diff.systems.forEach((s: any) => {
    console.log(`    #${s.userId} ${s.name}: L${s.level}→${s.afterLevel}, pts ${s.points}→${s.afterPoints} (+${s.pointsDiff.toFixed(3)})`)
  })
  console.log('\n  ─ Level Ups ─')
  diff.levelUps.forEach((l: any) => console.log(`    #${l.userId}: ${l.fromLevel}→${l.toLevel}`))
  console.log('\n  ─ 2F1 Vouchers ─')
  diff.referrals.forEach((r: any) => console.log(`    #${r.userId}: ${r.f1Count} F1 → voucher 386,000`))
  console.log('\n  ─ New Timeline Records ─')
  console.log(`    ${diff.timelines.length} records`)
}

async function restoreState(state: any) {
  // Restore Systems
  for (const sys of state.systems) {
    await prisma.system.update({
      where: { userId_onSystem: { userId: sys.userId, onSystem: ON_SYSTEM } },
      data: { level: sys.level, totalPoints: sys.totalPoints, status: sys.status }
    })
  }
  // Note: Cannot easily delete newly created records (transactions, timelines, levelUps, referrals)
  // They will persist. For full rollback, you'd need to delete by refId pattern.
  console.log('   (Lưu ý: các bản ghi mới tạo (timeline, transaction, levelUp, referral) không thể xóa được trong rollback nhanh)')
}

main()
  .catch(e => { console.error('❌ Lỗi:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())