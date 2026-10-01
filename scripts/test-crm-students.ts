/** Chỉ chạy trên PostgreSQL cục bộ rỗng, dùng dữ liệu giả. Mặc định dry-run. */
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { studentCommand, studentPlan, studentSettings, syncStudents, writeStudents } from '../lib/crm/students'
import { crmCommand, crmQuery } from '../lib/crm/validation'
import { CrmError, readCrm, writeCrm } from '../lib/crm/service'
import { phaseTwoCommand, phaseTwoQuery, readPhaseTwo, writePhaseTwo } from '../lib/crm/phase-two'
import { phaseThreeQuery, reportRange } from '../lib/crm/phase-three-validation'
import { readPhaseThree } from '../lib/crm/phase-three'
import { testPhaseTwo } from './test-crm-phase-two-db'
import { testPhaseThree } from './test-crm-phase-three'

export async function testStudents(db: PrismaClient) {
  process.env.AUTH_SECRET = 'disposable-crm-students-only'
  const admin = { id: 0, role: 'ADMIN', name: 'Admin' }
  const a = { id: 101, role: 'TEACHER', name: 'A' }; const b = { id: 102, role: 'INSTRUCTOR', name: 'B' }
  let assertions = 0
  const check = (value: unknown, message: string) => { assert.ok(value, message); assertions++ }
  const denied = async (work: () => Promise<unknown>, status: number) => { await assert.rejects(work, e => e instanceof CrmError && e.status === status); assertions++ }
  const write = (value: unknown) => writeStudents(db, admin, studentCommand.parse(value))
  await db.user.createMany({ data: [501, 502, 503, 504, ...Array.from({ length: 105 }, (_, i) => 600 + i)].map(id => ({ id, name: 'Student ' + id, email: 'student' + id + '@crm.invalid', phone: id === 501 ? '0901234567' : null })) })
  const ca = await db.course.create({ data: { id_khoa: 'STUDENT-A1', name_lop: 'A1', teacherId: a.id } })
  const ca2 = await db.course.create({ data: { id_khoa: 'STUDENT-A2', name_lop: 'A2', teacherId: a.id } })
  const cb = await db.course.create({ data: { id_khoa: 'STUDENT-B', name_lop: 'B', teacherId: b.id } })
  const unowned = await db.course.create({ data: { id_khoa: 'STUDENT-NONE', name_lop: 'Unowned' } })
  const ea = await db.enrollment.create({ data: { userId: 501, courseId: ca.id, status: 'PENDING' } })
  await db.enrollment.create({ data: { userId: 501, courseId: ca2.id, status: 'ACTIVE' } })
  const eb = await db.enrollment.create({ data: { userId: 501, courseId: cb.id, status: 'ACTIVE' } })
  await db.enrollment.createMany({ data: [{ userId: 503, courseId: cb.id }, { userId: 504, courseId: unowned.id }, ...Array.from({ length: 105 }, (_, i) => ({ userId: 600 + i, courseId: ca.id }))] })
  await db.payment.createMany({ data: [{ enrollmentId: ea.id, amount: 600, status: 'VERIFIED', verifiedAt: new Date() }, { enrollmentId: eb.id, amount: 900, status: 'VERIFIED', verifiedAt: new Date() }] })
  const canonical = await db.crmContact.create({ data: { name: 'Old manual', email: 'student501@crm.invalid', linkedUserId: 501, ownerId: b.id, source: 'Manual', needs: 'Keep', createdBy: 0 } })
  const legacyFingerprint = () => db.$queryRaw<{ table_name: string; fingerprint: string }[]>`SELECT 'Enrollment' AS table_name, md5(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id)) AS fingerprint FROM public."Enrollment" t UNION ALL SELECT 'Payment', md5(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id)) FROM public."Payment" t UNION ALL SELECT 'User', md5(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id)) FROM public."User" t UNION ALL SELECT 'Course', md5(string_agg(md5(to_jsonb(t)::text), '' ORDER BY t.id)) FROM public."Course" t`
  const before = await legacyFingerprint(); const beforeContacts = await db.crmContact.count()
  check(!await studentSettings(db), 'Off by default')
  const dry = await syncStudents(db, a)
  check('dryRun' in dry && dry.dryRun && await db.crmContact.count() === beforeContacts, 'Default dry run writes nothing')
  const off = await syncStudents(db, a, true)
  check(!off.enabled && await db.crmContact.count() === beforeContacts, 'Sync cannot implicitly enable the rule')
  await denied(() => writeStudents(db, a, studentCommand.parse({ action: 'preview' })), 403)
  await denied(() => syncStudents(db, { id: 502, role: 'STUDENT', name: 'Student' }), 403)
  const first = await write({ action: 'preview' }) as { token: string; counts: { missing: number }; rows: unknown[] }
  check(first.rows.length === 100 && first.counts.missing > 100 && await db.crmContact.count() === beforeContacts, 'Preview is bounded and leaves old data untouched')
  await denied(() => write({ action: 'enable', token: first.token + 'bad' }), 409)
  const enabled = await write({ action: 'enable', token: first.token })
  check('created' in enabled && enabled.created === 100 && await studentSettings(db), 'Enable creates only first reviewed batch')
  await denied(() => write({ action: 'enable', token: first.token }), 409)
  const bBefore = await db.crmContact.count({ where: { studentProfile: true, ownerId: b.id } })
  await syncStudents(db, a, true)
  check(await db.crmContact.count({ where: { studentProfile: true, ownerId: b.id } }) === bBefore, 'Teacher sync cannot create profiles for other teachers')
  await syncStudents(db, b, true)
  while ((await studentPlan(db)).counts.missing) await syncStudents(db, admin, true)
  const repeated = await syncStudents(db, admin, true)
  check('created' in repeated && repeated.created === 0, 'Repeated sync is idempotent')
  check(await db.crmContact.count({ where: { studentUserId: 501 } }) === 2, 'Multi-course learner has one private profile per teacher')
  check(await db.crmContact.count({ where: { studentUserId: 502 } }) === 0, 'Account registration alone does not enter teacher CRM')
  check(await db.crmContact.count({ where: { studentUserId: 504 } }) === 0, 'Course without teacher does not grant access')
  check(JSON.stringify(await legacyFingerprint()) === JSON.stringify(before), 'Old account, course, registration and payment rows unchanged')
  const preserved = await db.crmContact.findUniqueOrThrow({ where: { id: canonical.id } })
  check(preserved.ownerId === b.id && preserved.needs === 'Keep' && preserved.version === 1, 'Existing manual owner and notes preserved')
  const pa = await db.crmContact.findUniqueOrThrow({ where: { ownerId_studentUserId: { ownerId: a.id, studentUserId: 501 } } })
  const pb = await db.crmContact.findUniqueOrThrow({ where: { ownerId_studentUserId: { ownerId: b.id, studentUserId: 501 } } })
  check(pa.email === null && pb.phone === null && !pa.marketingEmailAllowed, 'Identity remains on website; no implicit marketing consent')
  const detail = await readCrm(db, a, crmQuery.parse({ view: 'detail', id: pa.id })) as { contact: { email: string; phone: string } }
  check(detail.contact.email === 'student501@crm.invalid' && detail.contact.phone === '+84901234567', 'Teacher sees current normalized website identity')
  await denied(() => readCrm(db, a, crmQuery.parse({ view: 'detail', id: pb.id })), 404)
  const list = await readCrm(db, a, crmQuery.parse({ q: 'student501@crm.invalid' })) as { contacts: { id: number }[] }
  check(list.contacts.length === 1 && list.contacts[0].id === pa.id, 'Identity search preserves authorization OR filters')
  const website = await readPhaseTwo(db, a, phaseTwoQuery.parse({ view: 'website', contactId: pa.id })) as { total: number; enrollments: { course: { id: number } }[] }
  check(website.total === 2 && website.enrollments.every(e => e.course.id !== cb.id), 'Courses and count exclude other teacher')
  const adminWebsite = await readPhaseTwo(db, admin, phaseTwoQuery.parse({ view: 'website', contactId: pa.id })) as { total: number }
  check(adminWebsite.total === 2, 'Admin opens private profile in its teacher context')
  const data = { name: pa.name, email: detail.contact.email, phone: detail.contact.phone, source: pa.source, needs: 'Needs A', tags: [], ownerId: a.id, archived: false }
  await writeCrm(db, a, crmCommand.parse({ action: 'contact.update', contactId: pa.id, version: 1, data }))
  await denied(() => writeCrm(db, admin, crmCommand.parse({ action: 'contact.update', contactId: pa.id, version: 2, data: { ...data, ownerId: b.id } })), 409)
  await denied(() => writePhaseTwo(db, admin, phaseTwoCommand.parse({ action: 'identity.link', contactId: pa.id, version: 2, userId: null })), 409)
  await writeCrm(db, a, crmCommand.parse({ action: 'activity.create', contactId: pa.id, type: 'NOTE', content: 'Private A' }))
  const bDetail = await readCrm(db, b, crmQuery.parse({ view: 'detail', id: pb.id })) as { contact: { activities: { content: string }[] } }
  check(!bDetail.contact.activities.some(item => item.content === 'Private A'), 'Private notes are isolated')
  await denied(() => writeCrm(db, a, crmCommand.parse({ action: 'opportunity.create', contactId: pa.id, data: { title: 'Wrong', stage: 'NEW', amount: 0, lostReason: '', courseId: cb.id } })), 400)
  await writeCrm(db, a, crmCommand.parse({ action: 'opportunity.create', contactId: pa.id, data: { title: 'Keep proposal', stage: 'PROPOSAL', amount: 600, lostReason: '', courseId: ca.id } }))
  await writeCrm(db, a, crmCommand.parse({ action: 'task.create', contactId: pa.id, title: 'Private A task', dueAt: new Date().toISOString() }))
  await syncStudents(db, admin, true)
  check((await db.crmOpportunity.findFirstOrThrow({ where: { contactId: pa.id } })).stage === 'PROPOSAL', 'Sync preserves manual pipeline')
  const bTasks = await readCrm(db, b, crmQuery.parse({ view: 'tasks' })) as { tasks: { contactId: number }[] }
  check(!bTasks.tasks.some(t => t.contactId === pa.id), 'Tasks remain private')
  const report = await readPhaseThree(db, a, phaseThreeQuery.parse({ view: 'reports' })) as { verifiedAmount: number }
  const range = reportRange()
  const expected = await db.payment.aggregate({ where: { status: 'VERIFIED', verifiedAt: { gte: range.gte, lt: range.lt }, enrollment: { course: { teacherId: a.id } } }, _sum: { amount: true } })
  check(report.verifiedAmount === expected._sum.amount, 'Teacher report includes their students without duplicating payments across profiles')
  await db.crmContact.update({ where: { id: pa.id }, data: { archived: true } })
  await syncStudents(db, admin, true)
  check(await db.crmContact.count({ where: { studentUserId: 501, ownerId: a.id } }) === 1 && (await db.crmContact.findUniqueOrThrow({ where: { id: pa.id } })).archived, 'Archived profile is never recreated or restored automatically')
  await db.crmContact.update({ where: { id: pa.id }, data: { archived: false } })
  await db.course.updateMany({ where: { id: { in: [ca.id, ca2.id] } }, data: { teacherId: b.id } })
  await denied(() => readCrm(db, a, crmQuery.parse({ view: 'detail', id: pa.id })), 404)
  await denied(() => writeCrm(db, a, crmCommand.parse({ action: 'activity.create', contactId: pa.id, type: 'NOTE', content: 'Revoked' })), 404)
  const revoked = await readCrm(db, a, crmQuery.parse({ q: 'student501@crm.invalid' })) as { contacts: unknown[] }
  check(revoked.contacts.length === 0, 'Search cannot bypass revoked teaching rights')
  const changedPreview = await write({ action: 'preview' }) as { token: string }
  await db.enrollment.create({ data: { userId: 502, courseId: cb.id } })
  await denied(() => write({ action: 'enable', token: changedPreview.token }), 409)
  await write({ action: 'disable' })
  const pausedCount = await db.crmContact.count()
  await syncStudents(db, admin, true)
  check(await db.crmContact.count() === pausedCount, 'Disable prevents new synchronization and preserves history')
  check(await db.emailCampaignLog.count() === 0, 'No external messages sent')
  return assertions
}

