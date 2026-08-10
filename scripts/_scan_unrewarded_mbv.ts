import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Bắt đầu quét tài khoản chưa được tặng ví MBV ===\n')

  // 1. Lấy tất cả user
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, emailVerified: true, createdAt: true }
  })

  // 2. Lấy tất cả các giao dịch MBV quà tặng đăng ký
  const giftTxs = await prisma.brkTransaction.findMany({
    where: {
      balanceType: 'MBV',
      type: 'MBV_CREDIT',
      description: { contains: 'Quà tặng đăng ký thành công' }
    },
    include: {
      wallet: true
    }
  })

  const userIdsReceived = new Set(giftTxs.map(t => t.wallet.userId))

  const unrewardedUsers = allUsers.filter(u => !userIdsReceived.has(u.id))
  const unrewardedVerified = unrewardedUsers.filter(u => u.emailVerified !== null)
  const unrewardedNotVerified = unrewardedUsers.filter(u => u.emailVerified === null)

  console.log(`- Tổng số người dùng trên hệ thống: ${allUsers.length}`)
  console.log(`- Số người dùng đã nhận quà MBV: ${userIdsReceived.size}`)
  console.log(`- Số người dùng chưa nhận quà MBV: ${unrewardedUsers.length}`)
  console.log(`  + Đã xác minh Email nhưng chưa nhận: ${unrewardedVerified.length}`)
  console.log(`  + Chưa xác minh Email (chưa hoàn tất đăng ký): ${unrewardedNotVerified.length}\n`)

  if (unrewardedVerified.length > 0) {
    console.log('=== Danh sách user đã xác minh email nhưng chưa được tặng MBV ===')
    console.table(unrewardedVerified.slice(0, 20).map(u => ({
      'ID User': u.id,
      'Tên': u.name,
      'Email': u.email,
      'SĐT': u.phone,
      'Ngày tạo': u.createdAt.toISOString().slice(0, 10)
    })))
    if (unrewardedVerified.length > 20) {
      console.log(`... và ${unrewardedVerified.length - 20} người dùng khác.`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
