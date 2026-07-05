import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// ======================== CONFIG ========================
const FEE = 26868
const BRKP_PER_ACTIVATION = 17
const BRKD_PER_ACTIVATION = 12868686
const GRACE_DAYS = 7
const BONUS_PCT = 2
const VOUCHER_2F1 = 386000
const MIN_WITHDRAW = 10000

const LEVEL_CONFIGS: Record<number, { brkpRequired: number; pct: number; gift: number; timeLimitDays: number; branchReqs: { branchLevel: number; count: number }[] }> = {
  1: { brkpRequired: 17, pct: 21, gift: 0, timeLimitDays: 0, branchReqs: [] },
  2: { brkpRequired: 50, pct: 30, gift: 386000, timeLimitDays: 6, branchReqs: [] },
  3: { brkpRequired: 250, pct: 39, gift: 1000000, timeLimitDays: 12, branchReqs: [{ branchLevel: 1, count: 2 }] },
  4: { brkpRequired: 1000, pct: 52.5, gift: 2000000, timeLimitDays: 15, branchReqs: [{ branchLevel: 2, count: 2 }, { branchLevel: 1, count: 1 }] },
  5: { brkpRequired: 4000, pct: 64.5, gift: 4000000, timeLimitDays: 24, branchReqs: [{ branchLevel: 3, count: 2 }, { branchLevel: 2, count: 1 }, { branchLevel: 1, count: 1 }] },
  6: { brkpRequired: 16000, pct: 70.5, gift: 8000000, timeLimitDays: 36, branchReqs: [{ branchLevel: 4, count: 2 }, { branchLevel: 2, count: 2 }] },
  7: { brkpRequired: 50000, pct: 75, gift: 16000000, timeLimitDays: 0, branchReqs: [{ branchLevel: 5, count: 2 }, { branchLevel: 4, count: 1 }, { branchLevel: 3, count: 1 }] },
  8: { brkpRequired: 100000, pct: 78, gift: 32000000, timeLimitDays: 0, branchReqs: [{ branchLevel: 6, count: 2 }, { branchLevel: 5, count: 1 }, { branchLevel: 4, count: 1 }] },
}

// ======================== TYPES ========================
interface SimMember {
  autoId: number
  userId: number
  name: string
  refUserId: number
  level: number
  activatedDate: string
  activatedDay: number
  officialDate: string | null
  officialDay: number | null
  isCancelled: boolean
  cancelledDay: number | null
  brkp: number
  brkd: number
  cash: number
  vouchers: { value: number; source: string; claimedDay: number }[]
  voucherBalance: number
  commissionsEarned: number
  bonusPoolReceived: number
  refundReceived: number
  f1Ids: number[]
  voucher2F1Claimed: boolean
  levelUpGifts: number[]
}

interface TreeData {
  members: SimMember[]
  nextAutoId: number
}

// ======================== SIMULATION ENGINE ========================
class BRKSimulation {
  data: TreeData
  dayLog: string[] = []
  growthRates: number[] = []
  dailyNewCounts: number[] = []

  constructor(realMembers: { autoId: number; userId: number; refSysId: number }[]) {
    const root = realMembers.find(m => m.refSysId === 0)
    if (!root) throw new Error('No root found')

    // Build initial tree from real data
    // NOTE: refSysId in DB stores the PARENT's userId (not autoId)
    const members: SimMember[] = realMembers.map(m => ({
      autoId: m.autoId,
      userId: m.userId,
      name: `REAL_${m.userId}`,
      refUserId: m.refSysId, // refSysId IS the parent's userId
      level: 1,
      activatedDate: '2026-07-02',
      activatedDay: 2,
      officialDate: null,
      officialDay: null,
      isCancelled: false,
      cancelledDay: null,
      brkp: 0,
      brkd: 0,
      cash: 0,
      vouchers: [],
      voucherBalance: 0,
      commissionsEarned: 0,
      bonusPoolReceived: 0,
      refundReceived: 0,
      f1Ids: [],
      voucher2F1Claimed: false,
      levelUpGifts: [],
    }))

    // Assign actual activation dates based on real data
    // (We'll fill this in after loading)
    this.data = { members, nextAutoId: Math.max(...realMembers.map(m => m.autoId)) + 1 }

    // Build F1 relationships
    this.rebuildF1Relationships()

    // Initial BRKP for all members (self-activation)
    for (const m of this.data.members) {
      m.brkp += BRKP_PER_ACTIVATION
      m.brkd += BRKD_PER_ACTIVATION
    }

    this.dayLog.push(`[INIT] Loaded ${members.length} real members, ${this.data.members.filter(m => m.f1Ids.filter(fid => !this.data.members.find(mm => mm.userId === fid)?.isCancelled).length >= 1).length} have F1`)
  }

