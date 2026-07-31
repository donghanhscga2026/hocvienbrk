import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("=== KIỂM TRA THÔNG TIN HỌC VIÊN #834 ===")
  
  const user = await prisma.user.findUnique({
    where: { id: 834 },
    include: { brkWallet: true }
  })
  console.log("User:", JSON.stringify(user, null, 2))

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: 834 },
    include: { course: true, payment: true }
  })
  console.log("\nEnrollments:", JSON.stringify(enrollments.map(e => ({
    id: e.id,
    courseId: e.courseId,
    courseName: e.course.name_lop,
    courseSlug: e.course.id_khoa,
    status: e.status,
    phi_coc: e.phi_coc,
    payment: e.payment ? {
      id: e.payment.id,
      amount: e.payment.amount,
      status: e.payment.status,
      transferContent: e.payment.transferContent
    } : null
  })), null, 2))
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
