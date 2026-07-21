'use server'

import prisma from '@/lib/prisma'
import { activateBrkMember, processGracePeriodExpirations } from './activation-service'
import { checkAndPromoteLevel } from './level-manager'
import { getAllLevelConfigs } from './config-service'
import { MB_TCA_SYSTEM_ID, requireMbtcaApplication } from './business-plan-service'

export async function activateMbtcaMember(
  userId: number,
  enrollmentReferrerId: number | null | undefined,
  expectedEnrollmentActivatedAt?: Date,
  allowPendingReplay = false,
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      courseId: 22,
      status: allowPendingReplay ? { in: ['PENDING', 'ACTIVE'] } : 'ACTIVE',
    },
    orderBy: { activatedAt: 'desc' },
  })
  if (!enrollment) throw new Error(`No approved Enrollment course #22 for user #${userId}`)
  if (!enrollment.activatedAt) {
    throw new Error(`Enrollment.activatedAt is missing for user #${userId}`)
  }
  if (expectedEnrollmentActivatedAt && enrollment.activatedAt.getTime() !== expectedEnrollmentActivatedAt.getTime()) {
    throw new Error(`Enrollment.activatedAt mismatch for user #${userId}; replay stopped`)
  }
  const enrollmentActivatedAt = enrollment.activatedAt
  const application = await requireMbtcaApplication(enrollmentActivatedAt)
  const existingSystem = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem: MB_TCA_SYSTEM_ID } },
  })
  if (existingSystem) {
    if (
      existingSystem.applicationId === application.id
      && existingSystem.activatedAt?.getTime() === enrollmentActivatedAt.getTime()
    ) return existingSystem
    throw new Error(`Existing system record for #${userId} belongs to another activation/application`)
  }
  return activateBrkMember(
    userId,
    MB_TCA_SYSTEM_ID,
    enrollmentReferrerId,
    enrollmentActivatedAt,
    undefined,
    application.id,
  )
}

export async function processMbtcaOfficialCron(runTime: Date = new Date()) {
  const application = await requireMbtcaApplication(runTime)
  const result = await processGracePeriodExpirations(
    runTime,
    MB_TCA_SYSTEM_ID,
    application.id,
  )
  return { applicationId: application.id, applicationCode: application.applicationCode, ...result }
}

export async function processMbtcaHourlyPromotions(runTime: Date = new Date()) {
  const application = await requireMbtcaApplication(runTime)
  const officialRecords = await prisma.brkTimelineRecord.findMany({
    where: {
      applicationId: application.id,
      eventStatus: 'OFFICIAL',
      time: { lte: runTime },
    },
    select: { userId: true },
  })
  const officialUserIds = officialRecords.map(record => record.userId)
  const members = await prisma.system.findMany({
    where: {
      applicationId: application.id,
      onSystem: MB_TCA_SYSTEM_ID,
      userId: { in: officialUserIds },
      status: 'ACTIVE',
      level: { gte: 1 },
    },
    orderBy: { autoId: 'asc' },
  })
  const configs = await getAllLevelConfigs(MB_TCA_SYSTEM_ID)
  const configMap = new Map(configs.map(config => [config.level, config]))
  let promoted = 0
  for (const member of members) {
    const before = member.level
    const updated = await checkAndPromoteLevel(
      member.userId,
      MB_TCA_SYSTEM_ID,
      runTime,
      configMap,
      member.userId,
      application.id,
    )
    if (updated && updated.level > before) promoted++
  }
  return {
    applicationId: application.id,
    applicationCode: application.applicationCode,
    checked: members.length,
    promoted,
  }
}