async function main() {
  if (!process.argv.includes('--execute')) { console.log('Dry-run: fake student/teacher tests require an empty disposable LOCAL PostgreSQL. No database writes.'); return }
  const url = new URL(process.env.CRM_TEST_URL || '')
  if (url.protocol !== 'postgresql:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || process.env.CRM_DISPOSABLE_TEST !== '1') throw new Error('Requires explicitly disposable local PostgreSQL.')
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  try {
    if (await db.user.count() || await db.crmContact.count() || await db.payment.count()) throw new Error('Refusing database containing existing records.')
    for (const [id, role] of [[0, 'ADMIN'], [101, 'TEACHER'], [102, 'INSTRUCTOR'], [103, 'STUDENT']] as const) await db.user.create({ data: { id, role, name: 'Test ' + id, email: 'test' + id + '@crm.invalid' } })
    console.log('Before: empty disposable local fixtures.')
    if (process.argv.includes('--regression')) console.log('PASS: ' + await testPhaseTwo(db) + ' phase two; ' + await testPhaseThree(db) + ' phase three regressions.')
    console.log('PASS: ' + await testStudents(db) + ' teacher/student assertions.')
    console.log('After: fake profiles=' + await db.crmContact.count({ where: { studentProfile: true } }) + ', sent messages=' + await db.emailCampaignLog.count())
  } finally { await db.$disconnect() }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
