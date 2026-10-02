/** Kiểm tra bằng dữ liệu giả trên PostgreSQL cục bộ rỗng. Mặc định dry-run. */
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { testPhaseTwo } from './test-crm-phase-two-db'
import { phaseThreeCommand, phaseThreeQuery, reportRange } from '../lib/crm/phase-three-validation'
import { automationSettings, readPhaseThree, runAutomation, writePhaseThree } from '../lib/crm/phase-three'
import { resolveCrmEmailRecipients } from '../lib/crm/email-recipients'
import { CrmError } from '../lib/crm/service'

export async function testPhaseThree(db: PrismaClient) {
  const admin = { id: 0, role: 'ADMIN', name: 'Test admin' }; const teacher = { id: 101, role: 'TEACHER', name: 'Teacher' }
  let assertions = 0
  const check = (value: unknown, message: string) => { assert.ok(value, message); assertions++ }
  const denied = async (work: () => Promise<unknown>, status: number) => { await assert.rejects(work, e => e instanceof CrmError && e.status === status); assertions++ }
  const command = (value: unknown) => phaseThreeCommand.parse(value)
  const write = (value: unknown) => writePhaseThree(db, admin, command(value))
  const query = (value: unknown) => phaseThreeQuery.parse(value)
  check(!phaseThreeQuery.safeParse({ view: 'reports', from: '2026-02-31' }).success, 'Invalid calendar date rejected')
  check(!phaseThreeQuery.safeParse({ view: 'reports', from: '2026-13-01' }).success, 'Invalid month rejected without throwing')
  check(reportRange('2026-10-01', '2026-10-01').gte.toISOString() === '2026-09-30T17:00:00.000Z', 'VN start converted once')
  check(reportRange('2026-10-01', '2026-10-01').lt.toISOString() === '2026-10-01T17:00:00.000Z', 'VN end exclusive')
  assert.throws(() => reportRange('2026-10-02', '2026-10-01')); assertions++
  assert.throws(() => reportRange('2024-01-01', '2026-10-01')); assertions++
  check((await automationSettings(db)).version === 0 && await db.crmAutomationSettings.count() === 0, 'Settings read does not write')
  check((await runAutomation(db)).dryRun && await db.crmAutomationEvent.count() === 0, 'Dry-run is default and rules off')
  await denied(() => readPhaseThree(db, { id: 103, role: 'STUDENT', name: 'Student' }, query({ view: 'reports' })), 403)
  await denied(() => writePhaseThree(db, teacher, command({ action: 'automation.preview' })), 403)
  const contact = await db.crmContact.create({ data: { name: 'Allowed', email: 'allowed@crm.invalid', source: 'Phase3', ownerId: 101, createdBy: 0 } })
  const blocked = await db.crmContact.create({ data: { name: 'Blocked', email: 'blocked@crm.invalid', source: 'Phase3', ownerId: 101, createdBy: 0, marketingEmailAllowed: true } })
  await db.emailBlacklist.create({ data: { email: 'BLOCKED@crm.invalid', reason: 'Test' } })
  const unapproved = await db.crmContact.create({ data: { name: 'Unapproved', email: 'unapproved@crm.invalid', source: 'Phase3', createdBy: 0 } })
  check(!unapproved.marketingEmailAllowed, 'Contact consent defaults false')
  await denied(() => writePhaseThree(db, teacher, command({ action: 'consent.set', contactId: contact.id, version: 1, allowed: true, note: 'Test' })), 403)
  await write({ action: 'consent.set', contactId: contact.id, version: 1, allowed: true, note: 'Explicit local fixture consent' })
  check((await db.crmContact.findUniqueOrThrow({ where: { id: contact.id } })).version === 2, 'Consent logs and increments version')
  await denied(() => write({ action: 'consent.set', contactId: contact.id, version: 1, allowed: false, note: 'Stale' }), 409)
  const filter = { source: 'Phase3' }
  type Segment = { recipients: { id: number }[]; excluded: number; token: string }
  const preview = () => write({ action: 'segment.preview', filter }) as Promise<Segment>
  const first = await preview()
  check(first.recipients.length === 1 && first.recipients[0].id === contact.id && first.excluded === 1, 'Consent and blacklist applied to preview')
  check(await db.emailCampaign.count() === 0, 'Preview creates no campaign')
  const draft = (token: string) => ({ action: 'campaign.draft', filter, token, title: 'CRM local test', subject: 'Test', body: '<script>not HTML</script>\nSecond line' })
  await denied(() => write(draft(first.token + 'bad')), 409)
  await db.crmContact.update({ where: { id: contact.id }, data: { version: { increment: 1 } } })
  await denied(() => write(draft(first.token)), 409)
  check(await db.emailCampaign.count() === 0, 'Stale snapshot fully rolls back')
  const second = await preview()
  await denied(() => writePhaseThree(db, { id: 102, role: 'ADMIN', name: 'Other actor' }, command(draft(second.token))), 409)
  const created = await write(draft(second.token)) as { campaignId: number }
  const campaign = await db.emailCampaign.findUniqueOrThrow({ where: { id: created.campaignId } })
  check(campaign.createdBy === 0 && campaign.status === 'DRAFT' && campaign.totalRecipients === 1, 'Root ID 0 creates draft only')
  check(campaign.htmlContent.includes('&lt;script&gt;') && !campaign.htmlContent.includes('<script>'), 'Draft escapes plain text')
  check(await db.emailCampaignLog.count() === 0 && await db.emailCampaignSender.count() === 0, 'No sender assignment or messages')
  const replay = await write(draft(second.token)) as { campaignId: number; reused: boolean }
  check(replay.reused && replay.campaignId === campaign.id && await db.emailCampaign.count() === 1, 'Draft replay is idempotent')
  check((await resolveCrmEmailRecipients(db, campaign.recipientCsvData!)).length === 1, 'Draft snapshot can resolve')
  await write({ action: 'consent.set', contactId: contact.id, version: 3, allowed: false, note: 'Fixture opt out' })
  check((await resolveCrmEmailRecipients(db, campaign.recipientCsvData!)).length === 0, 'Opt out after draft excludes from later sending')
  await db.crmContact.update({ where: { id: contact.id }, data: { marketingEmailAllowed: true, archived: true } })
  check((await resolveCrmEmailRecipients(db, campaign.recipientCsvData!)).length === 0, 'Archived recipient excluded after draft')
  await db.crmContact.update({ where: { id: contact.id }, data: { archived: false, email: 'changed-allowed@crm.invalid' } })
  check((await resolveCrmEmailRecipients(db, campaign.recipientCsvData!)).length === 0, 'Identity changes do not send to stale email')
  await db.crmContact.update({ where: { id: contact.id }, data: { email: 'allowed@crm.invalid' } })
  await db.user.create({ data: { id: 301, name: 'Website student', email: 'website301@crm.invalid', role: 'STUDENT' } })
  const linked = await db.crmContact.create({ data: { name: 'Linked', email: 'website301@crm.invalid', source: 'Phase3', ownerId: 101, createdBy: 0, linkedUserId: 301 } })
  const oldTaskContact = await db.crmContact.create({ data: { name: 'Has task', email: 'hastask@crm.invalid', source: 'Phase3', ownerId: 102, createdBy: 0 } })
  await db.crmTask.create({ data: { contactId: oldTaskContact.id, title: 'Existing task', dueAt: new Date(), createdBy: 0 } })
  const course = await db.course.create({ data: { id_khoa: 'PHASE3', name_lop: 'Phase three course', teacherId: 101 } })
  const opportunity = await db.crmOpportunity.create({ data: { contactId: linked.id, title: 'Local course', stage: 'PROPOSAL', amount: 5000, courseId: course.id } })
  await write({ action: 'settings.save', version: 0, lead: true, enrollment: true, payment: true })
  check((await runAutomation(db)).events === 0, 'Historical phase two fixtures not processed')
  await denied(() => write({ action: 'settings.save', version: 0, lead: false, enrollment: false, payment: false }), 409)
  const landing = await db.landingPage.findUniqueOrThrow({ where: { slug: 'crm-gift-test' } })
  const now = new Date()
  const addSubmission = (id: number, key: string, date = now) => db.crmSubmission.create({ data: { key, landingId: landing.id, contactId: id, ipHash: 'local', data: {}, createdAt: date } })
  await addSubmission(contact.id, 'phase3-form1'); await addSubmission(contact.id, 'phase3-form2'); await addSubmission(oldTaskContact.id, 'phase3-form3')
  await addSubmission(contact.id, 'phase3-historical', new Date('2000-01-01'))
  const enrollment = await db.enrollment.create({ data: { userId: 301, courseId: course.id, status: 'ACTIVE', createdAt: now } })
  const payment = await db.payment.create({ data: { enrollmentId: enrollment.id, amount: 5000, status: 'VERIFIED', verifiedAt: now } })
  const archived = await db.crmContact.create({ data: { name: 'Archived', email: 'archived@crm.invalid', source: 'Phase3', createdBy: 0, archived: true } })
  await addSubmission(archived.id, 'phase3-archived')
  await db.user.create({ data: { id: 302, name: 'Unlinked student', email: 'website302@crm.invalid', role: 'STUDENT' } })
  const unlinkedEnrollment = await db.enrollment.create({ data: { userId: 302, courseId: course.id, status: 'ACTIVE', createdAt: now } })
  await db.payment.create({ data: { enrollmentId: unlinkedEnrollment.id, amount: 9000, status: 'VERIFIED', verifiedAt: now } })
  type Auto = { token: string; rows: { key: string; createTask: boolean }[] }
  const auto = () => write({ action: 'automation.preview' }) as Promise<Auto>
  const planned = await auto()
  check(planned.rows.length === 5, 'Only new, linked, active and verified events planned')
  check(planned.rows.filter(r => r.createTask).length === 2, 'One task per customer; existing task preserved')
  const beforeTasks = await db.crmTask.count()
  const dry = await runAutomation(db)
  check(dry.dryRun && dry.tasks === 2 && await db.crmTask.count() === beforeTasks, 'Automation dry run has no writes')
  await db.payment.update({ where: { id: payment.id }, data: { status: 'PENDING' } })
  await denied(() => write({ action: 'automation.execute', token: planned.token }), 409)
  check(await db.crmAutomationEvent.count() === 0 && await db.crmTask.count() === beforeTasks, 'Changed event rolls back whole batch')
  await db.payment.update({ where: { id: payment.id }, data: { status: 'VERIFIED' } })
  const fresh = await auto()
  const result = await write({ action: 'automation.execute', token: fresh.token }) as { events: number; tasks: number }
  check(result.events === 5 && result.tasks === 2, 'Preview agrees with committed automation')
  check(await db.crmAutomationEvent.count() === 5 && await db.crmTask.count() === beforeTasks + 2, 'Unique events and task counts')
  check((await db.crmOpportunity.findUniqueOrThrow({ where: { id: opportunity.id } })).stage === 'PROPOSAL', 'Pipeline remains manual')
  check((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).amount === 5000 && (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status === 'VERIFIED', 'Payment not rewritten')
  check((await runAutomation(db, true)).events === 0, 'Repeated cron does not duplicate events')
  await denied(() => write({ action: 'automation.execute', token: fresh.token }), 409)
  await addSubmission(contact.id, 'phase3-later', new Date())
  const later = await runAutomation(db, true)
  check(later.events === 1 && later.tasks === 0, 'New event preserves task created by earlier run')
  const rem = await readPhaseThree(db, teacher, query({ view: 'reminders' })) as { tasks: { contactId: number }[] }
  check(rem.tasks.every(t => t.contactId !== oldTaskContact.id), 'Reminder list enforces ownership')
  const report = await readPhaseThree(db, teacher, query({ view: 'reports' })) as { verifiedAmount: number; sources: { label: string }[] }
  check(report.verifiedAmount === 5000, 'Reports exclude unlinked and other-owner payments')
  await denied(() => readPhaseThree(db, teacher, query({ view: 'consent', contactId: oldTaskContact.id })), 404)
  await denied(() => readPhaseThree(db, teacher, query({ view: 'settings' })), 403)
  await write({ action: 'settings.save', version: 1, lead: false, enrollment: false, payment: false })
  await addSubmission(contact.id, 'phase3-off', new Date())
  check((await runAutomation(db, true)).events === 0, 'Disabling rules stops processing')
  await db.crmSubmission.update({ where: { key: 'phase3-off' }, data: { createdAt: new Date(Date.now() - 60000) } })
  await write({ action: 'settings.save', version: 2, lead: true, enrollment: false, payment: false })
  check((await runAutomation(db)).events === 0, 'Reenable does not backfill disabled period')
  for (const table of ['CrmAutomationSettings', 'CrmAutomationEvent', 'CrmCampaignReceipt']) {
    const rows = await db.$queryRawUnsafe<{ allowed: boolean }[]>('SELECT has_table_privilege(\'anon\', \'"' + table + '"\', \'SELECT\') AS allowed')
    check(!rows[0].allowed, 'Anon cannot read ' + table)
  }
  check(await db.emailCampaignLog.count() === 0, 'Tests never send email')
  check(blocked.id !== contact.id, 'Fixtures isolated')
  return assertions
}

async function main() {
  if (!process.argv.includes('--execute')) { console.log('Dry-run: tests phase two + phase three on an empty disposable LOCAL PostgreSQL with all CRM migrations. No writes.'); return }
  const url = new URL(process.env.CRM_TEST_URL || '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol !== 'postgresql:' || process.env.CRM_DISPOSABLE_TEST !== '1') throw new Error('Requires explicitly disposable local PostgreSQL.')
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  try {
    if (await db.user.count() || await db.crmContact.count() || await db.payment.count()) throw new Error('Refusing a database with existing data.')
    process.env.AUTH_SECRET = 'disposable-crm-phase-three-test-only'
    console.log('Before: empty local fixtures. No external messages are sent.')
    for (const [id, role] of [[0, 'ADMIN'], [101, 'TEACHER'], [102, 'INSTRUCTOR'], [103, 'STUDENT']] as const) await db.user.create({ data: { id, role, name: 'Test ' + id, email: 'test-' + id + '@crm.invalid' } })
    console.log('PASS: ' + await testPhaseTwo(db) + ' phase two regression assertions; ' + await testPhaseThree(db) + ' phase three assertions.')
    console.log('After: fake contacts=' + await db.crmContact.count() + ', events=' + await db.crmAutomationEvent.count() + ', draft campaigns=' + await db.emailCampaign.count() + ', sent logs=' + await db.emailCampaignLog.count())
  } finally { await db.$disconnect() }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
