'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { processMbtcaOfficialCron, processMbtcaHourlyPromotions } from './mbtca-service'
import { processRevenueShareForSystem } from './revenue-share-service'
import { distributeCommission } from './commission-calculator'
import { getAllLevelConfigs } from './config-service'
import { MB_TCA_SYSTEM_ID, requireMbtcaApplication } from './business-plan-service'

const HOUR_MS = 60 * 60 * 1000
const ORCHESTRATOR_DELAY_MS = 5 * 60 * 1000

type PhaseCode = 'OFFICIAL_CONFIRMATION' | 'REVENUE_SHARE' | 'LEVEL_PROMOTION' | 'TEAM_COMMISSION'

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function runPhase<T>(runId: number, phaseCode: PhaseCode, task: () => Promise<T>): Promise<T | null> {
  const existing = await prisma.mbtcaWorkflowStep.findUnique({ where: { runId_phaseCode: { runId, phaseCode } } })
  if (existing?.status === 'COMPLETED' || existing?.status === 'SKIPPED') return null
  await prisma.mbtcaWorkflowStep.upsert({
    where: { runId_phaseCode: { runId, phaseCode } },
    update: { status: 'RUNNING', errorMessage: null, startedAt: new Date() },
    create: { runId, phaseCode, status: 'RUNNING', startedAt: new Date() },
  })
  await prisma.mbtcaWorkflowRun.update({ where: { id: runId }, data: { currentPhase: phaseCode } })
  try {
    const result = await task()
    await prisma.mbtcaWorkflowStep.update({
      where: { runId_phaseCode: { runId, phaseCode } },
      data: { status: 'COMPLETED', result: json(result), completedAt: new Date() },
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.mbtcaWorkflowStep.update({
      where: { runId_phaseCode: { runId, phaseCode } },
      data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
    })
    throw error
  }
}

async function skipPhase(runId: number, phaseCode: PhaseCode, reason: string) {
  await prisma.mbtcaWorkflowStep.upsert({
    where: { runId_phaseCode: { runId, phaseCode } },
    update: { status: 'SKIPPED', result: json({ reason }), completedAt: new Date() },
    create: { runId, phaseCode, status: 'SKIPPED', result: json({ reason }), completedAt: new Date() },
  })
}

async function verifyOfficialPhase(applicationId: number, runTime: Date) {
  const remainingDue = await prisma.system.count({
    where: {
      applicationId,
      onSystem: MB_TCA_SYSTEM_ID,
      status: 'ACTIVE',
      level: 0,
      gracePeriodEnd: { lte: runTime },
    },
  })
  if (remainingDue > 0) throw new Error(`${remainingDue} due members remain at level 0 after OFFICIAL phase`)
}

async function saveCommissionLevelSnapshot(applicationId: number, cycleNumber: number, effectiveAt: Date) {
  const officialUserIds = (await prisma.brkTimelineRecord.findMany({
    where: { applicationId, eventStatus: 'OFFICIAL', time: { lte: effectiveAt } },
    select: { userId: true },
  })).map(record => record.userId)
  const members = await prisma.system.findMany({
    where: { applicationId, userId: { in: officialUserIds }, status: 'ACTIVE' },
    select: { userId: true, level: true },
  })
  for (const member of members) {
    await prisma.mbtcaCommissionLevelSnapshot.upsert({
      where: { applicationId_cycleNumber_userId: { applicationId, cycleNumber, userId: member.userId } },
      update: { level: member.level, effectiveAt },
      create: { applicationId, cycleNumber, userId: member.userId, level: member.level, effectiveAt },
    })
  }
  return members.length
}

async function processTeamCommission(
  applicationId: number,
  cycleNumber: number,
  applicationStart: Date,
  runTime: Date,
) {
  const previousCycle = cycleNumber - 30
  if (previousCycle < 30) return { baseline: true, processedEvents: 0 }
  const snapshots = await prisma.mbtcaCommissionLevelSnapshot.findMany({
    where: { applicationId, cycleNumber: previousCycle },
  })
  if (!snapshots.length) throw new Error(`Missing level snapshot for commission cycle ${previousCycle}`)
  const levelByUserId = new Map(snapshots.map(snapshot => [snapshot.userId, snapshot.level]))
  const systems = await prisma.system.findMany({ where: { applicationId }, select: { userId: true } })
  for (const system of systems) if (!levelByUserId.has(system.userId)) levelByUserId.set(system.userId, 1)

  const periodStart = new Date(applicationStart.getTime() + previousCycle * HOUR_MS)
  const periodEnd = new Date(applicationStart.getTime() + cycleNumber * HOUR_MS)
  const events = await prisma.brkTimelineRecord.findMany({
    where: {
      applicationId,
      eventStatus: 'OFFICIAL',
      time: { gte: periodStart, lt: periodEnd },
    },
    orderBy: [{ time: 'asc' }, { id: 'asc' }],
  })
  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: MB_TCA_SYSTEM_ID } })
  if (!systemTree) throw new Error('System #4 not found')
  const configs = await getAllLevelConfigs(MB_TCA_SYSTEM_ID)
  const configMap = new Map(configs.map(config => [config.level, config]))
  for (const event of events) {
    await distributeCommission(
      event.userId,
      MB_TCA_SYSTEM_ID,
      Number(event.eventCashVolume),
      systemTree,
      runTime,
      configMap,
      Number(event.eventMbdtVolume),
      event.userId,
      { applicationId, commissionCycleNumber: cycleNumber, levelByUserId, creditPoints: false },
    )
  }
  return { baseline: false, periodStart, periodEnd, processedEvents: events.length }
}

