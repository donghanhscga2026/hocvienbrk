import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const execute = process.argv.includes('--execute')
  console.log(`=== Dọn dẹp log trùng lặp chiến dịch #2 (Mode: ${execute ? 'Thực thi' : 'DRY-RUN'}) ===\n`)

  // Tim cac email co nhieu hon 1 log
  const duplicates = await prisma.$queryRaw<any[]>`
    SELECT "toEmail", COUNT(*)::int as cnt
    FROM "EmailCampaignLog"
    WHERE "campaignId" = 2
    GROUP BY "toEmail"
    HAVING COUNT(*) > 1
  `

  for (const dup of duplicates) {
    console.log(`Xử lý email trùng: ${dup.toEmail}`)
    
    // Lay tat ca log cua email nay trong campaign 2, dung id tang dan de order
    const logs = await prisma.emailCampaignLog.findMany({
      where: { campaignId: 2, toEmail: dup.toEmail },
      orderBy: { id: 'asc' }
    })

    // Giu lai log dau tien, xoa cac log sau
    const logsToDelete = logs.slice(1)
    console.log(`  -> Tìm thấy ${logsToDelete.length} log thừa cần xóa`)

    if (execute) {
      const idsToDelete = logsToDelete.map(l => l.id)
      await prisma.emailCampaignLog.deleteMany({
        where: { id: { in: idsToDelete } }
      })
      console.log(`  => Đã xóa thành công`)
    } else {
      console.log(`  => Sẽ xóa khi chạy thực thi`)
    }
  }

  console.log("\nHoàn thành quét.")
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