  distributeInitialCommissions() {
    // Distribute commissions for the original members in activation order
    const sorted = [...this.data.members].sort((a, b) => a.activatedDay - b.activatedDay || a.autoId - b.autoId)
    for (const m of sorted) {
      // Skip root
      if (m.refUserId === 0) continue
      this.distributeCommission(m.userId)
    }
  }

  setActivationDates(dates: Map<number, number>) {
    for (const m of this.data.members) {
      const day = dates.get(m.userId)
      if (day) {
        m.activatedDay = day
        m.activatedDate = `2026-07-${String(day).padStart(2, '0')}`
      }
    }
  }

  rebuildF1Relationships() {
    // Reset F1
    for (const m of this.data.members) m.f1Ids = []

    // Build adjacency by refUserId
    for (const m of this.data.members) {
      if (m.refUserId !== 0 && !m.isCancelled) {
        const parent = this.data.members.find(p => p.userId === m.refUserId && !p.isCancelled)
        if (parent) parent.f1Ids.push(m.userId)
      }
    }
  }

  findPlacement(userId: number): number {
    // FORCED_4WIDE BFS placement
    const root = this.data.members.find(m => m.refUserId === 0 && !m.isCancelled)
    if (!root) return 0

    const queue: number[] = [root.userId]
    const visited = new Set<number>()

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const current = this.data.members.find(m => m.userId === currentId)
      if (!current || current.isCancelled) continue

      const activeF1 = current.f1Ids.filter(fid => {
        const fm = this.data.members.find(m => m.userId === fid)
        return fm && !fm.isCancelled
      })

      if (activeF1.length < 4) {
        return current.userId
      }

      // Level 3+ check: try to place deep first for fairness
      for (const f1Id of activeF1) {
        if (!visited.has(f1Id)) queue.push(f1Id)
      }
    }

