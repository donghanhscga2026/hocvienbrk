const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const BRKD_PER_ACTIVATION = 12_868_686

async function main() {
  console.log('=== BẮT ĐẦU RECALCULATE BRK SYSTEM 4 ===\n')

  // 1. Lấy danh sách member system 4 theo thứ tự activation
  const members = await prisma.$queryRaw`
    SELECT s."autoId", s."userId", u.name, s."activatedAt", s.level
    FROM system s JOIN "User" u ON u.id = s."userId"
    WHERE s."onSystem" = 4 AND s.status = 'ACTIVE'
    ORDER BY s."activatedAt"
  `
  console.log(`Tổng số member: ${members.length}`)
  const userIds = members.map(m => m.userId)

  // 2. Lấy wallet IDs của các member
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: userIds } }
  })
  const walletIds = wallets.map(w => w.id)
  console.log(`Tìm thấy ${wallets.length} wallets`)

  // 3. Xóa COMMISSION + BRKD_CREDIT cũ (từ distribution sai)
  // Xóa theo walletId và type/refId pattern
  let deleted = 0
  for (const wid of walletIds) {
    const result = await prisma.brkTransaction.deleteMany({
      where: {
        walletId: wid,
        type: { in: ['COMMISSION', 'BRKD_CREDIT'] },
        refId: { startsWith: 'sys_4_member_' }
      }
    })
    deleted += result.count
  }
  console.log(`Đã xóa ${deleted} giao dịch COMMISSION/BRKD_CREDIT cũ`)

  // 4. Reset wallet balance/brkd/totalEarned về 0
  for (const wid of userIds) {
    await prisma.brkWallet.updateMany({
      where: { userId: wid },
      data: { balance: 0, brkd: 0, totalEarned: 0 }
    })
  }
  console.log('Đã reset wallet (balance=0, brkd=0, totalEarned=0)')

  // 5. Credit self BRKD cho từng member tại thời điểm activatedAt
  let count = 0
  for (const m of members) {
    const wallet = await prisma.brkWallet.findUnique({ where: { userId: m.userId } })
    if (!wallet) {
      console.log(`  SKIP userId=${m.userId} - no wallet`)
      continue
    }

    const oldBrkd = Number(wallet.brkd)
    const newBrkd = oldBrkd + BRKD_PER_ACTIVATION

    await prisma.$transaction([
      prisma.brkWallet.update({
        where: { userId: m.userId },
        data: { brkd: newBrkd }
      }),
      prisma.brkTransaction.create({
        data: {
          walletId: wallet.id,
          amount: BRKD_PER_ACTIVATION,
          type: 'BRKD_CREDIT',
          description: 'BRKD tự kích hoạt hệ thống BRK',
          refId: 'self_activate_sys_4',
          balanceType: 'BRKD',
          balanceBefore: oldBrkd,
          balanceAfter: newBrkd,
          createdAt: m.activatedAt,
        }
      })
    ])
    count++
  }
  console.log(`\nĐã credit self BRKD (${BRKD_PER_ACTIVATION.toLocaleString()}) cho ${count} member`)

  // 6. Verify kết quả
  console.log('\n=== VERIFY ===')
  const finalWallets = await prisma.$queryRaw`
    SELECT w."userId", u.name, w.balance, w.brkd, w."voucherBalance", w."totalEarned"
    FROM brk_wallet w JOIN "User" u ON u.id = w."userId"
    WHERE w."userId" IN (${userIds.join(',')})
    ORDER BY w."userId"
  `
  for (const w of finalWallets) {
    console.log(
      `  #${String(w.userId).padEnd(5)} ${String(w.name).trim().padEnd(25)}` +
      ` | Cash: ${String(w.balance).padStart(10)}` +
      ` | BRKD: ${String(w.brkd).padStart(12)}` +
      ` | Voucher: ${String(w.voucherBalance).padStart(10)}`
    )
  }

  const txnResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM brk_transaction t
    JOIN brk_wallet w ON w.id = t."walletId"
    WHERE w."userId" IN (${userIds.join(',')})
  `
  console.log(`\nTổng giao dịch còn lại: ${txnResult[0].cnt}`)

  await prisma.$disconnect()
  console.log('\n=== HOÀN TẤT ===')
}

main().catch(e => {
  console.error('ERROR:', e)
  process.exit(1)
})
