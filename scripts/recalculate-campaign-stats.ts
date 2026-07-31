import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const execute = process.argv.includes('--execute')
  console.log(`=== Bắt đầu cập nhật (Mode: ${execute ? 'Thực thi' : 'DRY-RUN'}) ===\n`)

  const campaigns = await prisma.emailCampaign.findMany({
    select: {
      id: true,
      title: true,
      sentCount: true,
      failedCount: true,
      totalRecipients: true
    }
  })

  let count = 0

  for (const cp of campaigns) {
    // Đếm log thực tế trong DB
    const realSentCount = await prisma.emailCampaignLog.count({
      where: { campaignId: cp.id, status: { in: ['SENT', 'SKIPPED'] } }
    })

    const realFailedCount = await prisma.emailCampaignLog.count({
      where: { campaignId: cp.id, status: 'FAILED' }
    })

    if (cp.sentCount !== realSentCount || cp.failedCount !== realFailedCount) {
      count++
      console.log(` Chiến dịch #${cp.id} [${cp.title}]:`)
      console.log(`   - Hiện tại: Sent: ${cp.sentCount}, Failed: ${cp.failedCount} / Total: ${cp.totalRecipients}`)
      console.log(`   - Thực tế:  Sent: ${realSentCount}, Failed: ${realFailedCount}`)
      
      if (execute) {
        await prisma.emailCampaign.update({
          where: { id: cp.id },
          data: {
            sentCount: realSentCount,
            failedCount: realFailedCount
          }
        })
        console.log(`   => Đã cập nhật thành công`)
      } else {
        console.log(`   => Sẽ cập nhật khi chạy thực thi`)
      }
      console.log('---')
    }
  }

  console.log(`\n=> Tìm thấy ${count} chiến dịch bị lệch số liệu.`)
  if (!execute && count > 0) {
    console.log(`\n[Hướng dẫn] Chạy lệnh sau để chính thức cập nhật database:`)
    console.log(`npx tsx scripts/recalculate-campaign-stats.ts --execute`)
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
