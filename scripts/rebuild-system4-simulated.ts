import { PrismaClient } from '@prisma/client'
import { activateBrkMember, processGracePeriodExpirations } from '../lib/brk/activation-service'
import { processSystemDailyEval } from '../lib/brk/daily-eval-service'
import { processRevenueShareForSystem } from '../lib/brk/revenue-share-service'
import * as fs from 'fs'
import * as readline from 'readline'

const prisma = new PrismaClient()
const SYSTEM_ID = 4
const CHECKPOINT_PATH = 'plan_temp/rebuild_checkpoint.json'
const SIM_STATE_PATH = 'plan_temp/simulation_state.json'
const DAY0_UTC = Date.UTC(2026, 6, 2, 0, 0, 0)

const isExecuteMode = process.argv.includes('--execute')
const isResumeMode = process.argv.includes('--resume')
const isAutoMode = process.argv.includes('--auto')

interface SimMember {
  userId: number
  userName: string
  activatedAt: Date
  refSysId: number
  referrerId: number | null
  dayIndex: number
  enrollmentActivatedAt: Date
}

interface CheckpointData {
  startedAt: string
  mode: string
  processedMemberIds: number[]
  cronState: {
    lastGraceDay: number
    lastDailyEvalDay: number
    lastRevenueShareDay: number
  }
}

let rl: readline.Interface

function initReadline() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout })
}

function closeReadline() {
  if (rl) rl.close()
}

function askQuestion(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, answer => resolve(answer.trim()))
  })
}

async function waitForContinue() {
  if (isAutoMode) return
  await askQuestion('\n⏎ Nhấn Enter để tiếp tục...')
}

async function confirmAction(prompt: string): Promise<boolean> {
  if (isAutoMode) return true
  const answer = await askQuestion(`\n${prompt} (y/n): `)
  return answer === '' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'ok'
}

function saveCheckpoint(data: CheckpointData) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(data, null, 2))
}

function loadCheckpoint(): CheckpointData | null {
  if (!fs.existsSync(CHECKPOINT_PATH)) return null
  return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'))
}

function utcToIct(utcDate: Date): string {
  const ict = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000)
  return ict.toISOString().replace('T', ' ').replace(/\.\d+Z/, ' ICT')
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

function dayIndexToDate(dayIndex: number): Date {
  return new Date(DAY0_UTC + dayIndex * 24 * 60 * 60 * 1000)
}

function dateToDayIndex(date: Date): number {
  return Math.floor((date.getTime() - DAY0_UTC) / (24 * 60 * 60 * 1000))
}

function isRevenueShareDay(dayIndex: number): boolean {
  const d = dayIndexToDate(dayIndex)
  const dayOfMonth = d.getUTCDate()
  return (dayOfMonth - 1) % 3 === 0
}

function formatDate(dayIndex: number): string {
  const d = dayIndexToDate(dayIndex)
  const day = d.getUTCDate()
  const month = d.getUTCMonth() + 1
  const year = d.getUTCFullYear()
  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  return `${weekdays[d.getUTCDay()]} ${day}/${month}/${year}`
}

function displayHeader(text: string) {
  console.log('\n' + '═'.repeat(60))
  console.log(text)
  console.log('═'.repeat(60))
}

function displaySubHeader(text: string) {
  console.log('\n' + '─'.repeat(50))
  console.log(text)
  console.log('─'.repeat(50))
}

async function loadSimulationState(): Promise<Map<number, { refSysId: number; activatedAt: string }>> {
  if (!fs.existsSync(SIM_STATE_PATH)) {
    console.error(`❌ Không tìm thấy ${SIM_STATE_PATH}`)
    process.exit(1)
  }
  const state = JSON.parse(fs.readFileSync(SIM_STATE_PATH, 'utf-8'))
  const memberMap = new Map<number, { refSysId: number; activatedAt: string }>()
  for (const m of state.memberStates) {
    memberMap.set(m.userId, { refSysId: m.refSysId, activatedAt: m.activatedAt })
  }
  return memberMap
}

async function loadEnrollments() {
  return prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE', activatedAt: { not: null } },
    include: {
      user: { select: { id: true, name: true, referrerId: true } },
    },
    orderBy: { activatedAt: 'asc' },
  })
}

