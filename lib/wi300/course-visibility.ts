import type { Prisma, PrismaClient } from '@prisma/client'

// Separate catalog and personal preferences; never write Course.status here.
export const WI300_COURSE_PREFIX = 'wi300:course-visibility:'
export const WI300_CATALOG_INITIALIZED_KEY = 'wi300:catalog-initialized:v1'

// Freeze inherited visibility once; existing explicit preferences take priority.
export async function ensureWi300CourseVisibility(db: PrismaClient) {
  if ((await db.systemConfig.findUnique({ where: { key: WI300_CATALOG_INITIALIZED_KEY }, select: { value: true } }))?.value === true) return
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420306)`
    if ((await tx.systemConfig.findUnique({ where: { key: WI300_CATALOG_INITIALIZED_KEY }, select: { value: true } }))?.value === true) return
    const courses = await tx.course.findMany({ select: { id: true, status: true } })
    if (courses.length) await tx.systemConfig.createMany({ data: courses.map(course => ({ key: WI300_COURSE_PREFIX + course.id, value: course.status })), skipDuplicates: true })
    await tx.systemConfig.upsert({ where: { key: WI300_CATALOG_INITIALIZED_KEY }, create: { key: WI300_CATALOG_INITIALIZED_KEY, value: true }, update: { value: true } })
  }, { timeout: 15000 })
}

export const WI300_LEARNING_PREFIX = 'wi300:learning-hidden:'
export async function wi300CoursePreferences(db: PrismaClient) {
  await ensureWi300CourseVisibility(db)
  const rows = await db.systemConfig.findMany({ where: { key: { startsWith: WI300_COURSE_PREFIX } }, select: { key: true, value: true } })
  return new Map(rows.filter(row => typeof row.value === 'boolean' && Number.isInteger(Number(row.key.slice(WI300_COURSE_PREFIX.length))) && Number(row.key.slice(WI300_COURSE_PREFIX.length)) > 0).map(row => [Number(row.key.slice(WI300_COURSE_PREFIX.length)), row.value as boolean]))
}
export async function wi300HiddenCourses(db: PrismaClient) { return new Set([...(await wi300CoursePreferences(db))].filter(([, visible]) => !visible).map(([id]) => id)) }
export function wi300CourseWhere(base: Prisma.CourseWhereInput, preferences: Map<number, boolean>, catalog = true, enrolledCourseIds: number[] = []): Prisma.CourseWhereInput {
  const { status, ...scope } = base; void status
  const visible = [...preferences].filter(([, value]) => value).map(([id]) => id)
  // Only server-verified enrollments may bypass catalog hiding in personal space.
  const ids = catalog ? visible : [...new Set([...visible, ...enrolledCourseIds])]
  return { AND: [scope, { id: { in: ids } }] }
}
export async function setWi300CourseVisibility(db: PrismaClient, courseIds: number[], visible: boolean) {
  if (typeof visible !== 'boolean' || !courseIds.length || courseIds.length > 500 || courseIds.some(id => !Number.isInteger(id) || id <= 0)) throw new Error('Danh sách khóa học không hợp lệ.')
  await ensureWi300CourseVisibility(db)
  await db.$transaction(courseIds.map(id => db.systemConfig.upsert({ where: { key: WI300_COURSE_PREFIX + id }, create: { key: WI300_COURSE_PREFIX + id, value: visible }, update: { value: visible } })))
}
export async function wi300HiddenLearning(db: PrismaClient, userId: number) {
  const prefix = WI300_LEARNING_PREFIX + userId + ':'
  const rows = await db.systemConfig.findMany({ where: { key: { startsWith: prefix } }, select: { key: true, value: true } })
  return new Set(rows.filter(row => row.value === true).map(row => Number(row.key.slice(prefix.length))).filter(Number.isInteger))
}
