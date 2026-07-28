import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔴 Đang điều chỉnh doanh số cho #1010 và #3773...')

  // Cập nhật #1010
  await prisma.system.updateMany({
    where: { userId: 1010, onSystem: 4 },
    data: { totalPoints: 1233.633 }
  })
  console.log('✅ Đã cập nhật #1010 totalPoints = 1233.633')

  // Cập nhật #3773
  await prisma.system.updateMany({
    where: { userId: 3773, onSystem: 4 },
    data: { totalPoints: 1825.444 }
  })
  console.log('✅ Đã cập nhật #3773 totalPoints = 1825.444')

  console.log('🎉 Đã hoàn thành điều chỉnh doanh số còn lại!')
}

main().finally(() => prisma.$disconnect())