export async function runMbtcaOrchestrator(runTime: Date = new Date()) {
  const application = await requireMbtcaApplication(runTime)
  const elapsed = runTime.getTime() - application.startsAt.getTime()
  let cycleNumber = Math.floor(elapsed / HOUR_MS)
  if (cycleNumber < 1) return { processed: false, reason: 'First cycle is not due' }
  let scheduledAt = new Date(application.startsAt.getTime() + cycleNumber * HOUR_MS + ORCHESTRATOR_DELAY_MS)
  if (runTime < scheduledAt) return { processed: false, reason: 'Cycle minute 05 is not due', cycleNumber }

  const staleBefore = new Date(runTime.getTime() - 10 * 60 * 1000)
  await prisma.mbtcaWorkflowRun.updateMany({
    where: { applicationId: application.id, status: 'RUNNING', startedAt: { lt: staleBefore } },
    data: { status: 'FAILED', errorMessage: 'Previous invocation ended before completing', completedAt: new Date() },
  })
  const failedRun = await prisma.mbtcaWorkflowRun.findFirst({
    where: { applicationId: application.id, status: 'FAILED', cycleNumber: { lte: cycleNumber } },
    orderBy: { cycleNumber: 'asc' },
  })
  if (failedRun) {
    cycleNumber = failedRun.cycleNumber
    scheduledAt = failedRun.scheduledAt
  }

  const existingRun = await prisma.mbtcaWorkflowRun.findUnique({
    where: { applicationId_cycleNumber: { applicationId: application.id, cycleNumber } },
  })
  if (existingRun?.status === 'COMPLETED') return { processed: false, reason: 'Cycle already completed', cycleNumber }
  const run = await prisma.mbtcaWorkflowRun.upsert({
    where: { applicationId_cycleNumber: { applicationId: application.id, cycleNumber } },
    update: { status: 'RUNNING', errorMessage: null, startedAt: new Date() },
    create: { applicationId: application.id, cycleNumber, scheduledAt, status: 'RUNNING', startedAt: new Date() },
  })
  try {
    await runPhase(run.id, 'OFFICIAL_CONFIRMATION', async () => {
      const result = await processMbtcaOfficialCron(scheduledAt)
      await verifyOfficialPhase(application.id, scheduledAt)
      return result
    })

    if (cycleNumber % 7 === 0) {
      await runPhase(run.id, 'REVENUE_SHARE', () => processRevenueShareForSystem(MB_TCA_SYSTEM_ID, scheduledAt, application.id))
    } else {
      await skipPhase(run.id, 'REVENUE_SHARE', 'No 7-hour milestone is due')
    }

    if (cycleNumber % 30 === 0) {
      await runPhase(run.id, 'LEVEL_PROMOTION', async () => {
        const result = await processMbtcaHourlyPromotions(scheduledAt)
        const snapshotCount = await saveCommissionLevelSnapshot(application.id, cycleNumber, scheduledAt)
        return { ...result, snapshotCount }
      })
      await runPhase(run.id, 'TEAM_COMMISSION', () => processTeamCommission(
        application.id,
        cycleNumber,
        application.startsAt,
        scheduledAt,
      ))
    } else {
      await skipPhase(run.id, 'LEVEL_PROMOTION', 'No 30-hour milestone is due')
      await skipPhase(run.id, 'TEAM_COMMISSION', 'No 30-hour milestone is due')
    }

    await prisma.mbtcaWorkflowRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', currentPhase: null, completedAt: new Date() },
    })
    return { processed: true, applicationId: application.id, cycleNumber, scheduledAt }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.mbtcaWorkflowRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', errorMessage: message, completedAt: new Date() },
    })
    throw error
  }
}
