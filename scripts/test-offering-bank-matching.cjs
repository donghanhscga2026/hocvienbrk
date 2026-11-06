// Actual SePay handler; isolated account/transaction fixtures, no live bank or DB.
const assert = require('node:assert/strict'), { createHash } = require('node:crypto')
const load = require('./helpers/load-ts.cjs')
async function run() {
  let pending = [], transactions = [], activated = [], snapshot = null
  const db = {
    userBankAccount: { findFirst: async ({ where }) => ({ id: where.accountNumber === '123' ? 1 : 2, userId: 7, bankName: 'MB', webhookApiKeyHash: createHash('sha256').update('fixture-key').digest('hex') }) },
    processedTransaction: {
      findFirst: async ({ where }) => transactions.find(row => where.OR.some(condition => condition.externalId === row.externalId || condition.fingerprint === row.fingerprint)) || null,
      create: async ({ data }) => { const row = { id: transactions.length + 1, ...data }; transactions.push(row); return row },
      update: async ({ where, data }) => Object.assign(transactions.find(row => row.id === where.id), data),
    },
    enrollment: { findMany: async () => pending },
    systemConfig: { findUnique: async () => snapshot ? { value: snapshot } : null },
    affiliateRef: { findFirst: async () => null },
  }
  const hook = load('app/api/webhooks/sepay/route.ts', {
    'server-only': {}, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/test-account': { isTestAccount: () => false },
    '@/lib/enrollment-activation': { processEnrollmentActivation: async input => { activated.push(input.enrollmentId); return { success: true } } },
    '@/lib/activity-logger': { logActivity: async () => {} }, '@/lib/notifications': { sendTelegram: async () => {}, sendActivationEmail: async () => {} },
  })
  const row = (id, code, bankId = 1) => ({ id, userId: 0, courseId: id, phi_coc: 100000, course: { id_khoa: code, phi_coc: 100000, teacherBankAccountId: bankId, name_lop: code, autoVerifyConfig: null }, user: { id: 0, name: 'Buyer', phone: '0901234567', email: null } })
  const reset = rows => { pending = rows; transactions = []; activated = []; snapshot = null }
  const call = (content = 'HV 0 COC APP', amount = 100000, accountNumber = '123', key = 'fixture-key') => hook.POST(new Request('https://test.invalid/api/webhooks/sepay', { method: 'POST', headers: { authorization: 'Apikey ' + key, 'content-type': 'application/json' }, body: JSON.stringify({ id: 100, accountNumber, content, transferType: 'in', transferAmount: amount, transactionDate: '2026-11-06T03:00:00Z' }) }))
  reset([row(90, 'APP-PRO'), row(91, 'APP')])
  assert.equal((await call()).status, 200); assert.deepEqual(activated, [91], 'APP activates exactly APP, never the first APP-PRO purchase')
  await call(); assert.deepEqual(activated, [91], 'Repeated webhook does not activate again')
  reset([row(90, 'APP-PRO'), row(91, 'APP')]); await call('HV 0 COC APP-PRO'); assert.deepEqual(activated, [90], 'Hyphenated full code is preserved')
  reset([row(91, 'APP', 2)]); await call(); assert.equal(activated.length, 0, 'A different bank account of the same owner is rejected')
  assert.equal(transactions[0].status, 'UNMATCHED')
  reset([row(91, 'APP', 2)])
  snapshot = { price: 100000, bank: { id: 1, accountNumber: '123', accountHolder: 'Owner', bankName: 'MB', qrCodeUrl: null }, gratitudeId: null }
  await call(); assert.deepEqual(activated, [91], 'A previously captured receiving account survives later catalog edits')
  reset([row(91, 'APP')]); await call('HV 0 COC APP', 50000); assert.equal(activated.length, 0)
  reset([row(91, 'APP')]); assert.equal((await call('HV 0 COC APP', 100000, '123', 'invalid')).status, 401); assert.equal(transactions.length, 0)
  reset([row(90, 'APP'), row(91, 'APP')]); await call(); assert.equal(activated.length, 0); assert.equal(transactions[0].status, 'UNMATCHED', 'Ambiguous matches require manual reconciliation')
  console.log('Bank matching: exact/prefix/hyphen codes, account zero, selected/snapshotted receiving bank, insufficient amount, authentication, duplicates and ambiguous matches passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
