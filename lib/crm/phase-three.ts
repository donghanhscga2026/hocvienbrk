import { createHash } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { CrmActor, canUseCrm, contactScope, vietnamDayBounds } from './shared'
import { CrmError } from './service'
import { issuePreview, verifyPreview } from './phase-two'
import { phaseThreeCommand, phaseThreeQuery, reportRange, segmentFilter } from './phase-three-validation'

type Db = PrismaClient | Prisma.TransactionClient
const admin = (actor: CrmActor) => { if (actor.role !== 'ADMIN') throw new CrmError('Chỉ quản trị viên được thực hiện thao tác này.', 403) }
const receiptKey = (token: string) => createHash('sha256').update('crm-draft:' + token).digest('hex')
const contactSelect = { id: true, name: true, email: true, version: true, ownerId: true, tasks: { where: { completedAt: null }, select: { id: true }, take: 1 } } as const

export async function segmentPlan(db: Db, filter: z.infer<typeof segmentFilter>) {
  // Chỉ dùng email được cho phép rõ ràng; không suy từ việc khách điền form.
  const where: Prisma.CrmContactWhereInput = { archived: false, marketingEmailAllowed: true, email: { not: null } }
  if (filter.source) where.source = { contains: filter.source, mode: 'insensitive' }
  if (filter.tag) where.tags = { has: filter.tag }
  if (filter.stage) where.opportunities = { some: { stage: filter.stage } }
  if (filter.ownerId !== undefined) where.ownerId = filter.ownerId
  const contacts = await db.crmContact.findMany({ where, select: { id: true, name: true, email: true, version: true }, orderBy: { id: 'asc' }, take: 501 })
  if (contacts.length > 500) throw new CrmError('Nhóm có hơn 500 khách. Hãy lọc hẹp hơn trước khi tạo nháp.')
  const emails = contacts.map(c => c.email!.toLowerCase())
  const blocked = await db.emailBlacklist.findMany({ where: { OR: emails.map(email => ({ email: { equals: email, mode: 'insensitive' as const } })) }, select: { email: true } })
  const denied = new Set(blocked.map(row => row.email.toLowerCase()))
  const seen = new Set<string>()
  const recipients = contacts.filter(c => { const email = c.email!.toLowerCase(); if (denied.has(email) || seen.has(email)) return false; seen.add(email); return true })
  return { recipients, excluded: contacts.length - recipients.length }
}

