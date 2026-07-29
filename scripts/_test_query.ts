import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const courses = await prisma.course.findMany({
    take: 5,
    orderBy: { id: 'desc' },
    select: { id: true, id_khoa: true, name_lop: true, type: true },
  })
  console.log('COURSES:', JSON.stringify(courses, null, 2))

  const lessons = await prisma.lesson.findMany({
    where: { videoUrl: { not: null } },
    take: 5,
    orderBy: { courseId: 'desc' },
    select: { id: true, courseId: true, title: true, videoUrl: true, type: true },
  })
  console.log('LESSONS:', JSON.stringify(lessons, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
