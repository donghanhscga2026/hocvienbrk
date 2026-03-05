const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function debugEnrollment() {
  const userId = 1;
  const courseCode = 'CB';

  console.log(`🔍 Đang kiểm tra Enrollment cho User ID: ${userId}, Course Code: ${courseCode}...`)

  const enrollments = await prisma.enrollment.findMany({
    where: { 
      userId: userId,
      course: {
        id_khoa: courseCode
      }
    },
    include: {
      course: true,
      user: true,
      payment: true
    }
  })

  if (enrollments.length === 0) {
    console.log('❌ Không tìm thấy Enrollment nào khớp.')
    return
  }

  enrollments.forEach(e => {
    console.log('\n--- THÔNG TIN ENROLLMENT ---')
    console.log(`ID: ${e.id}`)
    console.log(`Trạng thái: ${e.status}`)
    console.log(`Học viên: ${e.user.name} (Phone: ${e.user.phone})`)
    console.log(`Khóa học: ${e.course.name_lop} (${e.course.id_khoa})`)
    console.log(`Phí cọc yêu cầu: ${e.course.phi_coc.toLocaleString()} VND`)
    console.log(`Thanh toán đi kèm: ${e.payment ? e.payment.status : 'Chưa có payment'}`)
    if (e.payment) {
        console.log(`   Số tiền đã nhận: ${e.payment.amount.toLocaleString()} VND`)
    }
    console.log('----------------------------')
  })
}

debugEnrollment()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
