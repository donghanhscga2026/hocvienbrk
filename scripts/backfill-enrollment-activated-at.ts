import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import prisma from '../lib/prisma'

const COURSE_ID = 22
const SNAPSHOT_COUNT = 91
const EXCLUDED_ENROLLMENT_IDS = new Set([1459, 1486])
const EXPECTED_COUNT = SNAPSHOT_COUNT - EXCLUDED_ENROLLMENT_IDS.size
const DEFAULT_SNAPSHOT = path.join(
  process.cwd(),
  'plan_temp',
  'mbtca-pre-replay-enrollments_2026-07-19T14-47-22-462Z.json',
)

type SnapshotEnrollment = {
  id: number
  userId: number
  courseId: number
  updatedAt: string
}

async function main() {
  const execute = process.argv.includes('--execute')
  const snapshotArg = process.argv.find(arg => arg.startsWith('--snapshot='))?.slice(11)
  const snapshotPath = snapshotArg ? path.resolve(snapshotArg) : DEFAULT_SNAPSHOT
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as {
    enrollments: SnapshotEnrollment[]
  }
  const snapshotRows = snapshot.enrollments.filter(row => row.courseId === COURSE_ID)
  if (snapshotRows.length !== SNAPSHOT_COUNT) {
    throw new Error(`Snapshot has ${snapshotRows.length} course #${COURSE_ID} enrollments; expected ${SNAPSHOT_COUNT}`)
  }
  const rows = snapshotRows.filter(row => !EXCLUDED_ENROLLMENT_IDS.has(row.id))
  const enrollmentIds = rows.map(row => row.id)
  const userIds = rows.map(row => row.userId)

  if (new Set(enrollmentIds).size !== EXPECTED_COUNT) {
    throw new Error('Snapshot contains duplicate enrollment IDs')
  }
  if (new Set(userIds).size !== EXPECTED_COUNT) {
    throw new Error('Snapshot contains duplicate user IDs')
  }

  const targets = rows.map(row => {
    const activatedAt = new Date(row.updatedAt)
    if (Number.isNaN(activatedAt.getTime())) {
      throw new Error(`Invalid snapshot updatedAt for enrollment #${row.id}`)
    }
    return { ...row, activatedAt }
  })
  const current = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds }, courseId: COURSE_ID },
    select: { id: true, userId: true, status: true, updatedAt: true, activatedAt: true },
  })
  if (current.length !== EXPECTED_COUNT) {
    throw new Error(`Database matched ${current.length}/${EXPECTED_COUNT} snapshot enrollments`)
  }

  const currentById = new Map(current.map(row => [row.id, row]))
  const changes = targets.flatMap(target => {
    const existing = currentById.get(target.id)!
    if (existing.userId !== target.userId) {
      throw new Error(`Enrollment #${target.id} user mismatch: snapshot #${target.userId}, DB #${existing.userId}`)
    }
    return existing.activatedAt?.getTime() === target.activatedAt.getTime()
      ? []
      : [{
          id: target.id,
          userId: target.userId,
          before: existing.activatedAt,
          after: target.activatedAt,
          currentUpdatedAt: existing.updatedAt,
        }]
  })

  console.log(execute ? 'EXECUTE MODE' : 'DRY-RUN ONLY — no database writes')
  console.log(`Snapshot: ${snapshotPath}`)
  console.log(`Matched: ${current.length}/${EXPECTED_COUNT}`)
  console.log(`Will set Enrollment.activatedAt: ${changes.length}`)
  console.log(`Already correct: ${EXPECTED_COUNT - changes.length}`)
  for (const change of changes) {
    console.log(
      `#${change.userId} enrollment=${change.id}: activatedAt ${change.before?.toISOString() ?? 'NULL'} -> ${change.after.toISOString()}`
      + ` | current updatedAt=${change.currentUpdatedAt.toISOString()}`,
    )
  }
  console.log('Enrollment.status, Enrollment.updatedAt, Enrollment.createdAt and all Payment fields remain unchanged.')
  if (!execute) return

  await prisma.$transaction(
    changes.map(change => prisma.enrollment.update({
      where: { id: change.id },
      data: {
        activatedAt: change.after,
        updatedAt: change.currentUpdatedAt,
      },
    })),
  )

  const verified = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds }, courseId: COURSE_ID },
    select: { id: true, activatedAt: true },
  })
  const verifiedById = new Map(verified.map(row => [row.id, row.activatedAt?.getTime()]))
  const mismatches = targets.filter(target => verifiedById.get(target.id) !== target.activatedAt.getTime())
  console.log(`VERIFY: ${EXPECTED_COUNT - mismatches.length}/${EXPECTED_COUNT} Enrollment.activatedAt match snapshot`)
  if (mismatches.length) {
    throw new Error(`Backfill verification failed for ${mismatches.length} enrollments`)
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
