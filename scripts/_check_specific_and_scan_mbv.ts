import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const targetIds = [1403, 1531, 1486, 1461]

  console.log('=== Kiểm tra 4 user cụ thể ===\n')
  for (const id of targetIds) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true }
    })
    if (!user) {
      console.log(`User #${id}: KHÔNG TỒN TẠI`)
      continue
    }
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: id } })
    const gift = wallet ? await prisma.brkTransaction.findFirst({
      where: {
        walletId: wallet.id,
        balanceType: 'MBV',
        type: 'MBV_CREDIT',
        description: { contains: 'Quà tặng đăng ký thành công' }
      }
    }) : null

    console.log(`User #${id} - ${user.name} (${user.email})`)
    console.log(`  emailVerified: ${user.emailVerified ? user.emailVerified.toISOString() : 'CHƯA XÁC MINH'}`)
    console.log(`  Đã nhận quà MBV 386386: ${gift ? 'CÓ (tx#' + gift.id + ', ' + gift.createdAt.toISOString() + ')' : 'CHƯA'}`)
    console.log(`  mbvBalance hiện tại: ${wallet?.mbvBalance ?? 'N/A (chưa có wallet)'}`)
    console.log('')
  }

  console.log('\n=== Quét toàn hệ thống: đã verify email nhưng chưa nhận quà MBV ===\n')
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, emailVerified: true, createdAt: true }
  })
  const giftTxs = await prisma.brkTransaction.findMany({
    where: {
      balanceType: 'MBV',
      type: 'MBV_CREDIT',
      description: { contains: 'Quà tặng đăng ký thành công' }
    },
    include: { wallet: true }
  })
  const userIdsReceived = new Set(giftTxs.map(t => t.wallet.userId))
  const unrewardedUsers = allUsers.filter(u => !userIdsReceived.has(u.id))
  const unrewardedVerified = unrewardedUsers.filter(u => u.emailVerified !== null)
  const unrewardedNotVerified = unrewardedUsers.filter(u => u.emailVerified === null)

  console.log(`- Tổng số người dùng: ${allUsers.length}`)
  console.log(`- Đã nhận quà MBV: ${userIdsReceived.size}`)
  console.log(`- Chưa nhận quà MBV: ${unrewardedUsers.length}`)
  console.log(`  + Đã xác minh email nhưng CHƯA nhận (bất thường): ${unrewardedVerified.length}`)
  console.log(`  + Chưa xác minh email (bình thường, đang chờ): ${unrewardedNotVerified.length}\n`)

  if (unrewardedVerified.length > 0) {
    console.log('=== DANH SÁCH bất thường: đã verify nhưng chưa nhận MBV ===')
    console.table(unrewardedVerified.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      emailVerified: u.emailVerified!.toISOString().slice(0, 19),
      createdAt: u.createdAt.toISOString().slice(0, 10)
    })))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