async function buildMemberList(): Promise<SimMember[]> {
  const simState = await loadSimulationState()
  const enrollments = await loadEnrollments()

  console.log(`📋 Tìm thấy ${enrollments.length} enrollments courseId=22 ACTIVE`)
  console.log(`📋 Simulation state: ${simState.size} thành viên`)

  const members: SimMember[] = []

  for (const enrollment of enrollments) {
    const userId = enrollment.userId
    const simData = simState.get(userId)

    if (simData) {
      const activatedAt = new Date(simData.activatedAt)
      members.push({
        userId,
        userName: enrollment.user.name || `#${userId}`,
        activatedAt,
        refSysId: simData.refSysId,
        referrerId: enrollment.user.referrerId,
        dayIndex: dateToDayIndex(activatedAt),
        enrollmentActivatedAt: enrollment.activatedAt!,
      })
    } else {
      const fallbackTime = new Date(Date.UTC(2026, 6, 17, 12, 0, 0))
      members.push({
        userId,
        userName: enrollment.user.name || `#${userId}`,
        activatedAt: fallbackTime,
        refSysId: -1,
        referrerId: enrollment.user.referrerId,
        dayIndex: dateToDayIndex(fallbackTime),
        enrollmentActivatedAt: enrollment.activatedAt!,
      })
    }
  }

  members.sort((a, b) => a.enrollmentActivatedAt.getTime() - b.enrollmentActivatedAt.getTime())

  return members
}

function groupByDay(members: SimMember[]): Map<number, SimMember[]> {
  const groups = new Map<number, SimMember[]>()
  for (const m of members) {
    if (!groups.has(m.dayIndex)) groups.set(m.dayIndex, [])
    groups.get(m.dayIndex)!.push(m)
  }
  return groups
}

async function displayDayPreview(
  dayIndex: number,
  dayMembers: SimMember[],
  totalProcessed: number,
  totalMembers: number,
  mode: string
) {
  displayHeader(`📅 NGÀY ${dayIndex} — ${formatDate(dayIndex)} — ${dayMembers.length} thành viên mới`)
  console.log(`_mode: ${mode.toUpperCase()}_ | Đã xử lý: ${totalProcessed}/${totalMembers}`)

  console.log('\n👥 THÀNH VIÊN SẼ KÍCH HOẠT:')
  for (let i = 0; i < dayMembers.length; i++) {
    const m = dayMembers[i]
    const ictTime = utcToIct(m.activatedAt)
    const placement = m.refSysId === 0 ? 'ROOT' :
      m.refSysId === -1 ? 'BFS (auto)' : `#${m.refSysId}`
    console.log(`  ${String(i + 1).padStart(2)}. #${m.userId} ${m.userName} — ${ictTime} → parent: ${placement}`)
  }

  if (dayIndex > 0) {
    console.log('\n🔔 CRON SẼ CHẠY TRƯỚC KHI XỬ LÝ:')
    console.log(`  ⏰ 16:50 UTC Grace Processing`)
    console.log(`  ⏰ 18:13 UTC Daily Eval`)
    if (isRevenueShareDay(dayIndex)) {
      console.log(`  ⏰ 19:14 UTC Revenue Share`)
    }
  }

  console.log('\n🔔 CRON SẼ CHẠY SAU KHI XỬ LÝ:')
  console.log(`  ⏰ 16:50 UTC Grace Processing`)
  console.log(`  ⏰ 18:13 UTC Daily Eval`)
  if (isRevenueShareDay(dayIndex + 1)) {
    console.log(`  ⏰ 19:14 UTC Revenue Share`)
  }
}

