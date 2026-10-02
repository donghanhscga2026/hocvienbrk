import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { canUseCrm, CrmActor } from './shared'
import { CrmError } from './service'
import { issuePreview, verifyPreview } from './phase-two'

type Db = PrismaClient | Prisma.TransactionClient
type StudentRow = { userId: number; teacherId: number; name: string; teacherName: string; courses: number }
export const studentCommand = z.discriminatedUnion('action', [
  z.object({ action: z.literal('preview') }).strict(),
  z.object({ action: z.literal('enable'), token: z.string().max(1000) }).strict(),
  z.object({ action: z.literal('disable') }).strict(),
  z.object({ action: z.literal('sync') }).strict(),
])
function assertActor(actor: CrmActor) {
  if (!canUseCrm(actor.role)) throw new CrmError('Không có quyền CRM.', 403)
}
function admin(actor: CrmActor) {
  assertActor(actor)
  if (actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên được bật đồng bộ học viên.', 403)
}
export async function studentSettings(db: Db) {
  return (await db.crmAutomationSettings.findUnique({ where: { id: 1 }, select: { studentSyncEnabled: true } }))?.studentSyncEnabled || false
}

// Một cặp học viên–giáo viên, kể cả đăng ký nhiều khóa. Không suy từ referrer/affiliate.
export async function studentPlan(db: Db, teacherId?: number) {
  const teacherFilter = teacherId === undefined ? Prisma.empty : Prisma.sql`AND c."teacherId" = ${teacherId}`
  const eligible = Prisma.sql`
    SELECT e."userId", c."teacherId", COUNT(*)::int AS courses
    FROM public."Enrollment" e JOIN public."Course" c ON c.id = e."courseId"
    JOIN public."User" t ON t.id = c."teacherId"
    WHERE t.role::text IN ('ADMIN', 'TEACHER', 'INSTRUCTOR') ${teacherFilter}
    GROUP BY e."userId", c."teacherId"`
  const counts = await db.$queryRaw<{ eligible: number; existing: number; missing: number }[]>(Prisma.sql`
    WITH eligible AS (${eligible})
    SELECT COUNT(*)::int AS eligible,
      COUNT(p.id)::int AS existing, (COUNT(*) - COUNT(p.id))::int AS missing
    FROM eligible e LEFT JOIN public."CrmContact" p
      ON p."studentUserId" = e."userId" AND p."ownerId" = e."teacherId"`)
  const rows = await db.$queryRaw<StudentRow[]>(Prisma.sql`
    WITH eligible AS (${eligible})
    SELECT e."userId", e."teacherId", LEFT(COALESCE(NULLIF(u.name, ''), 'Thành viên #' || u.id), 150) AS name,
      COALESCE(t.name, 'Giáo viên #' || t.id) AS "teacherName", e.courses
    FROM eligible e JOIN public."User" u ON u.id = e."userId"
    JOIN public."User" t ON t.id = e."teacherId"
    WHERE NOT EXISTS (SELECT 1 FROM public."CrmContact" p
      WHERE p."studentUserId" = e."userId" AND p."ownerId" = e."teacherId")
    ORDER BY e."teacherId", e."userId" LIMIT 100`)
  return { counts: counts[0], rows, hasMore: counts[0].missing > rows.length }
}
async function applyStudents(tx: Prisma.TransactionClient, plan: Awaited<ReturnType<typeof studentPlan>>, actor: CrmActor) {
  for (const row of plan.rows) {
    const contact = await tx.crmContact.create({ data: {
      name: row.name, source: 'Học viên khóa học', ownerId: row.teacherId,
      studentProfile: true, studentUserId: row.userId, createdBy: actor.id,
    } })
    await tx.crmActivity.create({ data: { contactId: contact.id, type: 'IMPORT', authorId: actor.id,
      authorName: actor.name, content: 'Đồng bộ học viên #' + row.userId + ' từ ' + row.courses + ' khóa của giáo viên #' + row.teacherId + '. Giữ nguyên đăng ký và thanh toán.' } })
  }
  return { enabled: true, created: plan.rows.length, before: plan.counts,
    after: { ...plan.counts, existing: plan.counts.existing + plan.rows.length, missing: plan.counts.missing - plan.rows.length }, hasMore: plan.hasMore }
}

// Cron mặc định dry-run; giao diện chỉ thực thi sau khi quản trị đã bật bằng bản xem trước.
export async function syncStudents(db: PrismaClient, actor: CrmActor, execute = false) {
  assertActor(actor)
  if (!execute) return { dryRun: true, enabled: await studentSettings(db), ...await studentPlan(db, actor.role === 'ADMIN' ? undefined : actor.id) }
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420304)`
    if (!await studentSettings(tx)) return { enabled: false, created: 0, hasMore: false }
    const plan = await studentPlan(tx, actor.role === 'ADMIN' ? undefined : actor.id)
    return { dryRun: false, ...await applyStudents(tx, plan, actor) }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 })
}
export async function writeStudents(db: PrismaClient, actor: CrmActor, command: z.infer<typeof studentCommand>) {
  assertActor(actor)
  if (command.action === 'sync') return syncStudents(db, actor, true)
  admin(actor)
  if (command.action === 'preview') {
    const plan = await studentPlan(db)
    return { ...plan, enabled: await studentSettings(db), token: issuePreview(actor.id, { type: 'crm-students', plan }) }
  }
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420304)`
    if (command.action === 'disable') {
      await tx.crmAutomationSettings.updateMany({ where: { id: 1 }, data: { studentSyncEnabled: false, version: { increment: 1 } } })
      return { enabled: false }
    }
    const plan = await studentPlan(tx)
    verifyPreview(command.token, actor.id, { type: 'crm-students', plan })
    await tx.crmAutomationSettings.upsert({ where: { id: 1 }, create: { id: 1, studentSyncEnabled: true },
      update: { studentSyncEnabled: true, version: { increment: 1 } } })
    return applyStudents(tx, plan, actor)
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 })
}
