import 'dotenv/config'
import prisma from '../lib/prisma'
import { runMbtcaOrchestrator } from '../lib/brk/mbtca-orchestrator-service'

const HOUR_MS = 60 * 60 * 1000

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

  // 1. Tìm chu kỳ cuối cùng đã hoàn thành COMPLETED trong DB
  const latestCompleted = await prisma.mbtcaWorkflowRun.findFirst({
    where: { applicationId: application.id, status: 'COMPLETED' },
    orderBy: { cycleNumber: 'desc' }
  })

  if (!latestCompleted) {
    console.error('❌ Không tìm thấy lịch sử chạy mbtca_workflow_run trong DB.')
    process.exit(1)
  }

  const lastCycle = latestCompleted.cycleNumber
  const now = new Date()
  const elapsed = now.getTime() - application.startsAt.getTime()
  const currentCycle = Math.floor(elapsed / HOUR_MS)

  console.log('======================================================')
  console.log('               BACKFILL MB-TCA CRON JOBS              ')
  console.log('======================================================')
  console.log(`- Ứng dụng: ${application.name} (Bắt đầu: ${application.startsAt.toISOString()})`)
  console.log(`- Chu kỳ hoàn thành gần nhất trong DB: ${lastCycle} (${latestCompleted.scheduledAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`)
  console.log(`- Chu kỳ hiện tại của hệ thống: ${currentCycle} (Giờ hiện tại: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})`)

  if (lastCycle >= currentCycle) {
    console.log('\n✅ Dữ liệu điều phối đã khớp mốc thời gian hiện tại. Không cần chạy bù!')
    return
  }

  const startCycle = lastCycle + 1
  const endCycle = currentCycle

  console.log(`\n👉 Phát hiện ${endCycle - startCycle + 1} chu kỳ bị lỡ (từ chu kỳ ${startCycle} đến ${endCycle}).`)
  console.log('Tiến hành chạy bù tuần tự theo thời gian thực tế...')

  for (let c = startCycle; c <= endCycle; c++) {
    // Giả lập thời gian chạy (phút thứ 06 của giờ chu kỳ đó) để đảm bảo sau scheduledAt (phút thứ 05)
    const simulatedTime = new Date(application.startsAt.getTime() + c * HOUR_MS + 6 * 60 * 1000)
    
    console.log(`\n------------------------------------------------------`)
    console.log(`🚀 Chạy bù chu kỳ ${c}/${endCycle}...`)
    console.log(`   Thời gian giả lập: ${simulatedTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (${simulatedTime.toISOString()})`)
    
    try {
      const result = await runMbtcaOrchestrator(simulatedTime)
      console.log(`   Kết quả:`, JSON.stringify(result))
      
      // Delay 1 giây giữa các chu kỳ để tránh quá tải kết nối và đảm bảo ghi nhận DB tuần tự
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`   ❌ Lỗi khi chạy bù chu kỳ ${c}:`, error)
      process.exit(1)
    }
  }

  console.log('\n======================================================')
  console.log('🎉 Đã chạy bù thành công toàn bộ các chu kỳ bị lỡ!')
  console.log('======================================================')
}

main()
  .catch(error => {
    console.error('❌ Lỗi:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