async function simulateActivation(member: SimMember, mode: string): Promise<{ success: boolean; error?: string; autoId?: number }> {
  const now = member.activatedAt
  const graceEnd = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

  if (mode === 'dry-run') {
    console.log(`  [DRY-RUN] Would call: activateBrkMember(${member.userId}, ${SYSTEM_ID}, ${member.referrerId}, ${now.toISOString()})`)
    console.log(`  [DRY-RUN] → refSysId would be resolved by BFS (FORCED_4WIDE)`)
    console.log(`  [DRY-RUN] → Expected: system record created, level=0, JOIN transaction logged`)
    return { success: true }
  }

  try {
    const system = await activateBrkMember(
      member.userId,
      SYSTEM_ID,
      member.referrerId,
      now
    )
    console.log(`  ✅ Activated! autoId=${system.autoId}, level=${system.level}, refSysId=${system.refSysId}`)
    return { success: true, autoId: system.autoId }
  } catch (err: any) {
    if (err.message?.includes('already active')) {
      console.log(`  ⏭ Already active in system, skipping`)
      return { success: true }
    }
    console.error(`  ❌ Error: ${err.message}`)
    return { success: false, error: err.message }
  }
}

async function simulateGraceProcessing(dayIndex: number, mode: string) {
  const cronTime = new Date(dayIndexToDate(dayIndex).getTime() + 16 * 3600000 + 50 * 60000)

  displaySubHeader(`⏰ Grace Processing — Day ${dayIndex} — ${utcToIct(cronTime)}`)

  if (mode === 'dry-run') {
    const expiredCount = await prisma.system.count({
      where: {
        onSystem: SYSTEM_ID,
        status: 'ACTIVE',
        gracePeriodEnd: { lte: cronTime }
      }
    })
    console.log(`  [DRY-RUN] Would call: processGracePeriodExpirations(${cronTime.toISOString()})`)
    console.log(`  [DRY-RUN] → Found ${expiredCount} members with gracePeriodEnd <= now`)
    return { processed: expiredCount }
  }

  try {
    const result = await processGracePeriodExpirations(cronTime)
    console.log(`  ✅ Grace processing: ${result.processed} members confirmed`)
    return result
  } catch (err: any) {
    console.error(`  ❌ Grace processing error: ${err.message}`)
    return { processed: 0 }
  }
}

async function simulateDailyEval(dayIndex: number, mode: string) {
  const evalTime = new Date(dayIndexToDate(dayIndex).getTime() + 18 * 3600000 + 13 * 60000)

  displaySubHeader(`⏰ Daily Eval — Day ${dayIndex} — ${utcToIct(evalTime)}`)

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: SYSTEM_ID } })
  if (!systemTree) {
    console.log('  ❌ SystemTree #4 not found')
    return { checked: 0, confirmed: 0 }
  }

  if (mode === 'dry-run') {
    const dueCount = await prisma.system.count({
      where: {
        onSystem: SYSTEM_ID,
        status: 'ACTIVE',
        gracePeriodEnd: { lt: evalTime }
      }
    })
    console.log(`  [DRY-RUN] Would call: processSystemDailyEval(systemTree, ${evalTime.toISOString()}, ${evalTime.toISOString()})`)
    console.log(`  [DRY-RUN] → Found ${dueCount} members with gracePeriodEnd < now`)
    return { checked: dueCount, confirmed: 0 }
  }

  try {
    const result = await processSystemDailyEval(systemTree, evalTime, evalTime)
    console.log(`  ✅ Daily eval: ${result.checked} checked, ${result.confirmed} confirmed`)
    return result
  } catch (err: any) {
    console.error(`  ❌ Daily eval error: ${err.message}`)
    return { checked: 0, confirmed: 0 }
  }
}

async function simulateRevenueShare(dayIndex: number, mode: string) {
  const distDate = new Date(dayIndexToDate(dayIndex).getTime() + 19 * 3600000 + 14 * 60000)

  const lastPool = await prisma.brkRevenuePool.findFirst({
    where: { systemId: SYSTEM_ID },
    orderBy: { roundNumber: 'desc' }
  })
  const nextRound = (lastPool?.roundNumber || 0) + 1

  displaySubHeader(`⏰ Revenue Share — Day ${dayIndex} — Round ${nextRound} — ${utcToIct(distDate)}`)

  if (mode === 'dry-run') {
    console.log(`  [DRY-RUN] Would call: processRevenueShareForSystem(${SYSTEM_ID}, ${distDate.toISOString()})`)
    console.log(`  [DRY-RUN] → Period: ${new Date(distDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()} → ${distDate.toISOString()}`)
    return { processed: true, qualifiedCount: 0 }
  }

  try {
    const result = await processRevenueShareForSystem(SYSTEM_ID, distDate)
    console.log(`  ✅ Revenue share: qualified=${result.qualifiedCount || 0}, pool=${formatMoney(result.poolAmount || 0)}`)
    if (result.amountPerPerson) {
      console.log(`  💰 Per person: ${formatMoney(result.amountPerPerson)}`)
    }
    return result
  } catch (err: any) {
    console.error(`  ❌ Revenue share error: ${err.message}`)
    return { processed: false }
  }
}

