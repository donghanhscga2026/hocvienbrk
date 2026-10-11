import type { Prisma, PrismaClient } from '@prisma/client'

// Separate catalog and personal preferences; never write Course.status here.
export const WI300_COURSE_PREFIX = 'wi300:course-visibility:'
export const WI300_LEARNING_PREFIX = 'wi300:learning-hidden:'
export async function wi300CoursePreferences(db: PrismaClient) {
  const rows = await db.systemConfig.findMany({ where: { key: { startsWith: WI300_COURSE_PREFIX } }, select: { key: true, value: true } })
  return new Map(rows.filter(row => typeof row.value === 'boolean').map(row => [Number(row.key.slice(WI300_COURSE_PREFIX.length)), row.value as boolean]))
}
export async function wi300HiddenCourses(db: PrismaClient) { return new Set([...(await wi300CoursePreferences(db))].filter(([, visible]) => !visible).map(([id]) => id)) }
export function wi300CourseWhere(base: Prisma.CourseWhereInput, preferences: Map<number, boolean>, catalog = true): Prisma.CourseWhereInput {
  const { status, ...scope } = base; void status
  const visible = [...preferences].filter(([, value]) => value).map(([id]) => id)
  const hidden = catalog ? [...preferences].filter(([, value]) => !value).map(([id]) => id) : []
  return { AND: [scope, { OR: [{ status: true, id: { notIn: hidden } }, { id: { in: visible } }] }] }
}
export async function setWi300CourseVisibility(db: PrismaClient, courseIds: number[], visible: boolean) {
  if (typeof visible !== 'boolean' || !courseIds.length || courseIds.length > 500 || courseIds.some(id => !Number.isInteger(id) || id <= 0)) throw new Error('Danh sách khóa học không hợp lệ.')
  await db.$transaction(courseIds.map(id => db.systemConfig.upsert({ where: { key: WI300_COURSE_PREFIX + id }, create: { key: WI300_COURSE_PREFIX + id, value: visible }, update: { value: visible } })))
}
export async function wi300HiddenLearning(db: PrismaClient, userId: number) {
  const prefix = WI300_LEARNING_PREFIX + userId + ':'
  const rows = await db.systemConfig.findMany({ where: { key: { startsWith: prefix } }, select: { key: true, value: true } })
  return new Set(rows.filter(row => row.value === true).map(row => Number(row.key.slice(prefix.length))).filter(Number.isInteger))
}
