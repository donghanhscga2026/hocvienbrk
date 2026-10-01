import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { contactFields } from './validation'
import { CrmActor, canUseCrm, contactScope } from './shared'
import { CrmError } from './service'
import { parseCrmCsv } from './csv'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

type Db = PrismaClient | Prisma.TransactionClient
export const phaseTwoCommand = z.discriminatedUnion('action', [
  z.object({ action: z.literal('import.preview'), csv: z.string().max(128000), ownerId: z.number().int().nonnegative().nullable() }).strict(),
  z.object({ action: z.literal('import.execute'), csv: z.string().max(128000), ownerId: z.number().int().nonnegative().nullable(), token: z.string().max(1000) }).strict(),
  z.object({ action: z.literal('students.preview'), userIds: z.array(z.number().int().nonnegative()).min(1).max(100), ownerId: z.number().int().nonnegative().nullable() }).strict(),
  z.object({ action: z.literal('students.execute'), userIds: z.array(z.number().int().nonnegative()).min(1).max(100), ownerId: z.number().int().nonnegative().nullable(), token: z.string().max(1000) }).strict(),
  z.object({ action: z.literal('identity.link'), contactId: z.number().int().positive(), version: z.number().int().positive(), userId: z.number().int().nonnegative().nullable() }).strict(),
  z.object({ action: z.literal('capture.toggle'), landingId: z.number().int().positive(), updatedAt: z.iso.datetime(), enabled: z.boolean() }).strict(),
  z.object({ action: z.literal('submission.resolve'), id: z.number().int().positive(), contactId: z.number().int().positive() }).strict(),
])
export const phaseTwoQuery = z.object({
  view: z.enum(['website', 'students', 'capture', 'submissions']),
  contactId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(150).default(''), page: z.coerce.number().int().positive().max(100000).default(1),
}).strict()
function admin(actor: CrmActor) { if (actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên được nhập và liên kết dữ liệu.', 403) }
export const normalizePhone = (value: string | null) => value ? parsePhoneNumberFromString(value, 'VN')?.number || null : null
const normalizeEmail = (value: string | null) => value?.trim().toLowerCase() || null
export function identityConflict(contact: { email: string | null; phone: string | null }, incoming: { email: string | null; phone: string | null }) {
  return !!((contact.email && incoming.email && normalizeEmail(contact.email) !== normalizeEmail(incoming.email)) ||
    (contact.phone && incoming.phone && normalizePhone(contact.phone) !== normalizePhone(incoming.phone)))
}
async function matches(db: Db, email: string | null, phone: string | null) {
  // Never query OR []: every intake/import requires a valid identity.
  return db.crmContact.findMany({ where: { OR: [
    ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
    ...(phone ? [{ phone }] : []),
  ] }, orderBy: { id: 'asc' } })
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!value) throw new CrmError('Cần cấu hình AUTH_SECRET để xác nhận bản xem trước.', 503)
  return value
}
export function issuePreview(actorId: number, value: unknown, now = Date.now()) {
  const payload = actorId + ':' + (now + 15 * 60000) + ':' + digest(value)
  return payload + ':' + createHmac('sha256', secret()).update('crm-import:' + payload).digest('hex')
}
export function verifyPreview(token: string, actorId: number, value: unknown, now = Date.now()) {
  const [owner, expires, hash, mac] = token.split(':')
  const payload = [owner, expires, hash].join(':')
  const expected = createHmac('sha256', secret()).update('crm-import:' + payload).digest('hex')
  const goodMac = !!mac && /^[a-f0-9]{64}$/.test(mac) && timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  if (!goodMac || owner !== String(actorId) || !Number.isFinite(Number(expires)) || Number(expires) < now || hash !== digest(value)) {
    throw new CrmError('Bản xem trước đã hết hạn hoặc dữ liệu đã thay đổi. Hãy xem trước lại.', 409)
  }
}
type ContactData = z.infer<typeof contactFields>
type PlanRow = { row: number; status: 'CREATE' | 'LINK' | 'SKIP' | 'CONFLICT' | 'INVALID'; message: string; data?: ContactData; userId?: number; contactId?: number; version?: number }
async function importPlan(db: Db, command: z.infer<typeof phaseTwoCommand>) {
  if (!('ownerId' in command)) throw new CrmError('Thiếu người phụ trách.')
  if (command.ownerId != null) {
    const owner = await db.user.findUnique({ where: { id: command.ownerId }, select: { role: true } })
    if (!owner || !canUseCrm(owner.role)) throw new CrmError('Người phụ trách không hợp lệ.')
  }
  let raw: { name?: string; email?: string; phone?: string; source?: string; needs?: string; tags?: string; userId?: number }[]
  if ('csv' in command) {
    try { raw = parseCrmCsv(command.csv) } catch (e) { throw new CrmError(e instanceof Error ? e.message : 'CSV không hợp lệ.') }
  }
  else if ('userIds' in command) {
    const users = await db.user.findMany({ where: { id: { in: [...new Set(command.userIds)] } }, select: { id: true, name: true, email: true, phone: true }, orderBy: { id: 'asc' } })
    if (users.length !== new Set(command.userIds).size) throw new CrmError('Một tài khoản đã bị xóa. Hãy chọn lại.', 409)
    raw = users.map(user => ({ userId: user.id, name: user.name || 'Thành viên #' + user.id, email: user.email, phone: user.phone || '', source: 'Thành viên website' }))
  } else throw new CrmError('Thiếu dữ liệu nhập.')
  const rows: PlanRow[] = []; const emails = new Set<string>(); const phones = new Set<string>()
  for (const [i, record] of raw.entries()) {
    const parsed = contactFields.safeParse({ name: record.name || '', email: record.email || '', phone: record.phone || '', source: record.source || 'CSV', needs: record.needs || '', tags: (record.tags || '').split('|').map(value => value.trim()).filter(Boolean), ownerId: command.ownerId, archived: false })
    if (!parsed.success) { rows.push({ row: i + 1, status: 'INVALID', message: parsed.error.issues[0].message }); continue }
    const data = parsed.data; const base = { row: i + 1, data, userId: record.userId }
    if ((data.email && emails.has(data.email)) || (data.phone && phones.has(data.phone))) {
      rows.push({ ...base, status: 'CONFLICT', message: 'Trùng định danh trong cùng danh sách; cần tách và kiểm tra.' }); continue
    }
    if (data.email) emails.add(data.email); if (data.phone) phones.add(data.phone)
    const found = await matches(db, data.email, data.phone)
    const alreadyLinked = record.userId === undefined ? null : await db.crmContact.findUnique({ where: { linkedUserId: record.userId } })
    if (alreadyLinked && (!found.length || found.some(c => c.id !== alreadyLinked.id))) {
      rows.push({ ...base, status: 'CONFLICT', message: 'Tài khoản đã liên kết hồ sơ khác.' }); continue
    }
    if (found.length > 1 || (found[0] && identityConflict(found[0], data))) {
      rows.push({ ...base, status: 'CONFLICT', message: 'Email và điện thoại không cùng một hồ sơ; không tự gộp.' }); continue
    }
    const contact = found[0]
    if (!contact) rows.push({ ...base, status: 'CREATE', message: record.userId === undefined ? 'Tạo khách mới' : 'Tạo khách và liên kết tài khoản' })
    else if (record.userId !== undefined && contact.linkedUserId == null && !contact.archived) {
      rows.push({ ...base, contactId: contact.id, version: contact.version, status: 'LINK', message: 'Liên kết hồ sơ sẵn có; giữ thông tin và người phụ trách' })
    } else rows.push({ ...base, contactId: contact.id, version: contact.version, status: contact.linkedUserId != null && record.userId !== undefined && contact.linkedUserId !== record.userId ? 'CONFLICT' : 'SKIP', message: 'Hồ sơ đã tồn tại; không ghi đè' })
  }
  return { rows, counts: Object.fromEntries(['CREATE', 'LINK', 'SKIP', 'CONFLICT', 'INVALID'].map(status => [status, rows.filter(row => row.status === status).length])) }
}
export async function readPhaseTwo(db: PrismaClient, actor: CrmActor, query: z.infer<typeof phaseTwoQuery>) {
  if (!canUseCrm(actor.role)) throw new CrmError('Không có quyền CRM.', 403)
  if (query.view === 'website') {
    if (!query.contactId) throw new CrmError('Thiếu hồ sơ khách.')
    const contact = await db.crmContact.findFirst({ where: { id: query.contactId, ...contactScope(actor) }, select: { id: true, linkedUserId: true } })
    if (!contact) throw new CrmError('Không tìm thấy hồ sơ.', 404)
    const user = contact.linkedUserId == null ? null : await db.user.findUnique({ where: { id: contact.linkedUserId }, select: { id: true, name: true, email: true, phone: true, createdAt: true } })
    const enrollments = user ? await db.enrollment.findMany({ where: { userId: user.id }, select: {
      id: true, status: true, createdAt: true, course: { select: { id: true, name_lop: true } },
      payment: { select: { id: true, status: true, amount: true, verifiedAt: true } },
      _count: { select: { lessonProgress: true } },
    }, orderBy: { createdAt: 'desc' }, take: 100, skip: (query.page - 1) * 100 }) : []
    const total = user ? await db.enrollment.count({ where: { userId: user.id } }) : 0
    return { user, enrollments: enrollments.map(item => ({ ...item, course: { id: item.course.id, title: item.course.name_lop } })), total, page: query.page }
  }
  admin(actor)
  if (query.view === 'students') {
    if (query.q.length < 3) return { users: [], total: 0 }
    const where: Prisma.UserWhereInput = { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }, { phone: { contains: query.q } }, ...( /^\d+$/.test(query.q) && Number.isSafeInteger(Number(query.q)) ? [{ id: Number(query.q) }] : [])] }
    const [users, total] = await Promise.all([db.user.findMany({ where, select: { id: true, name: true, email: true, phone: true, crmIdentityContact: { select: { id: true } } }, take: 20, skip: (query.page - 1) * 20, orderBy: { id: 'asc' } }), db.user.count({ where })])
    return { users, total }
  }
  if (query.view === 'capture') {
    const [landings, total] = await Promise.all([db.landingPage.findMany({ select: { id: true, title: true, slug: true, isActive: true, config: true, updatedAt: true }, orderBy: { id: 'desc' }, take: 20, skip: (query.page - 1) * 20 }), db.landingPage.count()])
    return { landings, total }
  }
  const [submissions, total] = await Promise.all([db.crmSubmission.findMany({ where: { status: 'CONFLICT' }, include: { landing: { select: { title: true } } }, orderBy: { createdAt: 'desc' }, take: 20, skip: (query.page - 1) * 20 }), db.crmSubmission.count({ where: { status: 'CONFLICT' } })])
  return { submissions, total }
}
export async function writePhaseTwo(db: PrismaClient, actor: CrmActor, command: z.infer<typeof phaseTwoCommand>) {
  admin(actor)
  if (command.action.endsWith('.preview')) {
    const plan = await importPlan(db, command)
    return { ...plan, token: issuePreview(actor.id, { command, plan }) }
  }
  return db.$transaction(async tx => {
    if (command.action === 'import.execute' || command.action === 'students.execute') {
      const previewCommand = command.action === 'import.execute' ? { action: 'import.preview' as const, csv: command.csv, ownerId: command.ownerId } : { action: 'students.preview' as const, userIds: command.userIds, ownerId: command.ownerId }
      const plan = await importPlan(tx, previewCommand)
      verifyPreview(command.token, actor.id, { command: previewCommand, plan })
      let created = 0; let linked = 0
      for (const row of plan.rows) {
        if (row.status !== 'CREATE' && row.status !== 'LINK') continue
        if (!row.data) throw new CrmError('Bản nhập không hợp lệ.')
        const contact = row.status === 'CREATE'
          ? await tx.crmContact.create({ data: { ...row.data, linkedUserId: row.userId, createdBy: actor.id } })
          : await tx.crmContact.update({ where: { id: row.contactId, version: row.version }, data: { linkedUserId: row.userId, version: { increment: 1 } } })
        await tx.crmActivity.create({ data: { contactId: contact.id, type: 'IMPORT', authorId: actor.id, authorName: actor.name, content: row.status === 'CREATE' ? 'Tạo từ bản nhập đã xem trước: ' + row.data.source : 'Liên kết tài khoản #' + row.userId + ' từ bản xem trước.' } })
        if (row.status === 'CREATE') created++; else linked++
      }
      return { created, linked, skipped: plan.rows.length - created - linked }
    }
    if (command.action === 'identity.link') {
      const lock = await tx.crmContact.updateMany({ where: { id: command.contactId, version: command.version, archived: false }, data: { version: { increment: 1 } } })
      if (!lock.count) throw new CrmError('Hồ sơ đã thay đổi hoặc được lưu trữ. Hãy tải lại.', 409)
      const contact = await tx.crmContact.findUniqueOrThrow({ where: { id: command.contactId } })
      if (command.userId != null) {
        const user = await tx.user.findUnique({ where: { id: command.userId }, select: { email: true, phone: true } })
        if (!user || identityConflict(contact, { email: normalizeEmail(user.email), phone: normalizePhone(user.phone) }) || !((contact.email && normalizeEmail(contact.email) === normalizeEmail(user.email)) || (contact.phone && normalizePhone(contact.phone) === normalizePhone(user.phone)))) throw new CrmError('Định danh không khớp. Kiểm tra email và điện thoại trước khi liên kết.', 409)
      }
      // Replacing an existing identity could disclose another member's records.
      if (contact.linkedUserId != null && command.userId != null && contact.linkedUserId !== command.userId) throw new CrmError('Hãy hủy liên kết cũ trước khi chọn tài khoản khác.', 409)
      await tx.crmContact.update({ where: { id: contact.id }, data: { linkedUserId: command.userId } })
      if (command.userId == null) await tx.crmOpportunity.updateMany({ where: { contactId: contact.id, courseId: { not: null } }, data: { courseId: null, version: { increment: 1 } } })
      await tx.crmActivity.create({ data: { contactId: contact.id, type: 'LINK', content: command.userId == null ? 'Hủy liên kết tài khoản.' : 'Liên kết tài khoản #' + command.userId, authorId: actor.id, authorName: actor.name } })
      return { contactId: contact.id }
    }
    if (command.action === 'capture.toggle') {
      const landing = await tx.landingPage.findUnique({ where: { id: command.landingId } })
      if (!landing) throw new CrmError('Không tìm thấy landing page.', 404)
      const config = landing.config && typeof landing.config === 'object' && !Array.isArray(landing.config) ? landing.config : {}
      const result = await tx.landingPage.updateMany({ where: { id: landing.id, updatedAt: new Date(command.updatedAt) }, data: { config: { ...config, crmCapture: command.enabled } } })
      if (!result.count) throw new CrmError('Landing page đã thay đổi. Hãy tải lại.', 409)
      return { enabled: command.enabled }
    }
    if (command.action === 'submission.resolve') {
      const contact = await tx.crmContact.findUnique({ where: { id: command.contactId } })
      const submission = await tx.crmSubmission.findUnique({ where: { id: command.id } })
      if (!contact || contact.archived || !submission || submission.status !== 'CONFLICT') throw new CrmError('Hồ sơ hoặc yêu cầu đã thay đổi.', 409)
      await tx.crmSubmission.update({ where: { id: submission.id }, data: { contactId: contact.id, status: 'REVIEWED' } })
      await tx.crmActivity.create({ data: { contactId: contact.id, type: 'FORM', content: 'Quản trị viên gắn yêu cầu form #' + submission.id + ' sau kiểm tra; không thay đổi định danh khách.', authorId: actor.id, authorName: actor.name } })
      return { contactId: contact.id }
    }
    throw new CrmError('Thao tác không hợp lệ.')
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 })
}
