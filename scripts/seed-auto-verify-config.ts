import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding AutoVerifyConfig...')

  // Khóa #22: NGÂN HÀNG PHƯỚC BÁU BRK1 → Sacombank → BRK System #4
  const course22 = await prisma.course.findUnique({ where: { id: 22 } })
  if (!course22) {
    console.log('❌ Course 22 not found')
    return
  }

  const existing = await prisma.autoVerifyConfig.findUnique({ where: { courseId: 22 } })
  if (existing) {
    console.log(`  ⏭ Config for course #22 (${course22.id_khoa}) already exists`)
    return
  }

  await prisma.autoVerifyConfig.create({
    data: {
      courseId: 22,
      emailFrom: 'info@sacombank.com.vn',
      bankName: 'Sacombank',
      emailQuery: '"thong bao giao dich"',
      onSystem: 4,
      enabled: true,
    }
  })
  console.log(`  ✅ Created config for course #22 (${course22.id_khoa}): email=Sacombank, onSystem=4`)

  // Tổng kết
  const total = await prisma.autoVerifyConfig.count()
  console.log(`\n🎉 Total AutoVerifyConfig records: ${total}`)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
