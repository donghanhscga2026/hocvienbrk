const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const isExecute = args.includes('--execute')

  console.log('==================================================')
  console.log('   SỬA: TRỪ MBDT GIFT CŨ + XÓA MBV CỘNG TRÙNG')
  console.log('==================================================')
  console.log(`Chế độ: ${isExecute ? '🔴 THỰC THI (WRITE)' : '🟢 KHẢO SÁT (DRY RUN)'}`)
  console.log('--------------------------------------------------')

  // Các wallet đã được hoàn trừ trước đó (tránh double-deduct khi chạy lại)
  const existingReversals = await prisma.brkTransaction.findMany({
    where: { description: { contains: 'Hoàn trừ quà tặng đăng ký ví MBDT' } },
    select: { walletId: true }
  })
  const alreadyReversed = new Set(existingReversals.map(r => r.walletId))
  console.log(`\n[GUARD] Số wallet đã có reversal tx (skip): ${alreadyReversed.size}`)

  // ── PART 1: MBV bị cộng trùng (>1 lần) ──────────────────────
  const mbvGiftTxs = await prisma.brkTransaction.findMany({
    where: {
      balanceType: 'MBV',
      type: 'MBV_CREDIT',
      description: { contains: 'Quà tặng đăng ký thành công' }
    },
    orderBy: { id: 'asc' }
  })

  const mbvByWallet = new Map()
  for (const tx of mbvGiftTxs) {
    const arr = mbvByWallet.get(tx.walletId) || []
    arr.push(tx)
    mbvByWallet.set(tx.walletId, arr)
  }

  const mbvDupWallets = [...mbvByWallet.entries()].filter(([, txs]) => txs.length > 1)
  console.log(`\n── PART 1: MBV cộng trùng ──`)
  console.log(`Số wallet MBV bị cộng trùng: ${mbvDupWallets.length}`)
  let mbvDupTxToDelete = 0
  for (const [walletId, txs] of mbvDupWallets) {
    const keep = txs[0]
    const remove = txs.slice(1)
    mbvDupTxToDelete += remove.length
    const mbvBalance = Number((await prisma.brkWallet.findUnique({ where: { id: walletId }, select: { mbvBalance: true } }))?.mbvBalance || 0)
    const target = Number(keep.amount)
    console.log(`  wallet ${walletId}: hiện có ${txs.length} tx, giữ tx#${keep.id}, xóa ${remove.length} tx (tx ${remove.map(t => t.id).join(',')}), mbvBalance hiện ${mbvBalance} → ${target}`)
  }
  console.log(`Tổng transaction MBV trùng sẽ xóa: ${mbvDupTxToDelete}`)

  // ── PART 2: MBDT gift cũ → trừ lại ───────────────────────────
  const mbdtGiftTxs = await prisma.brkTransaction.findMany({
    where: {
      balanceType: 'VOUCHER',
      type: 'VOUCHER_CREDIT',
      description: { contains: 'Quà tặng đăng ký thành công' }
    },
    select: { id: true, walletId: true, amount: true }
  })

  const mbdtByWallet = new Map()
  for (const tx of mbdtGiftTxs) {
    const arr = mbdtByWallet.get(tx.walletId) || []
    arr.push(tx)
    mbdtByWallet.set(tx.walletId, arr)
  }

  // Chỉ xử lý wallet chưa có reversal
  const mbdtPending = new Map()
  for (const [walletId, txs] of mbdtByWallet) {
    if (!alreadyReversed.has(walletId)) mbdtPending.set(walletId, txs)
  }

  console.log(`\n── PART 2: MBDT (VOUCHER) gift cũ cần trừ ──`)
  console.log(`Số wallet MBDT nhận gift: ${mbdtByWallet.size} (đã trừ: ${mbdtByWallet.size - mbdtPending.size}, còn cần trừ: ${mbdtPending.size})`)

  let mbdtDeductTotal = 0
  let mbdtClampedCount = 0
  let mbdtSkipCount = 0

  for (const [walletId, txs] of mbdtPending) {
    const totalGifted = txs.reduce((s, t) => s + Number(t.amount), 0)
    const wallet = await prisma.brkWallet.findUnique({ where: { id: walletId }, select: { voucherBalance: true, userId: true } })
    const current = Number(wallet?.voucherBalance || 0)
    const deduct = Math.min(current, totalGifted)
    if (deduct <= 0) {
      mbdtSkipCount++
      console.log(`  wallet ${walletId} (user ${wallet?.userId}): balance=${current}, không trừ (clamp 0)`)
    } else {
      mbdtDeductTotal += deduct
      if (deduct < totalGifted) mbdtClampedCount++
      console.log(`  wallet ${walletId} (user ${wallet?.userId}): balance=${current} → ${current - deduct} (trừ ${deduct})`)
    }
  }
  console.log(`Tổng MBDT sẽ trừ: ${mbdtDeductTotal.toLocaleString()} VND (clamp: ${mbdtClampedCount}, skip balance 0: ${mbdtSkipCount})`)

  // ── EXECUTE ───────────────────────────────────────────────────
  if (!isExecute) {
    console.log('\n💡 DRY RUN. Chưa có dữ liệu nào thay đổi.')
    console.log('💡 Chạy: node scripts/fix-mbdt-mbv.cjs --execute')
    return
  }

  // Part 1: xóa tx trùng + sửa mbvBalance
  let executedMbdt = 0
  for (const [walletId, txs] of mbvDupWallets) {
    const keep = txs[0]
    const remove = txs.slice(1)
    await prisma.$transaction([
      prisma.brkWallet.update({ where: { id: walletId }, data: { mbvBalance: Number(keep.amount) } }),
      prisma.brkTransaction.deleteMany({ where: { id: { in: remove.map(t => t.id) } } })
    ])
    executedMbdt++
  }

  // Part 2: trừ MBDT gift cũ (clamp 0), tạo ADJUSTMENT âm
  let executedReversal = 0
  for (const [walletId, txs] of mbdtPending) {
    const totalGifted = txs.reduce((s, t) => s + Number(t.amount), 0)
    const wallet = await prisma.brkWallet.findUnique({ where: { id: walletId }, select: { voucherBalance: true, userId: true } })
    const current = Number(wallet?.voucherBalance || 0)
    const deduct = Math.min(current, totalGifted)
    if (deduct <= 0) continue

    const newBalance = current - deduct
    await prisma.$transaction([
      prisma.brkWallet.update({ where: { id: walletId }, data: { voucherBalance: newBalance } }),
      prisma.brkTransaction.create({
        data: {
          walletId,
          amount: -deduct,
          type: 'ADJUSTMENT',
          description: 'Hoàn trừ quà tặng đăng ký ví MBDT (cộng nhầm)',
          balanceType: 'VOUCHER',
          balanceBefore: current,
          balanceAfter: newBalance,
        }
      })
    ])
    executedReversal++
  }

  console.log('\n✅ Đã THỰC THI:')
  console.log(`  - Sửa ${executedMbdt} wallet MBV trùng (đã xóa tx dư)`)
  console.log(`  - Hoàn trừ MBDT cho ${executedReversal} wallet (tổng ${mbdtDeductTotal.toLocaleString()} VND)`)
}

main()
  .catch(e => { console.error('Lỗi:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
