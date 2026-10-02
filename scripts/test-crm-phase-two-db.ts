import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { phaseTwoCommand, phaseTwoQuery, readPhaseTwo, writePhaseTwo } from '../lib/crm/phase-two'
import { captureLead } from '../lib/crm/intake'
import { crmCommand } from '../lib/crm/validation'
import { writeCrm, CrmError } from '../lib/crm/service'
import bcrypt from 'bcryptjs'

// Called only by the disposable local DB runner; never uses production env URLs.
export async function testPhaseTwo(db: PrismaClient) {
  process.env.AUTH_SECRET = 'disposable-crm-test-only'
  const admin = { id: 0, name: 'Admin', role: 'ADMIN' }; const teacher = { id: 101, name: 'A', role: 'TEACHER' }; const other = { id: 102, name: 'B', role: 'INSTRUCTOR' }
  let n = 0
  const check = (value: unknown, message: string) => { assert.ok(value, message); n++ }
  const denied = async (fn: () => Promise<unknown>, status: number) => { await assert.rejects(fn, error => error instanceof CrmError && error.status === status); n++ }
  const cmd = (value: unknown) => phaseTwoCommand.parse(value)
  const query = (value: unknown) => phaseTwoQuery.parse(value)
  type Preview = { token: string; counts: Record<string, number> }
  const csv = 'name,email,phone,source,needs,tags\nCSV A,csv-a@crm.invalid,,CSV,Nhu cầu,AI|AI\nCSV B,csv-b@crm.invalid,,CSV,,\nTrùng,csv-a@crm.invalid,,CSV,,'
  const before = await db.crmContact.count()
  const preview = await writePhaseTwo(db, admin, cmd({ action: 'import.preview', csv, ownerId: 101 })) as Preview
  check(preview.counts.CREATE === 2 && preview.counts.CONFLICT === 1 && await db.crmContact.count() === before, 'Import preview does not write and detects in-file duplicates')
  await denied(() => writePhaseTwo(db, teacher, cmd({ action: 'import.preview', csv, ownerId: 101 })), 403)
  await writePhaseTwo(db, admin, cmd({ action: 'import.execute', csv, ownerId: 101, token: preview.token }))
  check(await db.crmContact.count() === before + 2, 'Only valid preview rows inserted')
  await denied(() => writePhaseTwo(db, admin, cmd({ action: 'import.execute', csv, ownerId: 101, token: preview.token })), 409)
  const staleCsv = 'name,email\nStale,stale@crm.invalid'
  const stale = await writePhaseTwo(db, admin, cmd({ action: 'import.preview', csv: staleCsv, ownerId: 101 })) as Preview
  await denied(() => writePhaseTwo(db, admin, cmd({ action: 'import.execute', csv: staleCsv, ownerId: 102, token: stale.token })), 409)
  check(!await db.crmContact.findUnique({ where: { email: 'stale@crm.invalid' } }), 'Invalid confirmation rolls back all writes')
  const student = await db.user.create({ data: { id: 201, name: 'Learner', email: 'csv-a@crm.invalid' } })
  const learnerPreview = await writePhaseTwo(db, admin, cmd({ action: 'students.preview', userIds: [201], ownerId: 102 })) as Preview
  check(learnerPreview.counts.LINK === 1, 'Existing customer is linked without duplicate')
  await writePhaseTwo(db, admin, cmd({ action: 'students.execute', userIds: [201], ownerId: 102, token: learnerPreview.token }))
  const contact = await db.crmContact.findUniqueOrThrow({ where: { linkedUserId: 201 } })
  check(contact.ownerId === 101 && contact.needs === 'Nhu cầu', 'Student import preserves owner and existing needs')
  const course = await db.course.create({ data: { id_khoa: 'CRM-TEST', name_lop: 'AI test', teacherId: 101 } })
  const enrollment = await db.enrollment.create({ data: { userId: student.id, courseId: course.id } })
  await db.payment.create({ data: { enrollmentId: enrollment.id, amount: 500000, status: 'VERIFIED', verifiedAt: new Date() } })
  const website = await readPhaseTwo(db, teacher, query({ view: 'website', contactId: contact.id })) as { user: { id: number }; enrollments: { payment: { status: string } }[] }
  check(website.user.id === student.id && website.enrollments[0].payment.status === 'VERIFIED', 'Scoped profile shows live verified payment')
  await denied(() => readPhaseTwo(db, other, query({ view: 'website', contactId: contact.id })), 404)
  await denied(() => readPhaseTwo(db, teacher, query({ view: 'students', q: 'learner' })), 403)
  await denied(() => writePhaseTwo(db, admin, cmd({ action: 'identity.link', contactId: contact.id, version: contact.version, userId: 103 })), 409)
  await denied(() => writeCrm(db, teacher, crmCommand.parse({ action: 'contact.update', contactId: contact.id, version: contact.version, data: { name: contact.name, email: 'changed@crm.invalid', phone: '', source: contact.source, needs: contact.needs, tags: contact.tags, ownerId: 101, archived: false } })), 409)
  await writeCrm(db, teacher, crmCommand.parse({ action: 'opportunity.create', contactId: contact.id, data: { title: 'AI', stage: 'PROPOSAL', amount: 500000, lostReason: '', courseId: course.id } }))
  check((await db.crmOpportunity.findFirstOrThrow({ where: { contactId: contact.id } })).stage === 'PROPOSAL', 'Payment display does not automatically advance the consultation stage')
  const wrongCourse = await db.course.create({ data: { id_khoa: 'CRM-OTHER', name_lop: 'Other' } })
  await denied(() => writeCrm(db, teacher, crmCommand.parse({ action: 'opportunity.create', contactId: contact.id, data: { title: 'Other', stage: 'NEW', amount: 0, lostReason: '', courseId: wrongCourse.id } })), 400)
  await writePhaseTwo(db, admin, cmd({ action: 'identity.link', contactId: contact.id, version: contact.version, userId: null }))
  check((await db.crmOpportunity.findFirstOrThrow({ where: { contactId: contact.id } })).courseId === null, 'Unlink clears opportunity account references')
  const landing = await db.landingPage.create({ data: { slug: 'crm-gift-test', title: 'Gift', template: 'hero-cta', config: { accentColor: '#123456' } } })
  const lead = { slug: landing.slug, name: 'Lead', email: 'form@crm.invalid', phone: '', consent: true, utmSource: 'Facebook', utmCampaign: 'Gift', referral: 'unverified' }
  await denied(() => captureLead(db, lead, 'test-ip'), 404)
  await writePhaseTwo(db, admin, cmd({ action: 'capture.toggle', landingId: landing.id, updatedAt: landing.updatedAt.toISOString(), enabled: true }))
  const updatedLanding = await db.landingPage.findUniqueOrThrow({ where: { id: landing.id } })
  check((updatedLanding.config as Record<string, unknown>).accentColor === '#123456', 'Enabling capture preserves landing design config')
  await denied(() => writePhaseTwo(db, admin, cmd({ action: 'capture.toggle', landingId: landing.id, updatedAt: landing.updatedAt.toISOString(), enabled: false })), 409)
  await captureLead(db, lead, 'test-ip'); await captureLead(db, lead, 'test-ip')
  check(await db.crmSubmission.count() === 1 && await db.crmContact.count({ where: { email: lead.email } }) === 1, 'Repeated public form is idempotent')
  const publicContact = await db.crmContact.findUniqueOrThrow({ where: { email: lead.email } })
  check(publicContact.ownerId == null && publicContact.linkedUserId == null, 'Public inputs cannot assign owners or link login accounts')
  await captureLead(db, { ...lead, name: 'Impersonated' }, 'test-ip')
  check((await db.crmContact.findUniqueOrThrow({ where: { id: publicContact.id } })).name === 'Lead', 'Public submission cannot overwrite existing contact')
  const phoneOwner = await db.crmContact.create({ data: { name: 'Phone owner', phone: '+84909876543', source: 'Test', createdBy: 0 } })
  await captureLead(db, { ...lead, phone: '0909876543' }, 'test-ip')
  const conflict = await db.crmSubmission.findFirstOrThrow({ where: { status: 'CONFLICT' } })
  check(conflict.contactId === null && await db.crmContact.count({ where: { email: lead.email } }) === 1, 'Cross-contact identity conflicts go to review without merging')
  await writePhaseTwo(db, admin, cmd({ action: 'submission.resolve', id: conflict.id, contactId: phoneOwner.id }))
  check((await db.crmContact.findUniqueOrThrow({ where: { id: phoneOwner.id } })).email === null, 'Review does not overwrite identity')
  const submissionCount = await db.crmSubmission.count()
  await captureLead(db, { ...lead, email: 'bot@crm.invalid', website: 'spam' }, 'test-ip')
  check(await db.crmSubmission.count() === submissionCount, 'Honeypot writes nothing')
  const grants = await db.$queryRawUnsafe<{ allowed: boolean }[]>('SELECT has_table_privilege(\'anon\', \'"CrmSubmission"\', \'SELECT\') AS allowed')
  check(!grants[0].allowed, 'Public role cannot read submission data')
  check(await db.payment.count() === 1 && (await db.payment.findUniqueOrThrow({ where: { enrollmentId: enrollment.id } })).status === 'VERIFIED', 'CRM operations leave payment data unchanged')
  return n
}

async function localMain() {
  if (!process.argv.includes('--execute')) { console.log('Dry-run: requires an empty, prepared, disposable LOCAL database; inserts fake fixtures and tests phase two. No writes.'); return }
  const url = new URL(process.env.CRM_TEST_URL || '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || process.env.CRM_DISPOSABLE_TEST !== '1') throw new Error('Requires explicitly disposable LOCAL PostgreSQL.')
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  try {
    if (await db.user.count() || await db.crmContact.count() || await db.payment.count()) throw new Error('Fixtures must be empty; refusing to modify existing data.')
    for (const [id, role] of [[0, 'ADMIN'], [101, 'TEACHER'], [102, 'INSTRUCTOR'], [103, 'STUDENT']] as const) await db.user.create({ data: { id, role, name: 'Test ' + id, email: 'test-' + id + '@crm.invalid', emailVerified: new Date(), passwordChanged: true, password: await bcrypt.hash('LocalTest!2026', 10) } })
    console.log('PASS: ' + await testPhaseTwo(db) + ' phase two DB assertions.')
  } finally { await db.$disconnect() }
}
if (require.main === module) localMain().catch(error => { console.error(error); process.exitCode = 1 })
