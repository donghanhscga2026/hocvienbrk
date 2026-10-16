/* Read-only by default. Review the JSON plan, then explicitly pass both
 * --execute and --expect-digest=<digest> to apply exactly that reviewed plan.
 * No enum removal: older deployments must still be able to read existing data.
 */
const { createHash } = require('node:crypto')
const canonical = role => role === 'INSTRUCTOR' ? 'TEACHER' : role
const canonicalList = roles => [...new Set(roles.map(canonical))]

async function planConversion(db) {
  const [users, stagedUsers, tools, guides, admin26] = await Promise.all([
    db.user.findMany({ where: { role: 'INSTRUCTOR' }, select: { id: true, role: true }, orderBy: { id: 'asc' } }),
    db.userTest.findMany({ where: { role: 'INSTRUCTOR' }, select: { id: true, role: true }, orderBy: { id: 'asc' } }),
    db.tool.findMany({ where: { roles: { has: 'INSTRUCTOR' } }, select: { id: true, roles: true }, orderBy: { id: 'asc' } }),
    db.assistantGuide.findMany({ where: { roles: { has: 'INSTRUCTOR' } }, select: { id: true, roles: true }, orderBy: { id: 'asc' } }),
    db.user.findUnique({ where: { id: 26 }, select: { id: true, role: true } }),
  ])
  const plan = {
    users: users.filter(row => row.id !== 26).map(row => ({ ...row, next: 'TEACHER' })),
    stagedUsers: stagedUsers.map(row => ({ ...row, next: 'TEACHER' })),
    tools: tools.map(row => ({ ...row, next: canonicalList(row.roles) })),
    guides: guides.map(row => ({ ...row, next: canonicalList(row.roles) })),
    admin26: admin26 ? { ...admin26, next: 'ADMIN' } : null,
  }
  return { ...plan, digest: createHash('sha256').update(JSON.stringify(plan)).digest('hex') }
}

async function convert(db, { execute = false, expectedDigest } = {}) {
  if (!execute) return { mode: 'dry-run', before: await planConversion(db) }
  return db.$transaction(async tx => {
    const before = await planConversion(tx)
    if (!expectedDigest || before.digest !== expectedDigest) throw Error('Plan changed or no approved digest. Run dry-run and review again.')
    for (const [key, model] of [['users', 'user'], ['stagedUsers', 'userTest']]) {
      for (const row of before[key]) await tx[model].update({ where: { id: row.id }, data: { role: row.next } })
    }
    for (const [key, model] of [['tools', 'tool'], ['guides', 'assistantGuide']]) {
      for (const row of before[key]) await tx[model].update({ where: { id: row.id }, data: { roles: row.next } })
    }
    if (before.admin26 && before.admin26.role !== 'ADMIN') await tx.user.update({ where: { id: 26 }, data: { role: 'ADMIN' } })
    return { mode: 'executed', before, after: await planConversion(tx) }
  }, { isolationLevel: 'Serializable', timeout: 30000 })
}

if (require.main === module) {
  require('dotenv').config({ quiet: true })
  const { PrismaClient } = require('@prisma/client')
  const db = new PrismaClient()
  const expectedDigest = process.argv.find(arg => arg.startsWith('--expect-digest='))?.split('=')[1]
  convert(db, { execute: process.argv.includes('--execute'), expectedDigest })
    .then(report => console.log(JSON.stringify(report, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1 })
    .finally(() => db.$disconnect())
}
module.exports = { planConversion, convert }
