/**
 * CHẠY GRACE PROCESSING THỰC TẾ
 * Gọi processGracePeriodExpirations với thời gian 00:05 VN 04/07/2026
 *
 * CHẠY: npx tsx scripts/run-grace-july4.ts
 */
import { processGracePeriodExpirations } from '../lib/brk/activation-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const SIM_TIME = new Date('2026-07-03T17:05:00.000Z') // 00:05 VN 04/07

async function main() {
  console.log('═════════════════════════════════════════════════')
  console.log('  CHẠY GRACE PROCESSING THỰC TẾ')
  console.log(`  Thời gian: ${SIM_TIME.toISOString()} (00:05 VN 04/07)`)
  console.log('═════════════════════════════════════════════════\n')

  const result = await processGracePeriodExpirations(SIM_TIME)
  console.log('\n✅ Kết quả:', JSON.stringify(result, null, 2))

  // Verify: show updated members
  console.log('\n── TRẠNG THÁI SAU CHẠY ──')
  const updated = await prisma.system.findMany({
    where: { onSystem: 4, status: 'ACTIVE', level: { gt: 0 } },
    select: { userId: true, level: true, totalPoints: true }
  })
  for (const u of updated) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: u.userId } })
    console.log(`  #${u.userId}: level=${u.level} pts=${u.totalPoints} cash=${wallet?.balance || 0} brkd=${wallet?.brkd || 0}`)
  }
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
