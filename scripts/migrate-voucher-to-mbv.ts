import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const isExecute = args.includes('--execute')

  console.log('==================================================')
  console.log('   SCRIPT QUY ĐỔI VOUCHER → MBV (1:1)')
  console.log('==================================================')
  console.log(`Chế độ: ${isExecute ? '🔴 THỰC THI (WRITE)' : '🟢 KHẢO SÁT (DRY RUN)'}`)
  console.log('--------------------------------------------------')

  const wallets = await prisma.brkWallet.findMany({
    where: { voucherBalance: { gt: 0 } },
    select: {
      id: true,
      userId: true,
      voucherBalance: true,
      mbvBalance: true,
      user: { select: { name: true, email: true } }
    },
    orderBy: { userId: 'asc' }
  })

  const totalVoucher = wallets.reduce((s, w) => s + Number(w.voucherBalance), 0)
  const totalMbvAfter = wallets.reduce((s, w) => s + Number(w.mbvBalance) + Number(w.voucherBalance), 0)
  const currentMbvTotal = wallets.reduce((s, w) => s + Number(w.mbvBalance), 0)

  console.log(`Tổng số ví có voucherBalance > 0: ${wallets.length}`)
  console.log(`Tổng Voucher sẽ quy đổi: ${totalVoucher.toLocaleString()}`)
  console.log(`Tổng MBV hiện tại (các ví này): ${currentMbvTotal.toLocaleString()}`)
  console.log(`Tổng MBV sau quy đổi: ${totalMbvAfter.toLocaleString()}`)
  console.log('--------------------------------------------------')

  if (wallets.length === 0) {
    console.log('Không có ví nào cần quy đổi.')
    return
  }

  console.log('Chi tiết các ví sẽ được quy đổi (tối đa 30 dòng):')
  wallets.slice(0, 30).forEach(w => {
    console.log(
      `  #${w.userId} (${w.user.name || 'N/A'}) — Voucher: ${Number(w.voucherBalance).toLocaleString()} → MBV: ${Number(w.mbvBalance).toLocaleString()} → ${(Number(w.mbvBalance) + Number(w.voucherBalance)).toLocaleString()}`
    )
  })
  if (wallets.length > 30) {
    console.log(`  ... và ${wallets.length - 30} ví khác`)
  }
  console.log('--------------------------------------------------')

  if (!isExecute) {
    console.log('💡 Đây là bản chạy KHẢO SÁT (DRY RUN). Chưa có dữ liệu nào thay đổi.')
    console.log('💡 Chạy lệnh sau để THỰC THI THỰC TẾ:')
    console.log('   npx tsx scripts/migrate-voucher-to-mbv.ts --execute')
    return
  }

  let processed = 0
  let skipped = 0

  for (const wallet of wallets) {
    const amount = Number(wallet.voucherBalance)
    const refId = `voucher_to_mbv_${wallet.id}`

    const existing = await prisma.brkTransaction.findFirst({
      where: { walletId: wallet.id, refId, type: 'MBV_CREDIT' }
    })
    if (existing) {
      skipped++
      continue
    }

    const oldMbv = Number(wallet.mbvBalance)
    const oldVoucher = Number(wallet.voucherBalance)

    await prisma.$transaction(async (tx) => {
      await tx.brkWallet.update({
        where: { id: wallet.id },
        data: {
          mbvBalance: { increment: amount },
          voucherBalance: 0
        }
      })

      await tx.brkTransaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'MBV_CREDIT',
          description: 'Quy đổi điểm thưởng Voucher → MBV (1:1)',
          refId,
          balanceType: 'MBV',
          balanceBefore: oldMbv,
          balanceAfter: oldMbv + amount
        }
      })

      await tx.brkTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: 'ADJUSTMENT',
          description: 'Quy đổi điểm thưởng Voucher → MBV (1:1)',
          refId,
          balanceType: 'VOUCHER',
          balanceBefore: oldVoucher,
          balanceAfter: 0
        }
      })
    })

    processed++
    console.log(`✅ #${wallet.userId} (${wallet.user.name || 'N/A'}): +${amount.toLocaleString()} MBV, Voucher → 0`)
  }

  console.log('--------------------------------------------------')
  console.log('                  KẾT QUẢ THỰC THI')
  console.log('--------------------------------------------------')
  console.log(`- Ví đã quy đổi: ${processed}`)
  console.log(`- Ví đã có trước đó (bỏ qua): ${skipped}`)
  console.log('--------------------------------------------------')

  const after = await prisma.brkWallet.findMany({
    where: { userId: { in: wallets.map(w => w.userId) } },
    select: { voucherBalance: true, mbvBalance: true }
  })
  const afterVoucher = after.reduce((s, w) => s + Number(w.voucherBalance), 0)
  const afterMbv = after.reduce((s, w) => s + Number(w.mbvBalance), 0)
  console.log(`- Voucher còn lại: ${afterVoucher.toLocaleString()}`)
  console.log(`- MBV sau quy đổi: ${afterMbv.toLocaleString()}`)
  console.log('✅ Hoàn thành cập nhật database thực tế.')
}

main()
  .catch((e) => {
    console.error('Lỗi khi chạy script:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
