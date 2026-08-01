import { PrismaClient } from '@prisma/client'
import { creditMbvWallet } from '../lib/brk/wallet-service'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const isExecute = args.includes('--execute')

  console.log('==================================================')
  console.log('   SCRIPT CỘNG 386.386 MBV CHO TOÀN BỘ HỌC VIÊN')
  console.log('==================================================')
  console.log(`Chế độ: ${isExecute ? '🔴 THỰC THI (WRITE)' : '🟢 KHẢO SÁT (DRY RUN)'}`)
  console.log('--------------------------------------------------')

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true
    }
  })

  console.log(`Tìm thấy tổng cộng ${allUsers.length} học viên trong hệ thống.`)

  let processedCount = 0
  let skipCount = 0

  for (const user of allUsers) {
    let wallet = await prisma.brkWallet.findUnique({
      where: { userId: user.id }
    })

    if (!wallet) {
      if (isExecute) {
        wallet = await prisma.brkWallet.create({
          data: { userId: user.id }
        })
      } else {
        wallet = { id: 0, userId: user.id, mbvBalance: 0 } as any
      }
    }

    let hasGift = false
    if (wallet && wallet.id > 0) {
      const giftTx = await prisma.brkTransaction.findFirst({
        where: {
          walletId: wallet.id,
          balanceType: 'MBV',
          type: 'MBV_CREDIT',
          description: { contains: 'Quà tặng đăng ký thành công' }
        }
      })
      if (giftTx) {
        hasGift = true
      }
    }

    if (hasGift) {
      skipCount++
      console.log(`[SKIP] Học viên #${user.id} (${user.name}) - ${user.email} đã nhận quà MBV trước đó.`)
      continue
    }

    processedCount++
    console.log(`[PROCESS] Học viên #${user.id} (${user.name}) - ${user.email} chuẩn bị nhận +386.386 MBV. Current Balance: ${wallet ? wallet.mbvBalance : 0}`)

    if (isExecute) {
      try {
        await creditMbvWallet(
          user.id,
          386386,
          'Quà tặng đăng ký thành công ví MBV'
        )
      } catch (err: any) {
        console.error(`❌ Lỗi cộng tiền cho học viên #${user.id}:`, err.message)
      }
    }
  }

  console.log('--------------------------------------------------')
  console.log('                  KẾT QUẢ RÀ SOÁT')
  console.log('--------------------------------------------------')
  console.log(`- Số lượng học viên nhận quà MBV: ${processedCount}`)
  console.log(`- Số lượng học viên đã có quà MBV (bỏ qua): ${skipCount}`)
  console.log('--------------------------------------------------')

  if (!isExecute) {
    console.log('💡 Đây là bản chạy KHẢO SÁT (DRY RUN). Chưa có dữ liệu nào thay đổi.')
    console.log('💡 Chạy lệnh sau để THỰC THI THỰC TẾ:')
    console.log('   npx tsx scripts/award-signup-mbv.ts --execute')
  } else {
    console.log('✅ Hoàn thành cập nhật database thực tế.')
  }
}

main()
  .catch((e) => {
    console.error('Lỗi khi chạy script:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
