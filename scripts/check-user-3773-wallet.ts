import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 3773

  console.log(`\n🔍 KIỂM TRA LỊCH SỬ VÍ BRK CỦA USER #${userId}\n`)

  // 1. Lấy thông tin User & Wallet
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, email: true }
  })

  if (!user) {
    console.error(`❌ Không tìm thấy User #${userId} trong hệ thống.`)
    return
  }

  console.log(`👤 Học viên: ${user.name || 'N/A'}`)
  console.log(`📞 Điện thoại: ${user.phone || 'N/A'}`)
  console.log(`✉️ Email: ${user.email || 'N/A'}\n`)

  const wallet = await prisma.brkWallet.findUnique({
    where: { userId }
  })

  if (!wallet) {
    console.log(`ℹ️ User #${userId} chưa được khởi tạo ví BrkWallet trong DB.`)
    return
  }

  console.log(`💳 THÔNG TIN VÍ HIỆN TẠI (Bảng: brk_wallet)`)
  console.log(`   - Số dư tiền mặt (CASH): ${Number(wallet.balance).toLocaleString('vi-VN')} VND`)
  console.log(`   - Số dư BRKD:            ${Number(wallet.brkd).toLocaleString('vi-VN')} BRKD`)
  console.log(`   - Số dư ví VOUCHER:      ${Number(wallet.voucherBalance).toLocaleString('vi-VN')} VND`)
  console.log(`   - Tổng thu nhập đã nhận: ${Number(wallet.totalEarned).toLocaleString('vi-VN')} VND`)
  console.log(`   - Tổng đã rút:           ${Number(wallet.totalWithdrawn).toLocaleString('vi-VN')} VND`)
  console.log(`   - Cập nhật lần cuối:    ${wallet.updatedAt.toISOString()}\n`)

  // 2. Lấy danh sách giao dịch
  const txs = await prisma.brkTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' }
  })

  console.log(`📜 LỊCH SỬ GIAO DỊCH VÍ (Bảng: brk_transaction) - Tổng số: ${txs.length} giao dịch\n`)

  if (txs.length === 0) {
    console.log(`   (Chưa có phát sinh giao dịch nào)`)
  } else {
    txs.forEach((tx) => {
      const timeStr = tx.createdAt.toLocaleString('vi-VN')
      const amountSign = Number(tx.amount) >= 0 ? '+' : ''
      const amountStr = `${amountSign}${Number(tx.amount).toLocaleString('vi-VN')} VND`
      
      console.log(`⏱️ [${timeStr}] | ${tx.type} | Ví: ${tx.balanceType}`)
      console.log(`   💰 Biến động:   ${amountStr}`)
      console.log(`   📊 Số dư:       ${Number(tx.balanceBefore).toLocaleString('vi-VN')} ➔ ${Number(tx.balanceAfter).toLocaleString('vi-VN')}`)
      console.log(`   📝 Nội dung:    ${tx.description}`)
      if (tx.refId) {
        console.log(`   🔗 Tham chiếu:  refId=${tx.refId}${tx.sourceMemberId ? `, sourceMemberId=${tx.sourceMemberId}` : ''}`)
      }
      console.log(`   ------------------------------------------------------------`)
    })
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