export async function automationSettings(db: Db) {
  return await db.crmAutomationSettings.findUnique({ where: { id: 1 } }) || { id: 1, version: 0, leadSince: null, enrollmentSince: null, paymentSince: null, updatedAt: null }
}
type Contact = Prisma.CrmContactGetPayload<{ select: typeof contactSelect }>
type EventRow = { key: string; kind: 'FORM' | 'ENROLLMENT' | 'PAYMENT'; sourceId: number; contactId: number; name: string; version: number; ownerId: number | null; createTask: boolean; dueAt: string; title: string }
export async function automationPlan(db: Db) {
  const settings = await automationSettings(db)
  const rows: EventRow[] = []
  const add = (kind: EventRow['kind'], id: number, contact: Contact, date: Date, title: string) => rows.push({ key: kind + ':' + id, kind, sourceId: id, contactId: contact.id, name: contact.name, version: contact.version, ownerId: contact.ownerId, createTask: !contact.tasks.length, dueAt: new Date(date.getTime() + 86400000).toISOString(), title: title.slice(0, 200) })
  if (settings.leadSince) {
    const submissions = await db.crmSubmission.findMany({
      where: { createdAt: { gte: settings.leadSince }, status: { in: ['RECEIVED', 'REVIEWED'] }, contact: { is: { archived: false } }, crmAutomationEvent: { is: null } },
      select: { id: true, createdAt: true, contact: { select: contactSelect }, landing: { select: { title: true } } }, orderBy: { id: 'asc' }, take: 100,
    })
    for (const item of submissions) if (item.contact) add('FORM', item.id, item.contact, item.createdAt, 'Liên hệ khách đăng ký: ' + item.landing.title)
  }
  // Chỉ đọc tài khoản đã liên kết; không tự liên kết dựa trên email công khai.
  if (settings.enrollmentSince) {
    const items = await db.enrollment.findMany({
      where: { createdAt: { gte: settings.enrollmentSince }, status: 'ACTIVE', user: { crmIdentityContact: { is: { archived: false } } }, crmAutomationEvent: { is: null } },
      select: { id: true, createdAt: true, user: { select: { crmIdentityContact: { select: contactSelect } } }, course: { select: { name_lop: true } } }, orderBy: { id: 'asc' }, take: 100,
    })
    for (const item of items) if (item.user.crmIdentityContact) add('ENROLLMENT', item.id, item.user.crmIdentityContact, item.createdAt, 'Chăm sóc học viên mới: ' + item.course.name_lop)
  }
  if (settings.paymentSince) {
    const items = await db.payment.findMany({
      where: { status: 'VERIFIED', verifiedAt: { gte: settings.paymentSince }, enrollment: { user: { crmIdentityContact: { is: { archived: false } } } }, crmAutomationEvent: { is: null } },
      select: { id: true, verifiedAt: true, enrollment: { select: { user: { select: { crmIdentityContact: { select: contactSelect } } }, course: { select: { name_lop: true } } } } }, orderBy: { id: 'asc' }, take: 100,
    })
    for (const item of items) if (item.enrollment.user.crmIdentityContact && item.verifiedAt) add('PAYMENT', item.id, item.enrollment.user.crmIdentityContact, item.verifiedAt, 'Chăm sóc sau thanh toán: ' + item.enrollment.course.name_lop)
  }
  rows.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.key.localeCompare(b.key))
  const batch = rows.slice(0, 100)
  const scheduled = new Set<number>()
  for (const row of batch) { if (scheduled.has(row.contactId)) row.createTask = false; if (row.createTask) scheduled.add(row.contactId) }
  return { settings, rows: batch, hasMore: rows.length >= 100 }
}
async function applyAutomation(tx: Prisma.TransactionClient, plan: Awaited<ReturnType<typeof automationPlan>>, actor: CrmActor) {
  let tasks = 0
  for (const row of plan.rows) {
    // Khóa cùng hồ sơ như luồng chăm sóc thủ công để tránh chạy đua khi đổi phân công.
    const touched = await tx.crmContact.updateMany({ where: { id: row.contactId, version: row.version, archived: false }, data: { updatedAt: new Date() } })
    if (!touched.count) throw new CrmError('Hồ sơ đã thay đổi. Hãy xem trước lại.', 409)
    const task = row.createTask ? await tx.crmTask.create({ data: { contactId: row.contactId, title: row.title, dueAt: new Date(row.dueAt), createdBy: actor.id } }) : null
    await tx.crmAutomationEvent.create({ data: { sourceKey: row.key, kind: row.kind, contactId: row.contactId, taskId: task?.id,
      submissionId: row.kind === 'FORM' ? row.sourceId : null, enrollmentId: row.kind === 'ENROLLMENT' ? row.sourceId : null, paymentId: row.kind === 'PAYMENT' ? row.sourceId : null } })
    await tx.crmActivity.create({ data: { contactId: row.contactId, type: 'AUTOMATION', authorId: actor.id, authorName: actor.name, content: row.title + '. ' + (task ? 'Đã tạo việc chăm sóc, hạn 24 giờ sau sự kiện.' : 'Giữ lịch chăm sóc đang có.') + ' Bước tư vấn giữ nguyên.' } })
    if (task) tasks++
  }
  return { events: plan.rows.length, tasks, hasMore: plan.hasMore }
}

