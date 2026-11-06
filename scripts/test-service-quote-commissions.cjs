// Real commission engine + real wallet helpers, transactional in-memory adapter.
const assert = require('node:assert/strict')
const load = require('./helpers/load-ts.cjs')
async function run() {
  let state = { orders: new Map([1, 2].map(id => [id, { id, buyerId: 0, affiliateId: 8, status: 'PAID', totalAmount: 6000000, commissionProcessed: false, buyer: { referrerId: 99 }, items: [{ productId: 9, productType: 'COURSE', unitPrice: 6000000, quantity: 1 }] }])), conversions: [], commissions: [], wallets: new Map(), logs: [] }
  let fail = true
  const copy = value => structuredClone(value)
  const db = {
    $executeRaw: async () => {},
    order: { findUnique: async ({ where }) => copy(state.orders.get(where.id)), update: async ({ where, data }) => Object.assign(state.orders.get(where.id), data) },
    affiliateConversion: { findFirst: async ({ where }) => state.conversions.find(row => row.orderRecordId === where.orderRecordId), create: async ({ data }) => { const row = { id: state.conversions.length + 1, ...data }; state.conversions.push(row); return row } },
    affiliateCommission: { create: async ({ data }) => { if (fail && data.kind === 'GRATITUDE') throw Error('COMMISSION_FAILED'); state.commissions.push(data); return data } },
    systemAffiliateConfig: { findUnique: async () => ({ directRate: 10, gratitudeRate: 2, pendingDays: 30 }) },
    affiliateCampaign: { findFirst: async () => ({ id: 1 }) },
    productAffiliateConfig: { findUnique: async () => ({ directRate: 10, isActive: true }) },
    course: { findUnique: async () => ({ teacherId: 7 }) },
    enrollment: { findFirst: async () => ({ id: 5 }) },
    systemConfig: { findUnique: async () => ({ value: { gratitudeId: 6 } }) },
    affiliateLink: { findFirst: async () => ({ id: 1 }) },
    affiliateWallet: {
      findUnique: async ({ where }) => copy(state.wallets.get(where.userId) || null),
      upsert: async ({ where, create, update }) => { let wallet = state.wallets.get(where.userId); if (wallet) wallet.pendingBalance += update.pendingBalance.increment; else wallet = { id: where.userId, pendingBalance: create.pendingBalance }; state.wallets.set(where.userId, wallet); return copy(wallet) },
    },
    affiliateTransaction: { create: async ({ data }) => state.logs.push(data) },
  }
  db.$transaction = async fn => { const before = copy(state); try { return await fn(db) } catch (error) { state = before; throw error } }
  const engine = load('lib/affiliate/unified-commission.ts', { 'server-only': {}, '@/lib/prisma': { __esModule: true, default: db } })
  const quotes = load('lib/offerings/quotes.ts', { 'server-only': {}, '@/lib/crm/requests': {}, '@/lib/crm/service': {}, '@/lib/affiliate/unified-commission': engine })
  assert.equal((await quotes.settleQuoteCommission(db, 1)).success, false)
  assert.equal(state.conversions.length, 0); assert.equal(state.commissions.length, 0); assert.equal(state.wallets.size, 0); assert.equal(state.logs.length, 0, 'No partial wallet or conversion survives a failure')
  assert.equal(state.orders.get(1).commissionProcessed, false)
  fail = false
  assert.equal((await quotes.settleQuoteCommission(db, 1)).success, true)
  assert.equal(state.wallets.get(8).pendingBalance, 600000); assert.equal(state.wallets.get(6).pendingBalance, 120000); assert(!state.wallets.has(99), 'Uses original relationship, not buyer relationship at approval')
  assert.equal((await quotes.settleQuoteCommission(db, 1)).success, true); assert.equal(state.commissions.length, 2)
  assert.equal((await quotes.settleQuoteCommission(db, 2)).success, true)
  assert.equal(state.wallets.get(8).pendingBalance, 1200000, 'Two installments pay commission on 12m combined, not 24m')
  assert.equal(state.wallets.get(6).pendingBalance, 240000); assert.equal(state.commissions.length, 4)
  db.course.findMany = async () => [{ id: 9, teacherId: 7 }]
  db.enrollment.findMany = async () => [{ userId: 8 }]
  db.order.findMany = async () => [...state.orders.values()]
  db.affiliateConversion.findMany = async ({ where }) => state.conversions.filter(row => where.OR.some(condition => condition.orderRecordId === row.orderRecordId))
  db.affiliateCommission.findMany = async ({ where }) => state.commissions.filter(row => where.conversionId.in.includes(row.conversionId))
  const rerun = load('lib/affiliate/recalculate.ts', { 'server-only': {}, '@/lib/prisma': { __esModule: true, default: db }, '@/lib/activity-logger': { logActivity: async () => {} } })
  const before = copy(state)
  const report = await rerun.recalculateCourseCommissions({ courseId: 9, dryRun: true, actorId: 7 })
  assert.deepEqual(report.changes, [], 'Rerun retains captured quote recipient 6, ignoring current buyer referrer 99')
  assert.deepEqual(state, before, 'Rerun preview writes nothing')
  console.log('Quote commissions: real engine/wallet transaction rollback, successful retry, immutable attribution, account zero and per-installment/idempotent totals passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
