import 'dotenv/config'
import * as readline from 'readline'
import prisma from '../lib/prisma'

const SYSTEM_ID = 4
const COURSE_ID = 22
const GRACE_HOURS = 21
const GRACE_CRON_INTERVAL_MS = 60 * 60 * 1000
const APPLICATION_START = new Date('2026-07-02T06:00:00.000Z')
const ORCHESTRATOR_DELAY_MS = 5 * 60 * 1000

type ReplayMember = {
  enrollmentId: number
  enrollmentStatus: 'PENDING' | 'ACTIVE'
  userId: number
  name: string
  referrerId: number | null
  activatedAt: Date
  gracePeriodEnd: Date
  expiresAt: Date
  source: string
}

type ReplayEvent = {
  time: Date
  priority: number
  type: 'ACTIVATE' | 'CYCLE'
  member?: ReplayMember
  roundNumber?: number
}

type StopMode =
  | { type: 'members'; target: number }
  | { type: 'hours'; target: number }
  | { type: 'level'; userId: number; level: number }
  | { type: 'all' }

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5_000

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      const isConnError = error?.code === 'P1017' || error?.message?.includes('connection') || error?.message?.includes('ECONNRESET')
      if (isConnError && attempt < MAX_RETRIES) {
        console.log(`  ⚠️  Connection error on ${label} (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`)
        console.log(`  ⏳ Reconnecting in ${RETRY_DELAY_MS / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        continue
      }
      throw error
    }
  }
  throw new Error('unreachable')
}

function formatVi(date: Date) {
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())))
}

async function askNumber(rl: readline.Interface, question: string, min = 1, max = Infinity): Promise<number> {
  while (true) {
    const raw = await ask(rl, question)
    const n = Number(raw)
    if (Number.isNaN(n) || !Number.isInteger(n) || n < min || n > max) {
      console.log(`  ❌ Giá trị không hợp lệ (cần số nguyên ${min}–${max}). Thử lại.`)
      continue
    }
    return n
  }
}

function showMemberList(members: ReplayMember[]) {
  console.log('\n┌─────────┬────────┬─────────────────────────────┬──────────────────────────┬──────────────────────────┐')
  console.log('│   STT   │  ID    │ Tên                         │ Kích hoạt                │ Hết hạn ân hạn           │')
  console.log('├─────────┼────────┼─────────────────────────────┼──────────────────────────┼──────────────────────────┤')
  members.forEach((m, i) => {
    const stt = String(i + 1).padStart(6)
    const id = String(m.userId).padStart(6)
    const name = (m.name || `#${m.userId}`).slice(0, 27).padEnd(27)
    const activated = formatVi(m.activatedAt).padEnd(24)
    const grace = formatVi(m.gracePeriodEnd).padEnd(24)
    console.log(`│ ${stt} │ ${id} │ ${name} │ ${activated} │ ${grace} │`)
  })
  console.log('└─────────┴────────┴─────────────────────────────┴──────────────────────────┴──────────────────────────┘')
}

async function showMenu(rl: readline.Interface): Promise<{ choice: number; stopMode: StopMode; now: Date }> {
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║        REPLAY SYSTEM #4 (MBTCA) — MENU          ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log('║  1. Chạy toàn bộ (đến thời điểm hiện tại)      ║')
  console.log('║  2. Dừng sau N thành viên được kích hoạt        ║')
  console.log('║  3. Dừng sau N giờ                              ║')
  console.log('║  4. Dừng khi user X đạt level Y                 ║')
  console.log('║  5. Chạy đến thời điểm cụ thể                  ║')
  console.log('╚══════════════════════════════════════════════════╝')

  const choice = await askNumber(rl, '\n  Chọn (1-5): ', 1, 5)
  let stopMode: StopMode
  let now = new Date()

  switch (choice) {
    case 1:
      stopMode = { type: 'all' }
      break
    case 2: {
      const target = await askNumber(rl, '  Dừng sau bao nhiêu thành viên? ', 1)
      stopMode = { type: 'members', target }
      break
    }
    case 3: {
      const hours = await askNumber(rl, '  Chạy bao nhiêu giờ? ', 1)
      now = new Date(APPLICATION_START.getTime() + hours * 3600_000)
      stopMode = { type: 'hours', target: hours }
      break
    }
    case 4: {
      const userId = await askNumber(rl, '  User ID cần theo dõi? ', 1)
      const level = await askNumber(rl, '  Target level? ', 2)
      stopMode = { type: 'level', userId, level }
      break
    }
    case 5: {
      const raw = await ask(rl, '  Nhập thời điểm (YYYY-MM-DDTHH:MM:SS hoặc ISO): ')
      now = new Date(raw)
      if (Number.isNaN(now.getTime())) {
        console.log('  ❌ Thời điểm không hợp lệ. Hủy.')
        process.exit(1)
      }
      stopMode = { type: 'all' }
      break
    }
    default:
      stopMode = { type: 'all' }
  }

  return { choice, stopMode, now }
}

