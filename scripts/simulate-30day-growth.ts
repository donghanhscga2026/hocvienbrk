import prisma from '../lib/prisma'

const BRKP_PER_ACTIVATION = 17
const BRKD_PER_ACTIVATION = 12_868_686
const FEE = 26868

const LEVEL_CONFIGS = [
  { level: 1, pct: 21, req: 17, gift: 0 },
  { level: 2, pct: 30, req: 50, gift: 386000 },
  { level: 3, pct: 39, req: 250, gift: 1000000 },
  { level: 4, pct: 52.5, req: 1000, gift: 2000000 },
  { level: 5, pct: 64.5, req: 4000, gift: 4000000 },
]

interface SimMember {
  userId: number
  name: string
  level: number
  points: number
  refSysId: number
  autoId: number
  activatedAt: Date
  commissionEarned: number
  brkdEarned: number
  voucherEarned: number
  revenueShareEarned: number
  levelUpRecords: { from: number; to: number; day: number }[]
  returnFeePaid: boolean
}

let nextAutoId = 10000
let nextUserId = 2000

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function getDepthFromRoot(state: Map<number, SimMember>, userId: number): number {
  let depth = 0
  let cur = userId
  while (cur > 0) {
    const m = state.get(cur)
    if (!m || m.refSysId === 0) break
    depth++
    cur = m.refSysId
  }
  return depth
}

function bfsFirstAvailable(
  state: Map<number, SimMember>,
  tree: Map<number, number[]>,
  startUserId: number
): { userId: number; depth: number } | null {
  const queue = [startUserId]
  const visited = new Set<number>()

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (visited.has(cur)) continue
    visited.add(cur)

    const children = tree.get(cur) || []
    if (children.length < 4) {
      return { userId: cur, depth: getDepthFromRoot(state, cur) }
    }

    for (const child of children) {
      queue.push(child)
    }
  }
  return null
}

function resolvePlacementSim(
  state: Map<number, SimMember>,
  tree: Map<number, number[]>,
  rootUserId: number,
  referrerUserId: number | null
): number {
  if (!rootUserId) return 0

  const globalSlot = bfsFirstAvailable(state, tree, rootUserId)
  if (!globalSlot) return 0

  if (globalSlot.depth < 2) {
    return globalSlot.userId
  }

  if (referrerUserId && referrerUserId !== rootUserId) {
    const refSlot = bfsFirstAvailable(state, tree, referrerUserId)
    if (refSlot) return refSlot.userId
  }

  return globalSlot.userId
}

