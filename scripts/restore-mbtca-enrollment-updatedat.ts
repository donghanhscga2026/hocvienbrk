import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import prisma from '../lib/prisma'

const COURSE_ID = 22
const EXPECTED_COUNT = 91
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
  const rows = snapshot.enrollments.filter(row => row.courseId === COURSE_ID)
  if (rows.length !== EXPECTED_COUNT) {
    throw new Error(`Snapshot has ${rows.length} course #${COURSE_ID} enrollments; expected ${EXPECTED_COUNT}`)
  }

  const current = await prisma.enrollment.findMany({
    where: { id: { in: rows.map(row => row.id) }, courseId: COURSE_ID },
    select: { id: true, userId: true, updatedAt: true },
  })
  if (current.length !== EXPECTED_COUNT) {
    throw new Error(`Database matched ${current.length}/${EXPECTED_COUNT} snapshot enrollments`)
  }

  const currentById = new Map(current.map(row => [row.id, row]))
  const changes = rows.flatMap(row => {
    const existing = currentById.get(row.id)!
    const target = new Date(row.updatedAt)
    if (Number.isNaN(target.getTime())) throw new Error(`Invalid updatedAt for enrollment #${row.id}`)
    if (existing.userId !== row.userId) {
      throw new Error(`Enrollment #${row.id} user mismatch: snapshot #${row.userId}, DB #${existing.userId}`)
    }
    return existing.updatedAt.getTime() === target.getTime()
      ? []
      : [{ id: row.id, userId: row.userId, before: existing.updatedAt, after: target }]
  })

  console.log(execute ? 'EXECUTE MODE' : 'DRY-RUN ONLY — no database writes')
  console.log(`Snapshot: ${snapshotPath}`)
  console.log(`Matched: ${current.length}/${EXPECTED_COUNT}`)
  console.log(`Will update Enrollment.updatedAt: ${changes.length}`)
  console.log(`Already correct: ${EXPECTED_COUNT - changes.length}`)
  for (const change of changes) {
    console.log(`#${change.userId} enrollment=${change.id}: ${change.before.toISOString()} -> ${change.after.toISOString()}`)
  }
  console.log('Enrollment.status, Enrollment.createdAt and all Payment fields remain unchanged.')
  if (!execute) return

  await prisma.$transaction(
    changes.map(change => prisma.enrollment.update({
      where: { id: change.id },
      data: { updatedAt: change.after },
    })),
  )

  const verified = await prisma.enrollment.findMany({
    where: { id: { in: rows.map(row => row.id) }, courseId: COURSE_ID },
    select: { id: true, updatedAt: true },
  })
  const verifiedById = new Map(verified.map(row => [row.id, row.updatedAt.getTime()]))
  const mismatches = rows.filter(row => verifiedById.get(row.id) !== new Date(row.updatedAt).getTime())
  console.log(`VERIFY: ${EXPECTED_COUNT - mismatches.length}/${EXPECTED_COUNT} Enrollment.updatedAt match snapshot`)
  if (mismatches.length) throw new Error(`Restore verification failed for ${mismatches.length} enrollments`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
