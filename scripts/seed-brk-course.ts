import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Bắt đầu tạo SYS course cho BRK...')

  const id_khoa = 'BRK-SYS-01'
  const existingCourse = await prisma.course.findUnique({ where: { id_khoa } })
  if (existingCourse) {
    console.log(`ℹ️ Course ${id_khoa} đã tồn tại (id=${existingCourse.id})`)
    await linkToSystemTree(existingCourse.id)
    console.log('🎉 Hoàn tất!')
    return
  }

  // Find next available ID
  const maxId = await prisma.course.findFirst({ orderBy: { id: 'desc' }, select: { id: true } })
  const nextId = (maxId?.id || 12) + 1
  console.log(`Using ID=${nextId} for SYS course`)

  const course = await prisma.course.create({
    data: {
      id: nextId,
      id_khoa,
      name_lop: 'BRK Hệ Thống',
      type: 'SYS',
      status: true,
      phi_coc: 25000,
      stk: '0541001199966',
      name_stk: 'NGUYEN DUY HUNG',
      bank_stk: 'SACOMBANK',
      noidung_stk: 'BRK {SDT} {HOTEN}',
      mo_ta_ngan: 'Hệ thống BRK Affiliate - Kích hoạt tài khoản $1',
      mo_ta_dai: 'Đây là khóa học đặc biệt dành cho hệ thống BRK. Sau khi đóng phí $1 (25,000đ), bạn sẽ được kích hoạt vào hệ thống BRK, nhận điểm BRKD và bắt đầu xây dựng mạng lưới.',
      teacherId: null,
    }
  })
  console.log(`✅ Tạo course: ${course.name_lop} (id=${course.id})`)

  await linkToSystemTree(course.id)

  console.log('🎉 Seed SYS course hoàn tất!')
}

async function linkToSystemTree(courseId: number) {
  const tree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } })
  if (!tree) {
    console.log('⚠️ SystemTree BRK (onSystem=4) chưa tồn tại! Chạy seed-brk-levels.ts trước.')
    return
  }
  if (tree.courseId === courseId) {
    console.log('ℹ️ SystemTree đã link với course này rồi.')
    return
  }
  await prisma.systemTree.update({
    where: { onSystem: 4 },
    data: { courseId }
  })
  console.log(`✅ SystemTree BRK -> courseId=${courseId}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
