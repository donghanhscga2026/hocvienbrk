import type { PrismaClient } from '@prisma/client'
import { contactScope, vietnamDayBounds, type CrmActor } from './shared'
import { requestScope } from './requests'

// Counts cover the entire authorized scope; lists remain bounded independently.
export async function readDashboard(db: PrismaClient, actor: CrmActor, now = new Date()) {
  const requests = requestScope(actor)
  const contact = { ...contactScope(actor), archived: false }
  const tasks = { contact, completedAt: null }
  const { start, end } = vietnamDayBounds(now)
  const [newRequests, processing, resolved, overdue, today, completed, queue, appointments, recent] = await Promise.all([
    db.crmRequest.count({ where: { AND: [requests], status: 'NEW' } }),
    db.crmRequest.count({ where: { AND: [requests], status: 'IN_PROGRESS' } }),
    db.crmRequest.count({ where: { AND: [requests], status: 'RESOLVED' } }),
    db.crmTask.count({ where: { ...tasks, dueAt: { lt: now } } }),
    db.crmTask.count({ where: { ...tasks, dueAt: { gte: start, lt: end } } }),
    db.crmTask.count({ where: { contact, completedAt: { not: null } } }),
    db.crmRequest.findMany({ where: { AND: [requests], status: { in: ['NEW', 'IN_PROGRESS'] } }, select: { id: true, name: true, content: true, source: true, status: true, createdAt: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 6 }),
    db.crmTask.findMany({ where: { ...tasks, dueAt: { lt: end } }, select: { id: true, title: true, dueAt: true, contactId: true, contact: { select: { name: true } } }, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 6 }),
    db.crmRequest.findMany({ where: { AND: [requests] }, select: { id: true, name: true, status: true, source: true, updatedAt: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 5 }),
  ])
  return { stats: { newRequests, processing, resolved, overdue, today, completed }, queue, appointments, recent, generatedAt: now.toISOString() }
}
