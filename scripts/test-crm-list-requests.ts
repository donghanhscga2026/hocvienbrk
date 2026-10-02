/** Fake fixtures only. Default dry-run; refuses all non-local/non-disposable DBs. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { testPhaseTwo } from './test-crm-phase-two-db'
import { testPhaseThree } from './test-crm-phase-three'
import { testStudents } from './test-crm-students'
import { crmCommand, crmQuery } from '../lib/crm/validation'
import { readCrm, writeCrm, CrmError } from '../lib/crm/service'
import { createRequest, readRequests, updateRequest, requestSource } from '../lib/crm/requests'
import { captureLead } from '../lib/crm/intake'

async function testNew(db: PrismaClient) {
  let n = 0
  const check = (value: unknown, message: string) => { assert.ok(value, message); n++ }
  const deny = async (work: () => Promise<unknown>, status: number) => { await assert.rejects(work, e => e instanceof CrmError && e.status === status); n++ }
  const a = { id: 9001, name: 'Teacher A', role: 'TEACHER' }; const b = { id: 9002, name: 'Teacher B', role: 'TEACHER' }; const admin = { id: 0, name: 'Admin', role: 'ADMIN' }
  await db.user.createMany({ data: [{ ...a, role: 'TEACHER', email: 'a9001@crm.invalid' }, { ...b, role: 'TEACHER', email: 'b9002@crm.invalid' }, { id: 9003, name: 'Learner', email: 'learner9003@crm.invalid' }] })
  const ca = await db.course.create({ data: { id_khoa: 'LIST-A', name_lop: 'A', teacherId: a.id } })
  const cb = await db.course.create({ data: { id_khoa: 'LIST-B', name_lop: 'B', teacherId: b.id } })
  const ea = await db.enrollment.create({ data: { userId: 9003, courseId: ca.id, status: 'ACTIVE' } })
  await db.enrollment.create({ data: { userId: 9003, courseId: cb.id, status: 'ACTIVE' } })
  const lessons = []
  for (let order = 1; order <= 3; order++) lessons.push(await db.lesson.create({ data: { courseId: ca.id, title: 'A' + order, order } }))
  const foreign = await db.lesson.create({ data: { courseId: cb.id, title: 'B1', order: 1 } })
  await db.lessonProgress.createMany({ data: [{ enrollmentId: ea.id, lessonId: lessons[0].id, status: 'COMPLETED' }, { enrollmentId: ea.id, lessonId: lessons[1].id, status: 'IN_PROGRESS' }, { enrollmentId: ea.id, lessonId: lessons[2].id, status: 'RESET' }, { enrollmentId: ea.id, lessonId: foreign.id, status: 'COMPLETED' }] })
  const comment = await db.lessonComment.create({ data: { userId: 9003, lessonId: lessons[0].id, content: 'Question' } })
  const payload = { key: randomUUID(), courseId: ca.id, lessonId: lessons[0].id, commentId: comment.id, content: 'Please explain', category: 'LEARNING', consent: true }
  const beforeOld = await db.lessonProgress.findMany({ where: { enrollmentId: ea.id } })
  await deny(() => createRequest(db, payload, null, 'anon'), 403)
  await deny(() => createRequest(db, { ...payload, courseId: cb.id }, 9003, 'wrong'), 400)
  await deny(() => createRequest(db, payload, b.id, 'wrong-user'), 403)
  await createRequest(db, payload, 9003, 'learner')
  await createRequest(db, { ...payload, key: randomUUID() }, 9003, 'learner')
  check(await db.crmRequest.count({ where: { commentId: comment.id } }) === 1, 'Comment escalation is idempotent even with a new client UUID')
  const contact = await db.crmContact.findUniqueOrThrow({ where: { ownerId_studentUserId: { ownerId: a.id, studentUserId: 9003 } } })
  check(contact.email === null && contact.phone === null && contact.studentProfile && !contact.marketingEmailAllowed, 'Explicit support uses a private profile without implicit marketing')
  const list = await readCrm(db, a, crmQuery.parse({ q: 'learner9003@crm.invalid' })) as { contacts: { learning: { courseId: number; completed: number; total: number }[]; pendingRequests: number }[] }
  check(list.contacts.length === 1 && list.contacts[0].learning.length === 1 && list.contacts[0].learning[0].completed === 1 && list.contacts[0].learning[0].total === 3 && list.contacts[0].pendingRequests === 1, 'Summary excludes incomplete/reset/wrong-course rows and other teacher courses')
  const adminDetail = await readCrm(db, admin, crmQuery.parse({ view: 'detail', id: contact.id })) as { contact: { learning: unknown[] } }
  check(adminDetail.contact.learning.length === 1, 'Admin sees private roster in its teacher context')
  check((await readRequests(db, b, 1)).total === 0, 'Other teacher cannot read request')
  await deny(() => readRequests(db, b, 1, undefined, contact.id), 404)
  const row = await db.crmRequest.findFirstOrThrow({ where: { commentId: comment.id } })
  const source = await requestSource(db, a, row.id)
  check(source.lesson?.title === 'A1' && source.comment?.content === 'Question', 'Source is authorized original lesson/comment')
  await deny(() => requestSource(db, b, row.id), 404)
  await deny(() => updateRequest(db, b, { id: row.id, version: 1, status: 'IN_PROGRESS', resolution: '' }), 409)
  await deny(() => updateRequest(db, a, { id: row.id, version: 1, status: 'RESOLVED', resolution: '' }), 400)
  await updateRequest(db, a, { id: row.id, version: 1, status: 'IN_PROGRESS', resolution: 'Checking' })
  await deny(() => updateRequest(db, a, { id: row.id, version: 1, status: 'RESOLVED', resolution: 'Stale' }), 409)
  await updateRequest(db, a, { id: row.id, version: 2, status: 'RESOLVED', resolution: 'Explained' })
  const resolved = await db.crmRequest.findUniqueOrThrow({ where: { id: row.id } })
  check(Array.isArray(resolved.history) && resolved.history.length === 2 && resolved.status === 'RESOLVED', 'CAS updates retain prior status/results in audit history')
  check((await readRequests(db, a, 1)).requests.every(r => !('key' in r) && !('ipHash' in r) && !('history' in r)), 'List excludes private rate/idempotency metadata')
  const consult = { key: randomUUID(), courseId: ca.id, category: 'CONSULTATION', content: 'Fees?', name: 'Anonymous', email: 'learner9003@crm.invalid', phone: '', consent: true }
  await createRequest(db, consult, null, 'consult'); await createRequest(db, consult, null, 'consult')
  const anonymous = await db.crmRequest.findFirstOrThrow({ where: { content: 'Fees?' } })
  check(anonymous.userId === null && anonymous.contactId === null && anonymous.ownerId === a.id, 'Anonymous consultation never impersonates a matching login account')
  check((await readRequests(db, a, 1, 'NEW')).total === 1, 'Unlinked consultation appears in teacher inbox')
  const landing = await db.landingPage.create({ data: { slug: 'list-request-test', title: 'Landing', template: 'hero-cta', config: { crmCapture: true } } })
  const lead = { slug: landing.slug, name: 'Lead', email: 'lead-list@crm.invalid', phone: '', consent: true, message: 'General question' }
  await captureLead(db, lead, 'landing'); await captureLead(db, lead, 'landing')
  const general = await db.crmRequest.findFirstOrThrow({ where: { content: lead.message } })
  check(general.ownerId === null && await db.crmRequest.count({ where: { content: lead.message } }) === 1, 'Landing message enters admin queue once')
  check(!(await readRequests(db, a, 1)).requests.some(r => r.id === general.id), 'General landing request is private to admin')
  await updateRequest(db, admin, { id: general.id, version: 1, status: 'NEW', resolution: '', ownerId: a.id })
  const assigned = (await readRequests(db, a, 1)).requests.find(r => r.id === general.id)
  check(assigned?.ownerId === a.id && assigned.contactId === null, 'Admin can assign general request without exposing inaccessible canonical contact')
  await deny(() => updateRequest(db, a, { id: general.id, version: 2, status: 'NEW', resolution: '', ownerId: b.id }), 403)
  await deny(() => updateRequest(db, admin, { id: row.id, version: 3, status: 'RESOLVED', resolution: 'Explained', ownerId: b.id }), 403)
  const opp = await db.crmOpportunity.create({ data: { contactId: contact.id, title: 'Care', stage: 'NEW', amount: 20 } })
  const care = { action: 'care.update', contactId: contact.id, version: contact.version, note: 'New care', opportunity: { id: opp.id, version: 1, stage: 'PROPOSAL', lostReason: '' }, task: { title: 'Call', dueAt: '2026-10-02T09:00:00+07:00' } }
  const oldActivities = await db.crmActivity.count({ where: { contactId: contact.id } })
  await deny(() => writeCrm(db, a, crmCommand.parse({ ...care, opportunity: { ...care.opportunity, version: 999 } })), 409)
  check(await db.crmActivity.count({ where: { contactId: contact.id } }) === oldActivities && await db.crmTask.count({ where: { contactId: contact.id } }) === 0, 'Conflicting care rolls back note, task and pipeline together')
  await writeCrm(db, a, crmCommand.parse(care))
  check((await db.crmOpportunity.findUniqueOrThrow({ where: { id: opp.id } })).stage === 'PROPOSAL' && await db.crmTask.count({ where: { contactId: contact.id } }) === 1, 'Unified care saves pipeline and next task')
  await deny(() => writeCrm(db, a, crmCommand.parse(care)), 409)
  check(await db.crmTask.count({ where: { contactId: contact.id } }) === 1, 'Repeated stale care cannot duplicate reminders')
  const afterOld = await db.lessonProgress.findMany({ where: { enrollmentId: ea.id } })
  check(JSON.stringify(beforeOld) === JSON.stringify(afterOld), 'CRM leaves LMS completion and scores unchanged')
  await db.course.update({ where: { id: ca.id }, data: { teacherId: b.id } })
  check(!(await readRequests(db, a, 1)).requests.some(r => r.id === row.id || r.id === anonymous.id), 'Teacher reassignment revokes old course request access immediately')
  await deny(() => requestSource(db, a, row.id), 404)
  await deny(() => updateRequest(db, a, { id: row.id, version: 3, status: 'NEW', resolution: '' }), 409)
  const security = await db.$queryRaw<{ secured: boolean }[]>`SELECT c.relrowsecurity AND NOT has_table_privilege('anon', 'public."CrmRequest"', 'SELECT') AND NOT has_table_privilege('authenticated', 'public."CrmRequest"', 'INSERT') AS secured FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'CrmRequest'`
  check(security[0]?.secured, 'RLS enabled and browser roles have no Data API grants')
  check(await db.emailCampaignLog.count() === 0, 'No external messages sent')
  return n
}

async function main() {
  if (!process.argv.includes('--execute')) { console.log('Dry-run: apply request migration and test fake fixtures in empty disposable LOCAL DB only. No production writes.'); return }
  const url = new URL(process.env.CRM_TEST_URL || '')
  if (url.protocol !== 'postgresql:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || process.env.CRM_DISPOSABLE_TEST !== '1') throw new Error('Disposable local DB required.')
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  try {
    if (await db.user.count() || await db.crmContact.count() || await db.crmRequest.count()) throw new Error('Refusing existing data.')
    for (const [id, role] of [[0, 'ADMIN'], [101, 'TEACHER'], [102, 'INSTRUCTOR'], [103, 'STUDENT']] as const) await db.user.create({ data: { id, role, name: 'Test ' + id, email: 'test' + id + '@crm.invalid' } })
    console.log('Before: empty disposable fixtures.')
    console.log('PASS regression: ' + await testPhaseTwo(db) + ' phase 2; ' + await testPhaseThree(db) + ' phase 3; ' + await testStudents(db) + ' teacher/student assertions.')
    console.log('PASS: ' + await testNew(db) + ' list/request/care assertions.')
    console.log('After: requests=' + await db.crmRequest.count() + ', external messages=' + await db.emailCampaignLog.count())
  } finally { await db.$disconnect() }
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1 })
