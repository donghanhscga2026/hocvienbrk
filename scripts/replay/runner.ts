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

function getTeamCount(userId: number, memberStates: Map<number, MemberState>, closures: any[]): number {
  const userState = memberStates.get(userId)
  if (!userState) return 1
  let count = 1
  for (const m of memberStates.values()) {
    if (m.userId !== userId && m.isConfirmed) {
      const isDesc = closures.some(c => c.ancestorId === userState.autoId && c.descendantId === m.autoId)
      if (isDesc) {
        count++
      }
    }
  }
  return count
}

function makeDescription(
  event: string,
  title: string,
  desc: string,
  state: MemberState,
  memberStates: Map<number, MemberState>,
  closures: any[],
  extra: any = {}
): string {
  return JSON.stringify({
    sys4: true,
    event,
    title,
    desc,
    level: state.level,
    points: state.points,
    teamCount: getTeamCount(state.userId, memberStates, closures),
    balances: {
      cash: state.cashBalance,
      brkd: state.brkdBalance,
      voucher: state.voucherBalance
    },
    extra
  })
}

function checkAndPromoteLevelMemory(
  userId: number,
  memberStates: Map<number, MemberState>,
  configMap: Map<number, any>,
  evalTime: Date,
  promotions: PromotionRecord[],
  transactions: TransactionRecord[],
  closures: any[]
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

    const prevConfig = configMap.get(currentLevel)
    const prevPct = prevConfig ? Number(prevConfig.personalFeePct) : 0
    const nextPct = Number(nextConfig.personalFeePct)

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

    // Record thăng cấp Timeline snapshot
    const levelUpDesc = makeDescription(
      'LEVEL_UP',
      'Thăng tiến cấp bậc',
      `Cấp ${currentLevel - 1} (+${nextConfig.pointsRequired} MBP) ➔ Cấp ${currentLevel}. Tỷ lệ hoa hồng: ${prevPct}% ➔ ${nextPct}%.`,
      {
        ...state,
        level: currentLevel
      },
      memberStates,
      closures
    )
    transactions.push({
      userId,
      type: 'ADJUSTMENT',
      amount: 0,
      balanceType: 'BRKD',
      description: levelUpDesc,
      refId: `level_${currentLevel}_sys_${SYSTEM_ID}_user_${userId}_points`,
      createdAt: evalTime.toISOString()
    })

    if (nextConfig.giftValue > 0 && currentLevel > 2) {
      const voucherDesc = makeDescription(
        'VOUCHER',
        'Thưởng thăng cấp',
        `Quà tặng lên cấp ${currentLevel} (${nextConfig.giftValue.toLocaleString()} VND)`,
        {
          ...state,
          level: currentLevel,
          voucherBalance: state.voucherBalance + nextConfig.giftValue
        },
        memberStates,
        closures
      )
      state.voucherBalance += nextConfig.giftValue
      transactions.push({
        userId,
        type: 'VOUCHER_CREDIT',
        amount: nextConfig.giftValue,
        balanceType: 'VOUCHER',
        description: voucherDesc,
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
  memberStates: Map<number, MemberState>,
  promotions: PromotionRecord[],
  closures: any[]
) {
  const returnPct = Number(systemTree?.returnPct ?? 21)
  const returnRefId = `return_fee_sys_4_user_${memberUserId}`
  const brkdRefId = `return_brkd_sys_4_user_${memberUserId}`
  const returnAmt = (fee * returnPct) / 100
  const brkdReturn = Math.round((memberMBDT * returnPct) / 100)

  const state = memberStates.get(memberUserId)
  if (state) {
    // Record Level 0 -> 1 Promotion at recordTime (confirm)
    promotions.push({
      userId: memberUserId,
      userName: state.userName,
      fromLevel: 0,
      toLevel: 1,
      points: state.points,
      createdAt: recordTime.toISOString()
    })

    // Cash refund transaction snapshot
    const cashDesc = makeDescription(
      'RETURN_FEE_CASH',
      'Chính thức tham gia',
      `Được hoàn ${returnPct}% phí tham gia sau 1 ngày cân nhắc`,
      {
        ...state,
        cashBalance: state.cashBalance + returnAmt,
        brkdBalance: state.brkdBalance + brkdReturn,
        level: 1
      },
      memberStates,
      closures,
      { cashVolume: fee, mBdtVolume: memberMBDT }
    )
    transactions.push({
      userId: memberUserId,
      type: 'RETURN_FEE',
      amount: returnAmt,
      balanceType: 'CASH',
      description: cashDesc,
      refId: returnRefId,
      createdAt: recordTime.toISOString()
    })

    // MBDT refund transaction snapshot (incorporating Level 1 promotion)
    const brkdDesc = makeDescription(
      'RETURN_FEE',
      'Chính thức tham gia',
      `Được hoàn ${returnPct}% phí tham gia sau 1 ngày cân nhắc. Cấp 1. Tỷ lệ hoa hồng: 21%.`,
      {
        ...state,
        cashBalance: state.cashBalance + returnAmt,
        brkdBalance: state.brkdBalance + brkdReturn,
        level: 1
      },
      memberStates,
      closures,
      { cashVolume: fee, mBdtVolume: memberMBDT }
    )
    if (brkdReturn > 0) {
      transactions.push({
        userId: memberUserId,
        type: 'RETURN_FEE',
        amount: brkdReturn,
        balanceType: 'BRKD',
        description: brkdDesc,
        refId: brkdRefId,
        createdAt: recordTime.toISOString()
      })
    }

    // Apply updates to memberState
    state.cashBalance += returnAmt
    state.brkdBalance += brkdReturn
    state.level = 1
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

        // Create JOIN transaction snapshot for the member
        const joinDesc = makeDescription(
          'JOIN',
          'Tham gia hệ thống',
          'Bắt đầu tham gia hệ thống, đang trong thời gian cân nhắc, cấp 0.',
          state,
          memberStates,
          closures,
          { mBdtVolume: 0, cashVolume: 0 }
        )
        simState.transactions.push({
          userId: state.userId,
          type: 'ADJUSTMENT',
          amount: 0,
          balanceType: 'BRKD',
          description: joinDesc,
          refId: `sys_4_user_${state.userId}_join`,
          createdAt: state.activatedAt
        })

        // Create active registration logs for ancestors (F1 and F2)
        const userAncestors = closures
          .filter(c => c.descendantId === state.autoId && c.depth >= 1 && c.depth <= 2)
          .sort((a, b) => a.depth - b.depth)

        const parentClosure = userAncestors.find(c => c.depth === 1)
        const parentSys = parentClosure ? Array.from(memberStates.values()).find(s => s.autoId === parentClosure.ancestorId) : null

        for (const closure of userAncestors) {
          const ancestorSys = Array.from(memberStates.values()).find(s => s.autoId === closure.ancestorId)
          if (!ancestorSys) continue

          let descText = ""
          if (closure.depth === 1) {
            descText = `Học viên mới F1 #${state.userId} ${state.userName} đăng ký tham gia (Đang cân nhắc)`
          } else if (closure.depth === 2 && parentSys) {
            descText = `Học viên mới F2 #${state.userId} ${state.userName} đăng ký tham gia (Đang cân nhắc) dưới leader F1 #${parentSys.userId} ${parentSys.userName}`
          }

          const activeLogDesc = makeDescription(
            closure.depth === 1 ? "F1_ACTIVE" : "F2_ACTIVE",
            "Học viên mới đăng ký",
            descText,
            ancestorSys,
            memberStates,
            closures,
            {
              newMemberId: state.userId,
              newMemberName: state.userName,
              depth: closure.depth
            }
          )

          simState.transactions.push({
            userId: ancestorSys.userId,
            type: 'ADJUSTMENT',
            amount: 0,
            balanceType: 'BRKD',
            description: activeLogDesc,
            refId: `sys_4_user_${ancestorSys.userId}_under_${state.userId}_active`,
            createdAt: state.activatedAt
          })
        }
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
      memberStates,
      simState.promotions,
      closures
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
        earnPct,
        depth: closure.depth
      })
    }

    const commissionRefId = `sys_4_member_${member.userId}`
    const pointsRefId = `sys_4_member_${member.userId}_points`
    for (const { ancestorUserId, uplineLevel, earnPct, depth } of ancestorCredits) {
      const ancestorState = memberStates.get(ancestorUserId)
      if (!ancestorState) continue

      // Add points to ancestor at evalTime
      ancestorState.points += memberMBP
      console.log(`    ↳ Ancestor #${ancestorUserId} ${ancestorState.userName} received +${memberMBP.toFixed(3)} points (daily eval)`)

      let leaderChain = ""
      if (depth === 1) {
        leaderChain = `${member.userName} (#${member.userId}) (F1)`
      } else {
        const parentSys = Array.from(memberStates.values()).find(s => s.userId === member.refSysId)
        if (parentSys) {
          leaderChain = `${parentSys.userName} (#${parentSys.userId}) (F1) ➔ ${member.userName} (#${member.userId}) (F2)`
        } else {
          leaderChain = `${member.userName} (#${member.userId}) (F${depth})`
        }
      }

      // 1. Points transaction snapshot
      const pointsDesc = makeDescription(
        'F1_CONFIRM',
        'Tăng trưởng tích lũy',
        `Cộng +${memberMBP.toFixed(3)} MBP & dồn +${memberMBDT.toLocaleString()} MBDT từ F${depth} #${member.userId} confirm chính thức`,
        ancestorState,
        memberStates,
        closures,
        {
          newMemberId: member.userId,
          newMemberName: member.userName,
          depth,
          leaderChain,
          memberMBDT,
          memberMBP
        }
      )
      simState.transactions.push({
        userId: ancestorUserId,
        type: 'BRKD_CREDIT',
        amount: 0,
        balanceType: 'BRKD',
        description: pointsDesc,
        refId: pointsRefId,
        createdAt: evalTime.toISOString()
      })

      if (earnPct > 0) {
        const commissionAmount = (FEE * earnPct) / 100
        const brkdAmount = Math.round((memberMBDT * earnPct) / 100)

        // 2. CASH Commission transaction snapshot
        if (commissionAmount > 0) {
          const cashCommDesc = makeDescription(
            'COMMISSION',
            'Thu nhập gia tăng',
            `Hoa hồng (${earnPct}%) từ thành viên mới #${member.userId} - ${member.userName}`,
            {
              ...ancestorState,
              cashBalance: ancestorState.cashBalance + commissionAmount
            },
            memberStates,
            closures,
            {
              newMemberId: member.userId,
              newMemberName: member.userName,
              depth,
              leaderChain
            }
          )
          simState.transactions.push({
            userId: ancestorUserId,
            type: 'COMMISSION',
            amount: commissionAmount,
            balanceType: 'CASH',
            description: cashCommDesc,
            refId: commissionRefId,
            createdAt: new Date(evalTime.getTime() + 1000).toISOString()
          })
          ancestorState.cashBalance += commissionAmount
        }

        // 3. BRKD Commission transaction snapshot
        if (brkdAmount > 0) {
          const brkdCommDesc = makeDescription(
            'COMMISSION',
            'Thu nhập gia tăng',
            `Hoa hồng (${earnPct}%) từ thành viên mới #${member.userId} - ${member.userName}`,
            {
              ...ancestorState,
              brkdBalance: ancestorState.brkdBalance + brkdAmount
            },
            memberStates,
            closures,
            {
              newMemberId: member.userId,
              newMemberName: member.userName,
              depth,
              leaderChain
            }
          )
          simState.transactions.push({
            userId: ancestorUserId,
            type: 'COMMISSION',
            amount: brkdAmount,
            balanceType: 'BRKD',
            description: brkdCommDesc,
            refId: commissionRefId,
            createdAt: new Date(evalTime.getTime() + 1000).toISOString()
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
          const voucherDesc = makeDescription(
            'VOUCHER',
            'Thưởng thăng cấp',
            `Thưởng giới thiệu 2 F1 (hệ thống BRK)`,
            {
              ...parentSys,
              voucherBalance: parentSys.voucherBalance + 386000
            },
            memberStates,
            closures
          )
          simState.transactions.push({
            userId: parentSys.userId,
            type: 'VOUCHER_CREDIT',
            amount: 386000,
            balanceType: 'VOUCHER',
            description: voucherDesc,
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
        const promoTime = new Date(evalTime.getTime() + 2000)
        checkAndPromoteLevelMemory(state.userId, memberStates, configMap, promoTime, simState.promotions, simState.transactions, closures)
      }
    }
  }


  // 🎁 Revenue Share cycle (every 3 days)
  // Run time: 02:14 VNT of the 4th day (i.e., morning of the next day of the 3rd day)
  // 02:14 VNT is 19:14 UTC of the target date (dayIndex)
  if (dayIndex % SHARE_INTERVAL === 0 && dayIndex !== 15) {
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
        const cashShareDesc = makeDescription(
          'REVENUE_SHARE_CASH',
          'Đồng chia 2%',
          `Đồng chia 2% kỳ ${dayIndex / 3}`,
          {
            ...member,
            cashBalance: member.cashBalance + shareCASH,
            brkdBalance: member.brkdBalance + shareBRKD
          },
          memberStates,
          closures
        )
        simState.transactions.push({
          userId: member.userId,
          type: 'REVENUE_SHARE',
          amount: shareCASH,
          balanceType: 'CASH',
          description: cashShareDesc,
          refId: `pool_day_${dayIndex}`,
          createdAt: shareTime.toISOString()
        })

        if (shareBRKD > 0) {
          const brkdShareDesc = makeDescription(
            'REVENUE_SHARE',
            'Đồng chia 2%',
            `Đồng chia 2% kỳ ${dayIndex / 3}`,
            {
              ...member,
              cashBalance: member.cashBalance + shareCASH,
              brkdBalance: member.brkdBalance + shareBRKD
            },
            memberStates,
            closures
          )
          simState.transactions.push({
            userId: member.userId,
            type: 'REVENUE_SHARE',
            amount: shareBRKD,
            balanceType: 'BRKD',
            description: brkdShareDesc,
            refId: `pool_day_${dayIndex}`,
            createdAt: shareTime.toISOString()
          })
        }
        member.cashBalance += shareCASH
        member.brkdBalance += shareBRKD
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
