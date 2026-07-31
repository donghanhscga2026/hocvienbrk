import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { id: 1164 } })
  const course = await prisma.course.findUnique({ where: { id: 22 }, include: { teacherBankAccount: true } })
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: 1164, courseId: 22 },
    include: { payment: true }
  })

  console.log("=== THÔNG TIN HỌC VIÊN #1164 ===")
  console.log(`Tên: ${user?.name} | SĐT: ${user?.phone} | Email: ${user?.email}`)

  console.log("\n=== THÔNG TIN KHÓA HỌC #22 ===")
  console.log(`Mã khóa (id_khoa): ${course?.id_khoa}`)
  console.log(`Tên lớp: ${course?.name_lop}`)
  console.log(`Học phí cọc: ${course?.phi_coc?.toLocaleString('vi-VN')} đ`)
  console.log(`Tài khoản giáo viên thụ hưởng: ${course?.teacherBankAccount?.bankName} - ${course?.teacherBankAccount?.accountNumber}`)

  console.log("\n=== ĐĂNG KÝ (ENROLLMENT) ===")
  console.log(`Trạng thái: ${enrollment?.status}`)
  console.log(`Học phí cọc thực tế: ${enrollment?.phi_coc?.toLocaleString('vi-VN')} đ`)
  
  if (enrollment?.payment) {
    console.log(`Nội dung chuyển khoản mong muốn: "${enrollment.payment.transferContent}"`)
    console.log(`Số tiền mong muốn: ${enrollment.payment.amount?.toLocaleString('vi-VN')} đ`)
  } else {
    console.log("Chưa tạo bản ghi Payment")
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
