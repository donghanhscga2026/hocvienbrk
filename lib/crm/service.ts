import { Prisma, PrismaClient } from '@prisma/client'
import { canUseCrm, contactScope, CrmActor, isOpenStage, STAGE_LABELS, vietnamDayBounds } from './shared'
import { CrmCommand, crmQuery } from './validation'
import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { projectStudent, studentIdentity, studentUserSelect } from './student-profile'
import { learningSummaries } from './learning'
import { requestScope } from './requests'

export class CrmError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
const ownerSelect = { id: true, name: true, email: true } as const
function assertActor(actor: CrmActor) {
  if (!canUseCrm(actor.role)) throw new CrmError('Bạn không có quyền sử dụng CRM.', 403)
}
async function validateOwner(tx: Prisma.TransactionClient, actor: CrmActor, ownerId: number | null) {
  if (actor.role !== 'ADMIN' && ownerId !== actor.id) throw new CrmError('Chỉ quản trị viên được phân công khách.', 403)
  if (ownerId == null) return
  const owner = await tx.user.findUnique({ where: { id: ownerId }, select: { role: true } })
  if (!owner || !canUseCrm(owner.role)) throw new CrmError('Người phụ trách không có quyền sử dụng CRM.')
}

export async function readCrm(db: PrismaClient, actor: CrmActor, query: z.infer<typeof crmQuery>) {
  assertActor(actor)
  const scope = contactScope(actor)
  if (query.view === 'owners') {
    const owners = await db.user.findMany({
      where: actor.role === 'ADMIN' ? { role: { in: ['ADMIN', 'TEACHER', 'INSTRUCTOR'] } } : { id: actor.id },
      select: ownerSelect, orderBy: { id: 'asc' },
    })
    return { owners, actor: { id: actor.id, isAdmin: actor.role === 'ADMIN' } }
  }
  if (query.view === 'detail') {
    if (!query.id) throw new CrmError('Thiếu mã khách.')
    // Both the record and its activity count share the same authorization filter.
    const contact = await db.crmContact.findFirst({
      where: { id: query.id, ...scope }, include: {
        studentUser: { select: studentUserSelect },
        owner: { select: ownerSelect }, opportunities: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: [{ completedAt: 'asc' }, { dueAt: 'asc' }] },
        activities: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30, skip: (query.activityPage - 1) * 30 },
        _count: { select: { activities: true } },
      },
    })
    if (!contact) throw new CrmError('Không tìm thấy khách hoặc không có quyền truy cập.', 404)
    const learning = await learningSummaries(db, actor, [contact])
    return { contact: { ...projectStudent(contact), learning: learning.get(contact.id) || [], activityTotal: contact._count.activities } }
  }
  const base: Prisma.CrmContactWhereInput = { ...scope, archived: false }
  const now = new Date()
  const { start, end } = vietnamDayBounds(now)
  if (query.view === 'tasks') {
    const dueAt = query.due === 'today' ? { gte: start, lt: end } : query.due === 'overdue' ? { lt: now } : undefined
    const where: Prisma.CrmTaskWhereInput = { contact: base, completedAt: query.due === 'done' ? { not: null } : null, dueAt }
    const [tasks, total, overdue, today, unscheduled] = await Promise.all([
      db.crmTask.findMany({ where, include: { contact: { select: { id: true, name: true, owner: { select: ownerSelect } } } }, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 20, skip: (query.page - 1) * 20 }),
      db.crmTask.count({ where }),
      db.crmTask.count({ where: { contact: base, completedAt: null, dueAt: { lt: now } } }),
      db.crmTask.count({ where: { contact: base, completedAt: null, dueAt: { gte: start, lt: end } } }),
      db.crmContact.count({ where: { ...base, opportunities: { some: { stage: { notIn: ['WON', 'LOST'] } } }, tasks: { none: { completedAt: null } } } }),
    ])
    return { tasks, total, page: query.page, stats: { overdue, today, unscheduled } }
  }
  const where: Prisma.CrmContactWhereInput = { AND: [scope], archived: query.archived === 'true' }
  if (actor.role === 'ADMIN' && query.ownerId !== undefined) where.ownerId = query.ownerId
  if (query.q) where.OR = [
    { name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } },
    { phone: { contains: parsePhoneNumberFromString(query.q, 'VN')?.number || query.q.replace(/[\s().-]/g, '') || query.q, mode: 'insensitive' } },
    { studentProfile: true, studentUser: { OR: [
      { email: { contains: query.q, mode: 'insensitive' } }, { phone: { contains: query.q } },
    ] } },
  ]
  if (query.source) where.source = { contains: query.source, mode: 'insensitive' }
  if (query.tag) where.tags = { has: query.tag }
  if (query.stage) where.opportunities = { some: { stage: query.stage } }
  if (query.due === 'unscheduled') {
    where.AND = [scope, { opportunities: { some: { stage: { notIn: ['WON', 'LOST'] } } } }, { tasks: { none: { completedAt: null } } }]
  }
  const [contacts, total] = await Promise.all([
    db.crmContact.findMany({ where, include: {
      studentUser: { select: studentUserSelect },
      owner: { select: ownerSelect }, opportunities: { orderBy: { createdAt: 'desc' } },
      tasks: { where: { completedAt: null }, orderBy: { dueAt: 'asc' }, take: 1 },
    }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 20, skip: (query.page - 1) * 20 }),
    db.crmContact.count({ where }),
  ])
  const learning = await learningSummaries(db, actor, contacts)
  const counts = await db.crmRequest.groupBy({ by: ['contactId'], where: { AND: [requestScope(actor)], contactId: { in: contacts.map(c => c.id) }, status: { not: 'RESOLVED' } }, _count: true })
  return { contacts: contacts.map(contact => ({ ...projectStudent(contact), learning: learning.get(contact.id) || [], pendingRequests: counts.find(c => c.contactId === contact.id)?._count || 0 })), total, page: query.page }
}

