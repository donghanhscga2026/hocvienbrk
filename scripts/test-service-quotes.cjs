// Transactional fixtures only: never access production DB, banks or notifications.
const assert = require('node:assert/strict')
const React = require('react'), { JSDOM } = require('jsdom')
const load = require('./helpers/load-ts.cjs')
const shared = load('lib/offerings/quotes-shared.ts')
class CrmError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
const id = '00000000-0000-4000-8000-000000000001'
const actor = { id: 7, role: 'TEACHER', name: 'Owner' }, buyer = { id: 0 }
const draft = { title: 'Website', scope: 'Five pages and training', total: 12000000, terms: '', installments: [{ label: 'Deposit', amount: 6000000 }, { label: 'Delivery', amount: 6000000 }] }
async function run() {
  let configs = new Map(), orders = new Map(), enrollments = new Map(), notifications = [], nextId = 1, commissions = [], failOrder = false, failGrant = false
  const row = { id, ownerId: 7, userId: 0, courseId: 9, name: 'Customer', content: 'Needs', course: { id: 9, id_khoa: 'WEB', name_lop: 'Website', productGroup: 'SERVICE', teacherId: 7, teacher: { name: 'Owner' }, teacherBankAccount: { id: 3, accountHolder: 'Owner', accountNumber: '123456789', bankName: 'MB', accountType: 'BANK' } } }
  const copy = value => value == null ? value : structuredClone(value)
  configs.set('catalog:offering:9', { service: { saleMode: 'QUOTE', model: 'PROJECT' } })
  configs.set('catalog:quote-ref:' + id, { affiliateId: 8, refCode: '8', gratitudeId: 6 })
  const db = {
    $executeRaw: async () => {},
    crmRequest: { findFirst: async ({ where }) => where.id === id && (where.userId == null || where.userId === row.userId) && (where.ownerId == null || where.ownerId === row.ownerId) ? copy(row) : null },
    systemConfig: {
      findUnique: async ({ where }) => configs.has(where.key) ? { key: where.key, value: copy(configs.get(where.key)) } : null,
      upsert: async ({ where, create, update }) => configs.set(where.key, copy(configs.has(where.key) ? update.value : create.value)),
      create: async ({ data }) => { if (configs.has(data.key)) throw Error('Unique conflict'); configs.set(data.key, copy(data.value)) },
    },
    user: { findUnique: async () => ({ referrerId: 99 }) },
    appNotification: { upsert: async ({ create }) => notifications.push(copy(create)) },
    productAffiliateConfig: { upsert: async () => ({}) },
    order: { create: async ({ data }) => { if (failOrder) throw Error('ORDER_FAILED'); const order = { id: nextId++, ...copy(data) }; orders.set(order.id, order); return copy(order) }, update: async ({ where, data }) => { const value = { ...orders.get(where.id), ...data }; orders.set(where.id, value); return copy(value) } },
    orderItem: { updateMany: async ({ where, data }) => { Object.assign(orders.get(where.orderId).items.create, data) } },
    enrollment: { upsert: async ({ where, create }) => { if (failGrant) throw Error('GRANT_FAILED'); const key = JSON.stringify(where); if (!enrollments.has(key)) enrollments.set(key, { id: 50, ...copy(create) }); return copy(enrollments.get(key)) }, update: async () => {} },
  }
  let queue = Promise.resolve()
  db.$transaction = callback => {
    const task = queue.then(async () => { const before = copy({ configs, orders, enrollments, notifications, nextId }); try { return await callback(db) } catch (error) { ({ configs, orders, enrollments, notifications, nextId } = before); throw error } })
    queue = task.catch(() => {}); return task
  }
  const quotes = load('lib/offerings/quotes.ts', {
    'server-only': {}, '@/lib/crm/service': { CrmError }, '@/lib/crm/requests': { requestScope: actor => actor.role === 'ADMIN' ? {} : { ownerId: actor.id } },
    '@/lib/affiliate/unified-commission': { processOrderCommission: async id => { if (!commissions.includes(id)) commissions.push(id); return { success: true } } },
  })
  assert.throws(() => shared.quoteDraftSchema.parse({ ...draft, total: 1 }))
  assert.throws(() => shared.quoteDraftSchema.parse({ ...draft, installments: [{ label: 'Bad', amount: 1234 }] }))
  await assert.rejects(() => quotes.saveQuote(db, { ...actor, id: 99 }, id, 0, draft, false), /phạm vi/)
  let saved = await quotes.saveQuote(db, actor, id, 0, draft, false)
  assert.equal(saved.quote.version, 1); assert.equal(orders.size, 0)
  assert.equal((await quotes.getQuote(db, id, buyer, false)).quote, null, 'Draft is private')
  await assert.rejects(() => quotes.getQuote(db, id, { id: 42 }, false), /phạm vi/)
  await assert.rejects(() => quotes.saveQuote(db, actor, id, 0, draft, false), /thay đổi/)
  saved = await quotes.saveQuote(db, actor, id, 1, draft, true)
  assert.equal(saved.quote.affiliateId, 8); assert.equal(saved.quote.gratitudeId, 6, 'Uses captured relationship, not current buyer referrer 99')
  const publicQuote = (await quotes.getQuote(db, id, buyer, false)).quote
  assert.equal(publicQuote.bank, null); assert(!JSON.stringify(publicQuote).includes('refCode'))
  assert.equal(notifications.at(-1).recipientId, 0); assert.equal(notifications.at(-1).kind, 'REQUEST_UPDATED')
  await assert.rejects(() => quotes.changeQuote(db, actor, id, 2, 'ACCEPT', true), /xác nhận/)
  failOrder = true; await assert.rejects(() => quotes.changeQuote(db, buyer, id, 2, 'ACCEPT', false), /ORDER_FAILED/); assert.equal(orders.size, 0); assert.equal((await quotes.readQuote(db, id)).status, 'SENT'); failOrder = false
  await quotes.changeQuote(db, buyer, id, 2, 'ACCEPT', false)
  let quote = await quotes.readQuote(db, id)
  assert.equal(quote.status, 'ACCEPTED'); assert.equal(orders.size, 2); assert.equal(enrollments.size, 0)
  assert.equal(orders.get(1).affiliateId, 8); assert.equal(orders.get(1).totalAmount + orders.get(2).totalAmount, draft.total)
  assert(quote.installments.every(part => /^SQ[A-F0-9]{20}$/.test(part.code)))
  await assert.rejects(() => quotes.changeQuote(db, buyer, id, 2, 'ACCEPT', false), /thay đổi/); assert.equal(orders.size, 2)
  await assert.rejects(() => quotes.saveQuote(db, actor, id, 3, draft, true), /bản nháp/)
  const transfer = index => ({ content: quote.installments[index].code, amount: 6000000, bankAccountId: 3, receipt: 'bank-' + index })
  assert.equal(await quotes.matchQuoteTransfer(db, { ...transfer(0), content: 'HV 0 COC WEB' }), null, 'Other purchases keep existing matcher')
  await assert.rejects(() => quotes.matchQuoteTransfer(db, { ...transfer(0), bankAccountId: 4 }), /Tài khoản/)
  await assert.rejects(() => quotes.matchQuoteTransfer(db, { ...transfer(0), amount: 5000 }), /chưa đủ/)
  await assert.rejects(() => quotes.matchQuoteTransfer(db, transfer(1)), /các đợt trước/)
  assert.equal(enrollments.size, 0); assert.equal(commissions.length, 0)
  await quotes.changeQuote(db, buyer, id, quote.version, 'REPORT', false, 0)
  assert.equal(enrollments.size, 0, 'Customer report never activates service')
  failGrant = true; await assert.rejects(() => quotes.matchQuoteTransfer(db, transfer(0)), /GRANT_FAILED/); assert.equal(orders.get(1).status, 'PENDING'); assert(!(await quotes.readQuote(db, id)).installments[0].paidAt); failGrant = false
  await Promise.all([quotes.matchQuoteTransfer(db, transfer(0)), quotes.matchQuoteTransfer(db, transfer(0))])
  assert.equal(enrollments.size, 1); assert.equal(commissions.length, 1); assert.equal(orders.get(1).status, 'PAID'); assert.equal(orders.get(2).status, 'PENDING')
  await assert.rejects(() => quotes.matchQuoteTransfer(db, { ...transfer(1), receipt: 'bank-0' }), /đã dùng/)
  await quotes.confirmQuotePayment(db, { requestId: id, index: 1, actor, receipt: 'manual-bank-1' })
  assert.equal(commissions.length, 2); assert.equal(enrollments.size, 1); assert((await quotes.readQuote(db, id)).installments.every(part => part.paidAt))
  await quotes.confirmQuotePayment(db, { requestId: id, index: 1, actor, receipt: 'retry-commission' }); assert.equal(commissions.length, 2)
  assert.equal(notifications.filter(item => item.title.startsWith('Đã xác nhận')).length, 2)
  const domain = load('lib/website/domain-shared.ts')
  for (const path of ['/api/service-quotes/' + id, '/tools/service-quotes/' + id, '/my-requests/' + id + '/bao-gia']) {
    assert.equal(domain.domainRoute(path, { courses: true, crm: true, affiliate: true }), 'system')
    assert.equal(domain.domainRoute(path, { courses: true, crm: false, affiliate: true }), 'deny')
  }
  // Actual API boundaries: customer consent, CSRF, fresh staff role and domain checks.
  let writes = 0, staffAllowed = false
  const api = load('app/api/service-quotes/[id]/route.ts', {
    '@/lib/prisma': { __esModule: true, default: {} }, '@/lib/crm/service': { CrmError },
    '@/lib/crm/auth': { getCrmActor: async () => { if (!staffAllowed) throw new CrmError('Forbidden', 403); return actor } },
    '@/lib/app-notifications': { notificationActor: async () => buyer },
    '@/lib/website/domain-context': { requireDomainModule: async () => {}, requireDomainCourse: async course => assert.equal(course, 9) },
    '@/lib/offerings/quotes': { quoteRequest: async () => ({ courseId: 9 }), getQuote: async () => ({ quote: null }), changeQuote: async () => { writes++; return { updated: true } }, saveQuote: async () => { writes++; return {} } },
  })
  const context = { params: Promise.resolve({ id }) }
  const post = (body, origin = 'https://test.invalid') => api.POST(new Request('https://test.invalid/api/service-quotes/' + id, { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), context)
  assert.equal((await post({ action: 'ACCEPT', version: 2, consent: false })).status, 400)
  assert.equal((await post({ action: 'ACCEPT', version: 2, consent: true }, 'https://evil.invalid')).status, 403)
  assert.equal((await post({ action: 'ACCEPT', version: 2, consent: true, total: 1 })).status, 400)
  assert.equal((await post({ action: 'SEND', version: 0, draft })).status, 403); assert.equal(writes, 0)
  assert.equal((await post({ action: 'ACCEPT', version: 2, consent: true })).status, 200)
  const get = await api.GET(new Request('https://test.invalid/api/service-quotes/' + id), context); assert.equal(get.headers.get('cache-control'), 'private, no-store')
  // Actual CRM intake captures referral in the same transaction and never rewrites on retry.
  const priorSecret = process.env.AUTH_SECRET
  process.env.AUTH_SECRET = 'fixture-only-request-key'
  const requestRecords = new Map(), captured = new Map()
  const intakeDb = {
    $executeRaw: async () => {},
    user: { findUnique: async () => ({ id: 0, name: 'Customer', email: 'customer@test.invalid', phone: '', referrerId: 6 }) },
    course: { findFirst: async () => ({ id: 9, teacherId: 7, teacher: { role: 'TEACHER' } }) },
    enrollment: { findUnique: async () => null },
    crmRequest: { findUnique: async ({ where }) => requestRecords.get(where.key), count: async () => 0, create: async ({ data }) => { const record = { id: 'request-' + requestRecords.size, ...data }; requestRecords.set(data.key, record); return record } },
    systemConfig: { create: async ({ data }) => { assert(!captured.has(data.key)); captured.set(data.key, data.value) } },
  }
  intakeDb.$transaction = callback => callback(intakeDb)
  const intake = load('lib/crm/requests.ts', { '@/lib/crm/service': { CrmError }, '@/lib/wi300/course-visibility': {} })
  const input = { key: id, courseId: 9, category: 'CONSULTATION', content: 'Website needs', consent: true }
  try {
    await intake.createRequest(intakeDb, input, 0, 'fixture', undefined, false, { affiliateId: 8, refCode: '8' })
    await intake.createRequest(intakeDb, input, 0, 'fixture', undefined, false, { affiliateId: 99, refCode: '99' })
    assert.equal(captured.size, 1); assert.equal(captured.get('catalog:quote-ref:request-0').affiliateId, 8)
    assert.equal(captured.get('catalog:quote-ref:request-0').gratitudeId, 6)
    await intake.createRequest(intakeDb, { ...input, key: '00000000-0000-4000-8000-000000000002' }, 0, 'fixture', undefined, false, { affiliateId: 8, refCode: '8', disabled: true })
    assert.equal(captured.get('catalog:quote-ref:request-1').affiliateId, null); assert.equal(captured.get('catalog:quote-ref:request-1').gratitudeId, null)
  } finally { if (priorSecret == null) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = priorSecret }
  // Actual SePay handler recognizes quote-only codes before the legacy HV/COC matcher.
  const priorKey = process.env.SEPAY_WEBHOOK_API_KEY
  process.env.SEPAY_WEBHOOK_API_KEY = 'fixture-key'
  let matched = 0, transactionStatus
  const hook = load('app/api/webhooks/sepay/route.ts', {
    '@/lib/prisma': { __esModule: true, default: { userBankAccount: { findFirst: async () => ({ id: 3, userId: 7, bankName: 'MB', webhookApiKeyHash: null }) }, processedTransaction: { findFirst: async () => null, create: async () => ({ id: 1 }), update: async ({ data }) => { transactionStatus = data.status } } } },
    '@/lib/test-account': {}, '@/lib/enrollment-activation': {},
    '@/lib/offerings/quotes': { matchQuoteTransfer: async (db, input) => { matched++; assert.equal(input.bankAccountId, 3); assert.equal(input.amount, 6000000); assert(input.receipt.startsWith('BANK:')); return { updated: true } } },
  })
  const { NextRequest } = require('next/server')
  const webhook = key => new NextRequest('https://test.invalid/api/webhooks/sepay', { method: 'POST', headers: { authorization: 'Apikey ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 1, accountNumber: '123456789', transferType: 'in', transferAmount: 6000000, content: quote.installments[0].code }) })
  try {
    assert.equal((await hook.POST(webhook('invalid-key'))).status, 401); assert.equal(matched, 0)
    assert.equal((await hook.POST(webhook('fixture-key'))).status, 200); assert.equal(matched, 1); assert.equal(transactionStatus, 'PROCESSED')
  } finally { if (priorKey == null) delete process.env.SEPAY_WEBHOOK_API_KEY; else process.env.SEPAY_WEBHOOK_API_KEY = priorKey }
  // Public UI: no QR before acceptance; draft survives a failed send.
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.invalid' })
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(global, 'navigator', { configurable: true, value: dom.window.navigator })
  const root = require('react-dom/client').createRoot(document.getElementById('root'))
  const originalFetch = global.fetch
  try {
    window.confirm = () => true
    const Panel = load('components/offerings/ServiceQuotePanel.tsx', { 'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) } }).default
    let response = { quote: { ...quote, status: 'SENT', bank: null } }, postCount = 0
    global.fetch = async (url, init) => { if (init?.method === 'POST') { postCount++; return { ok: false, json: async () => ({ error: 'Save failed' }) } }; return { ok: true, json: async () => copy(response) } }
    await React.act(async () => root.render(React.createElement(Panel, { key: 'customer', requestId: id, staff: false })))
    assert(!document.querySelector('img')); const accept = [...document.querySelectorAll('button')].find(b => b.textContent === 'Đồng ý báo giá'); assert(accept.disabled)
    response = { quote: { ...quote, status: 'DRAFT', ...draft }, defaults: { title: 'Website', scope: 'Customer needs', customerName: 'Customer' } }
    await React.act(async () => root.render(React.createElement(Panel, { key: 'staff', requestId: id, staff: true })))
    await React.act(async () => {
      const node = document.querySelector('textarea[maxlength="6000"]')
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, 'Keep my draft')
      node.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
    await React.act(async () => [...document.querySelectorAll('button')].find(b => b.textContent === 'Gửi báo giá cho khách').click())
    assert.equal(postCount, 1); assert(document.body.textContent.includes('Save failed')); assert.equal(document.querySelector('textarea[maxlength="6000"]').value, 'Keep my draft')
  } finally { await React.act(async () => root.unmount()); dom.window.close(); global.fetch = originalFetch }
  console.log('Service quotes: scoped drafts, consent/version/immutable acceptance, rollback, exact installment totals, bank/receipt guards, sequential settlement, first-payment access, stable attribution, idempotent commissions, domain routing and UI failure retention passed (isolated fixtures).')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
