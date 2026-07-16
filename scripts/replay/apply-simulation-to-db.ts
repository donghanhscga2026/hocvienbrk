import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const STATE_FILE_PATH = path.join(process.cwd(), 'plan_temp', 'simulation_state.json')
const SYSTEM_ID = 4

async function run() {
  if (!fs.existsSync(STATE_FILE_PATH)) {
    console.error(`❌ Error: Simulation state file not found at ${STATE_FILE_PATH}`)
    return
  }

  const simState = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'))
  const simMembers = simState.memberStates
  console.log(`🚀 Starting database restoration using Simulation State (Day ${simState.lastDayIndex})`)
  console.log(`👤 Processing ${simMembers.length} members...`)

  // 1. Update System levels, points, and Wallets balances
  for (const sim of simMembers) {
    // Update System
    await prisma.system.updateMany({
      where: { userId: sim.userId, onSystem: SYSTEM_ID },
      data: {
        level: sim.level,
        totalPoints: sim.points,
      }
    })

    // Upsert Wallet balances
    await prisma.brkWallet.upsert({
      where: { userId: sim.userId },
      update: {
        balance: sim.cashBalance,
        brkd: sim.brkdBalance,
        voucherBalance: sim.voucherBalance
      },
      create: {
        userId: sim.userId,
        balance: sim.cashBalance,
        brkd: sim.brkdBalance,
        voucherBalance: sim.voucherBalance
      }
    })
  }
  console.log(`✅ System levels, points, and wallets updated for all members.`)

  // Get all wallets for mapping userId -> walletId
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: simMembers.map((m: any) => m.userId) } }
  })
  const walletMap = new Map(wallets.map(w => [w.userId, w.id]))

  // 2. Clear old transactions and level records of System 4
  console.log(`🧹 Clearing old transactions, pools, and promotions for System 4...`)
  
  // Delete all revenue awards of System 4 pools
  await prisma.brkRevenueAward.deleteMany({
    where: { pool: { systemId: SYSTEM_ID } }
  })

  // Delete all pools of System 4
  await prisma.brkRevenuePool.deleteMany({
    where: { systemId: SYSTEM_ID }
  })

  // Delete ALL transactions of these 84 wallets
  await prisma.brkTransaction.deleteMany({
    where: { walletId: { in: wallets.map(w => w.id) } }
  })

  // Delete level up records of these 84 users on System 4
  await prisma.brkLevelUpRecord.deleteMany({
    where: {
      userId: { in: simMembers.map((m: any) => m.userId) },
      onSystem: SYSTEM_ID
    }
  })
  console.log(`✅ Old transaction history, pools and promotions cleared.`)

  // 3. Insert new transactions from Simulation (calculating balanceBefore/balanceAfter dynamically)
  console.log(`📥 Sorting and calculating balances for ${simState.transactions.length} new transactions...`)
  
  // Group transactions by userId
  const userTxGroups = new Map<number, any[]>()
  for (const tx of simState.transactions) {
    if (!userTxGroups.has(tx.userId)) {
      userTxGroups.set(tx.userId, [])
    }
    userTxGroups.get(tx.userId)!.push(tx)
  }

  const txData: any[] = []

  for (const [userId, txs] of userTxGroups.entries()) {
    const walletId = walletMap.get(userId)
    if (!walletId) {
      throw new Error(`Wallet not found for user #${userId}`)
    }

    // Sort user transactions chronologically
    txs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    let cashBalance = 0
    let brkdBalance = 0
    let voucherBalance = 0

    for (const tx of txs) {
      let balanceBefore = 0
      let balanceAfter = 0

      if (tx.balanceType === 'CASH') {
        balanceBefore = cashBalance
        balanceAfter = cashBalance + tx.amount
        cashBalance = balanceAfter
      } else if (tx.balanceType === 'BRKD') {
        balanceBefore = brkdBalance
        balanceAfter = brkdBalance + tx.amount
        brkdBalance = balanceAfter
      } else if (tx.balanceType === 'VOUCHER') {
        balanceBefore = voucherBalance
        balanceAfter = voucherBalance + tx.amount
        voucherBalance = balanceAfter
      }

      txData.push({
        walletId,
        type: tx.type,
        amount: tx.amount,
        balanceType: tx.balanceType,
        description: tx.description,
        refId: tx.refId,
        balanceBefore,
        balanceAfter,
        createdAt: new Date(tx.createdAt)
      })
    }
  }

  // Batch insert transactions (using createMany)
  await prisma.brkTransaction.createMany({
    data: txData
  })
  console.log(`✅ Transactions inserted with running balance calculation.`)

  // 4. Insert new promotions from Simulation
  console.log(`📥 Inserting ${simState.promotions.length} level promotion records...`)
  const promoData = simState.promotions
    .filter((p: any) => p.fromLevel > 0 || p.toLevel > 0) // exclude initial 0->0 activations
    .map((p: any) => ({
      userId: p.userId,
      onSystem: SYSTEM_ID,
      fromLevel: p.fromLevel,
      toLevel: p.toLevel,
      promotedAt: new Date(p.createdAt)
    }))

  await prisma.brkLevelUpRecord.createMany({
    data: promoData
  })
  console.log(`✅ Promotion records inserted.`)

  // 5. Build and Insert Timeline Records for all members
  console.log(`📥 Building and inserting Timeline records...`)
  
  // Clear old timeline records of System 4
  await prisma.brkTimelineRecord.deleteMany({
    where: { onSystem: SYSTEM_ID }
  })

  const sysNodes = await prisma.system.findMany({
    where: { onSystem: SYSTEM_ID },
    select: { userId: true, activatedAt: true }
  })
  const activationMap = new Map(sysNodes.map(s => [s.userId, s.activatedAt]))

  const sysTree = await prisma.systemTree.findUnique({
    where: { onSystem: SYSTEM_ID },
    select: { graceDays: true, fee: true }
  })
  const graceDays = sysTree?.graceDays ?? 1
  const graceText = `${graceDays * 24}h`
  const sysFee = sysTree ? Number(sysTree.fee) : 26866666

  const timelineRecordsToInsert: any[] = []

  for (const sim of simMembers) {
    const userId = sim.userId
    const userEvents: any[] = []

    // 1) Mốc ACTIVATION
    const activatedAt = activationMap.get(userId)
    if (activatedAt) {
      userEvents.push({
        type: 'ACTIVATION',
        time: new Date(activatedAt),
        title: 'Đã kích hoạt hệ thống',
        description: `Đang trong thời gian ${graceText} cân nhắc, Cấp 0.`,
        fromLevel: null,
        toLevel: 0,
        amountCash: 0,
        amountBrkd: 0,
        amountVoucher: 0,
        txType: null,
        targetMemberId: null,
        targetMemberName: null,
        pathStr: null,
        meta: null
      })
    }

    // 2) Mốc LEVEL_UP (Không đưa mốc 0 -> 1 vào vì sẽ được gộp vào thời điểm confirm)
    const userPromotions = simState.promotions.filter((p: any) => 
      p.userId === userId && 
      p.toLevel > 0 && 
      !(p.fromLevel === 0 && p.toLevel === 1)
    )
    for (const p of userPromotions) {
      userEvents.push({
        type: 'LEVEL_UP',
        time: new Date(p.createdAt),
        title: 'Thăng tiến cấp bậc',
        description: `Thăng cấp từ Cấp ${p.fromLevel} lên Cấp ${p.toLevel}`,
        fromLevel: p.fromLevel,
        toLevel: p.toLevel,
        amountCash: 0,
        amountBrkd: 0,
        amountVoucher: 0,
        txType: null,
        targetMemberId: null,
        targetMemberName: null,
        pathStr: null,
        meta: null
      })
    }

    // 3) Mốc TRANSACTION (Gộp nhóm thông minh)
    const userTxs = userTxGroups.get(userId) || []
    const normalizeDesc = (desc: string) => {
      try {
        if (desc.startsWith('{') && desc.endsWith('}')) {
          const meta = JSON.parse(desc);
          if (meta.sys4) return meta.desc.toLowerCase();
        }
      } catch (e) {}
      return desc.toLowerCase();
    }

    const userGroupedTxs: any[] = []
    for (const tx of userTxs) {
      const txTime = new Date(tx.createdAt).getTime()
      let meta: any = null
      try {
        if (tx.description.startsWith('{') && tx.description.endsWith('}')) {
          meta = JSON.parse(tx.description)
        }
      } catch (e) {}

      // Bỏ qua transaction JOIN vì nó trùng với mốc ACTIVATION ban đầu
      if (tx.type === 'JOIN' || tx.description.includes('JOIN') || (meta && meta.event === 'JOIN')) {
        continue
      }

      // Bỏ qua transaction log thăng cấp points (LEVEL_UP) vì đã có LEVEL_UP timeline record thật
      if (tx.description.includes('Thăng tiến cấp bậc') || (meta && meta.event === 'LEVEL_UP')) {
        continue
      }

      // Tìm giao dịch tương tự để gộp nhóm
      const existing = userGroupedTxs.find(g => {
        const gTime = new Date(g.createdAt).getTime()
        const isTimeClose = Math.abs(gTime - txTime) < 5000

        // 1. Nếu là RETURN_FEE: gộp chung chỉ cần cùng loại và cùng thời gian
        if (tx.type === 'RETURN_FEE' && g.type === 'RETURN_FEE') return isTimeClose

        // 2. Nếu là COMMISSION: gộp chung chỉ cần cùng loại, cùng thời gian và cùng targetMemberId
        if (tx.type === 'COMMISSION' && g.type === 'COMMISSION') {
          const txNewMember = meta?.extra?.newMemberId
          const gNewMember = g.meta?.extra?.newMemberId
          return isTimeClose && txNewMember === gNewMember
        }

        // 3. Nếu là REVENUE_SHARE: gộp chung chỉ cần cùng loại và cùng thời gian
        if (tx.type === 'REVENUE_SHARE' && g.type === 'REVENUE_SHARE') return isTimeClose

        // Mặc định: So sánh chuẩn hóa desc và thời gian close
        const normTxDesc = normalizeDesc(tx.description || '')
        const normGDesc = normalizeDesc(g.description || '')
        return normGDesc === normTxDesc && isTimeClose
      })

      if (existing) {
        if (tx.balanceType === 'CASH') {
          existing.amountCash = Number(tx.amount)
          existing.description = tx.description
          existing.type = tx.type
        } else if (tx.balanceType === 'BRKD') {
          existing.amountBrkd = Number(tx.amount)
        } else if (tx.balanceType === 'VOUCHER') {
          existing.amountVoucher = Number(tx.amount)
        }
        if (meta && meta.sys4) {
          existing.meta = meta
        }
      } else {
        userGroupedTxs.push({
          createdAt: tx.createdAt,
          type: tx.type,
          description: tx.description,
          amountCash: tx.balanceType === 'CASH' ? Number(tx.amount) : 0,
          amountBrkd: tx.balanceType === 'BRKD' ? Number(tx.amount) : 0,
          amountVoucher: tx.balanceType === 'VOUCHER' ? Number(tx.amount) : 0,
          meta: meta && meta.sys4 ? meta : null
        })
      }
    }

    for (const gtx of userGroupedTxs) {
      let txTitle = 'Tăng trưởng tích lũy'
      let txDesc = gtx.description || ''
      if (gtx.type === 'COMMISSION') {
        txTitle = 'Thu nhập gia tăng'
      } else if (gtx.type === 'RETURN_FEE') {
        txTitle = 'Chính thức tham gia'
      } else if (gtx.type === 'REVENUE_SHARE') {
        txTitle = 'Đồng chia 2%'
      } else if (gtx.type === 'VOUCHER_CREDIT') {
        txTitle = 'Thưởng thăng cấp'
        const matchLvl = txDesc.match(/cấp (\d+)/)
        if (matchLvl) {
          txDesc = `Quà tặng lên cấp ${matchLvl[1]}`
        }
      }

      let targetMemberId: number | null = null
      let targetMemberName: string | null = null
      let pathStr: string | null = null

      if (gtx.meta) {
        txTitle = gtx.meta.title
        txDesc = gtx.meta.desc
        pathStr = gtx.meta.extra?.leaderChain || null
        if (gtx.meta.extra?.newMemberId) {
          targetMemberId = gtx.meta.extra.newMemberId
          targetMemberName = gtx.meta.extra.newMemberName || null
        }
      } else {
        const match = txDesc.match(/#(\d+)/)
        if (match && match[1]) {
          targetMemberId = parseInt(match[1])
          targetMemberName = `Học viên #${targetMemberId}`
        }
      }

      // Ghi đè cứng cho các sự kiện theo yêu cầu mới nhất của user
      if (gtx.type === 'RETURN_FEE') {
        txTitle = 'Chính thức tham gia'
        txDesc = 'Được hoàn 21% phí tham gia sau 1 ngày cân nhắc. Cấp 1. Tỷ lệ hoa hồng: 21%.'
      } else if (gtx.type === 'COMMISSION') {
        txTitle = 'Thu nhập gia tăng'
      } else if (gtx.type === 'BRKD_CREDIT') {
        txTitle = 'Tăng trưởng tích lũy'
      }

      userEvents.push({
        type: 'TRANSACTION',
        time: new Date(gtx.createdAt),
        title: txTitle,
        description: txDesc,
        fromLevel: null,
        toLevel: null,
        amountCash: gtx.amountCash,
        amountBrkd: gtx.amountBrkd,
        amountVoucher: gtx.amountVoucher,
        txType: gtx.type,
        targetMemberId,
        targetMemberName,
        pathStr,
        meta: gtx.meta
      })
    }

    // Sắp xếp các sự kiện của user theo thời gian tăng dần
    // Nếu cùng thời gian, TRANSACTION xếp trước LEVEL_UP để đảm bảo tăng điểm trước rồi mới promotion sau
    userEvents.sort((a, b) => {
      const diff = a.time.getTime() - b.time.getTime()
      if (diff !== 0) return diff
      if (a.type === 'TRANSACTION' && b.type === 'LEVEL_UP') return -1
      if (a.type === 'LEVEL_UP' && b.type === 'TRANSACTION') return 1
      return 0
    })

    // Tính lũy kế số dư và doanh số dồn toán học chuẩn xác
    let accumCash = 0
    let accumBrkd = 0
    let accumVoucher = 0
    let accumBrkdVolume = 0
    let accumCashVolume = 0
    let accumTeamSize = 1
    let accumBrkp = 0

    for (const ev of userEvents) {
      if (ev.type === 'ACTIVATION') {
        accumCash = 0
        accumBrkd = 0
        accumVoucher = 0
        accumBrkdVolume = 0
        accumCashVolume = 0
        accumTeamSize = 1
        accumBrkp = 0
      } else if (ev.type === 'TRANSACTION') {
        accumCash += ev.amountCash
        accumBrkd += ev.amountBrkd
        accumVoucher += ev.amountVoucher

        const meta = ev.meta
        if (meta) {
          if (meta.event === 'RETURN_FEE') {
            const personalMBDT = ev.amountBrkd ? Math.round(ev.amountBrkd / 0.21) : 0
            const personalCASH = sysFee
            accumBrkdVolume += personalMBDT
            accumCashVolume += personalCASH
            
            // Bản thân confirm: cộng điểm MBP thăng cấp
            accumBrkp += Number((personalMBDT / 750000).toFixed(3))
          } else if (meta.event === 'F1_CONFIRM' || meta.event === 'F2_CONFIRM') {
            const memberMBDT = meta.extra?.memberMBDT || 0
            const memberCASH = sysFee
            accumBrkdVolume += memberMBDT
            accumCashVolume += memberCASH

            // Tuyến dưới confirm: tăng thành viên nhóm và cộng điểm dồn
            accumTeamSize += 1
            accumBrkp += Number((memberMBDT / 750000).toFixed(3))
          }
        }
      }

      timelineRecordsToInsert.push({
        userId,
        onSystem: SYSTEM_ID,
        type: ev.type,
        time: ev.time,
        title: ev.title,
        description: ev.description,
        accumulatedCash: accumCash,
        accumulatedBrkd: accumBrkd,
        accumulatedBrkp: Number(accumBrkp.toFixed(3)),
        accumulatedTeamSize: accumTeamSize,
        accumulatedBrkdVolume: accumBrkdVolume,
        accumulatedCashVolume: accumCashVolume,
        amountCash: ev.amountCash,
        amountBrkd: ev.amountBrkd,
        amountVoucher: ev.amountVoucher,
        txType: ev.txType,
        targetMemberId: ev.targetMemberId,
        targetMemberName: ev.targetMemberName,
        pathStr: ev.pathStr,
        fromLevel: ev.fromLevel,
        toLevel: ev.toLevel
      })
    }
  }

  // Batch insert timeline records
  await prisma.brkTimelineRecord.createMany({
    data: timelineRecordsToInsert
  })
  console.log(`✅ Timeline records built and inserted.`)

  console.log(`🎉 DATABASE RESTORATION COMPLETE! System 4 data is now 100% matched with simulation.`)
}

run()
  .catch(err => console.error('Database Restoration failed:', err))
  .finally(() => prisma.$disconnect())
