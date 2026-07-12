import prisma from '@/lib/prisma'

async function main() {
  console.log('=== START VIP → Voucher Migration ===')

  // 1. Tạo 3 voucher mặc định
  const vipVoucher = await prisma.voucher.upsert({
    where: { code: 'VIP-DEFAULT' },
    update: {},
    create: {
      code: 'VIP-DEFAULT',
      name: 'Voucher VIP',
      type: 'VIP',
      description: 'Kích hoạt khóa học có phí (khi khóa accept VIP)'
    }
  })

  const allVoucher = await prisma.voucher.upsert({
    where: { code: 'ALL-DEFAULT' },
    update: {},
    create: {
      code: 'ALL-DEFAULT',
      name: 'Voucher All Access',
      type: 'ALL',
      description: 'Kích hoạt tất cả khóa học có phí'
    }
  })

  const cashVoucher = await prisma.voucher.upsert({
    where: { code: 'CASH-386K' },
    update: {},
    create: {
      code: 'CASH-386K',
      name: 'Voucher 386.000đ',
      type: 'CASH',
      value: 386000,
      durationDays: 90,
      description: 'Giảm 386.000đ khi kích hoạt khóa học'
    }
  })

  console.log('Vouchers created:', vipVoucher.id, allVoucher.id, cashVoucher.id)

  // 2. Convert vipExempt → acceptedVouchers
  const courses = await prisma.course.findMany({
    select: { id: true, vipExempt: true, name_lop: true }
  })

  let acceptedCount = 0
  for (const course of courses) {
    if (!course.vipExempt) {
      await prisma.courseAcceptedVoucher.upsert({
        where: {
          courseId_voucherId: {
            courseId: course.id,
            voucherId: vipVoucher.id
          }
        },
        update: {},
        create: {
          courseId: course.id,
          voucherId: vipVoucher.id
        }
      })
      acceptedCount++
    }
  }
  console.log(`Converted ${acceptedCount} courses to accept VIP voucher`)

  // 3. Award VIP voucher cho user có courseId=1 ACTIVE
  const vipEnrollments = await prisma.enrollment.findMany({
    where: { courseId: 1, status: 'ACTIVE' },
    select: { userId: true }
  })

  let awardedCount = 0
  for (const e of vipEnrollments) {
    try {
      await prisma.userVoucher.upsert({
        where: {
          userId_voucherId_awardedFromCourseId: {
            userId: e.userId,
            voucherId: vipVoucher.id,
            awardedFromCourseId: 1
          }
        },
        update: {},
        create: {
          userId: e.userId,
          voucherId: vipVoucher.id,
          status: 'ACTIVE',
          awardedFromCourseId: 1
        }
      })
      awardedCount++
    } catch (err) {
      console.error(`Failed award to user ${e.userId}:`, err)
    }
  }
  console.log(`Awarded VIP voucher to ${awardedCount} users`)

  // 4. Verify
  const uvCount = await prisma.userVoucher.count()
  const cavCount = await prisma.courseAcceptedVoucher.count()
  console.log(`\n=== VERIFICATION ===`)
  console.log(`UserVouchers: ${uvCount}`)
  console.log(`CourseAcceptedVouchers: ${cavCount}`)
  console.log(`=== MIGRATION COMPLETE ===`)
}

main().catch(console.error)