async function runStartupChecks() {
  displayHeader('🔍 STARTUP CHECKS')

  const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
  if (promoConfig?.value === 'B') {
    console.log('  ✅ brk_promotion_logic = B (Method B)')
  } else {
    console.log(`  ⚠️  brk_promotion_logic = ${promoConfig?.value || 'NOT SET'} (expected B)`)
    if (isExecuteMode) {
      console.log('  ❌ Aborting: Method B required for simulation')
      process.exit(1)
    }
  }

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: SYSTEM_ID } })
  if (systemTree) {
    console.log(`  ✅ SystemTree #4: fee=${formatMoney(Number(systemTree.fee))}, graceDays=${systemTree.graceDays}, returnPct=${systemTree.returnPct}%`)
  } else {
    console.log('  ❌ SystemTree #4 not found')
    process.exit(1)
  }

  const existingCount = await prisma.system.count({ where: { onSystem: SYSTEM_ID } })
  if (existingCount === 0) {
    console.log('  ✅ System #4 is clean (0 records)')
  } else {
    console.log(`  ⚠️  System #4 has ${existingCount} existing records`)
    if (isExecuteMode) {
      const ok = await confirmAction(`System #4 có ${existingCount} records. Tiếp tục?`)
      if (!ok) process.exit(0)
    }
  }

  const enrollmentCount = await prisma.enrollment.count({ where: { courseId: 22, status: 'ACTIVE' } })
  console.log(`  📋 Total enrollments courseId=22 ACTIVE: ${enrollmentCount}`)
  if (enrollmentCount !== 88) {
    console.log(`  ⚠️  Expected 88, got ${enrollmentCount}`)
  }
}

