import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Chi tiết trạng thái BRK S#4...\n')

  // 1. Members stats
  const members = await prisma.system.findMany({
    where: { onSystem: 4 },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { autoId: 'asc' }
  })

  console.log(`Tổng thành viên S#4: ${members.length}`)

  // Level distribution
  const levelCounts: Record<number, number> = {}
  for (const m of members) {
    const lvl = m.level || 1
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1
  }
  console.log('\nPhân bố level:')
  for (const [lvl, count] of Object.entries(levelCounts).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  Level ${lvl}: ${count} members`)
  }

  // Points distribution
  console.log('\nPhân bố points:')
  const pointsRanges = [
    { label: '0 pts', min: 0, max: 0 },
    { label: '1-16 pts', min: 1, max: 16 },
    { label: '17-49 pts', min: 17, max: 49 },
    { label: '50-249 pts', min: 50, max: 249 },
    { label: '250-999 pts', min: 250, max: 999 },
    { label: '1000+ pts', min: 1000, max: 999999 },
  ]
  for (const range of pointsRanges) {
    const count = members.filter(m => {
      const pts = Number(m.totalPoints || 0)
      return pts >= range.min && pts <= range.max
    }).length
    if (count > 0) console.log(`  ${range.label}: ${count} members`)
  }

  // 2. Wallet stats
  const wallets = await prisma.brkWallet.findMany({
    include: {
      transactions: { select: { type: true, balanceType: true, amount: true } }
    }
  })
  console.log(`\nVí BRK: ${wallets.length} wallets`)

  let totalCashBalance = 0
  let totalBrkdBalance = 0
  let totalVoucherBalance = 0
  for (const w of wallets) {
    totalCashBalance += Number(w.balance || 0)
    totalBrkdBalance += Number(w.brkd || 0)
    totalVoucherBalance += Number(w.voucherBalance || 0)
  }
  console.log(`  Total CASH balance: ${totalCashBalance.toLocaleString()}đ`)
  console.log(`  Total BRKD balance: ${totalBrkdBalance.toLocaleString()}`)
  console.log(`  Total VOUCHER balance: ${totalVoucherBalance.toLocaleString()}đ`)

  // 3. Transaction types breakdown
  const txTypes = await prisma.brkTransaction.groupBy({
    by: ['type', 'balanceType'],
    _count: { id: true },
    _sum: { amount: true }
  })
  console.log('\nGiao dịch:')
  for (const tx of txTypes) {
    const sum = Number(tx._sum.amount || 0)
    console.log(`  ${tx.type} (${tx.balanceType}): ${tx._count.id} giao dịch, tổng ${sum.toLocaleString()}`)
  }

  // 4. Level up records
  const levelUps = await prisma.brkLevelUpRecord.findMany({
    where: { onSystem: 4 },
    orderBy: { promotedAt: 'desc' },
    take: 10
  })
  console.log(`\nLịch sử thăng cấp (10 gần nhất):`)
  if (levelUps.length === 0) {
    console.log('  CHƯA CÓ RECORD NÀO!')
  } else {
    for (const lu of levelUps) {
      console.log(`  User#${lu.userId}: L${lu.fromLevel} → L${lu.toLevel} at ${lu.promotedAt?.toISOString()}`)
    }
  }

  // 5. Revenue pools
  const pools = await prisma.brkRevenuePool.findMany({
    where: { systemId: 4 },
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log(`\nRevenue pools (5 gần nhất):`)
  if (pools.length === 0) {
    console.log('  CHƯA CÓ POOL NÀO!')
  } else {
    for (const p of pools) {
      console.log(`  Round ${p.roundNumber}: pool=${Number(p.poolAmount).toLocaleString()}đ, qualified=${p.qualifiedCount}, status=${p.status}`)
    }
  }

  // 6. Referral bonuses
  const bonuses = await prisma.brkReferralBonus.findMany({
    where: { onSystem: 4 },
    orderBy: { id: 'desc' },
    take: 5
  })
  console.log(`\nThưởng giới thiệu 2F1 (5 gần nhất):`)
  if (bonuses.length === 0) {
    console.log('  CHƯA CÓ THƯỞNG NÀO!')
  } else {
    for (const b of bonuses) {
      console.log(`  User#${b.userId}: ${b.f1Count} F1s, claimed=${b.claimed}`)
    }
  }

  // 7. Sample 5 members with most points
  const topMembers = [...members].sort((a, b) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0)).slice(0, 5)
  console.log(`\nTop 5 thành viên nhiều điểm nhất:`)
  for (const m of topMembers) {
    console.log(`  #${m.userId} ${m.user?.name || 'N/A'}: Level ${m.level}, ${m.totalPoints} pts, refSysId=${m.refSysId}, expires=${m.expiresAt?.toISOString().slice(0, 10)}`)
  }

  // 8. Check activation times
  const now = new Date()
  const recentActivations = members.filter(m => m.activatedAt && (now.getTime() - m.activatedAt.getTime()) < 7 * 24 * 60 * 60 * 1000)
  console.log(`\nKích hoạt trong 7 ngày qua: ${recentActivations.length} members`)
  const oldActivations = members.filter(m => m.activatedAt && (now.getTime() - m.activatedAt.getTime()) >= 7 * 24 * 60 * 60 * 1000)
  console.log(`Kích hoạt từ 7+ ngày trước: ${oldActivations.length} members`)

  // 9. Check how many have gracePeriodEnd in the past (eligible for daily-eval)
  const eligibleForEval = members.filter(m => m.status === 'ACTIVE' && m.gracePeriodEnd && m.gracePeriodEnd < now)
  console.log(`\nĐủ điều kiện daily-eval (ACTIVE + grace expired): ${eligibleForEval.length}`)

  const notYetEligible = members.filter(m => m.status === 'ACTIVE' && m.gracePeriodEnd && m.gracePeriodEnd >= now)
  console.log(`Chưa đủ điều kiện (grace period chưa hết): ${notYetEligible.length}`)

  const noGracePeriod = members.filter(m => m.status === 'ACTIVE' && !m.gracePeriodEnd)
  console.log(`Không có gracePeriodEnd: ${noGracePeriod.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