async function main() {
  console.log('=== BRK 30-DAY GROWTH SIMULATION ===')
  console.log('')
  console.log('Loading seed data (56 current members)...')

  const systems = await prisma.system.findMany({
    where: { onSystem: 4, status: 'ACTIVE' },
    select: { userId: true, level: true, totalPoints: true, refSysId: true, autoId: true, activatedAt: true },
    orderBy: { activatedAt: 'asc' }
  })

  const users = await prisma.user.findMany({
    where: { id: { in: systems.map(s => s.userId) } },
    select: { id: true, name: true }
  })
  const nameMap = new Map(users.map(u => [u.id, u.name]))

  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: systems.map(s => s.userId) } }
  })
  const walletMap = new Map(wallets.map(w => [w.userId, { balance: Number(w.balance), brkd: Number(w.brkd), voucherBalance: Number(w.voucherBalance), totalEarned: Number(w.totalEarned) }]))

  const state: Map<number, SimMember> = new Map()
  const tree: Map<number, number[]> = new Map()

  for (const sys of systems) {
    const w = walletMap.get(sys.userId)
    state.set(sys.userId, {
      userId: sys.userId,
      name: nameMap.get(sys.userId) || `#${sys.userId}`,
      level: sys.level,
      points: Number(sys.totalPoints),
      refSysId: sys.refSysId,
      autoId: sys.autoId,
      activatedAt: sys.activatedAt || new Date(),
      commissionEarned: w?.balance || 0,
      brkdEarned: w?.brkd || 0,
      voucherEarned: w?.voucherBalance || 0,
      revenueShareEarned: 0,
      levelUpRecords: [],
      returnFeePaid: true,
    })

    if (sys.refSysId > 0) {
      const existing = tree.get(sys.refSysId) || []
      existing.push(sys.userId)
      tree.set(sys.refSysId, existing)
    }
  }

  const rootUserId = systems.find(s => s.refSysId === 0)?.userId || 0
  const seedUserIds = systems.map(s => s.userId)

  console.log(`  Root: #${rootUserId}`)
  console.log(`  Seed members: ${seedUserIds.length}`)
  console.log('')

  // --- GROWTH PARAMETERS ---
  const dailyNew: Record<string, number> = {
    '2026-07-02': 21, '2026-07-03': 5, '2026-07-04': 9,
    '2026-07-05': 2, '2026-07-06': 2, '2026-07-07': 13, '2026-07-08': 4
  }
  const growthRates: number[] = []
  let prevTotal = 0
  for (const [day, count] of Object.entries(dailyNew).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (prevTotal > 0) growthRates.push(count / prevTotal)
    prevTotal += count
  }
  const avgGrowthRate = growthRates.reduce((s, r) => s + r, 0) / growthRates.length
  const minRate = avgGrowthRate * 0.3
  const maxRate = avgGrowthRate * 1.2

  console.log('=== Growth Parameters ===')
  console.log(`  Avg daily growth rate (7 days): ${(avgGrowthRate * 100).toFixed(2)}%`)
  console.log(`  Simulation range: ${(minRate * 100).toFixed(2)}% to ${(maxRate * 100).toFixed(2)}%`)
  console.log(`  Simulation days: 8 to 30 (${23} days)`)
  console.log('')

  // --- SIMULATION ---
  const SHARE_PCT = 2.0
  let totalCommission = 0
  let totalBrkd = 0
  let totalVoucher = 0
  let totalRevenueShare = 0
  let periodNumber = 1
  let currentPeriodStartDay = 8
  let totalMembers = 56
  const periodLog: { period: number; days: string; newMembers: number; totalMembers: number; qualified: number; poolAmount: number; perPerson: number; cumulativeRevShare: number }[] = []

  for (let day = 8; day <= 30; day++) {
    const rate = rand(minRate, maxRate)
    const targetTotal = Math.round(totalMembers * (1 + rate))
    const numNew = targetTotal - totalMembers
    if (numNew <= 0) continue

    // Create members for this day
    for (let i = 0; i < numNew; i++) {
      const newUserId = nextUserId++
      const newAutoId = nextAutoId++
      const referrerUserId = seedUserIds[Math.floor(Math.random() * seedUserIds.length)]
      const refSysId = resolvePlacementSim(state, tree, rootUserId, referrerUserId)

      // Place in tree
      const newMember: SimMember = {
        userId: newUserId,
        name: `Thành viên #${newUserId}`,
        level: 1,
        points: BRKP_PER_ACTIVATION,
        refSysId,
        autoId: newAutoId,
        activatedAt: new Date(2026, 6, day),
        commissionEarned: 0,
        brkdEarned: 0,
        voucherEarned: 0,
        revenueShareEarned: 0,
        levelUpRecords: [],
        returnFeePaid: false,
      }
      state.set(newUserId, newMember)

      if (refSysId > 0) {
        const existing = tree.get(refSysId) || []
        existing.push(newUserId)
        tree.set(refSysId, existing)
      }

      // Walk up ancestry chain: add points + pay commission
      let currentRef = refSysId
      let previousPct = 21

      while (currentRef > 0) {
        const upMember = state.get(currentRef)
        if (!upMember) break

        upMember.points += BRKP_PER_ACTIVATION

        const upConfig = LEVEL_CONFIGS.find(c => c.level === upMember.level) || LEVEL_CONFIGS[0]
        const earnPct = upConfig.pct - previousPct

        if (earnPct > 0) {
          const commAmt = (FEE * earnPct) / 100
          upMember.commissionEarned += commAmt
          totalCommission += commAmt

          const brkdAmt = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100)
          upMember.brkdEarned += brkdAmt
          totalBrkd += brkdAmt
        }

        previousPct = Math.max(previousPct, upConfig.pct)
        currentRef = upMember.refSysId
      }
    }

    totalMembers = state.size

    // Level check (multi-pass)
    let hasLevelUp = true
    while (hasLevelUp) {
      hasLevelUp = false
      for (const member of state.values()) {
        const currentLvl = member.level
        const nextConfig = LEVEL_CONFIGS.find(c => c.level === currentLvl + 1)

        if (nextConfig && member.points >= nextConfig.req) {
          member.level = nextConfig.level
          hasLevelUp = true
          member.levelUpRecords.push({ from: currentLvl, to: nextConfig.level, day })

          if (nextConfig.gift > 0) {
            member.voucherEarned += nextConfig.gift
            totalVoucher += nextConfig.gift
          }
        }
      }
    }

    // Return fee (after 1 day grace)
    for (const member of state.values()) {
      if (!member.returnFeePaid && member.activatedAt) {
        const graceEnd = new Date(member.activatedAt.getTime() + 1 * 24 * 60 * 60 * 1000)
        const dayDate = new Date(2026, 6, day, 23, 59, 59)
        if (graceEnd <= dayDate) {
          const cashback = (FEE * 21) / 100
          member.commissionEarned += cashback
          member.returnFeePaid = true
          totalCommission += cashback
        }
      }
    }

    // Revenue share (every 3 days)
    if ((day - 7) % 3 === 0) {
      const newActivationCount = [...state.values()].filter(m => {
        const aDay = m.activatedAt.getDate()
        return aDay >= currentPeriodStartDay && aDay <= day
      }).length

      const totalRevenue = newActivationCount * FEE
      const poolAmount = (totalRevenue * SHARE_PCT) / 100

      const qualified = [...state.values()].filter(m => {
        const children = tree.get(m.userId) || []
        return children.length >= 1
      })

      const qualifiedCount = qualified.length
      let amountPerPerson = 0
      if (qualifiedCount > 0 && poolAmount > 0) {
        amountPerPerson = Math.floor((poolAmount * 100) / qualifiedCount) / 100
        for (const q of qualified) {
          q.revenueShareEarned += amountPerPerson
          totalRevenueShare += amountPerPerson
        }
      }

      periodLog.push({
        period: periodNumber,
        days: `${currentPeriodStartDay}/7 → ${day}/7`,
        newMembers: newActivationCount,
        totalMembers: state.size,
        qualified: qualifiedCount,
        poolAmount,
        perPerson: amountPerPerson,
        cumulativeRevShare: totalRevenueShare
      })

      currentPeriodStartDay = day + 1
      periodNumber++
    }
  }

  // --- REPORT ---
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('   KẾT QUẢ NGÀY 31 - SAU 30 NGÀY MÔ PHỎNG')
  console.log('═══════════════════════════════════════════════')
  console.log('')

  // Summary
  const levelDist: Record<number, number> = {}
  for (const m of state.values()) {
    levelDist[m.level] = (levelDist[m.level] || 0) + 1
  }

  const maxDepth = Math.max(...[...state.values()].map(m => getDepthFromRoot(state, m.userId)))
  const maxWidth = Math.max(...[...tree.values()].map(c => c.length), 0)

  console.log('=== TỔNG QUAN ===')
  console.log(`Tổng số thành viên: ${state.size}`)
  console.log(`Tổng số ngày mô phỏng: 23 ngày (8/7 → 30/7)`)
  console.log(`Số thành viên mới (mô phỏng): ${state.size - 56}`)
  console.log(`Cấu trúc cây: depth=${maxDepth}, max width=${maxWidth}`)
  console.log('')
  console.log('=== PHÂN BỐ LEVEL ===')
  for (const lv of [1, 2, 3, 4, 5]) {
    const cnt = levelDist[lv] || 0
    const pct = ((cnt / state.size) * 100).toFixed(1)
    console.log(`  Level ${lv}: ${cnt} thành viên (${pct}%)`)
  }
  console.log('')

  console.log('=== TÀI CHÍNH ===')
  const totalFees = (state.size - 56) * FEE
  console.log(`Tổng phí thu từ thành viên mới: ${totalFees.toLocaleString('vi')} VND`)
  console.log(`Tổng hoa hồng (CASH) đã trả: ${Math.round(totalCommission).toLocaleString('vi')} VND (${(totalCommission/totalFees*100).toFixed(1)}% của phí)`)
  console.log(`Tổng BRKD đã phát: ${Math.round(totalBrkd).toLocaleString('vi')} BRKD`)
  console.log(`Tổng VOUCHER đã thưởng: ${Math.round(totalVoucher).toLocaleString('vi')} VND`)
  console.log(`Tổng REVENUE SHARE đã chia: ${Math.round(totalRevenueShare).toLocaleString('vi')} VND`)
  console.log(`Tổng chi trả: ${Math.round(totalCommission + totalVoucher + totalRevenueShare).toLocaleString('vi')} VND`)
  console.log(`Tỉ lệ chi trả/phí thu: ${(((totalCommission + totalVoucher + totalRevenueShare) / totalFees) * 100).toFixed(1)}%`)
  console.log('')

  // Top earners
  const allMembers = [...state.values()]
  console.log('=== TOP 10 THU NHẬP CAO NHẤT (CASH) ===')
  const topCash = [...allMembers].sort((a, b) => b.commissionEarned - a.commissionEarned).slice(0, 10)
  for (const m of topCash) {
    console.log(`  #${m.userId} ${m.name.padEnd(25)} Lv${m.level} pts=${m.points} Cash=${Math.round(m.commissionEarned).toLocaleString('vi')} BRKD=${Math.round(m.brkdEarned).toLocaleString('vi')} Voucher=${Math.round(m.voucherEarned).toLocaleString('vi')}`)
  }
  console.log('')

  console.log('=== TOP 10 BRKD CAO NHẤT ===')
  const topBrkd = [...allMembers].sort((a, b) => b.brkdEarned - a.brkdEarned).slice(0, 10)
  for (const m of topBrkd) {
    console.log(`  #${m.userId} ${m.name.padEnd(25)} BRKD=${Math.round(m.brkdEarned).toLocaleString('vi')}`)
  }
  console.log('')

  // Level-up statistics
  const lvlUpCount = [...state.values()].reduce((s, m) => s + m.levelUpRecords.length, 0)
  const membersWithLevelUp = [...state.values()].filter(m => m.levelUpRecords.length > 0).length
  console.log('=== LEVEL-UP STATS ===')
  console.log(`Tổng level-up records: ${lvlUpCount}`)
  console.log(`Số member được thăng cấp: ${membersWithLevelUp}`)
  const multiPromo = [...state.values()].filter(m => m.levelUpRecords.length >= 2).length
  console.log(`Số member thăng 2 cấp trở lên: ${multiPromo}`)
  console.log('')

  // Revenue share pools
  console.log('=== CHI TIẾT ĐỒNG CHIA (REVENUE SHARE) ===')
  console.log('  (Mới = số member kích hoạt trong kỳ; Đủ ĐK = có ≥1 F1; Nhận/kỳ = tiền mỗi người được chia kỳ đó)')
  console.log('')
  console.log(`  ${'Kỳ'.padEnd(5)} ${'Ngày'.padEnd(14)} ${'Mới'.padEnd(6)} ${'Tổng'.padEnd(7)} ${'Đủ ĐK'.padEnd(7)} ${'Pool(VND)'.padEnd(14)} ${'Nhận/kỳ'.padEnd(10)} ${'Lũy kế mỗi người'.padEnd(18)} ${'Tổng đã chia'.padEnd(15)}`)
  console.log('  ' + '─'.repeat(100))
  let perPersonCumulative = 0
  for (const p of periodLog) {
    perPersonCumulative += p.perPerson
    console.log(`  ${String(p.period).padEnd(5)} ${p.days.padEnd(14)} ${String(p.newMembers).padEnd(6)} ${String(p.totalMembers).padEnd(7)} ${String(p.qualified).padEnd(7)} ${Math.round(p.poolAmount).toLocaleString('vi').padEnd(14)} ${p.perPerson.toLocaleString('vi').padEnd(10)} ${perPersonCumulative.toLocaleString('vi').padEnd(18)} ${Math.round(p.cumulativeRevShare).toLocaleString('vi').padEnd(15)}`)
  }
  const lastEntry = periodLog[periodLog.length - 1]
  if (lastEntry) {
    const totalPool = periodLog.reduce((s,p) => s + p.poolAmount, 0)
    const totalNew = periodLog.reduce((s,p) => s + p.newMembers, 0)
    console.log('  ' + '─'.repeat(100))
    console.log(`  ${'TỔNG'.padEnd(5)} ${''.padEnd(14)} ${String(totalNew).padEnd(6)} ${String(lastEntry.totalMembers).padEnd(7)} ${'—'.padEnd(7)} ${Math.round(totalPool).toLocaleString('vi').padEnd(14)} ${'—'.padEnd(10)} ${perPersonCumulative.toLocaleString('vi').padEnd(18)} ${Math.round(lastEntry.cumulativeRevShare).toLocaleString('vi').padEnd(15)}`)
    console.log('')
    console.log(`  ➜ Member đủ điều kiện cả 7 kỳ nhận tổng cộng: ${perPersonCumulative.toLocaleString('vi')} VND`)
    console.log(`  ➜ Trung bình mỗi kỳ: ${(perPersonCumulative / periodLog.length).toFixed(0)} VND/người`)
  }
  console.log('')

  // Top 10 seed members (original 56) by end state
  console.log('=== TOP 10 SEED MEMBERS (CUỐI KỲ) ===')
  const seedEndState = [...state.values()].filter(m => seedUserIds.includes(m.userId)).sort((a, b) => b.commissionEarned - a.commissionEarned).slice(0, 10)
  for (const m of seedEndState) {
    const initEarned = walletMap.get(m.userId)?.balance || 0
    const simEarned = m.commissionEarned - initEarned
    console.log(`  #${m.userId} ${m.name.padEnd(25)} Lv${m.level} pts=${m.points} +Cash=${Math.round(simEarned).toLocaleString('vi')} +BRKD=${Math.round(m.brkdEarned - (walletMap.get(m.userId)?.brkd || 0)).toLocaleString('vi')} Children=${(tree.get(m.userId) || []).length}`)
  }
  console.log('')

  // Level-up promotion records
  console.log('=== PROMOTION RECORDS (LEVEL-UP) ===')
  const allPromotions = [...state.values()]
    .filter(m => m.levelUpRecords.length > 0)
    .sort((a, b) => b.levelUpRecords.length - a.levelUpRecords.length)
  for (const m of allPromotions.slice(0, 20)) {
    const records = m.levelUpRecords.map(r => `Lv${r.from}→Lv${r.to}@day${r.day}`).join(', ')
    console.log(`  #${m.userId} ${m.name.padEnd(25)} ${records}`)
  }
  if (allPromotions.length > 20) {
    console.log(`  ... và ${allPromotions.length - 20} member khác`)
  }
  console.log('')

  // New member achievement
  const newMembers = [...state.values()].filter(m => !seedUserIds.includes(m.userId))
  const newPromoted = newMembers.filter(m => m.level > 1)
  console.log('=== THÀNH TÍCH THÀNH VIÊN MỚI ===')
  console.log(`Member mới: ${newMembers.length}`)
  console.log(`Member mới được thăng cấp: ${newPromoted.length}`)
  const newLvlUpCount = [...newPromoted].reduce((s, m) => s + m.levelUpRecords.length, 0)
  console.log(`Level-up records từ member mới: ${newLvlUpCount}`)
  const highestNewLvl = Math.max(...newMembers.map(m => m.level))
  console.log(`Level cao nhất của member mới: Lv${highestNewLvl}`)
  if (newPromoted.length > 0) {
    const topNew = newPromoted.sort((a, b) => b.level - a.level).slice(0, 5)
    console.log('Top new members:')
    for (const m of topNew) {
      console.log(`  #${m.userId} ${m.name.padEnd(25)} Lv${m.level} pts=${m.points} Cash=${Math.round(m.commissionEarned).toLocaleString('vi')}`)
    }
  }
}

main().catch(e => console.error('Fatal:', e)).finally(() => prisma.$disconnect().finally(() => process.exit(0)))
