import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const COURSE_ID = 22
  const VOUCHER_CODE = 'VIP_MB1'
  const VOUCHER_NAME = 'VIP MB1'

  console.log('=== Award Voucher VIP MB1 cho tất cả HV khóa #22 ===\n')

  // 1. Đảm bảo voucher tồn tại
  let voucher = await prisma.voucher.findUnique({ where: { id: 4 } })
  if (!voucher) {
    voucher = await prisma.voucher.create({
      data: {
        id: 4,
        code: VOUCHER_CODE,
        name: VOUCHER_NAME,
        type: 'VIP',
        value: 0,
        durationDays: null,
        description: 'Voucher VIP_MB1: Miễn phí hoàn toàn khi đăng ký khóa học. Không có thời hạn.',
        isActive: true,
      }
    })
    console.log(`✅ Đã tạo Voucher #4: ${voucher.name} (${voucher.code})`)
  } else {
    console.log(`ℹ️ Voucher #4 đã tồn tại: ${voucher.name} (${voucher.code})`)
  }

  // 2. Thêm CourseVoucherAward cho course #22 (để future enrollments tự nhận)
  const existingAward = await prisma.courseVoucherAward.findFirst({
    where: { courseId: COURSE_ID, voucherId: 4 }
  })
  if (!existingAward) {
    await prisma.courseVoucherAward.create({
      data: { courseId: COURSE_ID, voucherId: 4 }
    })
    console.log(`✅ Đã thêm CourseVoucherAward: Course #22 → Voucher #4`)
  } else {
    console.log(`ℹ️ CourseVoucherAward đã tồn tại`)
  }

  // 3. Lấy tất cả ACTIVE enrollment của course #22
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: COURSE_ID, status: 'ACTIVE' },
    select: { userId: true }
  })
  console.log(`\n📋 Tìm thấy ${enrollments.length} HV ACTIVE trong khóa #22\n`)

  let awarded = 0
  let skipped = 0

  for (const { userId } of enrollments) {
    const existing = await prisma.userVoucher.findFirst({
      where: { userId, voucherId: 4, awardedFromCourseId: COURSE_ID }
    })
    if (existing) {
      skipped++
      continue
    }

    await prisma.userVoucher.create({
      data: {
        userId,
        voucherId: 4,
        status: 'ACTIVE',
        awardedFromCourseId: COURSE_ID,
        expiresAt: null,
      }
    })
    awarded++
    console.log(`  ✅ User #${userId} nhận Voucher #4 VIP MB1`)
  }

  console.log(`\n=== KẾT QUẢ ===`)
  console.log(`  Awarded: ${awarded}`)
  console.log(`  Skipped (đã có): ${skipped}`)
  console.log(`  Tổng: ${enrollments.length}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
