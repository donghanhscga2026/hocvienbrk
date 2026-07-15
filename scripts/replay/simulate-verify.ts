import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const STATE_FILE_PATH = path.join(process.cwd(), 'plan_temp', 'simulation_state.json')
const SYSTEM_ID = 4

interface MemberState {
  userId: number
  userName: string
  autoId: number
  refSysId: number
  level: number
  points: number
  cashBalance: number
  brkdBalance: number
  voucherBalance: number
  isConfirmed: boolean
}

async function verify() {
  if (!fs.existsSync(STATE_FILE_PATH)) {
    console.log(`❌ Error: State file not found at ${STATE_FILE_PATH}. Run all 14 simulation days first.`)
    return
  }

  const simState = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'))
  const simMembers: MemberState[] = simState.memberStates
  simMembers.sort((a, b) => a.userId - b.userId)

  console.log(`\n======================================================`)
  console.log(`📊 SIMULATION VS DATABASE VERIFICATION (SYSTEM 4)`)
  console.log(`======================================================`)

  // Fetch actual data from DB
  const dbMembers = await prisma.system.findMany({
    where: { onSystem: SYSTEM_ID },
    include: {
      user: { select: { name: true } }
    }
  })
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: dbMembers.map(m => m.userId) } }
  })

  const dbMap = new Map(dbMembers.map(m => [m.userId, m]))
  const walletMap = new Map(wallets.map(w => [w.userId, w]))

  console.log(
    `%-6s | %-24s | %-12s | %-16s | %-16s | %-16s`.replace(/%/g, '%'),
    'ID', 'Họ tên', 'Level (S/D)', 'Points (S/D)', 'CASH (Sim/DB)', 'MBDT (Sim/DB)'
  )
  console.log('-'.repeat(110))

  let totalCashSim = 0
  let totalCashDB = 0
  let totalBrkdSim = 0
  let totalBrkdDB = 0
  let levelMismatches = 0
  let pointsMismatches = 0

  for (const sim of simMembers) {
    const db = dbMap.get(sim.userId)
    const wallet = walletMap.get(sim.userId)

    const dbLevel = db ? db.level : 0
    const dbPoints = db ? Number(db.totalPoints) : 0
    const dbCash = wallet ? Number(wallet.balance) : 0
    const dbBrkd = wallet ? Number(wallet.brkd) : 0

    totalCashSim += sim.cashBalance
    totalCashDB += dbCash
    totalBrkdSim += sim.brkdBalance
    totalBrkdDB += dbBrkd

    const levelStr = `C${sim.level}/C${dbLevel}`
    const pointsStr = `${sim.points.toFixed(2)}/${dbPoints.toFixed(2)}`
    const cashStr = `${Math.round(sim.cashBalance).toLocaleString()}/${Math.round(dbCash).toLocaleString()}`
    const brkdStr = `${sim.brkdBalance.toLocaleString()}/${dbBrkd.toLocaleString()}`

    if (sim.level !== dbLevel) levelMismatches++
    if (Math.abs(sim.points - dbPoints) > 0.01) pointsMismatches++

    console.log(
      `%-6d | %-24s | %-12s | %-16s | %-16s | %-16s`,
      sim.userId,
      sim.userName.slice(0, 24),
      levelStr,
      pointsStr,
      cashStr,
      brkdStr
    )
  }

  console.log('\n======================================================')
  console.log(`📈 COMPARATIVE STATS:`)
  console.log(`- Tổng CASH: Sim = ${Math.round(totalCashSim).toLocaleString()}đ | DB = ${Math.round(totalCashDB).toLocaleString()}đ`)
  console.log(`- Tổng MBDT: Sim = ${totalBrkdSim.toLocaleString()} | DB = ${totalBrkdDB.toLocaleString()}`)
  console.log(`- Số học viên lệch Cấp bậc (Level): ${levelMismatches} / ${simMembers.length}`)
  console.log(`- Số học viên lệch Điểm tích lũy: ${pointsMismatches} / ${simMembers.length}`)
  console.log('======================================================')
}

verify()
  .catch(err => console.error('Verification Error:', err))
  .finally(() => prisma.$disconnect())