export async function writeCrm(db: PrismaClient, actor: CrmActor, command: CrmCommand) {
  assertActor(actor)
  return db.$transaction(async tx => {
    const log = (contactId: number, type: string, content: string) => tx.crmActivity.create({
      data: { contactId, type, content, authorId: actor.id, authorName: actor.name },
    })
    if (command.action === 'contact.create') {
      await validateOwner(tx, actor, command.data.ownerId)
      const contact = await tx.crmContact.create({ data: { ...command.data, createdBy: actor.id } })
      await log(contact.id, 'CREATED', 'Tạo hồ sơ khách từ nguồn: ' + contact.source)
      return { contactId: contact.id }
    }
    // A scoped write locks the contact row until commit. Ownership transfer and child
    // writes cannot race to bypass permission checks; all errors roll back this touch.
    const locked = await tx.crmContact.updateMany({
      where: { id: command.contactId, ...contactScope(actor) }, data: { updatedAt: new Date() },
    })
    if (!locked.count) throw new CrmError('Không tìm thấy khách hoặc không có quyền truy cập.', 404)
    const contact = await tx.crmContact.findUniqueOrThrow({ where: { id: command.contactId }, include: { studentUser: { select: studentUserSelect } } })
    if (contact.archived && command.action !== 'contact.update') throw new CrmError('Khách đã lưu trữ. Hãy khôi phục trước khi chăm sóc.')
    if ((command.action === 'opportunity.create' || command.action === 'opportunity.update') && command.data.courseId != null) {
      const userId = contact.studentProfile ? contact.studentUserId : contact.linkedUserId
      const teacherId = contact.studentProfile ? contact.ownerId : actor.role === 'ADMIN' ? undefined : actor.id
      const enrollment = userId == null ? null : await tx.enrollment.findFirst({ where: { userId, courseId: command.data.courseId, ...(teacherId == null ? {} : { course: { teacherId } }) }, select: { id: true } })
      if (!enrollment) throw new CrmError('Khóa học chưa thuộc tài khoản liên kết của khách.')
    }
    if (command.action === 'care.update') {
      if (contact.version !== command.version) throw new CrmError('Hồ sơ đã thay đổi. Hãy tải lại trước khi lưu.', 409)
      if (command.opportunity) {
        const change = command.opportunity
        if (change.stage === 'LOST' && !change.lostReason) throw new CrmError('Cần ghi lý do chưa thành công.')
        const previous = await tx.crmOpportunity.findFirst({ where: { id: change.id, contactId: contact.id } })
        if (!previous || previous.version !== change.version) throw new CrmError('Cơ hội đã thay đổi. Hãy tải lại.', 409)
        await tx.crmOpportunity.update({ where: { id: previous.id }, data: { stage: change.stage, lostReason: change.stage === 'LOST' ? change.lostReason : '', version: { increment: 1 } } })
        await log(contact.id, 'OPPORTUNITY', previous.title + ': ' + STAGE_LABELS[previous.stage] + ' → ' + STAGE_LABELS[change.stage])
      }
      await log(contact.id, 'NOTE', command.note)
      if (command.task) {
        await tx.crmTask.create({ data: { contactId: contact.id, title: command.task.title, dueAt: command.task.dueAt, createdBy: actor.id } })
        await log(contact.id, 'TASK', 'Hẹn công việc: ' + command.task.title)
      }
      await tx.crmContact.update({ where: { id: contact.id }, data: { version: { increment: 1 }, lastContactAt: new Date() } })
      return { contactId: contact.id }
    }
    if (command.action === 'contact.update') {
      if (contact.version !== command.version) throw new CrmError('Hồ sơ đã được cập nhật ở nơi khác. Hãy tải lại trước khi lưu.', 409)
      if (contact.studentProfile) {
        const identity = contact.studentUser ? studentIdentity(contact.studentUser) : { email: null, phone: null }
        if (command.data.ownerId !== contact.ownerId || command.data.email !== identity.email || command.data.phone !== identity.phone) throw new CrmError('Hồ sơ học viên giữ giáo viên và định danh từ website. Hãy tải lại nếu tài khoản đã đổi.', 409)
      }
      if (contact.linkedUserId != null && (contact.email !== command.data.email || contact.phone !== command.data.phone)) throw new CrmError('Hãy nhờ quản trị viên hủy liên kết tài khoản trước khi đổi email hoặc điện thoại.', 409)
      await validateOwner(tx, actor, command.data.ownerId)
      await tx.crmContact.update({ where: { id: contact.id }, data: { ...command.data, ...(contact.studentProfile ? { email: null, phone: null } : {}), version: { increment: 1 } } })
      const changes: string[] = []
      if (contact.ownerId !== command.data.ownerId) changes.push('đổi người phụ trách từ #' + (contact.ownerId ?? 'chưa giao') + ' sang #' + (command.data.ownerId ?? 'chưa giao'))
      if (contact.archived !== command.data.archived) changes.push(command.data.archived ? 'lưu trữ hồ sơ' : 'khôi phục hồ sơ')
      await log(contact.id, 'UPDATED', changes.length ? changes.join('; ') : 'Cập nhật thông tin, nhu cầu hoặc nhãn của khách.')
    } else if (command.action === 'activity.create') {
      await log(contact.id, command.type, command.content)
      if (command.type !== 'NOTE') await tx.crmContact.update({ where: { id: contact.id }, data: { lastContactAt: new Date() } })
    } else if (command.action === 'opportunity.create') {
      await tx.crmOpportunity.create({ data: { ...command.data, contactId: contact.id } })
      await log(contact.id, 'OPPORTUNITY', 'Tạo cơ hội: ' + command.data.title + ' — ' + STAGE_LABELS[command.data.stage])
    } else if (command.action === 'opportunity.update') {
      const previous = await tx.crmOpportunity.findFirst({ where: { id: command.opportunityId, contactId: contact.id } })
      if (!previous) throw new CrmError('Không tìm thấy cơ hội.', 404)
      if (previous.version !== command.version) throw new CrmError('Cơ hội đã thay đổi. Hãy tải lại trước khi lưu.', 409)
      await tx.crmOpportunity.update({ where: { id: previous.id }, data: { ...command.data, version: { increment: 1 } } })
      await log(contact.id, 'OPPORTUNITY', command.data.title + ': ' + STAGE_LABELS[previous.stage] + ' → ' + STAGE_LABELS[command.data.stage] + (command.data.stage === 'LOST' ? '. Lý do: ' + command.data.lostReason : ''))
    } else if (command.action === 'task.create') {
      await tx.crmTask.create({ data: { contactId: contact.id, title: command.title, dueAt: command.dueAt, createdBy: actor.id } })
      await log(contact.id, 'TASK', 'Hẹn công việc: ' + command.title)
    } else if (command.action === 'task.toggle') {
      const task = await tx.crmTask.findFirst({ where: { id: command.taskId, contactId: contact.id } })
      if (!task) throw new CrmError('Không tìm thấy công việc.', 404)
      // Repeated requests are idempotent: no duplicate history or reset completion date.
      if (!!task.completedAt !== command.completed) {
        await tx.crmTask.update({ where: { id: task.id }, data: { completedAt: command.completed ? new Date() : null } })
        await log(contact.id, 'TASK', (command.completed ? 'Hoàn thành: ' : 'Mở lại: ') + task.title)
      }
    }
    return { contactId: contact.id }
  })
}

export function opportunitySummary(opportunities: { stage: string; amount: number }[]) {
  return opportunities.filter(item => isOpenStage(item.stage)).reduce((sum, item) => sum + item.amount, 0)
}
