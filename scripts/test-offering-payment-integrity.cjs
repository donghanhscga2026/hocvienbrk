// Actual actions and commission engine against transactional memory only.
// No network, database, bank, email or production wallet is accessed.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const load = require('./helpers/load-ts.cjs')
const copy = value => value == null ? value : structuredClone(value)
async function run() {
  let state, failOrder = false, failCommission = false, cookieReads = 0
  const course = { id: 9, id_khoa: 'APP', name_lop: 'App', phi_coc: 1000000, productGroup: 'DIGITAL', type: 'NORMAL', feeType: 'CO_PHI', teacherId: 7, allowMbvDeduction: true, voucherConfig: 'WALLET', teacherBankAccount: null }
  const reset = () => { state = { configs: new Map(), enrollments: [], orders: [], conversions: [], commissions: [], wallets: new Map(), logs: [], balance: 2000000, mbv: 2000000, debits: [], gifts: 0 }; failOrder = false; failCommission = false }
  reset()
  const db = {
    $executeRaw: async () => {},
    $queryRaw: async () => [],
    course: { findUnique: async () => copy(course) },
    user: { findUnique: async () => ({ id: 0, name: 'Buyer', referrerId: 6 }) },
    enrollment: {
      findUnique: async ({ where, include }) => { const row = state.enrollments.find(row => where.id != null ? row.id === where.id : row.userId === where.userId_courseId.userId && row.courseId === where.userId_courseId.courseId); return row ? copy({ ...row, ...(include?.course ? { course } : {}) }) : null },
      findFirst: async () => ({ id: 90 }), count: async () => 0,
      create: async ({ data }) => { if (state.enrollments.length) throw Object.assign(Error('Duplicate'), { code: 'P2002' }); const row = { id: 50, ...copy(data) }; state.enrollments.push(row); return copy(row) },
      update: async ({ where, data }) => { const row = state.enrollments.find(row => row.id === where.id); Object.assign(row, data); return copy(row) },
    },
    orderItem: {
      findFirst: async ({ where }) => { const order = state.orders.find(order => order.items.some(item => item.enrollmentId === where.enrollmentId)); return order ? { orderId: order.id } : null },
      findMany: async ({ where }) => state.orders.filter(order => order.items.some(item => item.enrollmentId === where.enrollmentId)).map(order => ({ orderId: order.id })),
    },
    order: {
      create: async ({ data }) => { if (failOrder) throw Error('ORDER_FAILED'); const order = { id: state.orders.length + 1, commissionProcessed: false, ...copy(data), items: [copy(data.items.create)] }; state.orders.push(order); return copy(order) },
      findUnique: async ({ where }) => { const order = state.orders.find(row => row.id === where.id); return order ? copy({ ...order, buyer: { referrerId: 6 } }) : null },
      update: async ({ where, data }) => { const order = state.orders.find(row => row.id === where.id); Object.assign(order, data); return copy(order) },
    },
    affiliateConversion: {
      findFirst: async ({ where }) => copy(state.conversions.find(row => where.enrollmentId != null ? row.enrollmentId === where.enrollmentId : row.orderRecordId === where.orderRecordId)) || null,
      create: async ({ data }) => { const row = { id: state.conversions.length + 1, ...copy(data) }; state.conversions.push(row); return copy(row) },
    },
    affiliateCommission: {
      create: async ({ data }) => { if (failCommission && data.kind === 'GRATITUDE') throw Error('COMMISSION_FAILED'); const row = { id: state.commissions.length + 1, ...copy(data) }; state.commissions.push(row); return copy(row) },
      findMany: async ({ where }) => copy(state.commissions.filter(row => state.conversions.some(conv => conv.id === row.conversionId && conv.orderRecordId === where.conversion.orderRecordId) && where.status.in.includes(row.status))),
      update: async ({ where, data }) => Object.assign(state.commissions.find(row => row.id === where.id), data),
    },
    systemAffiliateConfig: { findUnique: async () => ({ gratitudeRate: 2, pendingDays: 30 }) },
    affiliateCampaign: { findFirst: async () => ({ id: 1 }) },
    productAffiliateConfig: { findUnique: async () => ({ directRate: 10, isActive: true }) },
    affiliateLink: { findFirst: async () => ({ id: 1, code: 'REF8' }) },
    systemConfig: {
      findUnique: async ({ where }) => state.configs.has(where.key) ? { key: where.key, value: copy(state.configs.get(where.key)) } : null,
      upsert: async ({ where, create, update }) => { if (!state.configs.has(where.key)) state.configs.set(where.key, copy(create.value)); else if (update.value) state.configs.set(where.key, copy(update.value)); return { key: where.key, value: copy(state.configs.get(where.key)) } },
    },
    affiliateWallet: {
      findUnique: async ({ where }) => copy(state.wallets.get(where.userId)) || null,
      upsert: async ({ where, create, update }) => { let wallet = state.wallets.get(where.userId); if (wallet) wallet.pendingBalance += update.pendingBalance.increment; else wallet = { id: where.userId, balance: 0, pendingBalance: create.pendingBalance }; state.wallets.set(where.userId, wallet); return copy(wallet) },
      update: async ({ where, data }) => { const wallet = state.wallets.get(where.userId); for (const [field, value] of Object.entries(data)) wallet[field] = (wallet[field] || 0) - value.decrement; return copy(wallet) },
    },
    affiliateTransaction: { create: async ({ data }) => state.logs.push(copy(data)) },
    brkWallet: { findUnique: async () => ({ id: 1, balance: state.balance, mbvBalance: state.mbv }), update: async ({ data }) => { state.balance -= data.balance.decrement; state.mbv -= data.mbvBalance.decrement } },
    brkTransaction: { aggregate: async ({ where }) => ({ _sum: { amount: -state.debits.filter(row => row.ref === where.refId).reduce((sum, row) => sum + row.amount, 0) } }), create: async ({ data }) => state.debits.push({ amount: -data.amount, ref: data.refId }) },
    courseVoucherAward: { findMany: async () => [] },
    payment: { deleteMany: async () => {}, updateMany: async () => {}, upsert: async ({ create }) => copy(create) },
  }
  let queue = Promise.resolve()
  db.$transaction = fn => {
    const result = queue.then(async () => { const before = copy(state); try { return await fn(db) } catch (error) { state = before; throw error } })
    queue = result.catch(() => {}); return result
  }
  const engine = load('lib/affiliate/unified-commission.ts', { 'server-only': {}, '@/lib/prisma': { __esModule: true, default: db } })
  state.enrollments.push({ id: 50, userId: 0, courseId: 9, status: 'ACTIVE', referrerId: 8, phi_coc: 1000000 })
  state.conversions.push({ id: 1, enrollmentId: 50, link: { userId: 8, code: 'BUYER_REF' } })
  const orders = await Promise.all([engine.createOrderForEnrollment(50), engine.createOrderForEnrollment(50)])
  assert.equal(orders[0].orderId, orders[1].orderId); assert.equal(state.orders.length, 1)
  assert.equal(state.orders[0].affiliateId, 8); assert.equal(state.orders[0].refCode, 'BUYER_REF')
  failCommission = true
  assert.equal((await engine.processOrderCommission(1)).success, false)
  assert.equal(state.commissions.length, 0); assert.equal(state.wallets.size, 0); assert.equal(state.orders[0].commissionProcessed, false)
  failCommission = false
  await Promise.all([engine.processOrderCommission(1), engine.processOrderCommission(1)])
  assert.equal(state.commissions.length, 2); assert.equal(state.wallets.get(8).pendingBalance, 100000); assert.equal(state.wallets.get(6).pendingBalance, 20000)
  await engine.reverseCommissionForEnrollment(50, 'Cancel')
  assert.equal(state.orders[0].status, 'CANCELLED'); assert(state.commissions.every(row => row.status === 'CANCELLED'))
  assert.equal(state.wallets.get(8).pendingBalance, 0); const logs = state.logs.length
  await engine.reverseCommissionForEnrollment(50, 'Retry cancel'); assert.equal(state.logs.length, logs)
  assert.equal((await engine.processOrderCommission(1)).success, false, 'Cancelled order cannot earn again')

  const mocks = Object.fromEntries([...fs.readFileSync(require('node:path').join(__dirname, '../app/actions/course-actions.ts'), 'utf8').matchAll(/from ['"](@\/[^'"]+)['"]/g)].map(match => [match[1], {}]))
  Object.assign(mocks, {
    '@/auth': { auth: async () => ({ user: { id: '0', role: 'STUDENT' } }) }, '@/lib/prisma': { __esModule: true, default: db },
    'server-only': {},
    '@/lib/test-account': { isTestAccount: () => false }, '@/lib/affiliate/unified-commission': engine,
    '@/lib/website/domain-context': { requireDomainCourse: async () => {}, domainContext: async () => null },
    '@/lib/offerings/server': { readOfferingDetails: async () => ({ kind: 'APP' }) }, '@/lib/offerings/combo': { syncComboPurchase: async () => {}, syncComboInTransaction: async () => {} },
    '@/lib/affiliate/resolve-ref-helper': { resolveRefToUserId: async () => 8 },
    '@/lib/brk/wallet-service': {
      debitMbvWallet: async (id, amount, description, ref) => { state.mbv -= amount; state.debits.push({ amount, ref }) },
      debitBrkCashBalance: async (id, amount, description, ref) => { state.balance -= amount; state.debits.push({ amount, ref }) },
    },
    '@/lib/voucher/voucher-service': { awardVoucher: async () => {}, grantVoucherBenefits: async () => {}, getApplicableVoucherBenefits: async () => [{ userVoucherId: 1, voucherId: 2, benefitType: 'FREE_100', extraAmount: 0 }], markVoucherUsed: async () => { state.gifts++ } },
    '@/lib/affiliate/tracking': { trackAffiliateConversion: async () => {} },
    '@/lib/notifications': { sendTelegram: async () => {}, sendActivationEmail: async () => {} }, '@/lib/activity-logger': { logActivity: async () => {} },
    'next/cache': { revalidatePath: () => {} }, 'next/server': { after: () => {} },
    'next/headers': { cookies: async () => { cookieReads++; return { get: () => ({ value: '99' }) } }, headers: async () => new Headers() },
    '@/lib/vietqr': { createPaymentQR: async () => ({ qrCodeUrl: 'https://test.invalid/qr', transferContent: 'HV 0 COC APP' }), generateTransferContent: () => 'HV 0 COC APP' },
  })
  const actions = load('app/actions/course-actions.ts', mocks)
  reset()
  const walletCheckout = load('lib/offerings/wallet-checkout.ts', mocks)
  await Promise.all([1, 2].map(() => walletCheckout.debitCheckoutWallets(0, 9, { useVoucher: true, voucherAmount: 300000, useCash: true })))
  assert.equal(state.debits.reduce((sum, row) => sum + row.amount, 0), 1000000, 'Concurrent checkout tabs debit only the remaining purchase price')
  assert.equal(state.mbv, 1700000); assert.equal(state.balance, 1300000)
  reset(); failOrder = true
  assert.equal((await actions.enrollInCourseAction(9, 8, false, 0, true)).success, false)
  assert.equal(state.enrollments.length, 0); assert.equal(state.orders.length, 0, 'A failed order does not leave access activated')
  failOrder = false
  assert.equal((await actions.enrollInCourseAction(9, 8, false, 0, true)).success, true)
  assert.equal(state.debits.reduce((sum, row) => sum + row.amount, 0), 1000000, 'Retry resumes the recorded wallet payment without debiting twice')
  reset()
  assert.equal((await actions.enrollInCourseAction(9, 8, true, 1000000, false, true, 1)).success, false)
  assert.equal(state.debits.length, 0, 'Invalid wallet and gift combination is rejected before any debit')
  const qrPayments = []
  db.payment.create = async ({ data }) => { qrPayments.push(copy(data)); return { id: qrPayments.length, ...data } }
  for (const group of ['DIGITAL', 'SERVICE']) {
    reset(); course.productGroup = group; course.phi_coc = 1000000
    course.teacherBankAccount = { id: 1, accountNumber: '123456789', accountHolder: 'Owner', bankName: 'MB', qrCodeUrl: null }
    state.balance = 300000
    assert.equal((await actions.enrollInCourseAction(9, 8, false, 0, true)).success, true)
    assert.equal(qrPayments.at(-1).amount, 700000)
    assert.equal((await actions.enrollInCourseAction(9, 8)).success, true)
    assert.equal(qrPayments.at(-1).amount, 700000, 'Reopening without a wallet checkbox retains the 300000 already paid')
    assert.equal(state.balance, 0); assert.equal(state.debits.length, 1)
    course.phi_coc = 2000000
    course.teacherBankAccount = { ...course.teacherBankAccount, id: 2, accountNumber: '987654321' }
    assert.equal((await actions.enrollInCourseAction(9, 8)).success, true)
    assert.equal(qrPayments.at(-1).amount, 700000); assert.equal(qrPayments.at(-1).accountNumber, '123456789', 'Saved price and receiving account survive catalog edits')
    const settle = load('lib/enrollment-activation.ts', { ...mocks, '@/lib/affiliate/commission-calculator': {} })
    assert.equal((await settle.processEnrollmentActivation({ enrollmentId: 50, method: 'MANUAL_ADMIN', transferData: { amount: 700000, phone: null, courseCode: 'APP', bankName: 'MB', accountNumber: '123456789', transferTime: new Date(), content: 'Fixture' } })).success, true)
    assert.equal(state.orders[0].totalAmount, 1000000); assert.equal(state.wallets.get(8).pendingBalance, 100000)
  }
  course.phi_coc = 1000000; course.teacherBankAccount = null
  reset(); failCommission = true
  const failedCommission = await actions.enrollInCourseAction(9, 8, false, 0, true)
  assert.equal(failedCommission.success, true); assert.equal(failedCommission.commissionPending, true)
  assert.equal(state.orders.length, 1); assert.equal(state.commissions.length, 0); assert.equal(state.orders[0].commissionProcessed, false)
  failCommission = false
  assert.equal((await actions.enrollInCourseAction(9, 8, false, 0, true)).commissionPending, false)
  assert.equal(state.orders.length, 1); assert.equal(state.commissions.length, 2); assert.equal(state.debits.length, 1, 'Retry repairs commission without recharging the buyer')
  reset()
  const aliasMocks = { ...mocks, 'next/headers': { ...mocks['next/headers'], cookies: async () => ({ get: () => ({ value: JSON.stringify({ r: '12abc' }) }) }) } }
  const aliasActions = load('app/actions/course-actions.ts', aliasMocks)
  assert.equal((await aliasActions.enrollInCourseAction(9, null, false, 0, true)).success, true)
  assert.equal(state.orders[0].affiliateId, 8); assert.equal(state.orders[0].refCode, '12abc')
  const resolver = load('lib/affiliate/resolve-ref-helper.ts', { '@/lib/prisma': { __esModule: true, default: {
    affiliateRef: { findUnique: async () => null },
    user: { findUnique: async ({ where }) => where.affiliateCode === '12ABC' ? { id: 8 } : where.id === 12 ? { id: 12 } : null },
  } } })
  assert.equal(await resolver.resolveRefToUserId('12abc'), 8, 'Alphanumeric affiliate codes are never truncated to a member ID')
  const globals = { window: global.window, document: global.document, localStorage: global.localStorage }
  let affiliateCookie = 'aff_ref=' + encodeURIComponent(JSON.stringify({ r: '12abc' }))
  global.window = {}; global.document = { get cookie() { return affiliateCookie } }
  global.localStorage = { getItem: () => JSON.stringify({ ref: '12abc', timestamp: Date.now() }), removeItem: () => {} }
  try {
    const client = load('lib/affiliate/get-client-ref.ts')
    assert.equal(client.getClientRef(), '12abc', 'Browser cookie retains the full affiliate code')
    affiliateCookie = ''; assert.equal(client.getClientRef(), '12abc', 'Local storage fallback retains the full affiliate code')
    reset(); assert.equal((await aliasActions.enrollInCourseAction(9, client.getClientRef(), false, 0, true)).success, true)
    assert.equal(state.orders[0].affiliateId, 8); assert.equal(state.orders[0].refCode, '12abc')
  } finally { for (const [key, value] of Object.entries(globals)) if (value === undefined) delete global[key]; else global[key] = value }
  for (const group of ['DIGITAL', 'SERVICE']) for (const kind of ['cash', 'mbv', 'gift', 'pending']) {
    reset(); course.productGroup = group
    if (kind === 'pending') state.enrollments.push({ id: 50, userId: 0, courseId: 9, status: 'PENDING', referrerId: 8, phi_coc: 1000000 })
    const purchase = () => actions.enrollInCourseAction(9, 8, kind === 'mbv', kind === 'mbv' ? 1000000 : 0, ['cash', 'pending'].includes(kind), kind === 'gift', 1)
    const result = await purchase()
    assert.equal(result.success, true, result.message); assert.equal(result.status, 'ACTIVE')
    assert.equal(state.orders.length, 1); assert.equal(state.orders[0].totalAmount, 1000000); assert.equal(state.orders[0].affiliateId, 8)
    assert.equal(state.commissions.length, 2); assert.equal(state.wallets.get(8).pendingBalance, 100000)
    const before = copy(state); await purchase(); assert.deepEqual(state, before, 'Retry never debits/uses gifts or earns twice')
  }
  reset(); state.enrollments.push({ id: 50, userId: 0, courseId: 9, status: 'CANCELLED', referrerId: 8, phi_coc: 1000000 })
  assert.equal((await actions.enrollInCourseAction(9, 8, false, 0, true)).success, false)
  assert.equal(state.balance, 2000000); assert.equal(state.orders.length, 0)
  const activation = load('lib/enrollment-activation.ts', { ...mocks, '@/lib/affiliate/commission-calculator': {} })
  const reads = cookieReads
  assert.equal((await activation.processEnrollmentActivation({ enrollmentId: 50, method: 'MANUAL_ADMIN' })).success, false)
  state.enrollments[0].status = 'PENDING'; course.productGroup = 'SERVICE'
  assert.equal((await activation.processEnrollmentActivation({ enrollmentId: 50, method: 'MANUAL_ADMIN' })).success, true)
  assert.equal(cookieReads, reads, 'Admin approval never reads affiliate cookie 99')
  assert.equal(state.orders[0].affiliateId, 8)
  const paymentActions = load('app/actions/payment-actions.ts', { ...mocks, '@/auth': { auth: async () => ({ user: { id: '7', role: 'ADMIN' } }) }, '@/lib/brk/activation-service': {}, '@/lib/offerings/quotes': { cancelQuotesForEnrollment: async tx => assert.equal(tx, db) } })
  const pending = await paymentActions.revertToPendingAction([50])
  assert.equal(pending.count, 0); assert.equal(pending.errors.length, 1); assert.equal(state.enrollments[0].status, 'ACTIVE')
  const wallet = state.wallets.get(8); state.wallets.delete(8)
  const beforeCancel = copy(state)
  assert.equal((await paymentActions.cancelEnrollmentAction([50])).success, false)
  assert.deepEqual(state, beforeCancel, 'Failed commission reversal rolls back cancellation and all financial writes')
  state.wallets.set(8, wallet)
  assert.equal((await paymentActions.cancelEnrollmentAction([50])).success, true)
  assert.equal(state.enrollments[0].status, 'CANCELLED'); assert.equal(state.orders[0].status, 'CANCELLED'); assert.equal(state.wallets.get(8).pendingBalance, 0)

  const React = require('react'), render = require('react-dom/server').renderToStaticMarkup
  const reportDb = {
    course: { findMany: async () => [{ id: 9, productGroup: 'DIGITAL' }, { id: 10, productGroup: 'SERVICE' }, { id: 11, productGroup: 'COURSE' }] },
    order: { findMany: async ({ where }) => {
      assert.equal(where.status, 'PAID')
      if (where.items) {
        const selected = where.items.some.OR[0].productId.in
        assert.deepEqual(selected, [10]); assert.equal(where.items.some.OR[1].productType, 'SERVICE')
      }
      return [{ id: 1, affiliateId: 8, affiliate: { name: 'Affiliate' }, buyer: { name: 'Buyer' }, totalAmount: 1000000, items: [{ productType: 'COURSE', productId: where.items ? 10 : 9, productName: 'Offering', unitPrice: 1000000, quantity: 1 }] }]
    } },
    affiliateCommission: { findMany: async () => [] },
  }
  const report = load('app/tools/affiliate/sales/page.tsx', {
    '@/auth': { auth: async () => ({ user: { id: '7', role: 'ADMIN' } }) }, '@/lib/prisma': { __esModule: true, default: reportDb },
    '@/components/admin/AdminSubNav': { AdminSubNav: () => null }, '@/app/tools/affiliate/affiliate-nav': { affiliateSubNav: [] },
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  }).default
  for (const productType of ['', 'SERVICE']) {
    const html = render(await report({ searchParams: Promise.resolve({ productType }) }))
    assert(html.includes(productType ? 'Dịch vụ</td>' : 'Sản phẩm số</td>'), 'Course-backed offerings have the right report category')
  }
  console.log('Payment integrity: saved attribution, concurrent/idempotent orders and commissions, rollback/retry, cancellation, wallet/MBV/gift checkout for products and services, and admin-cookie isolation passed.')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
