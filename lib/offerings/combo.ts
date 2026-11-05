import 'server-only'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { offeringAccess, offeringDetailsSchema, type OfferingDetails } from './shared'

type DB = Prisma.TransactionClient
export const comboPurchaseKey = (id: number) => `catalog:combo-purchase:${id}`
const childKey = (userId: number, courseId: number) => `catalog:combo-right:${userId}:${courseId}`
const purchaseSchema = z.object({
  userId: z.number().int(),
  courseId: z.number().int(),
  items: z.array(z.object({ courseId: z.number().int(), gift: z.boolean() })),
})
const rightSchema = z.object({
  enrollmentId: z.number().int(),
  sources: z.array(z.number().int()),
  baseline: z.object({
    status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'CANCELLED']),
    activatedAt: z.string().nullable(),
    studyMode: z.enum(['ACTIVE', 'FREE', 'COMPANION', 'AUDITOR']),
  }),
})
async function config(db: DB, id: number) {
  const row = await db.systemConfig.findUnique({ where: { key: `catalog:offering:${id}` } })
  return offeringDetailsSchema.parse(row?.value || {})
}
export async function validateCombo(
  db: DB,
  id: number,
  group: string,
  details: OfferingDetails,
  teacherId: number | null,
) {
  const previous = await config(db, id)
  if (details.kind !== 'COMBO' && previous.kind !== 'COMBO') return
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`combo-config:${id}`}))`
  const changed =
    details.kind !== previous.kind ||
    JSON.stringify(details.bundleItems) !== JSON.stringify(previous.bundleItems)
  if (changed && (await db.enrollment.count({ where: { courseId: id } })))
    throw new Error(
      'Combo đã có người đăng ký. Hãy tạo combo mới để đổi thành phần; vẫn sửa được mô tả và giá bán.',
    )
  if (details.kind !== 'COMBO') return
  const references = await db.systemConfig.findMany({ where: { key: { startsWith: 'catalog:offering:' } } })
  if (
    references.some((row) => {
      const value = offeringDetailsSchema.safeParse(row.value).data
      return value?.kind === 'COMBO' && value.bundleItems.some((item) => item.courseId === id)
    })
  )
    throw new Error('Món này đang nằm trong combo khác, không thể đổi thành combo lồng nhau.')
  if (group !== 'DIGITAL' || details.accessDays !== 0 || details.bundleItems.length < 2)
    throw new Error(
      'Combo thuộc Sản phẩm số, gồm ít nhất 2 món và không đặt thời hạn chung. Thời hạn dùng theo từng món.',
    )
  if (details.bundleItems.some((item) => item.courseId === id))
    throw new Error('Không thể đưa combo vào chính nó.')
  const courses = await db.course.findMany({
    where: { id: { in: details.bundleItems.map((item) => item.courseId) } },
    select: { id: true, teacherId: true, type: true },
  })
  if (
    teacherId == null ||
    courses.length !== details.bundleItems.length ||
    courses.some((item) => item.teacherId !== teacherId || item.type === 'SYS')
  )
    throw new Error('Chọn các món thuộc cùng người phụ trách; khóa hệ thống không được đưa vào combo.')
  for (const item of courses)
    if ((await config(db, item.id)).kind === 'COMBO') throw new Error('Chưa hỗ trợ combo lồng trong combo.')
}

/** Read-only metadata: never include private resource URLs or instructions. */
export async function comboItems(
  details: OfferingDetails,
  scope: Prisma.CourseWhereInput = {},
  db: DB = prisma,
) {
  if (details.kind !== 'COMBO') return []
  const rows = await db.course.findMany({
    where: { AND: [scope, { id: { in: details.bundleItems.map((item) => item.courseId) } }] },
    select: {
      id: true,
      id_khoa: true,
      name_lop: true,
      productGroup: true,
      link_anh_bia: true,
      phi_coc: true,
    },
  })
  return Promise.all(
    details.bundleItems.flatMap((item) => {
      const course = rows.find((row) => row.id === item.courseId)
      return course
        ? [
            (async () => {
              const d = await config(db, course.id)
              return {
                ...course,
                gift: item.gift,
                accessDays: d.accessDays,
                sessions: d.sessions,
                durationMin: d.durationMin,
                service: d.service ? (await import('./shared')).publicOfferingDetails(d).service : undefined,
              }
            })(),
          ]
        : []
    }),
  )
}

/** One ledger per user/item preserves existing ownership and every independent combo source. */
async function reconcileChild(
  db: DB,
  userId: number,
  courseId: number,
  sourceId: number,
  add: boolean,
  activatedAt: Date,
) {
  const key = childKey(userId, courseId)
  const saved = await db.systemConfig.findUnique({ where: { key } })
  let right = saved ? rightSchema.parse(saved.value) : null
  let child = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { payment: true },
  })
  const d = await config(db, courseId)
  if (!right && (!add || offeringAccess(child, d.accessDays))) return
  // A subsequent independently verified purchase is never revoked by a combo.
  if (right && child?.payment?.status === 'VERIFIED') {
    await db.systemConfig.delete({ where: { key } })
    return
  }
  if (!child) {
    if (!add) {
      if (saved) await db.systemConfig.delete({ where: { key } })
      return
    }
    const course = await db.course.findUnique({ where: { id: courseId }, select: { feeType: true } })
    if (!course) throw new Error('Một món trong combo không còn tồn tại.')
    child = await db.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'PENDING',
        phi_coc: 0,
        studyMode: course.feeType === 'MIEN_PHI' ? 'FREE' : 'COMPANION',
      },
      include: { payment: true },
    })
  }
  if (!right)
    right = {
      enrollmentId: child.id,
      sources: [],
      baseline: {
        status: child.status,
        activatedAt: child.activatedAt?.toISOString() || null,
        studyMode: child.studyMode,
      },
    }
  if (right.enrollmentId !== child.id)
    throw new Error('Quyền sử dụng đã thay đổi. Vui lòng liên hệ người phụ trách.')
  const sources = [...new Set([...right.sources.filter((id) => id !== sourceId), ...(add ? [sourceId] : [])])]
  const parents = sources.length
    ? await db.enrollment.findMany({
        where: { id: { in: sources }, userId, status: 'ACTIVE' },
        select: { id: true, activatedAt: true },
      })
    : []
  right.sources = parents.map((parent) => parent.id)
  if (parents.length) {
    const dates = parents.map((parent) => parent.activatedAt?.getTime() || activatedAt.getTime())
    await db.enrollment.update({
      where: { id: child.id },
      data: { status: 'ACTIVE', activatedAt: new Date(Math.max(...dates)) },
    })
    await db.systemConfig.upsert({ where: { key }, create: { key, value: right }, update: { value: right } })
  } else {
    await db.enrollment.update({
      where: { id: child.id },
      data: {
        ...right.baseline,
        activatedAt: right.baseline.activatedAt ? new Date(right.baseline.activatedAt) : null,
      },
    })
    if (saved) await db.systemConfig.delete({ where: { key } })
  }
}

/** Snapshot on registration; grants only when parent is active. No child payments/commissions. */
export async function syncComboInTransaction(db: DB, enrollmentId: number) {
  const parent = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { id: true, userId: true, courseId: true, status: true, activatedAt: true },
  })
  const previous = await db.systemConfig.findUnique({ where: { key: comboPurchaseKey(enrollmentId) } })
  if (!parent && !previous) return
  const details = parent ? await config(db, parent.courseId) : null
  if (!previous && details?.kind !== 'COMBO') return
  const snapshot = previous
    ? purchaseSchema.parse(previous.value)
    : { userId: parent!.userId, courseId: parent!.courseId, items: details!.bundleItems }
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`combo-user:${snapshot.userId}`}))`
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`combo-config:${snapshot.courseId}`}))`
  const current = await db.enrollment.findUnique({ where: { id: enrollmentId } })
  const stored = await db.systemConfig.findUnique({ where: { key: comboPurchaseKey(enrollmentId) } })
  const frozen = stored ? purchaseSchema.parse(stored.value) : snapshot
  if (!stored) await db.systemConfig.create({ data: { key: comboPurchaseKey(enrollmentId), value: frozen } })
  const active = !!current && ['ACTIVE', 'COMPLETED'].includes(current.status)
  if (active && current && !current.activatedAt) {
    current.activatedAt = new Date()
    await db.enrollment.update({ where: { id: current.id }, data: { activatedAt: current.activatedAt } })
  }
  for (const item of frozen.items)
    await reconcileChild(
      db,
      frozen.userId,
      item.courseId,
      enrollmentId,
      active,
      current?.activatedAt || new Date(),
    )
}
export async function syncComboPurchase(enrollmentId: number) {
  return prisma.$transaction((db) => syncComboInTransaction(db, enrollmentId), { timeout: 20000 })
}