function describeStopMode(mode: StopMode): string {
  switch (mode.type) {
    case 'members': return `Dừng sau ${mode.target} thành viên`
    case 'hours': return `Dừng sau ${mode.target} giờ (cutoff: ${formatVi(new Date(APPLICATION_START.getTime() + mode.target * 3600_000))})`
    case 'level': return `Dừng khi #${mode.userId} đạt level ${mode.level}`
    case 'all': return `Chạy toàn bộ đến thời điểm hiện tại`
  }
}

async function loadMembers(systemDurationDays: number) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId: COURSE_ID,
      status: 'ACTIVE',
      activatedAt: { not: null },
    },
    include: {
      user: { select: { name: true, referrerId: true } },
    },
  })
  const members = enrollments.map<ReplayMember>(enrollment => {
    const activatedAt = enrollment.activatedAt!
    const source = 'Enrollment.activatedAt'
    return {
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.status as 'PENDING' | 'ACTIVE',
      userId: enrollment.userId,
      name: enrollment.user.name || `#${enrollment.userId}`,
      referrerId: enrollment.referrerId ?? enrollment.user.referrerId,
      activatedAt,
      gracePeriodEnd: new Date(activatedAt.getTime() + GRACE_HOURS * 60 * 60 * 1000),
      expiresAt: new Date(activatedAt.getTime() + systemDurationDays * 24 * 60 * 60 * 1000),
      source,
    }
  })
  members.sort((a, b) => a.activatedAt.getTime() - b.activatedAt.getTime() || a.enrollmentId - b.enrollmentId)
  return members
}

function getGraceCronTime(gracePeriodEnd: Date) {
  const firstCycle = new Date(APPLICATION_START.getTime() + GRACE_CRON_INTERVAL_MS + ORCHESTRATOR_DELAY_MS)
  const elapsed = gracePeriodEnd.getTime() - firstCycle.getTime()
  const tick = Math.max(0, Math.ceil(elapsed / GRACE_CRON_INTERVAL_MS))
  return new Date(firstCycle.getTime() + tick * GRACE_CRON_INTERVAL_MS)
}

function printDryRun(
  members: ReplayMember[],
  now: Date,
  stopMode: StopMode,
) {
  const sources = members.reduce<Record<string, number>>((result, member) => {
    result[member.source] = (result[member.source] || 0) + 1
    return result
  }, {})
  console.log('\n=== DRY-RUN — không ghi database ===')
  console.log(`System/course: #${SYSTEM_ID}/#${COURSE_ID}`)
  console.log(`Members total: ${members.length}`)
  console.log(`Activation sources: ${JSON.stringify(sources)}`)
  console.log(`Activation range: ${formatVi(members[0].activatedAt)} -> ${formatVi(members.at(-1)!.activatedAt)}`)
  console.log(`Grace period: ${GRACE_HOURS} hours`)
  console.log(`\nCHẾ ĐỘ CHẠY: ${describeStopMode(stopMode)}`)
  console.log(`\nTHỨ TỰ KÍCH HOẠT (logic nghiệp vụ chỉ chạy qua service thật khi confirm execute):`)
  members.forEach((member, index) => {
    console.log(`  ${index + 1}. #${member.userId} ${member.name} | ${formatVi(member.activatedAt)} | ${member.source}`)
  })

  const completedCycles = Math.max(0, Math.floor((now.getTime() - APPLICATION_START.getTime()) / GRACE_CRON_INTERVAL_MS))
  const activationsInWindow = members.filter(m => m.activatedAt <= now).length
  console.log('\nTỔNG KẾT:')
  console.log(`  Activation events: ${activationsInWindow}`)
  const confirmationTicks = new Set(
    members
      .map(member => getGraceCronTime(member.gracePeriodEnd))
      .filter(time => time <= now)
      .map(time => time.getTime()),
  )
  console.log(`  Official members due: ${members.filter(member => member.gracePeriodEnd <= now).length}`)
  console.log(`  Non-empty hourly confirmation ticks: ${confirmationTicks.size}`)
  console.log(`  Hourly orchestrator cycles: ${completedCycles}`)
  console.log(`  7-hour revenue-share milestones: ${Math.floor(completedCycles / 7)}`)
  console.log(`  30-hour promotion/commission milestones: ${Math.floor(completedCycles / 30)}`)
  console.log('  Placement, MBDT, commissions, levels and revenue share are not simulated here.')
}

