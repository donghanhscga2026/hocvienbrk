import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const SYSTEM_ID = 4
const COURSE_ID = 22
const FEE = 26868
const GRACE_DAYS = 1
const RETURN_PCT = 21
const SHARE_PCT = 2.0
const SHARE_INTERVAL = 3

const MBDT_BASE = 12_000_000
const MBDT_MIN = 12_868_686
const MBDT_MAX = 15_868_686

const STATE_FILE_PATH = path.join(process.cwd(), 'plan_temp', 'simulation_state.json')

function generateMBDT(userId: number): number {
  const seed = (userId * 9301 + 49297) % 233280
  const randomFactor = seed / 233280
  return Math.floor(randomFactor * (MBDT_MAX - MBDT_MIN + 1)) + MBDT_MIN
}

function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}

function getEvalTime(year: number, month: number, day: number): Date {
  // 01:13 VNT ngày hôm sau = 18:13 UTC ngày hôm trước
  return new Date(Date.UTC(year, month, day - 1, 18, 13, 0))
}

export interface MemberState {
  userId: number
  userName: string
  autoId: number
  refSysId: number
  activatedAt: string // ISO string for JSON serialization
  gracePeriodEnd: string
  level: number
  points: number
  cashBalance: number
  brkdBalance: number
  voucherBalance: number
  isConfirmed: boolean
  has2F1Voucher: boolean
  memberMBDT: number
}

export interface PromotionRecord {
  userId: number
  userName: string
  fromLevel: number
  toLevel: number
  points: number
  createdAt: string
}

export interface TransactionRecord {
  userId: number
  type: string
  amount: number
  balanceType: 'CASH' | 'BRKD' | 'VOUCHER'
  description: string
  refId: string
  createdAt: string
}

interface SimulationState {
  lastDayIndex: number
  memberStates: MemberState[]
  transactions: TransactionRecord[]
  promotions: PromotionRecord[]
  poolRevenueCASH: number
  poolRevenueMBDT: number
}

function checkAndPromoteLevelMemory(
  userId: number,
  memberStates: Map<number, MemberState>,
  configMap: Map<number, any>,
  evalTime: Date,
  promotions: PromotionRecord[],
  transactions: TransactionRecord[]
) {
  const state = memberStates.get(userId)
  if (!state) return

  let currentLevel = state.level || 0
  let maxPromoted = currentLevel

  while (currentLevel < 8) {
    const nextConfig = configMap.get(currentLevel + 1)
    if (!nextConfig) break

    if (state.points < nextConfig.pointsRequired) break

    if (nextConfig.branchReqs.length > 0) {
      let branchPassed = true
      for (const req of nextConfig.branchReqs) {
        let branchCount = 0
        for (const m of memberStates.values()) {
          if (m.refSysId === state.userId && m.isConfirmed) {
            if (m.level >= req.reqLevel) {
              branchCount++
            }
          }
        }
        if (branchCount < req.reqCount) {
          branchPassed = false
          break
        }
      }
      if (!branchPassed) break
    }

    currentLevel++
    maxPromoted = currentLevel
    promotions.push({
      userId,
      userName: state.userName,
      fromLevel: currentLevel - 1,
      toLevel: currentLevel,
      points: state.points,
      createdAt: evalTime.toISOString()
    })

    if (nextConfig.giftValue > 0 && currentLevel > 2) {
      state.voucherBalance += nextConfig.giftValue
      transactions.push({
        userId,
        type: 'VOUCHER_CREDIT',
        amount: nextConfig.giftValue,
        balanceType: 'VOUCHER',
        description: `Quà tặng lên cấp ${currentLevel} (${nextConfig.giftValue.toLocaleString()} VND)`,
        refId: `level_${currentLevel}_sys_${SYSTEM_ID}_user_${userId}`,
        createdAt: evalTime.toISOString()
      })
    }
  }

  if (maxPromoted > state.level) {
    state.level = maxPromoted
  }
}

