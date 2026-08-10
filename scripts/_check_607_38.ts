import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 607 },
    select: { id: true, name: true, email: true, phone: true }
  })
  
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: 38 }, { id_khoa: '38' }, { id_khoa: '#38' }, { name_lop: { contains: '38' } }] }
  })

  const wallet = await prisma.brkWallet.findUnique({
    where: { userId: 607 }
  })

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: 607 }
  })

  let courseEnrollment = null;
  if (course) {
    courseEnrollment = await prisma.enrollment.findFirst({
      where: { userId: 607, courseId: course.id }
    })
  }

  const transactions = wallet ? await prisma.brkTransaction.findMany({
    where: { walletId: wallet.id }
  }) : []

  console.log('=== USER ===', user)
  console.log('=== COURSE ===', course)
  console.log('=== WALLET ===', wallet)
  console.log('=== COURSE ENROLLMENT ===', courseEnrollment)
  console.log('=== ALL ENROLLMENTS ===', enrollments)
  console.log('=== TRANSACTIONS ===', transactions)
}

main().catch(console.error).finally(() => prisma.$disconnect())