    return root.userId
  }

  addMember(userId: number, name: string, activatedDay: number): SimMember {
    const existing = this.data.members.find(m => m.userId === userId)
    if (existing) return existing

    const parentUserId = this.findPlacement(userId)
    const newMember: SimMember = {
      autoId: this.data.nextAutoId++,
      userId,
      name,
      refUserId: parentUserId,
      level: 1,
      activatedDate: `2026-07-${String(activatedDay).padStart(2, '0')}`,
      activatedDay,
      officialDate: null,
      officialDay: null,
      isCancelled: false,
      cancelledDay: null,
      brkp: BRKP_PER_ACTIVATION,
      brkd: BRKD_PER_ACTIVATION,
      cash: 0,
      vouchers: [],
      voucherBalance: 0,
      commissionsEarned: 0,
      bonusPoolReceived: 0,
      refundReceived: 0,
      f1Ids: [],
      voucher2F1Claimed: false,
      levelUpGifts: [],
    }

    this.data.members.push(newMember)
    this.rebuildF1Relationships()

    // Distribute commissions to ancestors
    this.distributeCommission(userId)

    return newMember
  }

  distributeCommission(newMemberUserId: number) {
    const member = this.data.members.find(m => m.userId === newMemberUserId)
    if (!member || member.refUserId === 0) return

    // Collect ancestors (all uplines from F1 up to root)
    const ancestors: SimMember[] = []
    let currentId = member.refUserId
    const visited = new Set<number>()
    while (currentId !== 0 && !visited.has(currentId)) {
      visited.add(currentId)
      const upline = this.data.members.find(m => m.userId === currentId && !m.isCancelled)
      if (!upline) break
      ancestors.push(upline)
      currentId = upline.refUserId
    }

    let previousPct = 0
    for (const upline of ancestors) {
      const config = LEVEL_CONFIGS[upline.level]
      if (!config) continue

      const uplinePct = config.pct
      const earnPct = uplinePct - previousPct
      previousPct = Math.max(previousPct, uplinePct)

      // BRKP: each NEW activation gives 17 BRKP to ALL ancestors (full amount)
      // This makes "3 × 17 = 51" work for level 2 (self + 2 F1)
      // BRKP is NOT affected by differential commission% — it's always full
      upline.brkp += BRKP_PER_ACTIVATION

      if (earnPct <= 0) continue

      // Cash: proportional to commission percentage
      const commissionAmount = Math.round((FEE * earnPct) / 100)
      const brkdFromComm = Math.round((BRKD_PER_ACTIVATION * earnPct) / 100)

      upline.cash += commissionAmount
      upline.commissionsEarned += commissionAmount
      upline.brkd += brkdFromComm
    }
  }

  processGracePeriod(currentDay: number) {
    // Members whose grace period ended (activated on day currentDay - 7)
    // become official
    const expiryDay = currentDay - GRACE_DAYS
    const expiring = this.data.members.filter(m =>
      m.activatedDay === expiryDay && !m.isCancelled && !m.officialDate
    )

    for (const m of expiring) {
      // Check if they cancel (random ~10% cancellation)
      // For the simulation, we'll use the user's assumption of 3 cancellations
      m.officialDate = `2026-07-${String(currentDay).padStart(2, '0')}`
      m.officialDay = currentDay

      // 21% refund (cash + BRKD only, no BRKP)
      const refund = Math.round(FEE * 0.21)
      const brkdRefund = Math.round(BRKD_PER_ACTIVATION * 0.21)

      m.cash += refund
      m.refundReceived += refund
      m.brkd += brkdRefund

      this.dayLog.push(`[DAY ${currentDay}] uid=${m.userId} ${m.name} => OFFICIAL, refund 21% = ${refund} VND`)
    }
  }

  processCancellations(cancellations: { userId: number; cancelDay: number }[]) {
    for (const c of cancellations) {
      const member = this.data.members.find(m => m.userId === c.userId && !m.isCancelled)
      if (!member) continue

      member.isCancelled = true
      member.cancelledDay = c.cancelDay

      // Refund 100% (cash only, BRKP stays from activation)
      member.cash += FEE
      member.brkd += BRKD_PER_ACTIVATION

      // Move all F1 to upline
      const parent = this.data.members.find(m => m.userId === member.refUserId)
      if (parent) {
        // F1s of cancelled member need to be reassigned to the upline
        for (const f1Id of member.f1Ids) {
          const f1 = this.data.members.find(m => m.userId === f1Id)
          if (f1 && !f1.isCancelled) {
            f1.refUserId = parent.userId
          }
        }
      }

      this.rebuildF1Relationships()
      this.dayLog.push(`[DAY ${c.cancelDay}] CANCEL uid=${member.userId} ${member.name}, F1 moved to uid=${member.refUserId}`)
    }
  }

  checkLevelUp(currentDay: number) {
    let promoted = 0
    const sorted = [...this.data.members].filter(m => !m.isCancelled).sort((a, b) => b.brkp - a.brkp)

    for (const m of sorted) {
      let canPromote = true
      while (canPromote && m.level < 8) {
        const nextLevel = m.level + 1
        const config = LEVEL_CONFIGS[nextLevel]
        if (!config) { canPromote = false; break }

        if (m.brkp < config.brkpRequired) { canPromote = false; break }

        if (config.branchReqs.length > 0) {
          let passed = true
          for (const req of config.branchReqs) {
            const count = m.f1Ids.filter(fid => {
              const f1 = this.data.members.find(mm => mm.userId === fid)
              return f1 && !f1.isCancelled && f1.level >= req.branchLevel
            }).length
            if (count < req.count) { passed = false; break }
          }
          if (!passed) { canPromote = false; break }
        }

        // Promote one level
        m.level = nextLevel
        promoted++

        if (config.gift > 0) {
          m.vouchers.push({ value: config.gift, source: `Level ${nextLevel}`, claimedDay: currentDay })
          m.voucherBalance += config.gift
          m.levelUpGifts.push(config.gift)
        }

        this.dayLog.push(`[DAY ${currentDay}] LEVEL UP uid=${m.userId} ${m.name} => Level ${nextLevel} (BRKP=${Math.round(m.brkp)})`)
      }
    }

    return promoted
  }

  check2F1Vouchers(currentDay: number) {
    let awarded = 0
    for (const m of this.data.members) {
      if (m.isCancelled || m.voucher2F1Claimed) continue
      const activeF1 = m.f1Ids.filter(fid => {
        const f1 = this.data.members.find(mm => mm.userId === fid)
        return f1 && !f1.isCancelled
      })
      if (activeF1.length >= 2) {
        m.vouchers.push({ value: VOUCHER_2F1, source: '2 F1 bonus', claimedDay: currentDay })
        m.voucherBalance += VOUCHER_2F1
        m.voucher2F1Claimed = true
        awarded++
        this.dayLog.push(`[DAY ${currentDay}] VOUCHER 2F1 uid=${m.userId} ${m.name} => 386k`)
      }
    }
    return awarded
  }

  distributeBonusPool(periodStartDay: number, periodEndDay: number, currentDay: number) {
    // Only count OFFICIAL new members in this period
    const officialNew = this.data.members.filter(m =>
      !m.isCancelled &&
      m.officialDay !== null &&
      m.activatedDay >= periodStartDay &&
      m.activatedDay <= periodEndDay &&
      m.officialDay <= periodEndDay + 1 // became official by end of period
    )

    const totalSales = officialNew.length * FEE
    const pool = Math.round(totalSales * BONUS_PCT / 100)

    if (pool <= 0) return

    // People in bonus list: have >=1 active F1
    const bonusList = this.data.members.filter(m =>
      !m.isCancelled &&
      m.f1Ids.filter(fid => {
        const f1 = this.data.members.find(mm => mm.userId === fid)
        return f1 && !f1.isCancelled
      }).length >= 1
    )

    if (bonusList.length === 0) return

    const eachShare = Math.round(pool / bonusList.length)

    for (const m of bonusList) {
      m.cash += eachShare
      m.bonusPoolReceived += eachShare
      // BRKD proportional to bonus (no BRKP - BRKP only from activations)
      const brkdBonus = Math.round((BRKD_PER_ACTIVATION * eachShare) / FEE)
      m.brkd += brkdBonus
    }

    this.dayLog.push(`[DAY ${currentDay}] BONUS POOL: ${officialNew.length} official new, ${totalSales} VND sales, 2% = ${pool} VND, ${bonusList.length} recipients, each ${eachShare} VND`)
  }

  getMember(userId: number): SimMember | undefined {
    return this.data.members.find(m => m.userId === userId)
  }

  countActive(): number {
    return this.data.members.filter(m => !m.isCancelled).length
  }

  countOfficial(): number {
    return this.data.members.filter(m => m.officialDay !== null && !m.isCancelled).length
  }

  countF1BonusEligible(): number {
    return this.data.members.filter(m =>
      !m.isCancelled &&
      m.f1Ids.filter(fid => {
        const f1 = this.data.members.find(mm => mm.userId === fid)
        return f1 && !f1.isCancelled
      }).length >= 1
    ).length
  }

  printSummary(day: number, label: string) {
    const active = this.countActive()
    const official = this.countOfficial()
    const bonusEligible = this.countF1BonusEligible()
    const top = [...this.data.members].filter(m => !m.isCancelled).sort((a, b) => b.cash - a.cash).slice(0, 5)
    this.dayLog.push(`=== ${label}: ${active} active, ${official} official, ${bonusEligible} bonus-eligible ===`)
    for (const m of top) {
      this.dayLog.push(`  TOP: uid=${m.userId} ${m.name} Lv${m.level} BRKP=${Math.round(m.brkp)} Cash=${m.cash.toLocaleString()} VND`)
    }
  }

  printDetailedMemberReport(memberIds: number[], label: string) {
    const members = memberIds.map(id => this.getMember(id)!).filter(Boolean).sort((a, b) => b.cash - a.cash)
    
    this.dayLog.push(`
==================== ${label} ====================`)
    this.dayLog.push(`UserId | Name                        | Lv |   BRKP |       BRKD |      Cash |  Voucher |  Comm   |  Bonus  |  Refund | F1`)
    this.dayLog.push(`-------|------------------------------|----|--------|------------|-----------|----------|---------|---------|---------|----`)
    
    let totalCash = 0, totalVoucher = 0, totalBrkp = 0
    for (const m of members) {
      const activeF1 = m.f1Ids.filter(fid => {
        const f1 = this.data.members.find(mm => mm.userId === fid)
        return f1 && !f1.isCancelled
      }).length
      this.dayLog.push(
        `${String(m.userId).padStart(7)} | ${m.name.padEnd(28)} | ${String(m.level).padStart(2)} | ` +
        `${Math.round(m.brkp).toLocaleString().padStart(6)} | ${Math.round(m.brkd).toLocaleString().padStart(10)} | ` +
        `${m.cash.toLocaleString().padStart(9)} | ${m.voucherBalance.toLocaleString().padStart(8)} | ` +
        `${m.commissionsEarned.toLocaleString().padStart(7)} | ${m.bonusPoolReceived.toLocaleString().padStart(7)} | ` +
        `${m.refundReceived.toLocaleString().padStart(7)} | ${activeF1}`
      )
      totalCash += m.cash
      totalVoucher += m.voucherBalance
      totalBrkp += m.brkp
    }
    this.dayLog.push(`-------|------------------------------|----|--------|------------|-----------|----------|---------|---------|---------|----`)
    this.dayLog.push(`TOTAL  |                              |    | ${Math.round(totalBrkp).toLocaleString().padStart(6)} | ${''.padStart(10)} | ${totalCash.toLocaleString().padStart(9)} | ${totalVoucher.toLocaleString().padStart(8)} |`)
  }
}