async function confirmMember(
  memberUserId: number,
  fee: number,
  systemTree: any,
  recordTime: Date,
  memberMBDT: number,
  transactions: TransactionRecord[],
  memberStates: Map<number, MemberState>
) {
  const returnPct = Number(systemTree?.returnPct ?? 21)
  const returnRefId = `return_fee_sys_4_user_${memberUserId}`
  const returnAmt = (fee * returnPct) / 100

  // Cash refund
  transactions.push({
    userId: memberUserId,
    type: 'RETURN_FEE',
    amount: returnAmt,
    balanceType: 'CASH',
    description: `Hoàn ${returnPct}% phí tham gia sau 1 ngày cân nhắc`,
    refId: returnRefId,
    createdAt: recordTime.toISOString()
  })
  const state = memberStates.get(memberUserId)
  if (state) state.cashBalance += returnAmt

  // MBDT refund
  const brkdReturn = Math.round((memberMBDT * returnPct) / 100)
  if (brkdReturn > 0) {
    const brkdRefId = `return_brkd_sys_4_user_${memberUserId}`
    transactions.push({
      userId: memberUserId,
      type: 'RETURN_FEE',
      amount: brkdReturn,
      balanceType: 'BRKD',
      description: `MBDT hoàn ${returnPct}% sau 1 ngày cân nhắc`,
      refId: brkdRefId,
      createdAt: recordTime.toISOString()
    })
    if (state) state.brkdBalance += brkdReturn
  }
}

