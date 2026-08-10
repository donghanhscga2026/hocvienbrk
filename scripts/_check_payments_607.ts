import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const payments = await prisma.payment.findMany({
    where: { enrollment: { userId: 607 } },
    include: { enrollment: { include: { course: true } } }
  })
  for (const p of payments) {
    console.log(`Payment #${p.id} | Amount: ${p.amount} | Status: ${p.status} | Enrollment PhiCoc: ${p.enrollment.phi_coc} | Course PhiCoc: ${p.enrollment.course.phi_coc}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