async function getResidualState(userIds: number[]) {
  const wallets = await prisma.brkWallet.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  })
  return {
    systems: await prisma.system.count({ where: { onSystem: SYSTEM_ID } }),
    closures: await prisma.systemClosure.count({ where: { systemId: SYSTEM_ID } }),
    pools: await prisma.brkRevenuePool.count({ where: { systemId: SYSTEM_ID } }),
    awards: await prisma.brkRevenueAward.count({ where: { pool: { systemId: SYSTEM_ID } } }),
    timeline: await prisma.brkTimelineRecord.count({ where: { onSystem: SYSTEM_ID } }),
    levelUps: await prisma.brkLevelUpRecord.count({ where: { onSystem: SYSTEM_ID } }),
    referralBonuses: await prisma.brkReferralBonus.count({ where: { onSystem: SYSTEM_ID } }),
    workflowRuns: await prisma.mbtcaWorkflowRun.count(),
    workflowSteps: await prisma.mbtcaWorkflowStep.count(),
    commissionSnapshots: await prisma.mbtcaCommissionLevelSnapshot.count(),
    systemTransactions: await prisma.brkTransaction.count({
      where: {
        walletId: { in: wallets.map(wallet => wallet.id) },
        OR: [
          { refId: { startsWith: `sys_${SYSTEM_ID}_` } },
          { refId: { contains: `_sys_${SYSTEM_ID}_` } },
          { refId: { startsWith: 'dongchia_pool_' } },
        ],
      },
    }),
  }
}

function buildEvents(members: ReplayMember[], now: Date) {
  const events: ReplayEvent[] = []
  for (const member of members) {
    if (member.activatedAt <= now) events.push({ time: member.activatedAt, priority: 0, type: 'ACTIVATE', member })
  }
  for (let round = 1; ; round++) {
    const time = new Date(APPLICATION_START.getTime() + round * GRACE_CRON_INTERVAL_MS + ORCHESTRATOR_DELAY_MS)
    if (time > now) break
    events.push({ time, priority: 1, type: 'CYCLE', roundNumber: round })
  }
  events.sort((a, b) => a.time.getTime() - b.time.getTime() || a.priority - b.priority)
  return events
}

