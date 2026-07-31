import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("=== KIỂM TRA TRÙNG LẶP LOG CHIẾN DỊCH #2 ===\n")

  // Group log theo email va dem
  const duplicates = await prisma.$queryRaw<any[]>`
    SELECT "toEmail", COUNT(*)::int as cnt
    FROM "EmailCampaignLog"
    WHERE "campaignId" = 2
    GROUP BY "toEmail"
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
  `

  console.log(`Tìm thấy ${duplicates.length} email có nhiều hơn 1 bản ghi log:`)
  let totalDups = 0
  for (const dup of duplicates) {
    totalDups += (dup.cnt - 1)
    console.log(`- Email: ${dup.toEmail} (Số log: ${dup.cnt})`)
  }
  console.log(`\nTổng số log dư thừa do trùng lặp: ${totalDups}`)
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