// ======================== MAIN ========================
async function main() {
  console.log('=== BRK SIMULATION: 5/7 → 11/7 ===\n')

  // 1. Load real data
  const realSystems = await p.system.findMany({
    where: { onSystem: 4, status: 'ACTIVE' },
    orderBy: { autoId: 'asc' }
  })

  const enrollments = await p.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE' },
    include: { payment: { select: { transferTime: true, verifiedAt: true } } }
  })

  // Build activation date map
  const activationDates = new Map<number, number>()
  for (const e of enrollments) {
    const dt = e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt
    activationDates.set(e.userId, dt.getDate())
  }
  // For any system records without enrollment date, use default
  for (const s of realSystems) {
    if (!activationDates.has(s.userId)) {
      activationDates.set(s.userId, 2) // default to day 2
    }
  }

  // 2. Init simulation
  const sim = new BRKSimulation(realSystems.map(s => ({ autoId: s.autoId, userId: s.userId, refSysId: s.refSysId })))
  sim.setActivationDates(activationDates)

  // Set real user names from DB
  const realUsers = await p.user.findMany({
    where: { id: { in: realSystems.map(s => s.userId) } },
    select: { id: true, name: true }
  })
  for (const u of realUsers) {
    const m = sim.getMember(u.id)
    if (m) m.name = u.name || `#${u.id}`
  }

  // 3. Apply the 3 cancellations as user specified
  // Pick: 1 from day 2, 1 from day 3, 1 from day 4
  const day2members = sim.data.members.filter(m => m.activatedDay === 2 && m.userId !== 3773).sort((a, b) => a.userId - b.userId)
  const day3members = sim.data.members.filter(m => m.activatedDay === 3)
  const day4members = sim.data.members.filter(m => m.activatedDay === 4)

  // Pick strategic cancellations:
  // Day 2: #496 (has 1 F1 #1066) - to show F1 transfer to #1035
  const cancelDay2 = day2members.find(m => m.userId === 496) || day2members[0]
  // Day 3: a leaf node. Pick #1068 (under #229)
  const cancelDay3 = day3members.find(m => m.userId === 1068) || day3members[0]
  // Day 4: a leaf node. Pick #7 (under #965)
  const cancelDay4 = day4members.find(m => m.userId === 7) || day4members[0]

  const cancellations = [
    { userId: cancelDay2.userId, cancelDay: 7 },  // cancels on day 7 (within grace)
    { userId: cancelDay3.userId, cancelDay: 8 },
    { userId: cancelDay4.userId, cancelDay: 8 },
  ]

  console.log(`Real members: ${realSystems.length}`)
  console.log(`Cancellations: ${cancellations.map(c => `#${c.userId}`).join(', ')}`)
  console.log(`Growth rate: random 30%-150% per day\n`)

  // Distribute commissions for initial members (so ancestors get BRKP from original placements)
  sim.distributeInitialCommissions()
  sim.dayLog.push(`[INIT] After distributing initial commissions - Root BRKP=${Math.round(sim.getMember(3773)?.brkp || 0)}`)

  // ======================== NGAY MAI (5/7) ========================
  const originalIds = realSystems.map(s => s.userId)
  sim.printDetailedMemberReport(originalIds, 'NGAY MAI (5/7) - TRUOC KHI TANG TRUONG')
  for (const line of sim.dayLog.slice(-40)) {
    console.log(line)
  }

  // 4. Daily simulation
  let nextFakeId = 10000
  const SEED_RATES = [0.70, 0.45, 1.20, 0.55, 0.90, 0.35, 0.80] // random-ish rates

  for (let day = 5; day <= 11; day++) {
    const activeCount = sim.countActive()
    const rate = 0.3 + Math.random() * 1.2 // 30% to 150%
    const newCount = Math.max(1, Math.round(activeCount * rate))
    sim.growthRates.push(rate)
    sim.dailyNewCounts.push(newCount)
    sim.dayLog.push(`\n--- DAY ${day}/7: ${activeCount} existing → ${newCount} new members (${(rate * 100).toFixed(0)}%) ---`)

    // Add new members
    for (let i = 0; i < newCount; i++) {
      const fakeId = nextFakeId++
      sim.addMember(fakeId, `HV_AO_${fakeId}`, day)
    }

    // Process cancellations that happen on this day
    const dayCancellations = cancellations.filter(c => c.cancelDay === day)
    if (dayCancellations.length > 0) {
      sim.processCancellations(dayCancellations)
    }

    // Process grace period (7 days ago)
    sim.processGracePeriod(day)

    // Every 3 days: level up + bonus pool
    if (day === 5 || day === 8 || day === 11) {
      const promoted = sim.checkLevelUp(day)
      const vouchersAwarded = sim.check2F1Vouchers(day)

      // Bonus pool: for the preceding 3-day period
      if (day === 5) {
        // Period 2-4 July (first 3 days)
        sim.distributeBonusPool(2, 4, day)
      } else if (day === 8) {
        // Period 5-7 July
        sim.distributeBonusPool(5, 7, day)
      } else if (day === 11) {
        // Period 8-10 July
        sim.distributeBonusPool(8, 10, day)
      }

      sim.printSummary(day, `DAY ${day} SUMMARY`)
    }

    // End-of-day 5 checkpoint
    if (day === 5) {
      sim.printDetailedMemberReport(originalIds, 'NGAY MAI (5/7) - CUOI NGAY (SAU TANG TRUONG, LEVEL-UP, VOUCHER, BONUS POOL)')
    }
  }

  // ======================== FINAL REPORT ========================
  console.log('\n\n==================== FINAL REPORT ====================')
  console.log(`Total members created: ${sim.data.members.length}`)
  console.log(`Active: ${sim.countActive()}`)
  console.log(`Official: ${sim.countOfficial()}`)
  console.log(`Cancelled: ${sim.data.members.filter(m => m.isCancelled).length}`)
  console.log(`Growth rates: ${sim.growthRates.map(r => (r * 100).toFixed(0) + '%').join(', ')}`)
  console.log(`Daily new: ${sim.dailyNewCounts.join(', ')}`)
  console.log()

  // Report for each of the original 31 members
  console.log('==================== ORIGINAL 31 MEMBERS REPORT ====================')
  console.log(`UserId | Name                        | Lv |   BRKP |       BRKD |      Cash |  Voucher |  Comm   |  Bonus  |  Refund | F1`)
  console.log(`-------|------------------------------|----|--------|------------|-----------|----------|---------|---------|---------|----`)

  
  let totalCash = 0
  let totalVoucher = 0
  let totalBrkp = 0

  // Sort by cash descending
  const sortedOriginals = originalIds.map(id => sim.getMember(id)!).sort((a, b) => b.cash - a.cash)

  for (const m of sortedOriginals) {
    const activeF1 = m.f1Ids.filter(fid => {
      const f1 = sim.data.members.find(mm => mm.userId === fid)
      return f1 && !f1.isCancelled
    }).length
    console.log(
      `${String(m.userId).padStart(7)} | ${m.name.padEnd(28)} | ${String(m.level).padStart(2)} | ` +
      `${Math.round(m.brkp).toLocaleString().padStart(6)} | ${Math.round(m.brkd).toLocaleString().padStart(10)} | ` +
      `${m.cash.toLocaleString().padStart(9)} | ${m.voucherBalance.toLocaleString().padStart(8)} | ` +
      `${m.commissionsEarned.toLocaleString().padStart(7)} | ${m.bonusPoolReceived.toLocaleString().padStart(7)} | ` +
      `${m.refundReceived.toLocaleString().padStart(7)} | ${activeF1}`
    )
    totalCash += m.cash
    totalVoucher += m.voucherBalance
    totalBrkp += m.brkp
  }

  console.log(`-------|------------------------------|----|--------|------------|-----------|----------|---------|---------|---------|----`)
  console.log(`TOTAL  |                              |    | ${Math.round(totalBrkp).toLocaleString().padStart(6)} | ${''.padStart(10)} | ${totalCash.toLocaleString().padStart(9)} | ${totalVoucher.toLocaleString().padStart(8)} |`)
  console.log()

  // Summary stats
  const allActive = sim.data.members.filter(m => !m.isCancelled)
  const top10ByCash = [...allActive].sort((a, b) => b.cash - a.cash).slice(0, 10)
  const top10ByBrkp = [...allActive].sort((a, b) => b.brkp - a.brkp).slice(0, 10)

  console.log('==================== TOP 10 BY CASH (all members) ====================')
  for (const m of top10ByCash) {
    console.log(`${m.name.padEnd(28)} uid=${String(m.userId).padStart(7)} Lv${m.level} Cash=${m.cash.toLocaleString()} VND`)
  }

  console.log('\n==================== TOP 10 BY BRKP (all members) ====================')
  for (const m of top10ByBrkp) {
    console.log(`${m.name.padEnd(28)} uid=${String(m.userId).padStart(7)} Lv${m.level} BRKP=${Math.round(m.brkp).toLocaleString()}`)
  }

  // Level-up summary
  const levelCounts: Record<number, number> = {}
  for (const m of allActive) {
    levelCounts[m.level] = (levelCounts[m.level] || 0) + 1
  }
  console.log('\n==================== LEVEL DISTRIBUTION ====================')
  for (let lv = 1; lv <= 8; lv++) {
    if (levelCounts[lv]) console.log(`Level ${lv}: ${levelCounts[lv]} members`)
  }

  // Voucher summary
  const totalVouchersAwarded = allActive.reduce((s, m) => s + m.vouchers.length, 0)
  console.log(`\nTotal vouchers awarded: ${totalVouchersAwarded}`)
  console.log(`Total voucher balance: ${allActive.reduce((s, m) => s + m.voucherBalance, 0).toLocaleString()} VND`)

  // Full day log
  console.log('\n==================== FULL EVENT LOG ====================')
  for (const line of sim.dayLog) {
    console.log(line)
  }

  await p.$disconnect()
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