// Cron mặc định chỉ xem trước. Thực thi được gọi riêng, sau khi quản trị viên bật quy tắc.
export async function runAutomation(db: PrismaClient, execute = false) {
  if (!execute) { const plan = await automationPlan(db); return { dryRun: true, events: plan.rows.length, tasks: plan.rows.filter(r => r.createTask).length, hasMore: plan.hasMore } }
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420303)`
    const plan = await automationPlan(tx)
    return { dryRun: false, ...await applyAutomation(tx, plan, { id: -1, role: 'ADMIN', name: 'CRM tự động' }) }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 })
}

export async function readPhaseThree(db: PrismaClient, actor: CrmActor, query: z.infer<typeof phaseThreeQuery>) {
  if (!canUseCrm(actor.role)) throw new CrmError('Không có quyền CRM.', 403)
  const scope = { ...contactScope(actor), archived: false }
  if (query.view === 'settings') { admin(actor); return automationSettings(db) }
  if (query.view === 'consent') {
    if (!query.contactId) throw new CrmError('Thiếu mã khách.')
    const contact = await db.crmContact.findFirst({ where: { id: query.contactId, ...scope }, select: { id: true, marketingEmailAllowed: true, version: true } })
    if (!contact) throw new CrmError('Không tìm thấy khách.', 404)
    return contact
  }
  if (query.view === 'reminders') {
    const { start, end } = vietnamDayBounds(); const now = new Date()
    const where: Prisma.CrmTaskWhereInput = { contact: scope, completedAt: null, dueAt: { lt: end } }
    const [tasks, total, overdue, today, unscheduled] = await Promise.all([
      db.crmTask.findMany({ where, select: { id: true, contactId: true, title: true, dueAt: true, contact: { select: { name: true } } }, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 20, skip: (query.page - 1) * 20 }),
      db.crmTask.count({ where }), db.crmTask.count({ where: { contact: scope, completedAt: null, dueAt: { lt: now } } }),
      db.crmTask.count({ where: { contact: scope, completedAt: null, dueAt: { gte: start, lt: end } } }),
      db.crmContact.count({ where: { ...scope, opportunities: { some: { stage: { notIn: ['WON', 'LOST'] } } }, tasks: { none: { completedAt: null } } } }),
    ])
    return { tasks, total, overdue, today, unscheduled }
  }
  let range: ReturnType<typeof reportRange>
  try { range = reportRange(query.from, query.to) } catch { throw new CrmError('Khoảng báo cáo từ 1 đến 366 ngày.') }
  const period = { gte: range.gte, lt: range.lt }
  const [contacts, sources, owners, stages, payments] = await Promise.all([
    db.crmContact.count({ where: { ...scope, createdAt: period } }),
    db.crmContact.groupBy({ by: ['source'], where: { ...scope, createdAt: period }, _count: { _all: true }, orderBy: { _count: { source: 'desc' } }, take: 20 }),
    db.crmContact.groupBy({ by: ['ownerId'], where: { ...scope, createdAt: period }, _count: { _all: true }, orderBy: { _count: { ownerId: 'desc' } }, take: 100 }),
    db.crmOpportunity.groupBy({ by: ['stage'], where: { contact: scope, createdAt: period }, _count: { _all: true }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { status: 'VERIFIED', verifiedAt: period, enrollment: {
      ...(actor.role === 'ADMIN' ? {} : { course: { teacherId: actor.id } }),
      user: { OR: [{ crmIdentityContact: { is: scope } }, { crmStudentProfiles: { some: scope } }] },
    } }, _count: { _all: true }, _sum: { amount: true } }),
  ])
  const users = await db.user.findMany({ where: { id: { in: owners.flatMap(r => r.ownerId == null ? [] : [r.ownerId]) } }, select: { id: true, name: true } })
  return { from: range.first, to: range.last, contacts, sources: sources.map(r => ({ label: r.source, count: r._count._all })),
    owners: owners.map(r => ({ label: r.ownerId == null ? 'Chưa phân công' : users.find(u => u.id === r.ownerId)?.name || '#' + r.ownerId, count: r._count._all })),
    stages: stages.map(r => ({ stage: r.stage, count: r._count._all, amount: r._sum.amount || 0 })), verifiedPayments: payments._count._all, verifiedAmount: payments._sum.amount || 0 }
}

export async function writePhaseThree(db: PrismaClient, actor: CrmActor, command: z.infer<typeof phaseThreeCommand>) {
  admin(actor)
  if (command.action === 'segment.preview') {
    const plan = await segmentPlan(db, command.filter)
    return { ...plan, token: issuePreview(actor.id, { type: 'crm-segment', filter: command.filter, plan }) }
  }
  if (command.action === 'automation.preview') {
    const plan = await automationPlan(db)
    return { ...plan, token: issuePreview(actor.id, { type: 'crm-automation', plan }) }
  }
  return db.$transaction(async tx => {
    if (command.action === 'consent.set') {
      const result = await tx.crmContact.updateMany({ where: { id: command.contactId, version: command.version, archived: false }, data: { marketingEmailAllowed: command.allowed, version: { increment: 1 } } })
      if (!result.count) throw new CrmError('Hồ sơ đã thay đổi. Hãy tải lại.', 409)
      await tx.crmActivity.create({ data: { contactId: command.contactId, type: 'CONSENT', authorId: actor.id, authorName: actor.name, content: (command.allowed ? 'Cho phép nhận email: ' : 'Dừng nhận email: ') + command.note } })
      return { saved: true }
    }
    if (command.action === 'settings.save') {
      const before = await automationSettings(tx)
      if (before.version !== command.version) throw new CrmError('Cấu hình đã thay đổi. Hãy tải lại.', 409)
      const now = new Date()
      const data = { leadSince: command.lead ? before.leadSince || now : null, enrollmentSince: command.enrollment ? before.enrollmentSince || now : null, paymentSince: command.payment ? before.paymentSince || now : null }
      return before.version === 0 ? tx.crmAutomationSettings.create({ data: { id: 1, ...data } }) : tx.crmAutomationSettings.update({ where: { id: 1, version: command.version }, data: { ...data, version: { increment: 1 } } })
    }
    if (command.action === 'automation.execute') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70420303)`
      const plan = await automationPlan(tx)
      verifyPreview(command.token, actor.id, { type: 'crm-automation', plan })
      return applyAutomation(tx, plan, actor)
    }
    const previewKey = receiptKey(command.token)
    const existing = await tx.crmCampaignReceipt.findUnique({ where: { previewKey }, select: { campaignId: true, actorId: true } })
    if (existing) { if (existing.actorId !== actor.id) throw new CrmError('Bản xem trước không thuộc tài khoản này.', 403); return { campaignId: existing.campaignId, reused: true } }
    const plan = await segmentPlan(tx, command.filter)
    verifyPreview(command.token, actor.id, { type: 'crm-segment', filter: command.filter, plan })
    if (!plan.recipients.length) throw new CrmError('Nhóm chưa có khách đủ điều kiện nhận email.')
    // Nội dung thuần văn bản được escape; chỉ lưu DRAFT, không gán sender hoặc gửi.
    const escaped = command.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br/>')
    const campaign = await tx.emailCampaign.create({ data: { title: command.title, subject: command.subject, htmlContent: '<p>' + escaped + '</p>', notificationType: 'THONG_BAO', recipientSource: 'SELECTED_LIST', recipientFilter: { crm: true, ...command.filter }, recipientCsvData: JSON.stringify(plan.recipients.map(r => ({ contactId: r.id, email: r.email, name: r.name }))), totalRecipients: plan.recipients.length, createdBy: actor.id, status: 'DRAFT' } })
    await tx.crmCampaignReceipt.create({ data: { previewKey, campaignId: campaign.id, actorId: actor.id } })
    return { campaignId: campaign.id, reused: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 })
}
