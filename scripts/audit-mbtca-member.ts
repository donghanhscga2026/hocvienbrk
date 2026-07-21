import 'dotenv/config'
import prisma from '../lib/prisma'

const SYSTEM_ID = 4

function equalNumber(actual: unknown, expected: number) {
  return Math.abs(Number(actual) - expected) < 0.011
}

async function main() {
  const userId = Number(process.argv.find(arg => arg.startsWith('--user='))?.slice(7) || 3773)
  if (!Number.isInteger(userId) || userId <= 0) throw new Error('Invalid --user value')

  const system = await prisma.system.findUnique({
    where: { userId_onSystem: { userId, onSystem: SYSTEM_ID } },
  })
  if (!system) throw new Error(`User #${userId} is not in system #${SYSTEM_ID}`)
  if (system.applicationId == null) throw new Error(`User #${userId} has no MB TCA applicationId`)

  const descendants = await prisma.systemClosure.findMany({
    where: { ancestorId: system.autoId, systemId: SYSTEM_ID, applicationId: system.applicationId },
    select: { descendant: { select: { userId: true } } },
  })
  const descendantUserIds = descendants.map(row => row.descendant.userId)
  const officialEvents = await prisma.brkTimelineRecord.findMany({
    where: {
      applicationId: system.applicationId,
      userId: { in: descendantUserIds },
      eventStatus: 'OFFICIAL',
    },
    orderBy: [{ time: 'asc' }, { id: 'asc' }],
  })

  const [timeline, levelUps, bonuses, directF1Count] = await Promise.all([
    prisma.brkTimelineRecord.findMany({
      where: { userId, onSystem: SYSTEM_ID, applicationId: system.applicationId },
      orderBy: [{ time: 'asc' }, { id: 'asc' }],
    }),
    prisma.brkLevelUpRecord.findMany({
      where: { userId, onSystem: SYSTEM_ID, applicationId: system.applicationId },
      orderBy: { promotedAt: 'asc' },
    }),
    prisma.brkReferralBonus.findMany({ where: { userId, onSystem: SYSTEM_ID, applicationId: system.applicationId } }),
    prisma.systemClosure.count({
      where: { ancestorId: system.autoId, systemId: SYSTEM_ID, applicationId: system.applicationId, depth: 1 },
    }),
  ])

  const failures: string[] = []
  for (const record of timeline) {
    const included = officialEvents.filter(event => event.time <= record.time)
    const expectedTeamSize = included.length
    const expectedCashVolume = included.reduce((sum, event) => sum + Number(event.eventCashVolume), 0)
    const expectedMbdtVolume = included.reduce((sum, event) => sum + Number(event.eventMbdtVolume), 0)
    if (record.accumulatedTeamSize !== expectedTeamSize) {
      failures.push(`timeline#${record.id} team=${record.accumulatedTeamSize}, expected=${expectedTeamSize}`)
    }
    if (!equalNumber(record.accumulatedCashVolume, expectedCashVolume)) {
      failures.push(`timeline#${record.id} cashVolume=${record.accumulatedCashVolume}, expected=${expectedCashVolume}`)
    }
    if (!equalNumber(record.accumulatedBrkdVolume, expectedMbdtVolume)) {
      failures.push(`timeline#${record.id} mbdtVolume=${record.accumulatedBrkdVolume}, expected=${expectedMbdtVolume}`)
    }
  }

  for (const record of levelUps) {
    if (record.sourceMemberId == null) failures.push(`levelUp#${record.id} ${record.fromLevel}->${record.toLevel} missing sourceMemberId`)
    const matchingTimeline = timeline.find(item => (
      item.type === 'LEVEL_UP'
      && item.fromLevel === record.fromLevel
      && item.toLevel === record.toLevel
      && item.time.getTime() === record.promotedAt.getTime()
    ))
    if (!matchingTimeline) failures.push(`levelUp#${record.id} ${record.fromLevel}->${record.toLevel} missing LEVEL_UP timeline`)
  }

  for (const bonus of bonuses) {
    if (!bonus.claimed || bonus.claimedAt == null) failures.push(`referralBonus#${bonus.id} credited but not claimed`)
    if (bonus.sourceMemberId == null) failures.push(`referralBonus#${bonus.id} missing sourceMemberId`)
  }
  if (directF1Count > 4) failures.push(`direct F1 count=${directF1Count}, maximum=4`)

  console.log(`AUDIT MB-TCA member #${userId}`)
  console.log(`Timeline/level-ups/referral bonuses/F1: ${timeline.length}/${levelUps.length}/${bonuses.length}/${directF1Count}`)
  console.log(`Failures: ${failures.length}`)
  failures.slice(0, 100).forEach(failure => console.log(`- ${failure}`))
  if (failures.length > 100) console.log(`- ... ${failures.length - 100} more failures`)
  if (failures.length) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
