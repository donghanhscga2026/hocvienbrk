import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COURSE_ID = 54
const VOUCHER_CODE = 'GIF_DBS'

async function main() {
  const args = process.argv.slice(2)
  const isExecute = args.includes('--execute')

  console.log('==================================================')
  console.log('   Award voucher GIF_DBS cho HV da kich hoat khoa #54')
  console.log('==================================================')
  console.log(`Che do: ${isExecute ? 'THUC THI (ghi DB)' : 'Khao sat (dry-run, chi doc)'}`)
  console.log('--------------------------------------------------')

  const voucher = await prisma.voucher.findUnique({ where: { code: VOUCHER_CODE } })
  if (!voucher) {
    console.log(`Khong tim thay voucher ma ${VOUCHER_CODE}. Dung lai.`)
    return
  }
  console.log(`Voucher: #${voucher.id} ${voucher.name} (${voucher.code}) type=${voucher.type} isActive=${voucher.isActive} durationDays=${voucher.durationDays ?? 'khong han'}`)
  if (!voucher.isActive) {
    console.log('Voucher dang inactive. Dung lai.')
    return
  }

  const course = await prisma.course.findUnique({
    where: { id: COURSE_ID },
    select: { id: true, id_khoa: true, name_lop: true }
  })
  if (!course) {
    console.log(`Khong tim thay course id=${COURSE_ID}. Dung lai.`)
    return
  }
  console.log(`Khoa: #${course.id} ${course.id_khoa} ${course.name_lop}`)

  const awardLink = await prisma.courseVoucherAward.findFirst({
    where: { courseId: COURSE_ID, voucherId: voucher.id }
  })
  console.log(`CourseVoucherAward (khoa #54 -> voucher): ${awardLink ? 'da co (HV moi tu nhan)' : 'CHUA CO - HV moi se khong tu nhan'}`)

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: COURSE_ID, status: 'ACTIVE' },
    select: { userId: true, user: { select: { name: true, email: true } } },
    orderBy: { userId: 'asc' }
  })
  console.log(`So enrollment ACTIVE khoa #54: ${enrollments.length}`)

  const existing = await prisma.userVoucher.findMany({
    where: { voucherId: voucher.id, awardedFromCourseId: COURSE_ID },
    select: { userId: true, status: true }
  })
  const existingUserIds = new Set(existing.map(e => e.userId))
  const missing = enrollments.filter(e => !existingUserIds.has(e.userId))

  console.log(`Da co voucher (awardedFromCourseId=54): ${existing.length}`)
  console.log(`Con thieu, se award: ${missing.length}`)
  console.log('--------------------------------------------------')
  missing.slice(0, 30).forEach(e => {
    console.log(`  + User #${e.userId} (${e.user.name || 'N/A'}${e.user.email ? `, ${e.user.email}` : ''})`)
  })
  if (missing.length > 30) console.log(`  ... va ${missing.length - 30} nguoi khac`)
  console.log('--------------------------------------------------')

  if (!isExecute) {
    console.log('Day la ban chay khao sat. Chua co du lieu nao thay doi.')
    console.log('Chay lenh sau de thuc thi:')
    console.log('   npx tsx scripts/award-gif-dbs-course54.ts --execute')
    return
  }

  let awarded = 0
  let skipped = 0
  for (const e of missing) {
    const dup = await prisma.userVoucher.findFirst({
      where: { userId: e.userId, voucherId: voucher.id, awardedFromCourseId: COURSE_ID }
    })
    if (dup) { skipped++; continue }

    let expiresAt: Date | null = null
    if (voucher.durationDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + voucher.durationDays)
    }
    await prisma.userVoucher.create({
      data: { userId: e.userId, voucherId: voucher.id, status: 'ACTIVE', awardedFromCourseId: COURSE_ID, expiresAt }
    })
    awarded++
    console.log(`  Da award user #${e.userId}`)
  }

  const after = await prisma.userVoucher.count({
    where: { voucherId: voucher.id, awardedFromCourseId: COURSE_ID }
  })
  console.log('--------------------------------------------------')
  console.log(`Ket qua: awarded=${awarded} skipped=${skipped} tong sau thuc thi=${after} (du kien ${existing.length + missing.length})`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
