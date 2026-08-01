import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.brkTransaction.count({
    where: {
      balanceType: 'MBV',
      type: 'MBV_CREDIT',
      description: { contains: 'Quà tặng đăng ký thành công' }
    }
  })
  const totalUsers = await prisma.user.count()
  console.log(`Đã cộng MBV gift cho: ${count} user`)
  console.log(`Tổng số user: ${totalUsers}`)
}

main().finally(async () => { await prisma.$disconnect() })
