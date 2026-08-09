import 'dotenv/config'
import prisma from '../lib/prisma'
import { processCycleForBackfill } from '../lib/brk/mbtca-orchestrator-service'

const HOUR_MS = 60 * 60 * 1000

function parseRangeArg(flag: string): number | null {
  const match = process.argv.find(a => a.startsWith(`--${flag}=`))
  if (!match) return null
  const value = Number(match.split('=')[1])
  return Number.isFinite(value) ? value : null
}

async function main() {
  // Lấy cấu hình ứng dụng MB-TCA để tính chu kỳ thời gian
  const application = await prisma.systemPlanApplication.findFirst({
    where: { businessPlan: { code: 'MB_TCA' } },
    include: { businessPlan: true }
  })

  if (!application) {
    console.error('❌ Không tìm thấy ứng dụng kinh doanh MB-TCA.')
    process.exit(1)
  }

  const now = new Date()
  const currentCycle = Math.floor((now.getTime() - application.startsAt.getTime()) / HOUR_MS)

  // 1. Tìm toàn bộ cycle đã COMPLETED để phát hiện các "lỗ hổng" (cycle thiếu run)
  const runs = await prisma.mbtcaWorkflowRun.findMany({
    where: { applicationId: application.id },
    select: { cycleNumber: true, status: true },
  })
  const completedCycles = new Set(runs.filter(r => r.status === 'COMPLETED').map(r => r.cycleNumber))

  const milestoneCycles: number[] = []
  for (let c = 1; c <= currentCycle; c++) {
    if (completedCycles.has(c)) continue
    if (c % 7 === 0 || c % 30 === 0) milestoneCycles.push(c)
  }

  const fromCycle = parseRangeArg('from-cycle')
  const toCycle = parseRangeArg('to-cycle')
  const nowMs = now.getTime()
  const targetCycles = milestoneCycles.filter(c =>
    (fromCycle == null || c >= fromCycle) &&
    (toCycle == null || c <= toCycle) &&
    // Chỉ xử lý cycle đã tới hạn (scheduledAt <= now) để tránh thăng cấp/hết hạn sớm
    application.startsAt.getTime() + c * HOUR_MS + 5 * 60 * 1000 <= nowMs
  )

  console.log('======================================================')
  console.log('               BACKFILL MB-TCA CRON JOBS              ')
  console.log('======================================================')
  console.log(`- Ứng dụng: ${application.businessPlan.name} (Bắt đầu: ${application.startsAt.toISOString()})`)
  console.log(`- Chu kỳ hiện tại của hệ thống: ${currentCycle} (Giờ hiện tại: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`)
  console.log(`- Số cycle mốc (%7 REVENUE_SHARE hoặc %30 LEVEL_PROMOTION) còn thiếu: ${milestoneCycles.length}`)
  if (fromCycle != null || toCycle != null) {
    console.log(`- Phạm vi lọc: ${fromCycle ?? 'từ đầu'} → ${toCycle ?? 'đến hết'} (${targetCycles.length} cycle trong phạm vi)`)
  }

  if (targetCycles.length === 0) {
    console.log('\n✅ Không có cycle mốc nào cần chạy trong phạm vi này.')
    return
  }

  const dryRun = !process.argv.includes('--execute')
  if (dryRun) {
    console.log('\n======================================================')
    console.log('      DRY-RUN — chỉ hiển thị, không ghi dữ liệu       ')
    console.log('======================================================')
    for (const c of targetCycles) {
      const type = c % 30 === 0
        ? (c % 7 === 0 ? 'REVENUE_SHARE + LEVEL_PROMOTION' : 'LEVEL_PROMOTION')
        : 'REVENUE_SHARE'
      const scheduledAt = new Date(application.startsAt.getTime() + c * HOUR_MS + 5 * 60 * 1000)
      console.log(`  - Cycle ${c}: ${type} @ ${scheduledAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`)
    }
    console.log('\nℹ️ Để chạy thực tế: npx ts-node -r tsconfig-paths/register --compiler-options \'{"module":"CommonJS"}\' scripts/backfill-mbtca.ts --execute')
    return
  }

  console.log('\n======================================================')
  console.log('              EXECUTE — ghi dữ liệu thật              ')
  console.log('======================================================')

  const beforePools = await prisma.brkRevenuePool.count({ where: { applicationId: application.id } })
  const beforeRuns = await prisma.mbtcaWorkflowRun.count({ where: { applicationId: application.id } })
  console.log(`Trước khi chạy: revenuePools=${beforePools}, workflowRuns=${beforeRuns}`)

  let processedOk = 0
  for (const c of targetCycles) {
    console.log(`\n🚀 Chạy bù cycle ${c}...`)
    try {
      const result = await processCycleForBackfill(c)
      console.log(`   Kết quả:`, JSON.stringify(result))
      if (result.status === 'COMPLETED') processedOk++
    } catch (error) {
      console.error(`   ❌ Lỗi khi chạy bù cycle ${c}:`, error)
      process.exit(1)
    }
    // Delay 1 giây giữa các chu kỳ để tránh quá tải kết nối và đảm bảo ghi nhận DB tuần tự
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  const afterPools = await prisma.brkRevenuePool.count({ where: { applicationId: application.id } })
  const afterRuns = await prisma.mbtcaWorkflowRun.count({ where: { applicationId: application.id } })
  console.log('\n======================================================')
  console.log('🎉 Đã chạy bù xong!')
  console.log(`   - Cycle hoàn thành: ${processedOk}/${targetCycles.length}`)
  console.log(`   - revenuePools: ${beforePools} → ${afterPools} (+${afterPools - beforePools})`)
  console.log(`   - workflowRuns: ${beforeRuns} → ${afterRuns} (+${afterRuns - beforeRuns})`)
  console.log('======================================================')
}

main()
  .catch(error => {
    console.error('❌ Lỗi:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