export async function simulateDay(dayIndex: number) {
  console.log(`\n======================================================`)
  console.log(`⏳ RUNNING SIMULATION FOR DAY ${dayIndex}...`)
  console.log(`======================================================`)

  // 1. Load configs
  const dbConfigs = await prisma.brkLevelConfig.findMany({
    where: { systemId: SYSTEM_ID },
    include: { branchReqs: true }
  })
  const configMap = new Map<number, any>()
  for (const c of dbConfigs) {
    configMap.set(c.level, {
      level: c.level,
      pointsRequired: Number(c.pointsRequired),
      personalFeePct: Number(c.personalFeePct),
      giftValue: Number(c.giftValue),
      branchReqs: c.branchReqs.map(r => ({
        reqLevel: r.branchLevel,
        reqCount: r.count
      }))
    })
  }

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: SYSTEM_ID } })
  if (!systemTree) throw new Error('SystemTree #4 not found')

  // 2. Fetch and group enrollments from DB as the source of truth
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: COURSE_ID, status: 'ACTIVE' },
    include: {
      user: { select: { name: true, referrerId: true } },
      payment: { select: { transferTime: true, verifiedAt: true } },
    },
  })
  enrollments.sort((a, b) => {
    const ta = a.payment?.transferTime || a.payment?.verifiedAt || a.createdAt
    const tb = b.payment?.transferTime || b.payment?.verifiedAt || b.createdAt
    return ta.getTime() - tb.getTime()
  })

  // Load closure table
  const closures = await prisma.systemClosure.findMany({
    where: { systemId: SYSTEM_ID }
  })

  // Group by date
  const enrollByDay: Map<string, any[]> = new Map()
  for (const e of enrollments) {
    const t = e.payment?.transferTime || e.payment?.verifiedAt || e.createdAt
    const dayStr = t.toLocaleDateString('vi-VN')
    if (!enrollByDay.has(dayStr)) enrollByDay.set(dayStr, [])
    enrollByDay.get(dayStr)!.push(e)
  }
  const sortedDays = Array.from(enrollByDay.keys())

  if (dayIndex > sortedDays.length) {
    console.log(`❌ Error: Day index ${dayIndex} exceeds total days in dataset (${sortedDays.length})`)
    return
  }

  // 3. Load or initialize simulation state
  let simState: SimulationState
  if (dayIndex === 1) {
    console.log('🔄 Initializing new simulation state...')
    // Map all 84 users into their baseline states
    const statesList: MemberState[] = []
    const existingSystems = await prisma.system.findMany({
      where: { onSystem: SYSTEM_ID },
      include: { user: { select: { name: true } } }
    })
    existingSystems.sort((a, b) => {
      const ta = a.activatedAt || a.createdAt
      const tb = b.activatedAt || b.createdAt
      return ta.getTime() - tb.getTime()
    })

    for (const sys of existingSystems) {
      statesList.push({
        userId: sys.userId,
        userName: sys.user.name || `User #${sys.userId}`,
        autoId: sys.autoId,
        refSysId: sys.refSysId,
        activatedAt: (sys.activatedAt || sys.createdAt).toISOString(),
        gracePeriodEnd: (sys.gracePeriodEnd || new Date(sys.createdAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)).toISOString(),
        level: sys.refSysId === 0 ? 1 : 0, // Root is level 1, others 0
        points: 0,
        cashBalance: 0,
        brkdBalance: 0,
        voucherBalance: 0,
        isConfirmed: false,
        has2F1Voucher: false,
        memberMBDT: 0
      })
    }

    simState = {
      lastDayIndex: 0,
      memberStates: statesList,
      transactions: [],
      promotions: [],
      poolRevenueCASH: 0,
      poolRevenueMBDT: 0
    }
  } else {
    // Read from file
    if (!fs.existsSync(STATE_FILE_PATH)) {
      console.log(`❌ Error: State file not found at ${STATE_FILE_PATH}. You must run Day 1 first.`)
      return
    }
    simState = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'))
    if (simState.lastDayIndex !== dayIndex - 1) {
      console.log(`❌ Error: Expected to run Day ${simState.lastDayIndex + 1}, but you requested Day ${dayIndex}. Please run sequentially.`)
      return
    }
  }

  // Convert array back to Map for easier lookup
  const memberStates = new Map<number, MemberState>(simState.memberStates.map(s => [s.userId, s]))
  const targetDayStr = sortedDays[dayIndex - 1]
  const dayEnrollments = enrollByDay.get(targetDayStr)!
  const [d, m, y] = targetDayStr.split('/')

  console.log(`📅 Target Date: ${targetDayStr} (Index: ${dayIndex})`)
  console.log(`👤 New active registrations today: ${dayEnrollments.length}`)

  // Set the mock ACTIVE state of new members registered today
  for (const enrollment of dayEnrollments) {
    const state = memberStates.get(enrollment.userId)
    if (state) {
      console.log(`  ➕ user#${state.userId} ${state.userName} is now ACTIVE (awaiting Grace Period)`)
      // Record initial activation level 0 -> 0
      const exists = simState.promotions.some(p => p.userId === state.userId && p.fromLevel === 0 && p.toLevel === 0)
      if (!exists) {
        simState.promotions.push({
          userId: state.userId,
          userName: state.userName,
          fromLevel: 0,
          toLevel: 0,
          points: 0,
          createdAt: state.activatedAt
        })
      }
    }
  }

  // 4. Run confirmations
  // Run time: 23:50:00 VNT on this target date
  // 23:50 VNT is 16:50 UTC of the same day.
  const runTime = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 16, 50, 0))
  console.log(`⏰ Script Confirm Run Time (VNT): ${runTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`)

  const dueMembers = Array.from(memberStates.values()).filter(
    member => !member.isConfirmed && new Date(member.gracePeriodEnd).getTime() <= runTime.getTime()
  )

  console.log(`🔔 Confirming ${dueMembers.length} members who passed Grace Period:`)

  for (const member of dueMembers) {
    member.isConfirmed = true
    const memberMBDT = generateMBDT(member.userId)
    member.memberMBDT = memberMBDT
    const memberMBP = mbdtToMbp(memberMBDT)
    const recordTime = new Date(member.gracePeriodEnd) // Ghi nhận đúng thời điểm hết 24h cân nhắc

    // Accumulate revenue for pool
    simState.poolRevenueCASH += FEE
    simState.poolRevenueMBDT += memberMBDT

    // Self rewards
    member.points += memberMBP
    console.log(`  👉 #${member.userId} ${member.userName}: Confirmed! Points +${memberMBP.toFixed(3)} (MBDT=${memberMBDT.toLocaleString()})`)

    // No self MBDT credit, only point updates (memberMBDT is used only as reference for refunds & commissions)

    // Confirm & distribute Cash Return + MBDT Return (cá nhân người đó)
    await confirmMember(
      member.userId,
      FEE,
      systemTree,
      recordTime,
      memberMBDT,
      simState.transactions,
      memberStates
    )
  }

  // 4.5. Run daily promotions and commission evaluation at 01:13 VNT of the next day
  const evalTime = getEvalTime(Number(y), Number(m) - 1, Number(d) + 1)
  console.log(`⏰ Daily Level & Commission Evaluation (VNT): ${evalTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`)

  // For each member confirmed today (dueMembers), process ancestor points, commission, and vouchers
  for (const member of dueMembers) {
    const memberMBDT = member.memberMBDT
    const memberMBP = mbdtToMbp(memberMBDT)

    // Ancestor credits
    const memberAncestors = closures
      .filter(c => c.descendantId === member.autoId && c.depth >= 1)
      .sort((a, b) => a.depth - b.depth)

    const ancestorCredits: { ancestorUserId: number; uplineLevel: number; earnPct: number }[] = []
    const newMemberLevel = 1
    const newMemberConfig = configMap.get(newMemberLevel)
    let previousPct = newMemberConfig ? Number(newMemberConfig.personalFeePct) : 0

    for (const closure of memberAncestors) {
      const ancestorSys = Array.from(memberStates.values()).find(s => s.autoId === closure.ancestorId)
      if (!ancestorSys) continue

      const uplineLevel = ancestorSys.level || 1
      const config = configMap.get(uplineLevel)
      if (!config) continue

      const uplinePct = Number(config.personalFeePct)
      const earnPct = uplinePct - previousPct
      previousPct = Math.max(previousPct, uplinePct)

      ancestorCredits.push({
        ancestorUserId: ancestorSys.userId,
        uplineLevel,
        earnPct
      })
    }

    const commissionRefId = `sys_4_member_${member.userId}`
    for (const { ancestorUserId, uplineLevel, earnPct } of ancestorCredits) {
      const ancestorState = memberStates.get(ancestorUserId)
      if (!ancestorState) continue

      // Add points to ancestor at evalTime
      ancestorState.points += memberMBP
      console.log(`    ↳ Ancestor #${ancestorUserId} ${ancestorState.userName} received +${memberMBP.toFixed(3)} points (daily eval)`)

      if (earnPct > 0) {
        const commissionAmount = (FEE * earnPct) / 100
        if (commissionAmount > 0) {
          simState.transactions.push({
            userId: ancestorUserId,
            type: 'COMMISSION',
            amount: commissionAmount,
            balanceType: 'CASH',
            description: `Hoa hồng cấp ${uplineLevel} (${earnPct}%) từ thành viên mới #${member.userId}`,
            refId: commissionRefId,
            createdAt: evalTime.toISOString()
          })
          ancestorState.cashBalance += commissionAmount
        }

        const brkdAmount = Math.round((memberMBDT * earnPct) / 100)
        if (brkdAmount > 0) {
          simState.transactions.push({
            userId: ancestorUserId,
            type: 'COMMISSION',
            amount: brkdAmount,
            balanceType: 'BRKD',
            description: `MBDT cấp ${uplineLevel} (${earnPct}%) từ thành viên mới #${member.userId}`,
            refId: commissionRefId,
            createdAt: evalTime.toISOString()
          })
          ancestorState.brkdBalance += brkdAmount
        }
      }
    }

    // Check 2F1 Voucher for parent at evalTime
    if (member.refSysId > 0) {
      const parentSys = memberStates.get(member.refSysId)
      if (parentSys && !parentSys.has2F1Voucher) {
        const f1Count = Array.from(memberStates.values()).filter(
          m => m.refSysId === parentSys.userId && m.isConfirmed
        ).length
        if (f1Count >= 2) {
          parentSys.has2F1Voucher = true
          simState.transactions.push({
            userId: parentSys.userId,
            type: 'VOUCHER_CREDIT',
            amount: 386000,
            balanceType: 'VOUCHER',
            description: `Thưởng giới thiệu 2 F1 (hệ thống BRK)`,
            refId: `referral_2f1_sys_4`,
            createdAt: evalTime.toISOString()
          })
          parentSys.voucherBalance += 386000
          console.log(`    🎁 Parent #${parentSys.userId} ${parentSys.userName} received 2F1 Voucher (386,000 VND)`)
        }
      }
    }
  }

  // Check and promote level for ALL members in the system at evalTime
  const allStates = Array.from(memberStates.values())
  for (let currentL = 0; currentL < 8; currentL++) {
    for (const state of allStates) {
      if ((state.level || 0) === currentL) {
        checkAndPromoteLevelMemory(state.userId, memberStates, configMap, evalTime, simState.promotions, simState.transactions)
      }
    }
  }


  // 🎁 Revenue Share cycle (every 3 days)
  // Run time: 02:14 VNT of the 4th day (i.e., morning of the next day of the 3rd day)
  // 02:14 VNT is 19:14 UTC of the target date (dayIndex)
  if (dayIndex % SHARE_INTERVAL === 0) {
    const shareTime = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 19, 14, 0))
    console.log(`\n🎉 RUNNING REVENUE SHARE CYCLE (${shareTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} VNT)`)
    const poolAmountCASH = (simState.poolRevenueCASH * SHARE_PCT) / 100
    const poolAmountMBDT = (simState.poolRevenueMBDT * SHARE_PCT) / 100

    const qualified = Array.from(memberStates.values()).filter(member => {
      if (member.level < 1 || !member.isConfirmed) return false
      const f1Count = Array.from(memberStates.values()).filter(
        m => m.refSysId === member.userId && m.isConfirmed
      ).length
      return f1Count >= 1
    })

    console.log(`  Pool revenue CASH: ${simState.poolRevenueCASH.toLocaleString()} đ | MBDT: ${simState.poolRevenueMBDT.toLocaleString()} MBDT`)
    console.log(`  Bể chia CASH (2%): ${poolAmountCASH.toLocaleString()} đ | MBDT: ${poolAmountMBDT.toLocaleString()} MBDT`)
    console.log(`  Số thành viên đủ điều kiện (>=1 F1): ${qualified.length}`)

    if (qualified.length > 0) {
      const shareCASH = Math.floor((poolAmountCASH * 100) / qualified.length) / 100
      const shareBRKD = Math.round(poolAmountMBDT / qualified.length)

      for (const member of qualified) {
        simState.transactions.push({
          userId: member.userId,
          type: 'REVENUE_SHARE',
          amount: shareCASH,
          balanceType: 'CASH',
          description: `Chia đều doanh thu kỳ (${SHARE_PCT}% của ${simState.poolRevenueCASH}đ)`,
          refId: `pool_day_${dayIndex}`,
          createdAt: shareTime.toISOString()
        })
        member.cashBalance += shareCASH

        if (shareBRKD > 0) {
          simState.transactions.push({
            userId: member.userId,
            type: 'REVENUE_SHARE',
            amount: shareBRKD,
            balanceType: 'BRKD',
            description: `MBDT chia doanh thu kỳ (${SHARE_PCT}% của ${simState.poolRevenueMBDT} MBDT)`,
            refId: `pool_day_${dayIndex}`,
            createdAt: shareTime.toISOString()
          })
          member.brkdBalance += shareBRKD
        }
        console.log(`    👤 #${member.userId} ${member.userName} nhận: +${shareCASH.toLocaleString()}đ CASH | +${shareBRKD.toLocaleString()} MBDT`)
      }
    }

    // Reset pool revenue accumulator
    simState.poolRevenueCASH = 0
    simState.poolRevenueMBDT = 0
  }

  // Print day promotions (including level 0->0 initial activations and next-day 00:13 VNT promotions)
  const dayPromotions = simState.promotions.filter(p => {
    const pDateStr = new Date(p.createdAt).toLocaleDateString('vi-VN')
    return pDateStr === targetDayStr || pDateStr === evalTime.toLocaleDateString('vi-VN')
  })
  if (dayPromotions.length > 0) {
    console.log(`🎖️ Level Promotions & Activations on Day ${dayIndex}:`)
    for (const p of dayPromotions) {
      if (p.fromLevel === 0 && p.toLevel === 0) {
        console.log(`  ➕ #${p.userId} ${p.userName}: Kích hoạt tham gia (Đang cân nhắc) | MBP = 0, MBDT = 0, CASH = 0, Cấp 0`)
      } else {
        console.log(`  ⭐ #${p.userId} ${p.userName}: Thăng cấp Cấp ${p.fromLevel} → Cấp ${p.toLevel} (Điểm: ${p.points.toFixed(3)})`)
      }
    }
  }

  // Save state
  simState.lastDayIndex = dayIndex
  simState.memberStates = Array.from(memberStates.values())
  fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(simState, null, 2), 'utf-8')
  console.log(`\n💾 Saved state to ${STATE_FILE_PATH}`)
  console.log(`🏁 Day ${dayIndex} Replay Simulation Complete!`)
}
