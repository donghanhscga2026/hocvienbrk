import { simulateDay } from './runner'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const COURSE_ID = 22

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: COURSE_ID, status: 'ACTIVE' },
    include: {
      payment: { select: { transferTime: true, verifiedAt: true } },
    },
  })

  const enrollByDay = new Map<string, any[]>()
  for (const e of enrollments) {
    const t = e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt
    const dayStr = t.toLocaleDateString('vi-VN')
    if (!enrollByDay.has(dayStr)) enrollByDay.set(dayStr, [])
    enrollByDay.get(dayStr)!.push(e)
  }

  const totalDays = enrollByDay.size
  console.log(`🚀 Total days with enrollments to simulate: ${totalDays}`)

  for (let day = 1; day <= totalDays; day++) {
    console.log(`\n------------------------------------------------`)
    console.log(`➡️ Simulating Day ${day} of ${totalDays}...`)
    await simulateDay(day)
  }

  console.log('\n🎉 ALL DAYS SIMULATED SUCCESSFULLY!')
}

main().finally(() => prisma.$disconnect())