async function main() {
  console.log('🚀 BRK System #4 — Rebuild Simulation')
  console.log(`📋 Mode: ${isExecuteMode ? 'EXECUTE (live DB writes)' : 'DRY-RUN (no DB writes)'}${isAutoMode ? ' [AUTO]' : ''}`)
  console.log(`📋 Resume: ${isResumeMode ? 'YES (from checkpoint)' : 'NO (fresh start)'}`)

  initReadline()

  try {
    await runStartupChecks()

    const allMembers = await buildMemberList()
    const dayGroups = groupByDay(allMembers)
    const sortedDays = Array.from(dayGroups.keys()).sort((a, b) => a - b)

    console.log(`\n📋 Tổng: ${allMembers.length} thành viên, ${sortedDays.length} ngày`)
    console.log(`📋 Ngày: ${sortedDays.map(d => `D${d}(${dayGroups.get(d)!.length})`).join(', ')}`)

    let checkpoint: CheckpointData
    if (isResumeMode) {
      const loaded = loadCheckpoint()
      if (loaded) {
        checkpoint = loaded
        console.log(`\n🔄 Resuming from checkpoint (${checkpoint.processedMemberIds.length} members processed)`)
      } else {
        console.log('\n⚠️  No checkpoint found, starting fresh')
        checkpoint = {
          startedAt: new Date().toISOString(),
          mode: isExecuteMode ? 'execute' : 'dry-run',
          processedMemberIds: [],
          cronState: { lastGraceDay: -1, lastDailyEvalDay: -1, lastRevenueShareDay: -1 }
        }
      }
    } else {
      checkpoint = {
        startedAt: new Date().toISOString(),
        mode: isExecuteMode ? 'execute' : 'dry-run',
        processedMemberIds: [],
        cronState: { lastGraceDay: -1, lastDailyEvalDay: -1, lastRevenueShareDay: -1 }
      }
    }

    const mode = isExecuteMode ? 'execute' : 'dry-run'
    let totalProcessed = checkpoint.processedMemberIds.length

    for (const dayIndex of sortedDays) {
      const dayMembers = dayGroups.get(dayIndex)!
      const unprocessedMembers = dayMembers.filter(m => !checkpoint.processedMemberIds.includes(m.userId))

      if (unprocessedMembers.length === 0 && dayIndex > checkpoint.cronState.lastGraceDay) {
        console.log(`\n⏭ Day ${dayIndex} (${formatDate(dayIndex)}): all members processed, only running crons`)
      } else if (unprocessedMembers.length === 0) {
        console.log(`\n⏭ Day ${dayIndex} (${formatDate(dayIndex)}): fully processed, skipping`)
        continue
      }

      if (dayIndex > 0 && dayIndex > checkpoint.cronState.lastGraceDay) {
        await simulateGraceProcessing(dayIndex, mode)
        checkpoint.cronState.lastGraceDay = dayIndex
        saveCheckpoint(checkpoint)
        await waitForContinue()
      }

      if (dayIndex > 0 && dayIndex > checkpoint.cronState.lastDailyEvalDay) {
        await simulateDailyEval(dayIndex, mode)
        checkpoint.cronState.lastDailyEvalDay = dayIndex
        saveCheckpoint(checkpoint)
        await waitForContinue()
      }

      if (dayIndex > 0 && isRevenueShareDay(dayIndex) && dayIndex > checkpoint.cronState.lastRevenueShareDay) {
        await simulateRevenueShare(dayIndex, mode)
        checkpoint.cronState.lastRevenueShareDay = dayIndex
        saveCheckpoint(checkpoint)
        await waitForContinue()
      }

      await displayDayPreview(dayIndex, unprocessedMembers, totalProcessed, allMembers.length, mode)

      if (isExecuteMode) {
        const ok = await confirmAction(`Xác nhận xử lý ngày ${dayIndex}?`)
        if (!ok) {
          console.log('\n⛔ Dừng lại. Checkpoint đã lưu.')
          saveCheckpoint(checkpoint)
          return
        }
      }

      for (const member of unprocessedMembers) {
        displaySubHeader(`👤 #${totalProcessed + 1}/${allMembers.length} — #${member.userId} ${member.userName}`)
        console.log(`  ⏰ ${utcToIct(member.activatedAt)}`)
        const placement = member.refSysId === 0 ? 'ROOT (refSysId=0)' :
          member.refSysId === -1 ? 'BFS (auto-placement)' :
          `#${member.refSysId}`
        console.log(`  🔗 Expected parent: ${placement}`)

        const result = await simulateActivation(member, mode)

        if (!result.success) {
          console.log(`  ⚠️  Activation failed: ${result.error}`)
          if (isExecuteMode) {
            const ok = await confirmAction('Tiếp tục member tiếp theo?')
            if (!ok) {
              saveCheckpoint(checkpoint)
              return
            }
          }
        }

        checkpoint.processedMemberIds.push(member.userId)
        totalProcessed++
        saveCheckpoint(checkpoint)
        console.log(`  💾 Checkpoint saved (${totalProcessed}/${allMembers.length})`)

        if (!isAutoMode) {
          await waitForContinue()
        }
      }
    }

    displayHeader('🎉 SIMULATION COMPLETE')
    console.log(`  Total members processed: ${totalProcessed}/${allMembers.length}`)
    console.log(`  Mode: ${mode}`)

    if (isExecuteMode) {
      const totalSystem = await prisma.system.count({ where: { onSystem: SYSTEM_ID } })
      const totalClosures = await prisma.systemClosure.count({ where: { systemId: SYSTEM_ID } })
      const totalTransactions = await prisma.brkTransaction.count({
        where: { refId: { startsWith: `sys_${SYSTEM_ID}_` } }
      })
      console.log(`\n📊 Database state:`)
      console.log(`  System records: ${totalSystem}`)
      console.log(`  Closure records: ${totalClosures}`)
      console.log(`  Transactions: ${totalTransactions}`)
    }

  } catch (err: any) {
    console.error('\n❌ Fatal error:', err.message)
    console.error(err.stack)
  } finally {
    closeReadline()
    await prisma.$disconnect()
  }
}

main()
