import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.findFirst({
    where: { id_khoa: 'XD_HETHONG_UP1000' }
  })
  console.log("=== DATA KHÓA HỌC XD_HETHONG_UP1000 ===")
  console.log(JSON.stringify(course, null, 2))
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
