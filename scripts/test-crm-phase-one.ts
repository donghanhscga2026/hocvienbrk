/**
 * Integration test with disposable LOCAL PostgreSQL only.
 * Default is dry-run. Run with --execute and CRM_TEST_URL pointing to localhost.
 * A separate database is created for this run; no production URL is read.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { crmCommand, crmQuery } from '../lib/crm/validation'
import { CrmError, readCrm, writeCrm } from '../lib/crm/service'
import { canAccessContact, CrmActor, vietnamDayBounds, vietnamInputToIso } from '../lib/crm/shared'

async function main() {
  if (!process.argv.includes('--execute')) {
    console.log('Dry-run: creates a disposable LOCAL database, applies baseline + CRM migration, and tests CRUD, ownership, conflicts, dates, RLS and transaction rollback. No data written.')
    return
  }
  const url = new URL(process.env.CRM_TEST_URL || '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol !== 'postgresql:') throw new Error('CRM_TEST_URL must be a local PostgreSQL URL.')
  const databaseName = 'crm_phase1_test_' + Date.now()
  const adminDb = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  url.pathname = '/' + databaseName
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } })
  const temp = mkdtempSync(join(tmpdir(), 'crm-test-'))
  let assertions = 0
  const check = (value: unknown, message: string) => { assert.ok(value, message); assertions++ }
  const denied = async (operation: () => Promise<unknown>, status: number) => {
    await assert.rejects(operation, error => error instanceof CrmError && error.status === status); assertions++
  }
  try {
    await adminDb.$executeRawUnsafe('CREATE DATABASE "' + databaseName + '"')
    // Extract the pristine baseline from the backup ref; never change the project schema.
    const baseline = execFileSync('git', ['show', 'backup/pre-crm-phase-1-2026-09-30:prisma/schema.prisma'], { encoding: 'utf8' })
    const baselinePath = join(temp, 'before.prisma')
    writeFileSync(baselinePath, baseline, 'utf8')
    const env = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() }
    execFileSync('npx', ['prisma', 'db', 'push', '--schema', baselinePath, '--skip-generate'], { env, stdio: 'pipe' })
    // Simulate Supabase's broad legacy defaults, then verify CRM overrides them.
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const found = await adminDb.$queryRawUnsafe<{ rolname: string }[]>('SELECT rolname FROM pg_roles WHERE rolname = $1', role)
      if (!found.length) await adminDb.$executeRawUnsafe('CREATE ROLE "' + role + '" NOLOGIN')
      await db.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO "' + role + '"')
      await db.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES GRANT ALL ON SEQUENCES TO "' + role + '"')
    }
    execFileSync('npx', ['prisma', 'db', 'execute', '--url', url.toString(), '--file', 'prisma/migrations/20260930110000_crm_phase_one/migration.sql'], { env, stdio: 'pipe' })
    const drift = execFileSync('npx', ['prisma', 'migrate', 'diff', '--from-url', url.toString(), '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { env, encoding: 'utf8' })
    check(drift.includes('This is an empty migration'), 'Migration must match Prisma schema without drift')
    console.log('Before test: contacts=' + await db.crmContact.count() + ', tasks=' + await db.crmTask.count())
    for (const user of [
      { id: 0, name: 'Root test', email: 'root@crm.invalid', role: 'ADMIN' as const },
      { id: 101, name: 'Teacher A', email: 'teacher-a@crm.invalid', role: 'TEACHER' as const },
      { id: 102, name: 'Teacher B', email: 'teacher-b@crm.invalid', role: 'INSTRUCTOR' as const },
      { id: 103, name: 'Student', email: 'student@crm.invalid', role: 'STUDENT' as const },
    ]) await db.user.create({ data: { ...user, password: await bcrypt.hash('CrmPreview!2026', 10), emailVerified: new Date(), passwordChanged: true } })
    const admin: CrmActor = { id: 0, name: 'Root', role: 'ADMIN' }
    const teacher: CrmActor = { id: 101, name: 'Teacher A', role: 'TEACHER' }
    const other: CrmActor = { id: 102, name: 'Teacher B', role: 'INSTRUCTOR' }
    const student: CrmActor = { id: 103, name: 'Student', role: 'STUDENT' }
    const command = (raw: unknown) => crmCommand.parse(raw)
    const data = { name: 'Khách test', email: ' CLIENT@CRM.INVALID ', phone: '0901234567', source: 'Nhập tay', needs: 'Cần học AI', tags: ['AI', 'AI'], ownerId: 101, archived: false }
    const created = await writeCrm(db, admin, command({ action: 'contact.create', data }))
    const contactId = created.contactId
    const contact = await db.crmContact.findUniqueOrThrow({ where: { id: contactId } })
    check(contact.email === 'client@crm.invalid' && contact.phone === '+84901234567' && contact.tags.length === 1, 'Normalize contact identity and deduplicate tags')
    check(canAccessContact(admin, null) && canAccessContact(teacher, 101) && !canAccessContact(other, 101) && !canAccessContact(student, 103), 'Role policy including root ID zero')
    check(!crmCommand.safeParse({ action: 'contact.create', data: { ...data, email: '', phone: '' } }).success, 'Contact requires a usable identity')
    check(!crmCommand.safeParse({ action: 'contact.create', data: { ...data, phone: 'bad' } }).success, 'Invalid phone rejected')
    check(!crmCommand.safeParse({ action: 'opportunity.create', contactId, data: { title: 'Lost', stage: 'LOST', amount: 0, lostReason: '' } }).success, 'Lost opportunity requires a reason')
    await assert.rejects(() => writeCrm(db, admin, command({ action: 'contact.create', data })), error => (error as { code?: string }).code === 'P2002'); assertions++
    await denied(() => readCrm(db, other, crmQuery.parse({ view: 'detail', id: contactId })), 404)
    await denied(() => readCrm(db, student, crmQuery.parse({})), 403)
    await denied(() => writeCrm(db, other, command({ action: 'activity.create', contactId, type: 'NOTE', content: 'Forbidden' })), 404)
    await denied(() => writeCrm(db, teacher, command({ action: 'contact.create', data: { ...data, email: 'other@crm.invalid', phone: '', ownerId: 102 } })), 403)
    await denied(() => writeCrm(db, admin, command({ action: 'contact.create', data: { ...data, email: 'student-owner@crm.invalid', phone: '', ownerId: 103 } })), 400)
    const found = await readCrm(db, teacher, crmQuery.parse({ q: '0901234567', ownerId: 102 })) as { contacts: { id: number }[] }
    check(found.contacts.length === 1 && found.contacts[0].id === contactId, 'Local phone search works and client cannot widen owner scope')
    const hidden = await readCrm(db, other, crmQuery.parse({ ownerId: 101 })) as { total: number }
    check(hidden.total === 0, 'Other owner cannot list contact even with forged owner filter')
    await writeCrm(db, teacher, command({ action: 'activity.create', contactId, type: 'CALL', content: 'Đã gọi, khách cần xem lịch.' }))
    check(!!(await db.crmContact.findUniqueOrThrow({ where: { id: contactId } })).lastContactAt, 'Calls update last-contact time')
    const oppData = { title: 'Khóa AI', stage: 'QUALIFIED', amount: 1000000, lostReason: '' }
    await writeCrm(db, teacher, command({ action: 'opportunity.create', contactId, data: oppData }))
    const opp = await db.crmOpportunity.findFirstOrThrow({ where: { contactId } })
    const { end } = vietnamDayBounds()
    await writeCrm(db, teacher, command({ action: 'task.create', contactId, title: 'Việc quá hạn', dueAt: new Date(Date.now() - 60000).toISOString() }))
    await writeCrm(db, teacher, command({ action: 'task.create', contactId, title: 'Việc hôm nay', dueAt: new Date(end.getTime() - 1000).toISOString() }))
    const task = await db.crmTask.findFirstOrThrow({ where: { contactId } })
    const overview = await readCrm(db, teacher, crmQuery.parse({ view: 'tasks' })) as { stats: { overdue: number; today: number; unscheduled: number } }
    check(overview.stats.overdue === 1 && overview.stats.today >= 1 && overview.stats.unscheduled === 0, 'Due and overdue counts use Vietnamese day boundaries')
    const otherTasks = await readCrm(db, other, crmQuery.parse({ view: 'tasks' })) as { total: number; stats: { today: number } }
    check(otherTasks.total === 0 && otherTasks.stats.today === 0, 'Task list and stats enforce owner scope')
    await writeCrm(db, teacher, command({ action: 'task.toggle', contactId, taskId: task.id, completed: true }))
    const activityCount = await db.crmActivity.count()
    await writeCrm(db, teacher, command({ action: 'task.toggle', contactId, taskId: task.id, completed: true }))
    check(activityCount === await db.crmActivity.count(), 'Repeating completion does not duplicate timeline')
    await writeCrm(db, teacher, command({ action: 'opportunity.update', contactId, opportunityId: opp.id, version: 1, data: { ...oppData, stage: 'PROPOSAL' } }))
    await denied(() => writeCrm(db, teacher, command({ action: 'opportunity.update', contactId, opportunityId: opp.id, version: 1, data: oppData })), 409)
    await denied(() => writeCrm(db, teacher, command({ action: 'task.toggle', contactId, taskId: 999999, completed: true })), 404)
    // A second contact tests cross-contact ID injection against children.
    const second = await writeCrm(db, teacher, command({ action: 'contact.create', data: { ...data, email: 'second@crm.invalid', phone: '' } }))
    await denied(() => writeCrm(db, teacher, command({ action: 'opportunity.update', contactId: second.contactId, opportunityId: opp.id, version: 2, data: oppData })), 404)
    await denied(() => writeCrm(db, teacher, command({ action: 'task.toggle', contactId: second.contactId, taskId: task.id, completed: true })), 404)
    // Assignment cannot be changed by caregivers; failed transactions retain old ownership.
    await denied(() => writeCrm(db, teacher, command({ action: 'contact.update', contactId, version: 1, data: { ...data, ownerId: 102 } })), 403)
    check((await db.crmContact.findUniqueOrThrow({ where: { id: contactId } })).version === 1, 'Failed reassignment rolls back contact changes')
    await writeCrm(db, admin, command({ action: 'contact.update', contactId, version: 1, data: { ...data, ownerId: 102 } }))
    await denied(() => writeCrm(db, teacher, command({ action: 'activity.create', contactId, type: 'NOTE', content: 'Former owner' })), 404)
    await denied(() => writeCrm(db, admin, command({ action: 'contact.update', contactId, version: 1, data })), 409)
    await writeCrm(db, admin, command({ action: 'contact.update', contactId, version: 2, data: { ...data, ownerId: 102, archived: true } }))
    await denied(() => writeCrm(db, other, command({ action: 'activity.create', contactId, type: 'NOTE', content: 'Archived' })), 400)
    const archivedTasks = await readCrm(db, other, crmQuery.parse({ view: 'tasks' })) as { total: number }
    check(archivedTasks.total === 0, 'Archived contacts excluded from active task dashboard')
    await writeCrm(db, admin, command({ action: 'contact.update', contactId, version: 3, data: { ...data, ownerId: 102, archived: false } }))
    check(vietnamInputToIso('2026-10-02T15:00') === '2026-10-02T08:00:00.000Z', 'Wall-clock reminder converts to UTC once')
    const boundary = vietnamDayBounds(new Date('2026-09-30T17:01:00Z'))
    check(boundary.start.toISOString() === '2026-09-30T17:00:00.000Z', 'Vietnam midnight crosses UTC date correctly')
    const grants = await db.$queryRawUnsafe<{ allowed: boolean }[]>('SELECT has_table_privilege(\'anon\', \'"CrmContact"\', \'SELECT\') AS allowed')
    check(!grants[0].allowed, 'Anonymous REST users cannot read private CRM tables')
    const rls = await db.$queryRawUnsafe<{ relrowsecurity: boolean }[]>('SELECT relrowsecurity FROM pg_class WHERE relname = \'CrmContact\'')
    check(rls[0].relrowsecurity, 'CRM RLS enabled')
    const concurrent = await Promise.allSettled([
      writeCrm(db, other, command({ action: 'contact.update', contactId, version: 4, data: { ...data, ownerId: 102, name: 'Update A' } })),
      writeCrm(db, other, command({ action: 'contact.update', contactId, version: 4, data: { ...data, ownerId: 102, name: 'Update B' } })),
    ])
    check(concurrent.filter(item => item.status === 'fulfilled').length === 1 && concurrent.filter(item => item.status === 'rejected').length === 1, 'Concurrent edits cannot silently overwrite each other')
    console.log('After test: contacts=' + await db.crmContact.count() + ', opportunities=' + await db.crmOpportunity.count() + ', tasks=' + await db.crmTask.count())
    console.log('PASS: ' + assertions + ' integration assertions, migration matches schema.')
  } finally {
    await db.$disconnect()
    if (process.argv.includes('--keep')) console.log('Local preview database: ' + databaseName)
    else await adminDb.$executeRawUnsafe('DROP DATABASE IF EXISTS "' + databaseName + '" WITH (FORCE)')
    await adminDb.$disconnect()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