async function executeReplay(
  members: ReplayMember[],
  now: Date,
  stopMode: StopMode,
  maxEvents?: number,
) {
  const residual = await getResidualState(members.map(member => member.userId))
  const dirty = Object.values(residual).some(count => count > 0)
  console.log('\nResidual state:', residual)
  if (dirty) {
    console.log('\n⚠️  System #4 chưa sạch dữ liệu. Dữ liệu cũ có thể chồng chéo.')
    console.log('   Nếu bạn chắc chắn, tiếp tục. Nếu không, hãy xóa dữ liệu cũ trước.')
  }
  console.log(`STOP MODE: ${describeStopMode(stopMode)}`)

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: SYSTEM_ID } })
  if (!systemTree) throw new Error('SystemTree #4 not found')
  const application = await prisma.systemPlanApplication.findUnique({
    where: { applicationCode: 'SYS4_MB_TCA_20260702_130000' },
    include: { businessPlan: true },
  })
  if (!application || application.businessPlan.code !== 'MB_TCA') {
    throw new Error('MB TCA application SYS4_MB_TCA_20260702_130000 not found')
  }
  const events = buildEvents(members, now)
  const { activateMbtcaMember } = await import('../lib/brk/mbtca-service')
  const { runMbtcaOrchestrator } = await import('../lib/brk/mbtca-orchestrator-service')

  let stopRequested = false
  let signalCount = 0
  let completedEvents = 0
  let activatedCount = 0
  const requestStop = () => {
    signalCount++
    if (signalCount === 1) {
      stopRequested = true
      console.log('\nSTOP REQUESTED — waiting for the current event to finish. Press Ctrl+C again to force exit.')
      return
    }
    console.error('\nFORCED STOP — the current event may be incomplete.')
    process.exit(130)
  }
  process.on('SIGINT', requestStop)

  try {
    for (const event of events) {
      if (stopRequested) break

      if (event.type === 'ACTIVATE' && event.member) {
        await withRetry(`ACTIVATE #${event.member.userId}`, () =>
          activateMbtcaMember(
            event.member!.userId,
            event.member!.referrerId,
            event.time,
            true,
          )
        )
        activatedCount++
        console.log(`ACTIVATE #${event.member.userId} ${event.member.name} @ ${event.time.toISOString()} [${activatedCount}/${members.length}]`)
      } else if (event.type === 'CYCLE') {
        const result = await withRetry(`CYCLE ${event.roundNumber}`, () =>
          runMbtcaOrchestrator(event.time)
        )
        console.log(`CYCLE ${event.roundNumber}: ${JSON.stringify(result)}`)
      }
      completedEvents++
      console.log(`CHECKPOINT ${completedEvents}: ${event.type} @ ${event.time.toISOString()}`)

      if (maxEvents != null && completedEvents >= maxEvents) {
        stopRequested = true
        console.log(`MAX EVENTS REACHED (${maxEvents}) — stopping at a safe checkpoint.`)
        break
      }

      if (stopMode.type === 'members' && activatedCount >= stopMode.target) {
        stopRequested = true
        console.log(`TARGET MEMBERS REACHED (${stopMode.target}) — stopping at a safe checkpoint.`)
        break
      }

      if (stopMode.type === 'level') {
        const sys = await prisma.system.findUnique({
          where: { userId_onSystem: { userId: stopMode.userId, onSystem: SYSTEM_ID } },
          select: { level: true },
        })
        if (sys && sys.level >= stopMode.level) {
          stopRequested = true
          console.log(`TARGET LEVEL REACHED — #${stopMode.userId} reached level ${sys.level} (target: ${stopMode.level}) — stopping at a safe checkpoint.`)
          break
        }
      }
    }
  } finally {
    process.off('SIGINT', requestStop)
  }

  if (stopRequested) {
    console.log(`\nReplay stopped safely after ${completedEvents} completed events (${activatedCount} activations).`)
    if (stopMode.type === 'level') {
      const sys = await prisma.system.findUnique({
        where: { userId_onSystem: { userId: stopMode.userId, onSystem: SYSTEM_ID } },
        select: { level: true, totalPoints: true },
      })
      console.log(`#${stopMode.userId} current state: level=${sys?.level ?? 'N/A'}, totalPoints=${sys?.totalPoints ?? 'N/A'}`)
    }
    return
  }

  console.log('\n✅ Replay completed successfully.')
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  try {
    const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: SYSTEM_ID } })
    if (!systemTree) throw new Error('SystemTree #4 not found')
    const members = await loadMembers(systemTree.durationDays)
    if (!members.length) throw new Error('Không tìm thấy thành viên ACTIVE nào cho course #22')

    console.log(`\n=== REPLAY SYSTEM #${SYSTEM_ID} (MBTCA) ===`)
    console.log(`Tổng thành viên ACTIVE: ${members.length}`)
    console.log(`Grace period: ${GRACE_HOURS}h | Cron interval: ${GRACE_CRON_INTERVAL_MS / 60000}min`)

    showMemberList(members)

    const { stopMode, now } = await showMenu(rl)

    const events = buildEvents(members, now)
    console.log(`\nCutoff time: ${formatVi(now)}`)
    console.log(`Total events: ${events.length}`)

    printDryRun(members, now, stopMode)

    const confirm = await ask(rl, '\n▶ Bạn có muốn thực thi không? (y/N): ')
    if (confirm.toLowerCase() !== 'y') {
      console.log('Đã hủy.')
      return
    }

    await executeReplay(members, now, stopMode)
  } finally {
    rl.close()
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
